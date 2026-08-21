// X4 — what a run computed, as a read-only document.
//
// A virtual document under the `regelspraak-uitkomst:` scheme, following W5's
// pattern rather than W3's webview, and that is a sequencing decision rather
// than a final one. What a trace is, is tabular text: one line per write, the
// rule that made it, the operands it read. The hard part of X4 is deciding
// *what* to show, and a text view answers that in a form a test can read;
// W3's webview would then be a re-skin of a solved problem rather than the
// place the problem gets solved. Click-through and a collapsible chain are what
// the webview would add, and they are worth having — later, on this content.
//
// Read-only, like every other view this extension adds: the run is a fact about
// a testset, and the testset is the text (BRD OBJ-8). Re-running is how it
// changes.

import {
	Disposable, Event, EventEmitter, Position, TextDocumentContentProvider,
	Uri, ViewColumn, window, workspace
} from 'vscode';

import { RunDetail, TestRun } from './testExplorer';

export const RUN_SCHEME = 'regelspraak-uitkomst';

/** The palette command; the lens runs, this shows what the run computed. */
export const SHOW_RUN_COMMAND = 'regelspraak.showUitkomst';

/**
 * The testgeval a view is of, carried in the virtual URI.
 *
 * The case's name is in the path because that is what the editor puts on the
 * tab, and the document it came from is in the query — W5's split, for W5's
 * reason: a percent-encoded absolute path is unreadable on a tab.
 */
function runUri(source: Uri, caseName: string): Uri {
	return Uri.from({
		scheme: RUN_SCHEME,
		path: `${caseName} (uitkomst)`,
		query: `${source.toString()}#${encodeURIComponent(caseName)}`
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

	/** Shows what a finished run computed, beside the testset it came from. */
	async show(source: Uri, run: TestRun): Promise<void> {
		const uri = runUri(source, run.case);
		this.rendered.set(uri.toString(), render(source, run));
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

function render(source: Uri, run: TestRun): string {
	const name = source.path.split('/').pop() ?? '';
	const lines: string[] = [
		`// Uitkomst van '${run.case}'`,
		`// ${name}${run.detail ? ` · rekendatum ${run.detail.rekendatum}` : ''}`,
		'//',
		'// Alleen-lezen, en de stand van één run. Pas de testset aan en voer',
		'// opnieuw uit; deze weergave rekent niets zelf uit.',
		''
	];

	if (run.outcome === 'geweigerd') {
		lines.push('Geweigerd', `\t${run.reason ?? 'zonder opgegeven reden'}`);
		for (const one of run.details ?? []) {
			lines.push(`\t${one}`);
		}
		return `${lines.join('\n')}\n`;
	}

	lines.push(...section('Verwachtingen', run.assertions.length === 0
		? ['\t(geen — dit testgeval voert alleen uit)']
		: table(run.assertions.map((one): [string, string] => [
			`${one.passed ? '✓' : '✗'} ${one.label}`,
			one.passed
				? one.actual ?? ''
				: `verwacht ${one.expected ?? 'leeg'}, werkelijk ${one.actual ?? 'leeg'}`
					+ (one.rule ? `   (${one.rule})` : '')
		]))));

	if (run.faults.length > 0) {
		lines.push(...section('Fouten tijdens de uitvoering', table(
			run.faults.map((one): [string, string] => [
				`${one.rule}${one.instance ? ` · ${one.instance}` : ''}`, one.message
			]))));
	}

	const detail = run.detail;
	if (!detail) {
		return `${lines.join('\n')}\n`;
	}

	if (detail.inconsistencies.length > 0) {
		lines.push(...section('Inconsistent bevonden', detail.inconsistencies.map(one =>
			`\t${one.rule}${one.instance ? ` · ${one.instance}` : ''}`)));
	}

	// Input before derived, because a reader checking a surprising number starts
	// from what was given rather than from what was worked out.
	for (const [heading, derived] of [
		['Gegeven', false], ['Afgeleid', true]
	] as [string, boolean][]) {
		const rows = detail.values.filter(one => one.derived === derived);
		if (rows.length > 0) {
			lines.push(...section(heading, rows.flatMap(valueLines)));
		}
	}

	const kenmerken = detail.kenmerken.filter(one => one.present);
	if (kenmerken.length > 0) {
		lines.push(...section('Kenmerken', table(kenmerken.map((one): [string, string] => [
			`${one.instance} · ${one.kenmerk}`, one.derived ? 'afgeleid' : 'gegeven'
		]))));
	}

	if (detail.trace.length > 0) {
		lines.push(...section('Trace, in de volgorde waarin geschreven werd',
			detail.trace.flatMap(one => [
				`\t${one.instance ? `${one.instance} · ` : ''}${target(one.target, one.coordinates)}`
					+ ` = ${one.value}   ← ${one.rule}`,
				...one.operands.map(operand =>
					`\t\t${operand.instance ? `${operand.instance} · ` : ''}${operand.label}`
						+ ` = ${operand.value}`)
			])));
	}

	lines.push(...section('Gevuurde regels', table(detail.firedRules.map((one): [string, string] => [
		one.rule, one.count === 1 ? '' : `${one.count}×`
	]))));

	return `${lines.join('\n')}\n`;
}

function section(heading: string, body: string[]): string[] {
	return [heading, ...body, ''];
}

function target(name: string, coordinates?: string[]): string {
	return coordinates?.length ? `${name} [${coordinates.join(', ')}]` : name;
}

/** One value, or one line per period where the write was time-dependent. */
function valueLines(one: RunDetail['values'][number]): string[] {
	const label = `${one.instance} · ${target(one.attribute, one.coordinates)}`;
	if (!one.segments) {
		return table([[label, one.value ?? 'leeg']]);
	}
	return [
		`\t${label}`,
		...one.segments.map(segment => `\t\t${period(segment.from, segment.to)}  ${segment.value}`)
	];
}

function period(from?: string, to?: string): string {
	if (from && to) {
		return `van ${from} tot ${to}`;
	}
	if (from) {
		return `vanaf ${from}`;
	}
	return to ? `tot ${to}` : 'altijd';
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
