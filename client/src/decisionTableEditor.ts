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
//
// **One gesture is two undo steps, and that is known rather than overlooked.**
// The realignment can only be computed once the gesture is in the document — the
// formatter reads the text, not a plan for it — and `workspace.applyEdit` opens
// its own undo element every time it is called, with no API to join two. So
// <kbd>Ctrl</kbd>+<kbd>Z</kbd> after changing a cell takes back the realignment
// first and the value second. The alternatives are worse: computing the padding
// here would be a second implementation of the layout engine's column widths
// (the very thing `format/layout.ts` exists to be the only one of), and skipping
// the realignment leaves a grid editor writing text it has knocked out of
// alignment.

import { randomBytes } from 'node:crypto';

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
 * Characters a cell value may not contain, because they are not values.
 *
 * A `|` is the column separator — typed into a cell it does not set that cell to
 * something containing a pipe, it gives the row an extra column — and a line
 * break ends the row (`beslistabelRij` ends at the NL, [D-2]). Both are *structural*
 * edits, and the whole premise of this editor is that it edits cases and never
 * structure: that is why a column title is read-only, and the same argument
 * covers the value boxes it took a review to notice. The server does catch the
 * result (RS903, "deze rij heeft 4 kolommen en de titelrij 3") — but by then the
 * row is written, and the grid cannot draw what the user just made, because it
 * lays out `table.columns` and the extra cell falls outside them.
 */
const NOT_A_VALUE = /[|\r\n]/u;

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
 *
 * `undefined` is for a gesture about a table this document does not have, which
 * is the webview being a moment behind and nothing worth saying. Everything else
 * a user could have caused comes back as a `Refusal` carrying its reason: a row
 * or cell the server no longer reports is the grid and the model disagreeing
 * about the shape of the table, which is exactly the state a silent no-op leaves
 * someone guessing about.
 */
export function gridEdit(
	document: TextDocument,
	tables: readonly DecisionTable[],
	gesture: CellEdit | RowEdit
): WorkspaceEdit | Refusal | undefined {
	const uri = document.uri;
	const table = tables[gesture.table];
	if (!table) {
		return undefined;
	}
	const edit = new WorkspaceEdit();
	if (gesture.kind === 'cell') {
		const cell = table.rows[gesture.row]?.cells[gesture.cell];
		if (!cell) {
			return { reason: 'Deze cel bestaat niet meer in de tabel; het rooster wordt opnieuw geladen.' };
		}
		if (cell.text !== gesture.was) {
			return { reason: 'Deze cel is intussen elders gewijzigd; de bewerking is niet doorgevoerd.' };
		}
		if (NOT_A_VALUE.test(gesture.text)) {
			return {
				reason: 'Een cel kan geen | of regeleinde bevatten: dat verandert de indeling van de tabel in plaats van deze waarde. Bewerk de tabel als tekst om een kolom toe te voegen.'
			};
		}
		edit.replace(uri, toRange(cell.range), gesture.text);
		return edit;
	}
	if (gesture.kind === 'deleteRow') {
		const row = table.rows[gesture.row];
		if (!row) {
			return { reason: 'Deze rij bestaat niet meer in de tabel; het rooster wordt opnieuw geladen.' };
		}
		// The whole line, newline included: a row is one line by construction
		// (`beslistabelRij` ends at the NL), and leaving the newline behind would
		// leave an empty line where the case was.
		//
		// Unless there is no newline to take, which is the case where this row is
		// the last line of a file that does not end in one. `Position(line + 1, 0)`
		// is then past the end of the document, and VS Code validates a position on
		// apply and **clamps** it rather than failing — so the delete would stop at
		// the end of the row and leave exactly the empty line above says it does
		// not leave. The line break *before* the row does the same job and always
		// exists: a table's rows are never the first line of a file.
		const line = row.range.start.line;
		const lastLine = line >= document.lineCount - 1;
		edit.delete(uri, lastLine
			? new Range(document.lineAt(line - 1).range.end, document.lineAt(line).range.end)
			: new Range(new Position(line, 0), new Position(line + 1, 0)));
		return edit;
	}
	const after = table.rows[table.rows.length - 1]?.range ?? table.headerRange;
	if (!after || table.columns.length === 0) {
		return { reason: 'Deze tabel heeft nog geen titelrij; voeg die als tekst toe.' };
	}
	// At the **end** of the row above rather than at the start of the line below
	// it. `Position(after.end.line + 1, 0)` does not exist where that row is the
	// last line of a file with no final newline — `files.insertFinalNewline`
	// defaults to off and the formatter honours it, so such a file is ordinary —
	// and VS Code clamps the position instead of failing, which appended the new
	// row to the end of the previous one. This end always exists.
	edit.insert(uri, toPosition(after.end), `\n${emptyRow(table)}`);
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

		// Debounced for everything the *user* drives. Each call is a round trip
		// that the server answers by refreshing the document from its buffer, so an
		// undebounced one made every keystroke in a text editor open beside this
		// grid cost a full reparse, a rebuilt declaration AST and one fragment parse
		// per candidate conclusion and condition column — on the thread that also
		// answers completion and hover. 250 ms is the server's own re-index
		// interval, so this asks no more often than there is a new answer to have.
		const soon = debounce(push, 250);

		// Three reasons the grid goes stale, and it must follow all three: the
		// document changed (from here, from a text editor, or from a rename), the
		// server re-indexed it, and the diagnostics were republished — the last
		// arrives separately from the second, since validation may be off or
		// deferred to save.
		const subscriptions = [
			workspace.onDidChangeTextDocument(event => {
				if (event.document.uri.toString() === document.uri.toString()) {
					soon();
				}
			}),
			languages.onDidChangeDiagnostics(event => {
				if (event.uris.some(uri => uri.toString() === document.uri.toString())) {
					soon();
				}
			}),
			// Not debounced: this redraw is the answer to something the user just did
			// in this grid, and it is what puts the cell back in step with the text.
			panel.webview.onDidReceiveMessage((message: GridGesture) =>
				this.apply(document, message).then(push, () => undefined)),
			{ dispose: (): void => soon.cancel() }
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
		const outcome = gridEdit(document, tables, gesture);
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
 * Calls `run` once the caller has stopped asking for `delay` ms.
 *
 * Small enough to keep here: the server has a `Debouncer` of its own and this
 * side has needed none until now, so a shared utility module would be one file
 * holding one function used in one place.
 */
function debounce(run: () => void, delay: number): { (): void; cancel(): void } {
	let timer: NodeJS.Timeout | undefined;
	const call = (): void => {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = undefined;
			run();
		}, delay);
	};
	call.cancel = (): void => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
	};
	return call;
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
				// Only as far as the grid actually draws. A row may hold **more** cells
				// than the title row has columns — that is RS903's case, and the grid
				// lays out `table.columns` — so a diagnostic filed against cell 3 of a
				// three-column table went to a key the view never reads, and marked
				// itself placed on the way, which took the table-level fallback away
				// too. It vanished from the one view that could not draw the problem it
				// was about.
				row.cells.slice(0, table.columns.length).forEach((cell, c) => {
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

const toPosition = (p: { line: number; character: number }): Position =>
	new Position(p.line, p.character);

const toRange = (r: { start: { line: number; character: number }; end: { line: number; character: number } }): Range =>
	new Range(toPosition(r.start), toPosition(r.end));

/**
 * The CSP nonce for this panel's one inline script.
 *
 * From `node:crypto` rather than `Math.random`. Nothing on this page is
 * attacker-supplied — every value reaches the DOM through `textContent` or
 * `value`, never as markup — so there is no path to defend today; but a nonce
 * is a security mechanism, and one spelled with a predictable RNG reads as
 * sound until somebody adds the `innerHTML` that makes it matter.
 */
function nonce(): string {
	return randomBytes(16).toString('hex');
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
