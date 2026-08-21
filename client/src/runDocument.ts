// X4 — what a run computed, as text.
//
// One of two renderers over `runView.ts`; the other is W3's panel, which is what
// the run commands open. This one stays, and is not a leftover:
//
//   - **A trace is something people paste.** Into a ticket, a commit message, a
//     message to whoever wrote the rule. A panel cannot be copied out of, and
//     that is the one thing a reader of a surprising number wants to do with it.
//   - **A webview cannot be driven from a test.** The panel's content is checked
//     through `buildView`, which is pure; that the *content decisions* come out
//     as expected end to end, against a real server and a real run, is checked
//     here. Keeping it is what keeps that check possible.
//
// Read-only, like every view this extension adds: the run is a fact about a
// testset, and the testset is the text (BRD OBJ-8). Re-running is how it changes.

import {
	Disposable, Event, EventEmitter, Position, TextDocumentContentProvider,
	Uri, ViewColumn, window, workspace
} from 'vscode';

import { RunRow, RunSection, RunView, buildView } from './runView';
import { TestRun } from './testExplorer';

export const RUN_SCHEME = 'regelspraak-uitkomst';

/**
 * Opens the outcome of a finished run as text.
 *
 * Registered and contributed to nothing: it takes a document, a case and a
 * focus, and a palette entry invokes a command with none of them. The way in is
 * the panel's own **Als tekst openen** button, which has all three.
 */
export const SHOW_RUN_AS_TEXT_COMMAND = 'regelspraak.showUitkomstAlsTekst';

/**
 * The testgeval a view is of, carried in the virtual URI.
 *
 * The name is in the path because that is what the editor puts on the tab, and
 * the document it came from is in the query — W5's split, for W5's reason: a
 * percent-encoded absolute path is unreadable on a tab.
 */
function runUri(source: Uri, view: RunView): Uri {
	return Uri.from({
		scheme: RUN_SCHEME,
		path: `${view.name} (uitkomst)`,
		query: `${source.toString()}#${encodeURIComponent(view.name)}`
	});
}

/** Two columns, padded so a reader's eye can run down either one. */
function table(rows: [string, string][], indent = '\t'): string[] {
	const width = rows.reduce((wide, [left]) => Math.max(wide, left.length), 0);
	return rows.map(([left, right]) =>
		right ? `${indent}${left.padEnd(width)}  ${right}` : `${indent}${left}`);
}

export class RunDocuments implements TextDocumentContentProvider, Disposable {
	private readonly changed = new EventEmitter<Uri>();
	readonly onDidChange: Event<Uri> = this.changed.event;
	/** The last run per view, so re-opening does not re-run and scroll away. */
	private readonly rendered = new Map<string, string>();
	private readonly registration: Disposable;

	constructor() {
		this.registration = workspace.registerTextDocumentContentProvider(RUN_SCHEME, this);
	}

	provideTextDocumentContent(uri: Uri): string {
		return this.rendered.get(uri.toString())
			?? '// Deze uitkomst is er niet meer. Voer het testgeval opnieuw uit.\n';
	}

	/** Shows what a finished run computed, beside the document it was asked from. */
	async show(source: Uri, run: TestRun, focus?: string): Promise<void> {
		const view = buildView(source.path.split('/').pop() ?? '', run, focus);
		const uri = runUri(source, view);
		this.rendered.set(uri.toString(), renderText(view));
		this.changed.fire(uri);
		const document = await workspace.openTextDocument(uri);
		await window.showTextDocument(document, {
			viewColumn: ViewColumn.Beside,
			preview: true,
			preserveFocus: true
		});
	}

	dispose(): void {
		this.registration.dispose();
		this.changed.dispose();
	}
}

/**
 * The view as plain text.
 *
 * Exported so a test can read what a run shows without a running editor — and
 * so the panel and this cannot be checked against different expectations.
 */
export function renderText(view: RunView): string {
	const lines: string[] = [
		`// ${view.heading}`,
		`// ${view.meta}`,
		'//',
		'// Alleen-lezen, en de stand van één run. Pas de testset aan en voer',
		'// opnieuw uit; deze weergave rekent niets zelf uit.',
		''
	];

	if (view.refusal) {
		lines.push('Geweigerd', `\t${view.refusal.reason}`);
		for (const one of view.refusal.details) {
			lines.push(`\t${one}`);
		}
		return `${lines.join('\n')}\n`;
	}

	for (const section of view.sections) {
		lines.push(section.title, ...sectionLines(section), '');
	}
	return `${lines.join('\n')}\n`;
}

function sectionLines(section: RunSection): string[] {
	if (!section.aligned) {
		return section.rows.flatMap(row => rowLines(row, 1));
	}
	// Padded against the whole section, then each row's children under it — a
	// time-dependent value is one label with a period per line, and it sits in an
	// aligned section beside the values that fit on one.
	const padded = table(section.rows.map((row): [string, string] => [
		`${glyph(row)}${row.label}`, row.note ?? ''
	]));
	return section.rows.flatMap((row, at) => [
		padded[at],
		...(row.children ?? []).flatMap(child => childLines(child, 2))
	]);
}

function rowLines(row: RunRow, depth: number): string[] {
	const indent = '\t'.repeat(depth);
	const value = row.value === undefined ? '' : ` = ${row.value}`;
	// The rule is an arrow rather than a word: it reads as attribution beside a
	// value, where "door" would read as part of the sentence the value is in.
	const note = row.note === undefined ? '' : `   ← ${row.note}`;
	return [
		`${indent}${glyph(row)}${row.label}${value}${note}`,
		...(row.children ?? []).flatMap(child => childLines(child, depth + 1))
	];
}

/**
 * A period reads as two columns and an operand as `name = value`.
 *
 * The difference is the row's kind and not its depth, which is why this is not
 * `rowLines` again: a segment states what held *when*, so the period is a label
 * and the value belongs beside it.
 */
function childLines(row: RunRow, depth: number): string[] {
	const indent = '\t'.repeat(depth);
	return row.kind === 'segment'
		? [`${indent}${row.label}  ${row.value ?? ''}`]
		: rowLines(row, depth);
}

/** The one mark a text view has for a fact a panel states with colour. */
function glyph(row: RunRow): string {
	if (row.kind === 'pass') {
		return '✓ ';
	}
	return row.kind === 'fail' ? '✗ ' : '';
}

/**
 * The testgeval the cursor is in, from the tree the Test Explorer already holds.
 *
 * The ranges come from `regelspraak/tests`, so "which testgeval is this" is
 * answered by the same fact the Testing view draws with — rather than by a
 * second reading of the text on this side, which has no parser for it.
 */
export function caseAtCursor(
	items: { name: string; startLine: number; endLine: number }[],
	at: Position
): string | undefined {
	return items.find(one => at.line >= one.startLine && at.line <= one.endLine)?.name;
}
