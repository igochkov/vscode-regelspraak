// W4 — the visual Beslistabel editor (FSD §W4, FR-W4.1).
//
// A custom **text** editor: VS Code hands it the `TextDocument` itself, so the
// file on disk stays exactly what it always was and every edit goes through the
// normal edit stack — undo, dirty state, save, and anyone else watching the
// document all keep working. FR-W4.1's "preserves the textual source as the
// source of truth" is that choice rather than a promise made on top of one.
//
// It is opt-in per file, which is `"priority": "option"` in the manifest: the
// text editor stays the default for `.rgs` and this one is reached through
// **Reopen Editor With…**. That matters more here than for a typical custom
// editor, because a `.rgs` file is not a decision table — it is a model that may
// *contain* some. So this view shows the tables and says plainly that it shows
// nothing else.
//
// **What it edits is cases, not columns.** A column's title is a composed
// RegelSpraak sentence, and whether it reads as a conclusion is what decides
// the column's role (§12, and the classifier in `ast/build.ts`). A one-line box
// gives an author no help writing one and every help silently turning a
// conclusion column into a condition column — which surfaces as RS901 on a
// table that looked fine. So titles are shown with the role the server read
// from them, and editing one is a job for the text editor, one click away.
//
// **Nothing here parses RegelSpraak.** The grid, the cell ranges and the column
// roles come from `regelspraak/decisionTables`; the per-cell errors are the
// diagnostics the server already publishes, matched to cells by range. Both are
// the server's answers, because a second reading of a table that disagreed with
// the first would be worse than no grid at all.

import {
	CancellationToken, CustomTextEditorProvider, Diagnostic, DiagnosticSeverity, Position,
	Range, TextDocument, Uri, ViewColumn, WebviewPanel, WorkspaceEdit, commands, languages,
	window, workspace
} from 'vscode';

import { DecisionTable, ModelSource } from './model';

export const DECISION_TABLE_VIEW = 'regelspraak.beslistabel';

/** Opens the active RegelSpraak file in the grid, which is the opt-in gesture. */
export const OPEN_DECISION_TABLES_COMMAND = 'regelspraak.openBeslistabelEditor';

export interface CellEdit {
	kind: 'cell';
	table: number;
	row: number;
	cell: number;
	text: string;
	/** What the webview believed was there, so a stale edit is refused. */
	was: string;
}

export interface RowEdit {
	kind: 'addRow' | 'deleteRow';
	table: number;
	row: number;
}

export interface OpenAsText {
	kind: 'openAsText';
}

export type GridGesture = CellEdit | RowEdit | OpenAsText;

/** Why a gesture was refused. Distinguished from `undefined`, which is silence. */
export interface Refusal {
	reason: string;
}

/**
 * One gesture as a `WorkspaceEdit`, or a refusal.
 *
 * Separate from the provider, and handed the tables rather than fetching them,
 * for two reasons. It is the half that **writes**, so it is the half worth
 * testing directly, and a webview cannot be driven from a test. And taking the
 * tables as an argument is what makes the staleness check mean anything: the
 * caller fetches them again immediately before, so the `was` text the webview
 * sent is compared against what the server reads *now*. A range that has moved
 * would otherwise put a cell's text on top of whatever took its place — rename
 * takes the same precaution, and this is the other feature that writes.
 */
export function gridEdit(
	uri: Uri,
	tables: readonly DecisionTable[],
	gesture: CellEdit | RowEdit
): WorkspaceEdit | Refusal | undefined {
	const table = tables[gesture.table];
	if (!table) {
		return undefined;
	}
	const edit = new WorkspaceEdit();
	if (gesture.kind === 'cell') {
		const cell = table.rows[gesture.row]?.cells[gesture.cell];
		if (!cell) {
			return undefined;
		}
		if (cell.text !== gesture.was) {
			return { reason: 'Deze cel is intussen elders gewijzigd; de bewerking is niet doorgevoerd.' };
		}
		edit.replace(uri, toRange(cell.range), gesture.text);
		return edit;
	}
	if (gesture.kind === 'deleteRow') {
		const row = table.rows[gesture.row];
		if (!row) {
			return undefined;
		}
		// The whole line, newline included: a row is one line by construction
		// (`beslistabelRij` ends at the NL), and leaving the newline behind would
		// leave an empty line where the case was.
		edit.delete(uri, new Range(
			new Position(row.range.start.line, 0),
			new Position(row.range.start.line + 1, 0)));
		return edit;
	}
	const after = table.rows[table.rows.length - 1]?.range ?? table.headerRange;
	if (!after) {
		return undefined;
	}
	edit.insert(uri, new Position(after.end.line + 1, 0), `${emptyRow(table)}
`);
	return edit;
}

export class DecisionTableEditor implements CustomTextEditorProvider {
	constructor(private readonly source: ModelSource) {}

	async resolveCustomTextEditor(
		document: TextDocument,
		panel: WebviewPanel,
		token: CancellationToken
	): Promise<void> {
		panel.webview.options = { enableScripts: true };
		panel.webview.html = page(panel.webview.cspSource, nonce());

		const push = async (): Promise<void> => {
			if (token.isCancellationRequested) {
				return;
			}
			const tables = await this.source.decisionTables(document.uri.toString());
			void panel.webview.postMessage({
				type: 'tables',
				tables,
				problems: problems(document.uri, tables)
			});
		};

		// Three reasons the grid goes stale, and it must follow all three: the
		// document changed (from here, from a text editor, or from a rename), the
		// server re-indexed it, and the diagnostics were republished — the last
		// arrives separately from the second, since validation may be off or
		// deferred to save.
		const subscriptions = [
			workspace.onDidChangeTextDocument(event => {
				if (event.document.uri.toString() === document.uri.toString()) {
					void push();
				}
			}),
			languages.onDidChangeDiagnostics(event => {
				if (event.uris.some(uri => uri.toString() === document.uri.toString())) {
					void push();
				}
			}),
			panel.webview.onDidReceiveMessage((message: GridGesture) =>
				this.apply(document, message).then(push, () => undefined))
		];
		panel.onDidDispose(() => subscriptions.forEach(one => one.dispose()));

		await push();
	}

	/** Applies one gesture through `gridEdit`, then lines the pipes back up. */
	private async apply(document: TextDocument, gesture: GridGesture): Promise<void> {
		if (gesture.kind === 'openAsText') {
			await commands.executeCommand('vscode.openWith', document.uri, 'default');
			return;
		}
		const tables = await this.source.decisionTables(document.uri.toString());
		const outcome = gridEdit(document.uri, tables, gesture);
		if (!outcome) {
			return;
		}
		if ('reason' in outcome) {
			void window.showWarningMessage(outcome.reason);
			return;
		}
		if (await workspace.applyEdit(outcome)) {
			await realign(document);
		}
	}
}

/**
 * A new case row: one cell per column, and the case number continued where the
 * table is numbering its cases.
 *
 * Continued rather than always inserted, because the first column is only a
 * case number by convention — §12 gives it no meaning — so a table whose first
 * column holds something else must not have a number written into it.
 */
export function emptyRow(table: DecisionTable): string {
	const numbers = table.rows.map(row => Number(row.cells[0]?.text));
	const numbered = table.rows.length > 0 && numbers.every(n => Number.isInteger(n) && n > 0);
	const cells = table.columns.map((_, i) =>
		i === 0 && numbered ? ` ${Math.max(...numbers) + 1} ` : '  ');
	return `|${cells.join('|')}|`;
}

/**
 * Lines the table's pipes back up after an edit, through the formatter.
 *
 * The grid changes cell widths on every edit, and a grid editor that leaves the
 * text it wrote out of alignment defeats its own purpose. It is safe to do
 * unasked because of what the formatter is: whitespace only, idempotent, and
 * silent when it is switched off or the file does not parse — in which cases
 * this does nothing and the text simply stays as written.
 */
async function realign(document: TextDocument): Promise<void> {
	const edits = await commands.executeCommand<{ range: Range; newText: string }[] | undefined>(
		'vscode.executeFormatDocumentProvider', document.uri);
	if (!edits || edits.length === 0) {
		return;
	}
	const edit = new WorkspaceEdit();
	for (const one of edits) {
		edit.replace(document.uri, one.range, one.newText);
	}
	await workspace.applyEdit(edit);
}

/**
 * The server's diagnostics, placed on the cells they fall in.
 *
 * Keyed by `table:row:cell` so the webview needs no ranges of its own. A
 * diagnostic that covers no cell — one about the table as a whole, RS901 —
 * lands on the table under the key `table`, which is where a reader looks for
 * "something is wrong with this table" rather than with one value.
 */
function problems(uri: Uri, tables: DecisionTable[]): Record<string, string> {
	const found: Record<string, string> = {};
	const note = (key: string, diagnostic: Diagnostic): void => {
		const text = `${diagnostic.code ?? ''} ${diagnostic.message}`.trim();
		found[key] = found[key] ? `${found[key]}\n${text}` : text;
	};
	for (const diagnostic of languages.getDiagnostics(uri)) {
		if (diagnostic.severity !== DiagnosticSeverity.Error
			&& diagnostic.severity !== DiagnosticSeverity.Warning) {
			continue;
		}
		tables.forEach((table, t) => {
			if (!overlaps(diagnostic.range, toRange(table.range))) {
				return;
			}
			let placed = false;
			table.rows.forEach((row, r) => {
				row.cells.forEach((cell, c) => {
					if (overlaps(diagnostic.range, toRange(cell.range))) {
						note(`${t}:${r}:${c}`, diagnostic);
						placed = true;
					}
				});
			});
			if (!placed) {
				note(`${t}`, diagnostic);
			}
		});
	}
	return found;
}

function overlaps(a: Range, b: Range): boolean {
	// An empty cell is an empty range, and `intersection` answers nothing for
	// one; a diagnostic that starts exactly there is still about it.
	return a.intersection(b) !== undefined || b.contains(a.start) || a.contains(b.start);
}

const toRange = (r: { start: { line: number; character: number }; end: { line: number; character: number } }): Range =>
	new Range(new Position(r.start.line, r.start.character), new Position(r.end.line, r.end.character));

function nonce(): string {
	let text = '';
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	}
	return text;
}

/** Opens the active RegelSpraak document in this editor. */
export async function openDecisionTables(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
		void window.showInformationMessage(
			'Open eerst een RegelSpraak-bestand; het beslistabelrooster toont de tabellen van één bestand.');
		return;
	}
	await commands.executeCommand('vscode.openWith',
		editor.document.uri, DECISION_TABLE_VIEW, editor.viewColumn ?? ViewColumn.Active);
}

/**
 * The whole view, inline.
 *
 * A webview loads nothing from anywhere: the CSP admits this document's own
 * styles and one nonce'd script, and nothing else. It is also theme-aware by
 * construction, since every colour is one of the workbench's own variables
 * rather than a value chosen here (FR-W3.1's rule, which this view follows for
 * the same reason).
 */
function page(cspSource: string, scriptNonce: string): string {
	return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${scriptNonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
	body {
		font-family: var(--vscode-font-family);
		color: var(--vscode-foreground);
		background: var(--vscode-editor-background);
		padding: 1rem 1.25rem 3rem;
	}
	h1 { font-size: 1.1rem; margin: 0 0 .25rem; }
	h2 { font-size: 1rem; margin: 2rem 0 .25rem; }
	.hint { color: var(--vscode-descriptionForeground); font-size: .85rem; margin: 0 0 1rem; }
	.validity { color: var(--vscode-descriptionForeground); font-size: .85rem; margin: 0 0 .5rem; }
	table { border-collapse: collapse; width: 100%; }
	th, td {
		border: 1px solid var(--vscode-panel-border);
		padding: .3rem .4rem;
		text-align: left;
		vertical-align: top;
	}
	th { font-weight: 600; font-size: .85rem; }
	th .role {
		display: block;
		font-weight: 400;
		font-size: .75rem;
		color: var(--vscode-descriptionForeground);
	}
	th.conclusie { border-top: 2px solid var(--vscode-textLink-foreground); }
	input {
		width: 100%;
		box-sizing: border-box;
		font-family: var(--vscode-editor-font-family);
		font-size: var(--vscode-editor-font-size);
		color: var(--vscode-input-foreground);
		background: var(--vscode-input-background);
		border: 1px solid transparent;
		padding: .15rem .25rem;
	}
	input:focus { outline: 1px solid var(--vscode-focusBorder); }
	td.fout input { border-color: var(--vscode-editorError-foreground); }
	.tafelfout {
		color: var(--vscode-editorError-foreground);
		font-size: .85rem;
		margin: .25rem 0 .5rem;
		white-space: pre-line;
	}
	button {
		font-family: var(--vscode-font-family);
		color: var(--vscode-button-foreground);
		background: var(--vscode-button-background);
		border: none;
		padding: .3rem .7rem;
		margin: .5rem .4rem 0 0;
		cursor: pointer;
	}
	button.secundair {
		color: var(--vscode-button-secondaryForeground);
		background: var(--vscode-button-secondaryBackground);
	}
	.leeg { color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
<h1>Beslistabellen</h1>
<p class="hint">Dit rooster toont alleen de beslistabellen van dit bestand; al het andere staat in de
tekst. Kolomtitels zijn hier niet te bewerken — een titel is een RegelSpraak-zin, en die bepaalt of de
kolom concludeert of voorwaarde is.</p>
<button class="secundair" id="alsTekst">Als tekst openen</button>
<div id="inhoud"></div>
<script nonce="${scriptNonce}">
const vscode = acquireVsCodeApi();
const inhoud = document.getElementById('inhoud');
document.getElementById('alsTekst').addEventListener('click',
	() => vscode.postMessage({ kind: 'openAsText' }));

let vorm = '';

window.addEventListener('message', event => {
	const bericht = event.data;
	if (bericht.type !== 'tables') { return; }
	teken(bericht.tables, bericht.problems || {});
});

/**
 * De vorm van de tabellen, zodat een herteken alleen gebeurt als er iets is
 * bijgekomen of weggevallen — anders verliest het veld waarin getypt wordt de
 * aandacht bij elke toetsaanslag in de tekst ernaast.
 */
function vormVan(tables) {
	return JSON.stringify(tables.map(t => [t.name, t.validity, t.columns.map(c => c.header + '|' + c.role), t.rows.length]));
}

function teken(tables, problems) {
	const nieuweVorm = vormVan(tables);
	if (nieuweVorm !== vorm) {
		vorm = nieuweVorm;
		bouw(tables);
	}
	werkBij(tables, problems);
}

function bouw(tables) {
	inhoud.textContent = '';
	if (tables.length === 0) {
		const p = document.createElement('p');
		p.className = 'leeg';
		p.textContent = 'Dit bestand bevat geen beslistabel.';
		inhoud.appendChild(p);
		return;
	}
	tables.forEach((table, t) => {
		const kop = document.createElement('h2');
		kop.textContent = table.name;
		inhoud.appendChild(kop);

		if (table.validity) {
			const geldig = document.createElement('p');
			geldig.className = 'validity';
			geldig.textContent = table.validity;
			inhoud.appendChild(geldig);
		}

		const fout = document.createElement('p');
		fout.className = 'tafelfout';
		fout.id = 'tafelfout-' + t;
		inhoud.appendChild(fout);

		const rooster = document.createElement('table');
		const titelrij = document.createElement('tr');
		table.columns.forEach(column => {
			const th = document.createElement('th');
			if (column.role === 'conclusie') { th.className = 'conclusie'; }
			th.appendChild(document.createTextNode(column.header || '\\u00a0'));
			const rol = document.createElement('span');
			rol.className = 'role';
			rol.textContent = column.header ? column.role : '';
			th.appendChild(rol);
			titelrij.appendChild(th);
		});
		titelrij.appendChild(document.createElement('th'));
		rooster.appendChild(titelrij);

		table.rows.forEach((row, r) => {
			const tr = document.createElement('tr');
			table.columns.forEach((_, c) => {
				const td = document.createElement('td');
				td.id = 'cel-' + t + '-' + r + '-' + c;
				const veld = document.createElement('input');
				veld.type = 'text';
				veld.dataset.tabel = String(t);
				veld.dataset.rij = String(r);
				veld.dataset.cel = String(c);
				veld.addEventListener('change', () => {
					vscode.postMessage({
						kind: 'cell', table: t, row: r, cell: c,
						text: veld.value, was: veld.dataset.was || ''
					});
				});
				td.appendChild(veld);
				tr.appendChild(td);
			});
			const acties = document.createElement('td');
			const wis = document.createElement('button');
			wis.className = 'secundair';
			wis.textContent = 'Wissen';
			wis.title = 'Deze rij verwijderen';
			wis.addEventListener('click', () =>
				vscode.postMessage({ kind: 'deleteRow', table: t, row: r }));
			acties.appendChild(wis);
			tr.appendChild(acties);
			rooster.appendChild(tr);
		});
		inhoud.appendChild(rooster);

		const voeg = document.createElement('button');
		voeg.textContent = 'Rij toevoegen';
		voeg.addEventListener('click', () =>
			vscode.postMessage({ kind: 'addRow', table: t, row: table.rows.length }));
		inhoud.appendChild(voeg);
	});
}

function werkBij(tables, problems) {
	tables.forEach((table, t) => {
		const tafelfout = document.getElementById('tafelfout-' + t);
		if (tafelfout) { tafelfout.textContent = problems[String(t)] || ''; }
		table.rows.forEach((row, r) => {
			table.columns.forEach((_, c) => {
				const td = document.getElementById('cel-' + t + '-' + r + '-' + c);
				if (!td) { return; }
				const veld = td.querySelector('input');
				const tekst = (row.cells[c] || {}).text || '';
				veld.dataset.was = tekst;
				// Niet terwijl er in dit veld getypt wordt: dan zou wat de
				// server nog weet over het typen heen schrijven.
				if (document.activeElement !== veld) { veld.value = tekst; }
				const melding = problems[t + ':' + r + ':' + c];
				td.className = melding ? 'fout' : '';
				veld.title = melding || '';
			});
		});
	});
}
</script>
</body>
</html>`;
}
