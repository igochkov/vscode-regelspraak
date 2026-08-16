// W4 — the beslistabellen of a document as a preview (FSD §W4, FR-W4.1).
//
// **A view of the text, never a second place to write it** (BRD OBJ-8). This
// replaced a custom editor that edited cells as a grid, and the reason is the
// product's rather than the code's: RegelSpraak is authored as text here, and a
// visual editing surface teaches the opposite whether or not anyone reaches for
// it. What the grid was actually good at — showing a table as a table — survives
// as a projection, and everything that wrote is gone.
//
// So the preview is read-only in the strong sense: it holds no `WorkspaceEdit`,
// registers no editor for `.rgs`, and the only gesture it has is to put the
// cursor somewhere. That is also why it is reached from a CodeLens rather than
// from **Reopen Editor With…** — the way in sits *in the text*, above the one
// table it is about, and leads back to the text.
//
// **It shows three things the source cannot**, which is what makes it worth
// opening at all rather than reading the pipes that are already right there:
//
//   - which column concludes and which conditions, a fact §12 leaves to content
//     and the text never states;
//   - the errors the server published, on the cell each one is about;
//   - what the case under the cursor concludes, as one sentence — §12 splits a
//     result part across the title cell and a data cell, and the text shows the
//     halves in different places on the screen and never the whole.
//
// **Nothing here parses RegelSpraak.** The grid, the cell ranges, the column
// roles and whether a column's sentence takes the case's value all come from
// `regelspraak/decisionTables`; the per-cell errors are the diagnostics the
// server already published, matched to cells by range. A second reading of a
// table that disagreed with the first would be worse than no preview at all.

import { randomBytes } from 'node:crypto';
import * as path from 'path';

import {
	Diagnostic, DiagnosticSeverity, Disposable, Position, Range, Selection, TextEditorRevealType,
	Uri, ViewColumn, WebviewPanel, languages, window, workspace
} from 'vscode';

import { DecisionTable, ModelSource, WireRange } from './model';

/**
 * Opens the preview. Invoked by the CodeLens the server draws above every
 * `Beslistabel`, and from the palette for the active file.
 */
export const PREVIEW_DECISION_TABLES_COMMAND = 'regelspraak.previewBeslistabel';

/** What the preview can ask for, which is only ever to be shown a place. */
export type PreviewGesture =
	| { kind: 'reveal'; table: number; row: number; cell: number }
	| { kind: 'revealTable'; table: number };

/** Where in a document's tables a line falls; `row` is -1 for no case row. */
export interface Spot {
	table: number;
	row: number;
}

/**
 * The document range a gesture points at, or nothing.
 *
 * Pure, exported and separate from the panel for the reason the editor's writing
 * half was: a webview cannot be driven from a test, so the half worth testing is
 * kept where a test can reach it. `row < 0` is the title row, whose cells are the
 * columns.
 */
export function rangeOfGesture(
	tables: readonly DecisionTable[],
	gesture: PreviewGesture
): WireRange | undefined {
	const table = tables[gesture.table];
	if (!table) {
		return undefined;
	}
	if (gesture.kind === 'revealTable') {
		return table.nameRange;
	}
	return gesture.row < 0
		? table.columns[gesture.cell]?.range
		: table.rows[gesture.row]?.cells[gesture.cell]?.range;
}

/**
 * Which table and case a document line is in — the other half of the jump.
 *
 * By line rather than by full position because a row *is* a line (`beslistabelRij`
 * ends at the NL, [D-2]), so the column adds nothing: a cursor anywhere on a case
 * is on that case. `row` is -1 for a line inside the declaration that is not a
 * case — its name, its `geldig` line, its title row — because the table is still
 * worth highlighting there even though no case is.
 */
export function caseAt(tables: readonly DecisionTable[], line: number): Spot | undefined {
	for (let table = 0; table < tables.length; table++) {
		const { range, rows } = tables[table];
		if (line < range.start.line || line > range.end.line) {
			continue;
		}
		return {
			table,
			row: rows.findIndex(row => row.range.start.line <= line && line <= row.range.end.line)
		};
	}
	return undefined;
}

/**
 * The open previews, one per document.
 *
 * Per document rather than one panel retargeted at whatever is in front: two
 * `.rgs` files open side by side are two models, and a preview that followed the
 * focus would keep answering about the file the reader just looked away from.
 * VS Code's own Markdown preview is per document for the same reason.
 */
export class DecisionTablePreviews implements Disposable {
	private readonly open = new Map<string, Preview>();

	constructor(private readonly source: ModelSource) {}

	/**
	 * Shows the preview of `uri`, scrolled to the table `at` falls in.
	 *
	 * An existing panel is revealed rather than replaced, so pressing the lens of
	 * a second table in the same file scrolls the preview already open instead of
	 * stacking another one beside it.
	 */
	async show(uri: Uri, at?: Position): Promise<void> {
		const key = uri.toString();
		let preview = this.open.get(key);
		if (!preview) {
			const panel = window.createWebviewPanel(
				'regelspraak.beslistabelvoorbeeld',
				`Beslistabellen: ${path.basename(uri.fsPath)}`,
				// Beside, and without taking the focus: the reader pressed a lens in
				// the text and the text is where they are still working.
				{ viewColumn: ViewColumn.Beside, preserveFocus: true },
				// Kept alive while hidden so flipping to another tab and back does not
				// lose the scroll position of a long table.
				{ enableScripts: true, retainContextWhenHidden: true });
			preview = new Preview(uri, panel, this.source, () => this.open.delete(key));
			this.open.set(key, preview);
		}
		await preview.reveal(at);
	}

	dispose(): void {
		for (const preview of [...this.open.values()]) {
			preview.dispose();
		}
		this.open.clear();
	}
}

class Preview {
	private readonly subscriptions: Disposable[] = [];
	private disposed = false;

	/**
	 * The tables as last drawn, which is what a gesture's indices count against.
	 *
	 * Deliberately not re-fetched before a jump. The editor this replaced did
	 * re-fetch, because it *wrote* through these ranges and a range that had moved
	 * would put text on top of whatever took its place; navigation cannot damage
	 * anything, and answering the click against the view the reader actually
	 * clicked is more likely to land where they meant than answering it against a
	 * fresher table whose rows their click never saw.
	 */
	private tables: readonly DecisionTable[] = [];

	constructor(
		private readonly uri: Uri,
		private readonly panel: WebviewPanel,
		private readonly source: ModelSource,
		forget: () => void
	) {
		panel.webview.html = page(panel.webview.cspSource, nonce());

		// Debounced for everything the *user* drives: each call is a round trip the
		// server answers by refreshing the document from its buffer, so an
		// undebounced one made every keystroke in the text beside this cost a full
		// reparse plus one fragment parse per candidate column — on the thread that
		// also answers completion and hover. 250 ms is the server's own re-index
		// interval, so this asks no more often than there is a new answer to have.
		const soon = debounce(() => void this.push(), 250);
		const mine = (uri: Uri): boolean => uri.toString() === this.uri.toString();

		this.subscriptions.push(
			workspace.onDidChangeTextDocument(event => {
				if (mine(event.document.uri)) {
					soon();
				}
			}),
			// Separately from the change above: validation may be off, or deferred to
			// save, so the two do not arrive together.
			languages.onDidChangeDiagnostics(event => {
				if (event.uris.some(mine)) {
					soon();
				}
			}),
			// The other direction of the jump. Not debounced: it posts one small
			// message and moving the cursor is exactly when a reader wants to see
			// which case they are in.
			window.onDidChangeTextEditorSelection(event => {
				if (mine(event.textEditor.document.uri)) {
					this.follow(event.selections[0]?.active.line);
				}
			}),
			panel.webview.onDidReceiveMessage((gesture: PreviewGesture) => void this.jump(gesture)),
			{ dispose: (): void => soon.cancel() }
		);
		panel.onDidDispose(() => {
			forget();
			this.dispose();
		});
	}

	async reveal(at?: Position): Promise<void> {
		this.panel.reveal(this.panel.viewColumn, true);
		await this.push(at?.line);
	}

	dispose(): void {
		// Guarded because the two ways in reach each other: closing the tab fires
		// `onDidDispose`, which calls this, and this closes the panel.
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.subscriptions.forEach(one => one.dispose());
		this.subscriptions.length = 0;
		this.panel.dispose();
	}

	private async push(revealLine?: number): Promise<void> {
		this.tables = await this.source.decisionTables(this.uri.toString());
		await this.panel.webview.postMessage({
			type: 'tables',
			tables: this.tables,
			problems: problems(this.uri, this.tables),
			reveal: revealLine === undefined ? undefined : caseAt(this.tables, revealLine)?.table
		});
		// The caption states the conclusion of the case the cursor is in, so a
		// redraw has to put it back: the message above replaced the whole view.
		this.follow(this.editor()?.selection.active.line);
	}

	private follow(line: number | undefined): void {
		void this.panel.webview.postMessage({
			type: 'cursor',
			spot: line === undefined ? undefined : caseAt(this.tables, line)
		});
	}

	/** Puts the cursor on what was clicked, and gives it the focus. */
	private async jump(gesture: PreviewGesture): Promise<void> {
		const range = rangeOfGesture(this.tables, gesture);
		if (!range) {
			return;
		}
		const document = await workspace.openTextDocument(this.uri);
		// Into the column the file is already open in where it is open, so the jump
		// does not move the text out from under a reader who has it arranged. The
		// fallback is the first column and not the active one: the click came from
		// this panel, so the active column is the panel's, and opening the text
		// there would close the preview the reader clicked in.
		const editor = await window.showTextDocument(
			document, this.editor()?.viewColumn ?? ViewColumn.One);
		const target = new Range(toPosition(range.start), toPosition(range.end));
		editor.selection = new Selection(target.start, target.end);
		editor.revealRange(target, TextEditorRevealType.InCenterIfOutsideViewport);
	}

	private editor(): { viewColumn?: ViewColumn; selection: Selection } | undefined {
		return window.visibleTextEditors.find(
			one => one.document.uri.toString() === this.uri.toString());
	}
}

/** Shows the preview of the active RegelSpraak file, for the palette. */
export async function previewActiveDocument(previews: DecisionTablePreviews): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
		void window.showInformationMessage(
			'Open eerst een RegelSpraak-bestand; het voorbeeld toont de beslistabellen van één bestand.');
		return;
	}
	await previews.show(editor.document.uri, editor.selection.active);
}

/**
 * Calls `run` once the caller has stopped asking for `delay` ms.
 *
 * Small enough to keep here: the server has a `Debouncer` of its own and this
 * side needs one in one place, so a shared utility module would be one file
 * holding one function.
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
 * The server's diagnostics, placed on the cells they fall in.
 *
 * Keyed by `table:row:cell` so the webview needs no ranges of its own. A
 * diagnostic that covers no cell — one about the table as a whole, RS901 —
 * lands on the table under the key `table`, which is where a reader looks for
 * "something is wrong with this table" rather than with one value.
 */
function problems(uri: Uri, tables: readonly DecisionTable[]): Record<string, string> {
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
				// Only as far as the view actually draws. A row may hold **more** cells
				// than the title row has columns — that is RS903's case, and the view
				// lays out `table.columns` — so a diagnostic filed against cell 3 of a
				// three-column table went to a key nothing reads, and marked itself
				// placed on the way, which took the table-level fallback away too. It
				// vanished from the one view that could not draw the problem it was about.
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

const toRange = (r: WireRange): Range => new Range(toPosition(r.start), toPosition(r.end));

/**
 * The CSP nonce for this panel's one inline script.
 *
 * From `node:crypto` rather than `Math.random`. Nothing on this page is
 * attacker-supplied — every value reaches the DOM through `textContent`, never
 * as markup — so there is no path to defend today; but a nonce is a security
 * mechanism, and one spelled with a predictable RNG reads as sound until
 * somebody adds the `innerHTML` that makes it matter.
 */
function nonce(): string {
	return randomBytes(16).toString('hex');
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
	td {
		font-family: var(--vscode-editor-font-family);
		font-size: var(--vscode-editor-font-size);
		cursor: pointer;
	}
	td:hover { background: var(--vscode-list-hoverBackground); }
	tr.here td { background: var(--vscode-editor-selectionHighlightBackground); }
	td.problem { border-color: var(--vscode-editorError-foreground); }
	h2 { cursor: pointer; }
	h2:hover { color: var(--vscode-textLink-activeForeground); }
	.table-problem {
		color: var(--vscode-editorError-foreground);
		font-size: .85rem;
		margin: .25rem 0 .5rem;
		white-space: pre-line;
	}
	.sentence {
		min-height: 1.4em;
		margin: .5rem 0 0;
		font-size: .9rem;
		color: var(--vscode-descriptionForeground);
		white-space: pre-line;
	}
	.empty { color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
<h1>Beslistabellen</h1>
<p class="hint">Een leesweergave van de beslistabellen in dit bestand; al het andere staat in de tekst.
Klik op een cel om er in de tekst heen te gaan — bewerken doet u daar. Onder elke tabel staat wat het
geval waar de cursor in staat concludeert.</p>
<div id="content"></div>
<script nonce="${scriptNonce}">
const vscode = acquireVsCodeApi();
const content = document.getElementById('content');

/** The tables as last drawn, so the cursor message can caption a case. */
let drawn = [];
let shape = '';

window.addEventListener('message', event => {
	const message = event.data;
	if (message.type === 'tables') {
		draw(message.tables, message.problems || {});
		if (message.reveal !== undefined && message.reveal !== null) {
			const heading = document.getElementById('table-' + message.reveal);
			if (heading) { heading.scrollIntoView({ block: 'start' }); }
		}
	} else if (message.type === 'cursor') {
		highlight(message.spot);
	}
});

/**
 * The shape of the tables, so a redraw only happens when something was added or
 * removed. Rebuilding on every keystroke would throw away the scroll position of
 * whoever is reading a long table in the file being typed in.
 */
function shapeOf(tables) {
	return JSON.stringify(tables.map(t =>
		[t.name, t.validity, t.columns.map(c => c.header + '|' + c.role + '|' + !!c.composed), t.rows.length]));
}

function draw(tables, problems) {
	drawn = tables;
	const next = shapeOf(tables);
	if (next !== shape) {
		shape = next;
		build(tables);
	}
	update(tables, problems);
}

function build(tables) {
	content.textContent = '';
	if (tables.length === 0) {
		const p = document.createElement('p');
		p.className = 'empty';
		p.textContent = 'Dit bestand bevat geen beslistabel.';
		content.appendChild(p);
		return;
	}
	tables.forEach((table, t) => {
		const heading = document.createElement('h2');
		heading.id = 'table-' + t;
		heading.textContent = table.name;
		heading.title = 'Naar deze tabel in de tekst';
		heading.addEventListener('click', () =>
			vscode.postMessage({ kind: 'revealTable', table: t }));
		content.appendChild(heading);

		if (table.validity) {
			const validity = document.createElement('p');
			validity.className = 'validity';
			validity.textContent = table.validity;
			content.appendChild(validity);
		}

		const failure = document.createElement('p');
		failure.className = 'table-problem';
		failure.id = 'table-problem-' + t;
		content.appendChild(failure);

		const grid = document.createElement('table');
		const titles = document.createElement('tr');
		table.columns.forEach((column, c) => {
			const th = document.createElement('th');
			if (column.role === 'conclusie') { th.className = 'conclusie'; }
			th.appendChild(document.createTextNode(column.header || '\\u00a0'));
			const role = document.createElement('span');
			role.className = 'role';
			role.textContent = column.header ? column.role : '';
			th.appendChild(role);
			th.title = 'Naar deze kolomtitel in de tekst';
			th.addEventListener('click', () =>
				vscode.postMessage({ kind: 'reveal', table: t, row: -1, cell: c }));
			titles.appendChild(th);
		});
		grid.appendChild(titles);

		table.rows.forEach((row, r) => {
			const tr = document.createElement('tr');
			tr.id = 'row-' + t + '-' + r;
			table.columns.forEach((_, c) => {
				const td = document.createElement('td');
				td.id = 'cell-' + t + '-' + r + '-' + c;
				td.addEventListener('click', () =>
					vscode.postMessage({ kind: 'reveal', table: t, row: r, cell: c }));
				tr.appendChild(td);
			});
			grid.appendChild(tr);
		});
		content.appendChild(grid);

		const sentence = document.createElement('p');
		sentence.className = 'sentence';
		sentence.id = 'sentence-' + t;
		content.appendChild(sentence);
	});
}

function update(tables, problems) {
	tables.forEach((table, t) => {
		const failure = document.getElementById('table-problem-' + t);
		if (failure) { failure.textContent = problems[String(t)] || ''; }
		table.rows.forEach((row, r) => {
			table.columns.forEach((_, c) => {
				const td = document.getElementById('cell-' + t + '-' + r + '-' + c);
				if (!td) { return; }
				td.textContent = (row.cells[c] || {}).text || '';
				const problem = problems[t + ':' + r + ':' + c];
				td.className = problem ? 'problem' : '';
				td.title = problem || 'Naar deze cel in de tekst';
			});
		});
	});
}

/**
 * What the case concludes, in one sentence per conclusion column.
 *
 * §12 splits a result part across the title cell and a data cell, so the whole
 * sentence exists nowhere in the text — which is the reason this view draws it.
 * Whether the value finishes the sentence or says whether it holds is the
 * server's answer (\`composed\`) and never a guess made here: appending
 * \`onwaar\` to \`een Lid is jeugdlid\` would state the opposite of the case.
 */
function conclusionsOf(table, r) {
	const row = table.rows[r];
	if (!row) { return ''; }
	const lines = [];
	table.columns.forEach((column, c) => {
		if (column.role !== 'conclusie' || !column.header) { return; }
		const value = ((row.cells[c] || {}).text || '').trim();
		if (column.composed) {
			lines.push(value ? column.header + ' ' + value : column.header);
		} else {
			lines.push(value ? column.header + ' (' + value + ')' : column.header);
		}
	});
	return lines.join('\\n');
}

function highlight(spot) {
	for (const row of document.querySelectorAll('tr.here')) {
		row.className = '';
	}
	drawn.forEach((table, t) => {
		const sentence = document.getElementById('sentence-' + t);
		if (!sentence) { return; }
		if (!spot || spot.table !== t || spot.row < 0) {
			sentence.textContent = '';
			return;
		}
		const row = document.getElementById('row-' + t + '-' + spot.row);
		if (row) { row.className = 'here'; }
		sentence.textContent = conclusionsOf(table, spot.row);
	});
}
</script>
</body>
</html>`;
}
