// W3 — the outcome and the derivation trace as a panel (FSD §W3, FR-W3.1).
//
// Deferred through X4 and built now, on content that had settled. The sequencing
// was the point: the hard part of X4 was deciding *what* to show, a webview
// cannot be driven from a test, and `runDocument.ts` answered the question in a
// form a test can read. So this replaces the rendering and nothing else — every
// content decision is `runView.ts`'s, and both renderers project it.
//
// **What the panel adds over the text is three things**, and they are the whole
// reason it exists rather than being a nicer-looking version of the same view:
//
//   - **Colour that means something.** A passing expectation and a failing one
//     are the same shape in text and are told apart by a glyph; here they are
//     told apart before the reader has read anything. Every colour is a
//     workbench variable, so it is the *theme's* green — this extension ships no
//     colour of its own (BRD A-5 is withdrawn for that reason).
//   - **Click-through.** A trace line names the rule that wrote it, and that is
//     the next thing a reader of a surprising number wants to open. A failing
//     expectation goes to the `Verwacht` line that made it.
//   - **Chains that collapse.** A write's operands are what it was computed out
//     of, which matters for the one number you are chasing and is noise for the
//     forty you are not. `<details>` does it with no script.
//
// **Nothing here computes anything.** Every value arrives as a RegelSpraak
// literal the server rendered; this side has no arithmetic and no unit algebra
// and must not grow either.

import { randomBytes } from 'node:crypto';

import {
	Disposable, Position, Range, Selection, SymbolInformation, SymbolKind,
	TextEditorRevealType, Uri, ViewColumn, WebviewPanel, commands, window, workspace
} from 'vscode';

import { WireRange } from './model';
import { SHOW_RUN_AS_TEXT_COMMAND } from './runDocument';
import { RunFocus, RunLink, RunRow, RunView, buildView } from './runView';
import { CollectionElements, TestRun } from './testExplorer';

/**
 * The palette command: the outcome of the testgeval the cursor is in.
 *
 * The lens runs; this shows what a run computed. It opens the panel, which is
 * what W3 changed — the text form moved behind the panel’s own button.
 */
export const SHOW_RUN_COMMAND = 'regelspraak.showUitkomst';

/**
 * What the panel can ask for, which is only ever to be shown a place.
 *
 * The two navigating shapes are `RunLink`, so the panel cannot ask for a jump
 * the view did not offer — which piece of a row is clickable, and what it opens,
 * is `runView.ts`'s decision and is checked there.
 */
export type RunGesture =
	| RunLink
	| { kind: 'asText' }
	/** UX-6, from the panel's own toolbar: this run against the one before it. */
	| { kind: 'compare' }
	/** UX-4: open one collection, answered back into the row that asked. */
	| { kind: 'expand'; at: string; expression: string; rule: string; instance?: string };

/**
 * What the panel needs from the rest of the extension, and no more.
 *
 * Two questions, both `TestExplorer`'s: one is a request to the server and the
 * other is the run history it already keeps. Injected rather than reached for,
 * for the reason every pure half of this module is exported — a webview cannot
 * be driven from a test, so what the panel *decides* stays testable and what it
 * *needs* is handed to it.
 */
export interface RunServices {
	expandCollection(
		uri: string,
		caseName: string,
		what: { rule: string; instance?: string; expression: string }
	): Promise<CollectionElements | undefined>;
	previousRun(uri: string, caseName: string): TestRun | undefined;
}

/**
 * The rule's own declaration, looked up rather than carried.
 *
 * A trace entry names a rule and has no range for it: what "writes" a rule is
 * its declaration, which sits in no rule body, so the run never had one to send.
 * `workspace/symbol` is the index that does know, and asking it is also what
 * makes the jump work across files — the rule that wrote a value is routinely
 * not in the document the reader started from.
 *
 * Pure and exported for W4's `rangeOfGesture` reason: a webview cannot be driven
 * from a test, so the half that decides anything lives where a test reaches it.
 * A rule and a decision table share a `SymbolKind` (LSP has none meaning
 * "table"), so both are accepted and an exact name match is what disambiguates —
 * `Regel Jeugdlid` and `Regel Jeugdlid met korting` are two symbols and a prefix
 * match would open whichever the index happened to list first.
 */
export function ruleLocation(
	symbols: readonly SymbolInformation[],
	rule: string
): { uri: Uri; range: Range } | undefined {
	const found = symbols.find(one =>
		one.name === rule
		&& (one.kind === SymbolKind.Function || one.kind === SymbolKind.Method));
	return found ? { uri: found.location.uri, range: found.location.range } : undefined;
}

/**
 * One segment of a track, placed as a percentage of the track's width (UX-5).
 *
 * Percentages rather than a viewBox, because the track is as wide as the panel
 * and a viewBox would have to scale — which stretches the labels with it.
 */
export interface TrackSegment {
	/** Left edge and width, both 0..100. */
	at: number;
	width: number;
	label: string;
	value: string;
	empty: boolean;
	/** True where the period runs off that edge of the track. */
	openStart: boolean;
	openEnd: boolean;
}

/**
 * One dated mark on the axis — a knip, or an end of the timeline.
 *
 * `anchor` is about **clipping and not about taste**: a date drawn centred on a
 * mark at the very edge hangs half of itself outside the panel, so the outermost
 * marks are anchored inwards.
 */
export interface TrackTick {
	at: number;
	label: string;
	anchor: 'start' | 'middle' | 'end';
}

export interface Track {
	segments: TrackSegment[];
	/** Every distinct bound, in order, so the axis carries its dates (UX-5). */
	ticks: TrackTick[];
	/** The rekendatum, where it falls inside the drawn span. */
	now?: { at: number; label: string };
}

/**
 * The geometry of a timeline track, from the periods a row states.
 *
 * **Pure and exported for the reason `rangeOfGesture` and `statusFor` are**: a
 * webview cannot be driven from a test, and this is the half that decides
 * anything — where a knip lands is the whole point of drawing the thing, and a
 * knip one day off drawn in the wrong place is worse than no picture.
 *
 * **It states every label and places none of them finally.** Which dates the
 * axis carries and where each belongs is decided here; whether two of them
 * collide, or a value fits inside its own block, depends on the width the panel
 * happens to have and on the width the theme's font gives the text — neither of
 * which a test can know either. So the drawing thins them, and this offers the
 * full set.
 *
 * Three shapes it has to get right, and each is a real timeline:
 *
 *   - **An open end runs off the edge.** A period with no bound is not a period
 *     that stops at the last knip; the domain is padded on that side so the
 *     block visibly leaves the picture, and the padding is a fraction of the
 *     span so it looks the same whatever the scale.
 *   - **A single unbounded period** (`altijd`) has no finite bound at all, so
 *     there is nothing to be in proportion to and no date to put on an axis.
 *   - **A zero-width span** — every bound on one day — divides by nothing, so it
 *     falls back to equal blocks rather than to `NaN` in every coordinate.
 *
 * **And it declines to draw a track that says nothing**, which is a departure
 * from §UX-5's "wherever a value is time-dependent". A single period is one
 * full-width block whose only content is the label the row beneath it already
 * carries — in proportion to nothing, because there is nothing beside it — so
 * drawing it costs a line of the panel per timeline row and adds no fact. Two
 * periods have a knip between them, which is the whole feature; and one period
 * with the **rekendatum inside it** says where the run is standing, which is
 * what most timeline bugs reduce to. Those two are the cases it draws.
 */
export function trackOf(
	rows: readonly RunRow[],
	now?: { day: number; text: string }
): Track | undefined {
	const periods = rows.filter(one => one.kind === 'segment' && one.span);
	if (periods.length === 0) {
		return undefined;
	}
	// Keyed by day, so a knip two periods share is one mark on the axis rather
	// than the same date drawn twice on top of itself.
	const bounds = new Map<number, string>();
	for (const one of periods) {
		for (const edge of [one.span!.from, one.span!.to]) {
			if (edge) {
				bounds.set(edge.day, edge.text);
			}
		}
	}
	const drawn = (one: RunRow): TrackSegment => ({
		at: 0,
		width: 100,
		label: one.label,
		value: one.value ?? '',
		empty: one.empty === true,
		openStart: one.span!.from === undefined,
		openEnd: one.span!.to === undefined
	});
	if (bounds.size === 0) {
		// One period, open at both ends: nothing to be in proportion to, no date
		// to put on an axis and no cursor to place, so a picture adds nothing.
		return undefined;
	}
	const days = [...bounds.keys()].sort((a, b) => a - b);
	const low = days[0];
	const high = days[days.length - 1];
	if (high === low) {
		if (periods.length < 2 && now?.day !== low) {
			return undefined;
		}
		// Every bound on one day: there is no span to be in proportion to, and
		// dividing by it puts `NaN` in every coordinate — which SVG draws as
		// nothing at all, so the track would silently vanish rather than say it
		// could not be drawn. Equal blocks are the honest fallback.
		return {
			segments: periods.map((one, index) => ({
				...drawn(one),
				at: index / periods.length * 100,
				width: 100 / periods.length
			})),
			ticks: [{ at: 50, label: bounds.get(low)!, anchor: 'middle' }],
			...(now?.day === low ? { now: { at: 50, label: now.text } } : {})
		};
	}
	// A fifth of the span on any side that runs off, so an open period is visibly
	// open *and* wide enough to carry its own value — which is usually the
	// current one, and so the one a reader is looking for. A fraction rather than
	// a number of days, so it looks the same whether the timeline spans a month
	// or a century.
	const pad = (high - low) * 0.2;
	const from = periods.some(one => one.span!.from === undefined) ? low - pad : low;
	const to = periods.some(one => one.span!.to === undefined) ? high + pad : high;
	const width = to - from;
	const at = (day: number): number => (day - from) / width * 100;
	const standing = now !== undefined && now.day >= from && now.day <= to;
	if (periods.length < 2 && !standing) {
		return undefined;
	}
	return {
		segments: periods.map(one => {
			const left = at(one.span!.from?.day ?? from);
			return { ...drawn(one), at: left, width: at(one.span!.to?.day ?? to) - left };
		}),
		ticks: days.map((day): TrackTick => {
			const x = at(day);
			return {
				at: x,
				label: bounds.get(day)!,
				// Anchored inwards at the edges: a date centred on a mark at 0%
				// hangs half of itself outside the panel.
				anchor: x < 6 ? 'start' : x > 94 ? 'end' : 'middle'
			};
		}),
		...(standing ? { now: { at: at(now!.day), label: now!.text } } : {})
	};
}

/**
 * A row as the webview receives it: the view's own row, plus the geometry of
 * the track drawn above its periods where it states any.
 *
 * Attached **here and not in `buildView`**, which is the whole reason this type
 * exists rather than a field on `RunRow`: where a knip falls in pixels is
 * drawing, and `runView.ts` decides content. The text renderer never sees it and
 * loses nothing — it prints the period list, which is the same content read a
 * different way, and that is what "the two renderers may draw differently and
 * may not decide differently" permits.
 */
interface DrawnRow extends Omit<RunRow, 'children'> {
	track?: Track;
	children?: DrawnRow[];
}

interface DrawnView extends Omit<RunView, 'sections'> {
	sections: { title: string; aligned?: boolean; rows: DrawnRow[] }[];
}

/** The view with a track computed for every row that states periods. */
function withTracks(view: RunView): DrawnView {
	const walk = (row: RunRow): DrawnRow => {
		const children = row.children?.map(walk);
		const track = row.children
			? trackOf(row.children, view.rekendatumDay === undefined || view.rekendatum === undefined
				? undefined
				: { day: view.rekendatumDay, text: view.rekendatum })
			: undefined;
		return {
			...row,
			...(children ? { children } : {}),
			...(track ? { track } : {})
		};
	};
	return {
		...view,
		sections: view.sections.map(one => ({ ...one, rows: one.rows.map(walk) }))
	};
}

/**
 * The open outcome panels, one per view.
 *
 * Per view rather than one panel retargeted: "what did this rule do" and "what
 * did this testgeval produce" are two questions a reader compares against each
 * other, and a single panel would answer the second by throwing away the first.
 * Keyed on the view's name, which is the rule where there is one — so pressing
 * the same rule's lens twice redraws one panel rather than stacking them.
 */
export class RunPanels implements Disposable {
	private readonly open = new Map<string, Panel>();

	/**
	 * `services` is optional so a test can open a panel without a server: the
	 * suite asserts that it opens, and the two gestures that need one then
	 * answer that they cannot rather than throwing.
	 */
	constructor(private readonly services?: RunServices) { }

	/**
	 * Draws a finished run, focused on `focus` where there is one.
	 *
	 * `testset` is **the document the run came from**, not the one the gesture was
	 * made in — named for it, because passing the rule's own file instead is a
	 * mistake with no symptom until a reader clicks an expectation: every range in
	 * the view is a position in the testset, so the jump then lands on that line
	 * number in the wrong file. The panel opens beside whatever is active, so the
	 * gesture's document is not needed for anything.
	 */
	async show(testset: Uri, run: TestRun, focus?: RunFocus, previous?: TestRun): Promise<void> {
		const view = buildView(testset.path.split('/').pop() ?? '', run, focus, previous);
		let panel = this.open.get(view.name);
		if (!panel) {
			const created = window.createWebviewPanel(
				'regelspraak.uitkomst',
				`${view.name} (uitkomst)`,
				// Beside and without the focus: the reader pressed a lens in the text
				// and the text is where they are still working.
				{ viewColumn: ViewColumn.Beside, preserveFocus: true },
				// Kept alive while hidden, so flipping away and back does not lose the
				// scroll position of a long trace or the chains left open in it.
				{ enableScripts: true, retainContextWhenHidden: true });
			panel = new Panel(created, () => this.open.delete(view.name), this.services);
			this.open.set(view.name, panel);
		}
		await panel.draw(testset, run, view, focus, previous);
	}

	dispose(): void {
		for (const panel of [...this.open.values()]) {
			panel.dispose();
		}
		this.open.clear();
	}
}

class Panel {
	private readonly subscriptions: Disposable[] = [];
	private disposed = false;
	/** The run as last drawn, which is what **Als tekst openen** re-renders. */
	private drawn: {
		source: Uri; run: TestRun; focus?: RunFocus; previous?: TestRun
	} | undefined;

	constructor(
		private readonly panel: WebviewPanel,
		forget: () => void,
		private readonly services?: RunServices
	) {
		panel.webview.html = page(panel.webview.cspSource, nonce());
		this.subscriptions.push(
			panel.webview.onDidReceiveMessage((gesture: RunGesture) => void this.act(gesture)));
		panel.onDidDispose(() => {
			forget();
			this.dispose();
		});
	}

	async draw(
		testset: Uri,
		run: TestRun,
		view: RunView,
		focus?: RunFocus,
		previous?: TestRun
	): Promise<void> {
		this.drawn = { source: testset, run, focus, previous };
		this.panel.title = `${view.name} (uitkomst)`;
		this.panel.reveal(this.panel.viewColumn, true);
		// Tracks attached on the way out, so the webview draws and computes
		// nothing — see `DrawnRow`.
		await this.panel.webview.postMessage({ type: 'run', view: withTracks(view) });
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

	private async act(gesture: RunGesture): Promise<void> {
		const drawn = this.drawn;
		if (!drawn) {
			return;
		}
		if (gesture.kind === 'asText') {
			// **A comparison opens as a diff** (UX-6). The panel names the
			// differences and the diff editor shows both runs with them marked, and
			// those are two readings of one comparison rather than two features: a
			// reader who already knows what they are looking for wants the first,
			// and one who does not wants the second. Which they get follows from
			// what the panel is currently drawing.
			await commands.executeCommand(SHOW_RUN_AS_TEXT_COMMAND,
				drawn.source.toString(), drawn.run, drawn.focus, drawn.previous);
			return;
		}
		if (gesture.kind === 'reveal') {
			await this.jump(drawn.source, toRange(gesture.range));
			return;
		}
		if (gesture.kind === 'explain') {
			// UX-6 → UX-1, over the run already in hand: no second run is made,
			// because the question is about *this* one. The comparison is dropped —
			// the reader has moved from "what changed" to "how did this come about",
			// and keeping a diff section above the derivation would answer the
			// question they have just left.
			await this.redraw(drawn, {
				kind: 'waarde',
				attribute: gesture.attribute,
				...(gesture.instance === undefined ? {} : { instance: gesture.instance })
			});
			return;
		}
		if (gesture.kind === 'compare') {
			await this.compare(drawn);
			return;
		}
		if (gesture.kind === 'expand') {
			await this.open(drawn, gesture);
			return;
		}
		// The rule's declaration, which is routinely in another file than the
		// testset this run was made from.
		const symbols = await commands.executeCommand<SymbolInformation[]>(
			'vscode.executeWorkspaceSymbolProvider', gesture.rule) ?? [];
		const found = ruleLocation(symbols, gesture.rule);
		if (found) {
			await this.jump(found.uri, found.range);
		} else {
			void window.showInformationMessage(
				`'${gesture.rule}' is niet als declaratie te vinden in deze werkruimte.`);
		}
	}

	/** The same run, read as an answer about something else. */
	private async redraw(
		drawn: { source: Uri; run: TestRun },
		focus: RunFocus
	): Promise<void> {
		const view = buildView(drawn.source.path.split('/').pop() ?? '', drawn.run, focus);
		await this.draw(drawn.source, drawn.run, view, focus);
	}

	/**
	 * UX-6 — this run against the previous one, drawn in place.
	 *
	 * **The retained run and not a fresh one**: what the reader is looking at is
	 * the run in front of them, and re-running to obtain the other half would
	 * compare a third run against a second. Where there is no previous run it
	 * says so, which is the honest answer to a first press.
	 */
	private async compare(
		drawn: { source: Uri; run: TestRun; focus?: RunFocus }
	): Promise<void> {
		const previous = this.services?.previousRun(drawn.source.toString(), drawn.run.case);
		if (!previous) {
			void window.showInformationMessage(
				`Er is nog geen eerdere uitvoering van '${drawn.run.case}' om mee te vergelijken. `
				+ 'Pas het model aan en voer opnieuw uit.');
			return;
		}
		const view = buildView(
			drawn.source.path.split('/').pop() ?? '', drawn.run, drawn.focus, previous);
		await this.draw(drawn.source, drawn.run, view, drawn.focus, previous);
	}

	/**
	 * UX-4 — one collection, opened and answered back into the row that asked.
	 *
	 * The row's id travels out and back so a second click while the first is
	 * still out cannot fill the wrong row: an expansion is a run, and a reader
	 * opening two of them does not wait in between.
	 */
	private async open(
		drawn: { source: Uri; run: TestRun },
		gesture: Extract<RunGesture, { kind: 'expand' }>
	): Promise<void> {
		const answer = this.services
			? await this.services.expandCollection(drawn.source.toString(), drawn.run.case, {
				rule: gesture.rule,
				...(gesture.instance === undefined ? {} : { instance: gesture.instance }),
				expression: gesture.expression
			})
			: undefined;
		if (this.disposed) {
			return;
		}
		await this.panel.webview.postMessage({
			type: 'elements',
			at: gesture.at,
			answer: answer ?? {
				expression: gesture.expression,
				value: '',
				size: 0,
				elements: [],
				refusal: 'Deze verzameling kon niet worden uitgeklapt.'
			}
		});
	}

	/** Puts the cursor on what was clicked, and gives it the focus. */
	private async jump(uri: Uri, range: Range): Promise<void> {
		const document = await workspace.openTextDocument(uri);
		// Into the column the file is already open in where it is open, so the jump
		// does not move the text out from under a reader who has it arranged. The
		// fallback is the first column and not the active one: the click came from
		// this panel, so the active column is the panel's, and opening the text
		// there would close the view the reader clicked in.
		const already = window.visibleTextEditors.find(
			one => one.document.uri.toString() === uri.toString());
		const editor = await window.showTextDocument(
			document, already?.viewColumn ?? ViewColumn.One);
		editor.selection = new Selection(range.start, range.end);
		editor.revealRange(range, TextEditorRevealType.InCenterIfOutsideViewport);
	}
}

const toRange = (r: WireRange): Range => new Range(
	new Position(r.start.line, r.start.character),
	new Position(r.end.line, r.end.character));

/**
 * The CSP nonce for this panel's one inline script.
 *
 * From `node:crypto` rather than `Math.random`, on W4's reasoning: every value
 * here reaches the DOM through `textContent` and never as markup, so there is no
 * path to defend today — but a nonce spelled with a predictable RNG reads as
 * sound until somebody adds the `innerHTML` that makes it matter.
 */
function nonce(): string {
	return randomBytes(16).toString('hex');
}

/**
 * The whole view, inline.
 *
 * Loads nothing from anywhere: the CSP admits this document's own styles and one
 * nonce'd script. **Every colour is a workbench variable** (FR-W3.1) — the
 * testing icons for pass and fail, the debug Variables pane's own name/value
 * pair for a write, the editor's warning colour for a fault. That is not
 * economy: fixed colours overrode whichever theme the reader chose, which is
 * why BRD A-5 was withdrawn, and the same rule binds a webview.
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
		line-height: 1.5;
	}
	h1 { font-size: 1.05rem; margin: 0; font-weight: 600; }
	.meta { color: var(--vscode-descriptionForeground); font-size: .85rem; margin: .1rem 0 0; }
	.hint { color: var(--vscode-descriptionForeground); font-size: .8rem; margin: .4rem 0 .2rem; }
	h2 {
		font-size: .85rem;
		text-transform: uppercase;
		letter-spacing: .04em;
		color: var(--vscode-descriptionForeground);
		border-bottom: 1px solid var(--vscode-panel-border);
		padding-bottom: .2rem;
		margin: 1.6rem 0 .4rem;
	}
	ul { list-style: none; margin: 0; padding: 0; }
	li { padding: .05rem 0; }
	.row { display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
	.mark { flex: 0 0 auto; width: 1em; text-align: center; font-weight: 600; }
	.pass .mark { color: var(--vscode-testing-iconPassed, var(--vscode-charts-green)); }
	.fail .mark { color: var(--vscode-testing-iconFailed, var(--vscode-charts-red)); }
	.fault .mark, .inconsistency .mark { color: var(--vscode-editorWarning-foreground); }
	/* A rule that was considered and did not fire: the testing view's own colour
	   for a test that is neither passed nor failed, so it reads as neither. */
	.skipped .mark { color: var(--vscode-testing-iconSkipped, var(--vscode-descriptionForeground)); }
	.skipped .note { color: var(--vscode-descriptionForeground); }
	.label { color: var(--vscode-debugTokenExpression-name, var(--vscode-foreground)); }
	.value {
		color: var(--vscode-debugTokenExpression-number, var(--vscode-charts-blue));
		font-family: var(--vscode-editor-font-family);
	}
	.value::before { content: "= "; color: var(--vscode-descriptionForeground); }
	.note { color: var(--vscode-descriptionForeground); font-size: .9rem; }
	.fail .note { color: var(--vscode-testing-iconFailed, var(--vscode-charts-red)); }
	.fault .note { color: var(--vscode-editorWarning-foreground); }
	/* The rule that wrote the value, after it — an arrow, as in the text form,
	   because it is attribution and not part of the value. */
	.rule { font-size: .9rem; }
	.rule::before { content: "\\2190 "; color: var(--vscode-descriptionForeground); }
	/* The qualifier reads as a note about the attribution, not as part of the
	   name — so it is set like a note and never carries the link's colour. */
	.ruleDetail { color: var(--vscode-descriptionForeground); font-size: .9rem; }
	.plain { color: var(--vscode-descriptionForeground); font-style: italic; }
	/* Clickable, and it has to look it: a jump nobody discovers is not a feature. */
	button.link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--vscode-textLink-foreground);
		cursor: pointer;
		text-align: left;
	}
	button.link:hover { text-decoration: underline; color: var(--vscode-textLink-activeForeground); }
	details { margin: 0; }
	details > ul { margin-left: 1.6rem; }
	/*
	 * block, not the default list-item: a summary's marker box is laid out before
	 * its content, and this summary's content is the row div — so the triangle
	 * took a line of its own above every foldable row. The marker belongs in the
	 * row, in the same 1em column every other row reserves for a tick or a
	 * warning sign, which is what puts it in line with them.
	 */
	summary { cursor: pointer; display: block; }
	summary::-webkit-details-marker { display: none; }
	.disclosure::before {
		content: "\\25B8";
		color: var(--vscode-descriptionForeground);
	}
	details[open] > summary .disclosure::before { content: "\\25BE"; }
	.operands { margin-left: 1.6rem; }
	/*
	 * UX-5's timeline track. **Every colour is a chart variable**, so the theme
	 * owns them exactly as it owns the pass and fail glyphs — a track is a
	 * picture of data and BRD A-5 binds a picture as much as a word.
	 *
	 * The fill is deliberately faint and the stroke is not: a reader is looking
	 * for where the edges are, and a solid block would also make the value drawn
	 * on top of it unreadable in one of the two themes.
	 */
	svg.track { display: block; width: 100%; height: 52px; margin: .2rem 0 .3rem; }
	.track .seg { fill: var(--vscode-charts-blue); fill-opacity: .22; stroke: var(--vscode-charts-blue); stroke-opacity: .85; }
	/* The axis and its dated marks: without a date on it a coloured bar is not a
	   timeline to anyone who did not build it. */
	.track .axis, .track .tick { stroke: var(--vscode-panel-border); stroke-width: 1; }
	/* Every date on the track reads the same, the rekendatum's included: 9px of
	   an accent colour is a line of text nobody can read, and the cursor's own
	   stroke is what makes it stand out. */
	.track .date, .track .nowlabel { fill: var(--vscode-descriptionForeground); font-size: 9px; }
	/* An empty period is a *gap in coverage*, and it has to look like one: drawn
	   as though it were filled would be the picture saying the opposite of the
	   data. */
	.track .seg.leeg { fill: var(--vscode-descriptionForeground); fill-opacity: .08; stroke: var(--vscode-descriptionForeground); stroke-opacity: .4; stroke-dasharray: 3 2; }
	.track text { fill: var(--vscode-foreground); font-size: 10px; font-family: var(--vscode-editor-font-family); }
	.track .segvalue { font-size: 10px; }
	/* The rekendatum: which segment the run is actually standing in is what most
	   timeline bugs reduce to. */
	/*
	 * The stroke keeps the accent, and it is the one thing here that needs it: a
	 * cursor drawn like a knip's tick is a cursor a reader cannot tell from a
	 * knip, which is the one distinction the track exists to make.
	 *
	 * **Red and 2px**, after orange at 1.5px was tried and faded into the block
	 * behind it — a cursor that has to be looked for is not one. Red is the
	 * convention for "here" on a timeline, and the collision with this panel's
	 * own red is not one in practice: red means *failed* here as a glyph and as
	 * note text, never as a rule drawn through a chart.
	 */
	.track .now { stroke: var(--vscode-charts-red); stroke-width: 2; }
	.operand .label, .segment .label { color: var(--vscode-descriptionForeground); }
	/*
	 * A step's label is a piece of the model's own text, not a name — so it is
	 * set in the editor's font, which is what tells a reader at a glance that the
	 * rows above it are values and this one is a sentence they can find in a file.
	 */
	.step .label {
		font-family: var(--vscode-editor-font-family);
		color: var(--vscode-descriptionForeground);
	}
	.refusal { color: var(--vscode-testing-iconFailed, var(--vscode-charts-red)); }
	/*
	 * UX-6's three kinds of change. The workbench's own diff colours, because a
	 * reader already knows what they mean here — added is green and removed is
	 * red in every diff editor they open — and a value that merely *moved* is
	 * neither, so it takes the ordinary note colour and says so in words.
	 */
	.appeared .mark, .appeared .note { color: var(--vscode-gitDecoration-addedResourceForeground, var(--vscode-charts-green)); }
	.vanished .mark, .vanished .note { color: var(--vscode-gitDecoration-deletedResourceForeground, var(--vscode-charts-red)); }
	.changed .mark { color: var(--vscode-gitDecoration-modifiedResourceForeground, var(--vscode-charts-blue)); }
	.changed .note { color: var(--vscode-foreground); }
	/*
	 * UX-4's opened collection. A table, because two columns of five hundred rows
	 * is what it is — and scrollable in its own right, so a long one does not
	 * push the trace under it out of reach.
	 */
	.elements { margin: .2rem 0 .4rem 1.6rem; max-height: 22rem; overflow: auto; }
	.elements table { border-collapse: collapse; font-size: .9rem; }
	.elements th {
		text-align: left;
		font-weight: 400;
		color: var(--vscode-descriptionForeground);
		border-bottom: 1px solid var(--vscode-panel-border);
		padding: .1rem .8rem .1rem 0;
		position: sticky;
		top: 0;
		background: var(--vscode-editor-background);
	}
	.elements td { padding: .05rem .8rem .05rem 0; }
	.elements td.num {
		text-align: right;
		font-family: var(--vscode-editor-font-family);
		color: var(--vscode-debugTokenExpression-number, var(--vscode-charts-blue));
	}
	.elements .why { color: var(--vscode-editorWarning-foreground); }
	/* In the header, where a reader looks for what to do with a view — not at the
	   bottom, which for a long trace is a scroll away from the question. */
	.tools { margin: .4rem 0 1.4rem; }
</style>
</head>
<body>
<header>
	<h1 id="heading"></h1>
	<p class="meta" id="meta"></p>
	<p class="hint">Alleen-lezen, en de stand van één run. Klik een regelnaam om hem te openen;
		klap een schrijving open om te zien wat er gerekend is en waaruit.</p>
	<p class="tools">
		<button class="link" id="asText">Als tekst openen</button> ·
		<button class="link" id="compare">Vergelijk met vorige uitvoering</button>
	</p>
</header>
<main id="body"></main>
<script nonce="${scriptNonce}">
	const vscode = acquireVsCodeApi();
	const body = document.getElementById('body');

	document.getElementById('asText').addEventListener('click', () => {
		vscode.postMessage({ kind: 'asText' });
	});
	document.getElementById('compare').addEventListener('click', () => {
		vscode.postMessage({ kind: 'compare' });
	});

	/** A button that does something here, rather than asking the extension. */
	function clickable(className, text, act) {
		const node = document.createElement('button');
		node.className = className + ' link';
		node.textContent = text;
		node.addEventListener('click', act);
		return node;
	}

	/** A span, or a button where the row has somewhere to go. */
	function piece(className, text, gesture) {
		const node = document.createElement(gesture ? 'button' : 'span');
		node.className = gesture ? className + ' link' : className;
		node.textContent = text;
		if (gesture) {
			node.addEventListener('click', () => vscode.postMessage(gesture));
		}
		return node;
	}

	/*
	 * One row. Which piece is clickable is row.link, decided in runView.ts —
	 * nothing is worked out here, because a decision made inside this string is a
	 * decision no test can read. (And no backticks in here: this whole page is one
	 * template literal, so one would end it — three times now, and the third was
	 * six of them in a comment naming the functions it was about. Quote a name
	 * with apostrophes in this string, or do not quote it.)
	 */
	function rowLine(row, foldable) {
		const line = document.createElement('div');
		line.className = 'row ' + row.kind;
		const mark = document.createElement('span');
		// The fold marker shares the column the tick and the warning sign use, so a
		// foldable row starts where every other row starts.
		mark.className = foldable ? 'mark disclosure' : 'mark';
		mark.textContent = foldable ? '' : (row.kind === 'pass' ? '\\u2713'
			: row.kind === 'fail' ? '\\u2717'
			: row.kind === 'fault' || row.kind === 'inconsistency' ? '\\u26A0'
			: row.kind === 'skipped' ? '\\u2298'
			// UX-6: what happened to this fact between the two runs, in one glyph.
			: row.kind === 'appeared' ? '+'
			: row.kind === 'vanished' ? '\\u2212'
			: row.kind === 'changed' ? '\\u2192' : '');
		line.append(mark);

		const on = where => row.link && row.link.on === where ? row.link : undefined;
		line.append(piece(row.kind === 'note' ? 'label plain' : 'label', row.label, on('label')));
		if (row.value !== undefined) {
			line.append(piece('value', row.value));
		}
		if (row.note !== undefined) {
			line.append(piece('note', row.note));
		}
		if (row.ruleAt === 'beside' && row.rule) {
			line.append(piece('rule', row.rule, on('beside')));
		}
		// After the name and outside the link: the link matches a declared name
		// exactly, and 'Contributiestaffel (rij 2)' declares nothing.
		if (row.ruleDetail) {
			line.append(piece('ruleDetail', '(' + row.ruleDetail + ')'));
		}
		// UX-4. A separate affordance and never the row's own link: this row
		// already states a value and may already be a way somewhere, and what the
		// button does is fetch — which is a different kind of act from a jump and
		// has to look like one.
		if (row.expand) {
			const at = 'uitklap-' + (++expansions);
			const open = clickable('note', 'uitklappen', () => {
				open.textContent = 'bezig…';
				open.disabled = true;
				vscode.postMessage({
					kind: 'expand',
					at: at,
					expression: row.expand.expression,
					rule: row.expand.rule,
					instance: row.expand.instance
				});
			});
			line.append(open);
			const holder = document.createElement('div');
			holder.className = 'elements';
			holder.id = at;
			holder.hidden = true;
			awaiting.set(at, { holder: holder, button: open });
			line.append(holder);
		}
		return line;
	}

	/** One counter per page, so two rows asking at once cannot share an id. */
	let expansions = 0;
	const awaiting = new Map();

	/*
	 * UX-4 — the elements of an opened collection.
	 *
	 * **Nothing is computed here and nothing is re-ordered by value.** The server
	 * sent them largest first, because ordering is arithmetic over units and
	 * rationals and this side has none; what it *can* offer is the collection's
	 * own order, which each row carries as its position. So the two headers
	 * toggle between two readings the answer already contains.
	 */
	const PAINTED = 20;

	function elementsTable(answer) {
		const table = document.createElement('table');
		const head = document.createElement('tr');
		const byOrder = document.createElement('th');
		const byValue = document.createElement('th');
		table.append(head);
		head.append(byOrder, byValue);

		const body = document.createElement('tbody');
		table.append(body);
		let ordered = false;
		let painted = PAINTED;

		function draw() {
			byOrder.replaceChildren(clickable('', 'instantie' + (ordered ? ' \u25B4' : ''),
				() => { ordered = true; draw(); }));
			byValue.replaceChildren(clickable('', 'waarde' + (ordered ? '' : ' \u25BE'),
				() => { ordered = false; draw(); }));
			const rows = ordered
				? answer.elements.slice().sort((a, b) => a.position - b.position)
				: answer.elements;
			body.replaceChildren();
			for (const one of rows.slice(0, painted)) {
				const line = document.createElement('tr');
				const who = document.createElement('td');
				who.textContent = one.instance || one.label;
				const what = document.createElement('td');
				what.className = 'num';
				what.textContent = one.value;
				line.append(who, what);
				body.append(line);
			}
			if (rows.length > painted) {
				const more = document.createElement('tr');
				const cell = document.createElement('td');
				cell.colSpan = 2;
				cell.append(clickable('note', 'toon alle ' + rows.length, () => {
					painted = rows.length;
					draw();
				}));
				more.append(cell);
				body.append(more);
			}
		}

		// The server's order is the one it arrives in, and it is the one a reader
		// opened the collection for: the outlier is row one.
		ordered = answer.sorted !== true;
		draw();
		return table;
	}

	/*
	 * UX-5 — the periods of one row as a dated timeline.
	 *
	 * Every coordinate arrives computed (see DrawnRow); nothing is worked out
	 * here, because a decision made inside this string is a decision no test can
	 * read. What *is* decided here is whether each label fits, which depends on
	 * the width the panel happens to have and on the width the theme's font gives
	 * the text — see 'fitLabels'.
	 *
	 * Four bands, and the reading runs down them: the rekendatum above, the
	 * periods as blocks, the axis with a mark per knip, and the dates under it.
	 */
	function svgNode(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function trackNode(track) {
		const svg = svgNode('svg');
		svg.setAttribute('class', 'track');
		for (const one of track.segments) {
			const rect = svgNode('rect');
			rect.setAttribute('class', one.empty ? 'seg leeg' : 'seg');
			rect.setAttribute('x', one.at + '%');
			rect.setAttribute('width', one.width + '%');
			rect.setAttribute('y', '14');
			rect.setAttribute('height', '17');
			// The native tooltip carries the whole period and the whole value; the
			// block itself can only ever show what fits inside it.
			const title = svgNode('title');
			title.textContent = one.label + ' — ' + one.value;
			rect.append(title);
			svg.append(rect);

			const value = svgNode('text');
			value.setAttribute('class', 'segvalue');
			value.setAttribute('x', (one.at + one.width / 2) + '%');
			value.setAttribute('y', '26');
			value.setAttribute('text-anchor', 'middle');
			value.textContent = one.value;
			// Measured against its own block once it has a width — see fitLabels.
			value.dataset.fit = String(one.width);
			svg.append(value);
		}

		const axis = svgNode('line');
		axis.setAttribute('class', 'axis');
		axis.setAttribute('x1', '0');
		axis.setAttribute('x2', '100%');
		axis.setAttribute('y1', '35');
		axis.setAttribute('y2', '35');
		svg.append(axis);

		for (const one of track.ticks) {
			const mark = svgNode('line');
			mark.setAttribute('class', 'tick');
			mark.setAttribute('x1', one.at + '%');
			mark.setAttribute('x2', one.at + '%');
			mark.setAttribute('y1', '31');
			mark.setAttribute('y2', '39');
			svg.append(mark);

			const date = svgNode('text');
			date.setAttribute('class', 'date');
			date.setAttribute('x', one.at + '%');
			date.setAttribute('y', '49');
			date.setAttribute('text-anchor', one.anchor);
			date.textContent = one.label;
			date.dataset.at = String(one.at);
			svg.append(date);
		}

		if (track.now) {
			const line = svgNode('line');
			line.setAttribute('class', 'now');
			line.setAttribute('x1', track.now.at + '%');
			line.setAttribute('x2', track.now.at + '%');
			// From under its own label down to the axis, so the date, the line and
			// the point on the axis read as one mark rather than three.
			line.setAttribute('y1', '10');
			line.setAttribute('y2', '39');
			const title = svgNode('title');
			title.textContent = 'rekendatum ' + track.now.label;
			line.append(title);
			svg.append(line);

			const label = svgNode('text');
			label.setAttribute('class', 'nowlabel');
			label.setAttribute('x', track.now.at + '%');
			label.setAttribute('y', '8');
			// Inwards at the edges, as the dates are, and for the same reason.
			label.setAttribute('text-anchor',
				track.now.at < 12 ? 'start' : track.now.at > 88 ? 'end' : 'middle');
			label.textContent = 'rekendatum ' + track.now.label;
			svg.append(label);
		}
		return svg;
	}

	/*
	 * Hides the labels that do not fit, once the track has a width.
	 *
	 * **This is the one thing the drawing decides, and it has to.** Whether two
	 * dates collide, or a value fits inside its own block, is a question about
	 * rendered pixels: it depends on the panel's width and on the font the theme
	 * chose, and 'trackOf' — which is where every other decision lives — can know
	 * neither. So it offers every label and this drops what will not fit.
	 *
	 * Dropped rather than shrunk or rotated: the row beneath the track carries
	 * every period in full, so a label that cannot be read here is a label a
	 * reader loses nothing by, while two dates drawn over each other are a date
	 * nobody can read and a picture that looks broken.
	 *
	 * Re-run whenever the width changes, which includes **0 to something**: a
	 * track inside a collapsed fold has no layout at all, so without this every
	 * label would be measured as not fitting and dropped for good.
	 */
	function fitLabels(svg) {
		const width = svg.clientWidth;
		if (!width) {
			return;
		}
		for (const value of svg.querySelectorAll('text.segvalue')) {
			const room = Number(value.dataset.fit) / 100 * width;
			value.style.display = 'none';
			// Measured while shown, then hidden again if it does not fit — a hidden
			// element has no length to measure.
			value.style.display = '';
			value.style.display = value.getComputedTextLength() + 6 > room ? 'none' : '';
		}
		let takenTo = -Infinity;
		for (const date of svg.querySelectorAll('text.date')) {
			date.style.display = '';
			const centre = Number(date.dataset.at) / 100 * width;
			const half = date.getComputedTextLength() / 2;
			const anchor = date.getAttribute('text-anchor');
			const left = anchor === 'start' ? centre : anchor === 'end' ? centre - half * 2 : centre - half;
			const right = left + half * 2;
			// In axis order, so the first of a colliding pair survives — dropping
			// the later one keeps the left-to-right reading intact.
			if (left < takenTo + 6) {
				date.style.display = 'none';
			} else {
				takenTo = right;
			}
		}
	}

	/*
	 * Every track on the page keeps itself fitted.
	 *
	 * A 'ResizeObserver' rather than a resize listener, because the width that
	 * matters changes for two reasons and only one of them is the window: opening
	 * a fold gives a track its first layout, and until then it has no width at
	 * all.
	 */
	const trackFitter = new ResizeObserver(entries => {
		for (const entry of entries) {
			fitLabels(entry.target);
		}
	});

	/*
	 * Lifts an expansion's table out of the row it was built in (UX-4).
	 *
	 * The row is a flex line and, where it folds, a summary — and a table is
	 * neither an item of the first nor legal content of the second. So the
	 * button stays on the line, where it belongs, and what it fills sits under
	 * the whole row.
	 */
	function lift(line, item) {
		const holder = line.querySelector('.elements');
		if (holder) {
			holder.remove();
			item.append(holder);
		}
	}

	function rowItem(row) {
		const item = document.createElement('li');
		const foldable = Boolean(row.children && row.children.length > 0);
		if (!foldable) {
			const line = rowLine(row, false);
			item.append(line);
			lift(line, item);
			return item;
		}
		// Collapsed unless the row says otherwise: a write's operands matter for the
		// one value being chased and are noise for the other forty, while a finding
		// that hides why it was found is a report the reader has to interrogate.
		const details = document.createElement('details');
		details.open = row.open === true;
		const summary = document.createElement('summary');
		const line = rowLine(row, true);
		summary.append(line);
		details.append(summary);
		const nested = document.createElement('ul');
		if (row.track) {
			const holder = document.createElement('li');
			const svg = trackNode(row.track);
			holder.append(svg);
			nested.append(holder);
			// Fitted the moment it has a width, and again whenever that changes —
			// which for a track inside a fold is the moment the fold opens.
			trackFitter.observe(svg);
		}
		for (const child of row.children) {
			nested.append(rowItem(child));
		}
		details.append(nested);
		item.append(details);
		lift(line, item);
		return item;
	}

	window.addEventListener('message', event => {
		const message = event.data;
		if (message.type === 'elements') {
			const waiting = awaiting.get(message.at);
			if (!waiting) {
				return;
			}
			const answer = message.answer;
			waiting.button.disabled = false;
			waiting.button.textContent = 'uitklappen';
			waiting.holder.hidden = false;
			waiting.holder.replaceChildren();
			if (answer.refusal || answer.elements.length === 0) {
				const why = document.createElement('div');
				why.className = 'why';
				why.textContent = answer.refusal || 'Deze verzameling heeft geen elementen.';
				waiting.holder.append(why);
				return;
			}
			waiting.holder.append(elementsTable(answer));
			if (answer.truncated) {
				const cut = document.createElement('div');
				cut.className = 'note';
				cut.textContent = 'Niet alles is opgehaald: deze verzameling telt '
					+ answer.size + ' elementen.';
				waiting.holder.append(cut);
			}
			return;
		}
		if (message.type !== 'run') {
			return;
		}
		// A redraw replaces every row, so the ids the old ones handed out are
		// gone with them — and an answer still in flight then has nowhere to land,
		// which is what this map being cleared says.
		awaiting.clear();
		const view = message.view;
		document.getElementById('heading').textContent = view.heading;
		document.getElementById('meta').textContent = view.meta;
		body.replaceChildren();
		if (view.refusal) {
			const head = document.createElement('h2');
			head.textContent = 'Geweigerd';
			const why = document.createElement('p');
			why.className = 'refusal';
			why.textContent = view.refusal.reason;
			body.append(head, why);
			for (const one of view.refusal.details) {
				const line = document.createElement('p');
				line.className = 'note';
				line.textContent = one;
				body.append(line);
			}
			return;
		}
		for (const section of view.sections) {
			const head = document.createElement('h2');
			head.textContent = section.title;
			const list = document.createElement('ul');
			for (const row of section.rows) {
				list.append(rowItem(row));
			}
			body.append(head, list);
		}
	});
</script>
</body>
</html>`;
}
