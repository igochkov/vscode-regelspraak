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
import { RunFocus, RunLink, RunView, buildView } from './runView';
import { TestRun } from './testExplorer';

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
export type RunGesture = RunLink | { kind: 'asText' };

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
	 * Draws a finished run, focused on `focus` where there is one.
	 *
	 * `testset` is **the document the run came from**, not the one the gesture was
	 * made in — named for it, because passing the rule's own file instead is a
	 * mistake with no symptom until a reader clicks an expectation: every range in
	 * the view is a position in the testset, so the jump then lands on that line
	 * number in the wrong file. The panel opens beside whatever is active, so the
	 * gesture's document is not needed for anything.
	 */
	async show(testset: Uri, run: TestRun, focus?: RunFocus): Promise<void> {
		const view = buildView(testset.path.split('/').pop() ?? '', run, focus);
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
			panel = new Panel(created, () => this.open.delete(view.name));
			this.open.set(view.name, panel);
		}
		await panel.draw(testset, run, view, focus);
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
	private drawn: { source: Uri; run: TestRun; focus?: RunFocus } | undefined;

	constructor(private readonly panel: WebviewPanel, forget: () => void) {
		panel.webview.html = page(panel.webview.cspSource, nonce());
		this.subscriptions.push(
			panel.webview.onDidReceiveMessage((gesture: RunGesture) => void this.act(gesture)));
		panel.onDidDispose(() => {
			forget();
			this.dispose();
		});
	}

	async draw(testset: Uri, run: TestRun, view: RunView, focus?: RunFocus): Promise<void> {
		this.drawn = { source: testset, run, focus };
		this.panel.title = `${view.name} (uitkomst)`;
		this.panel.reveal(this.panel.viewColumn, true);
		await this.panel.webview.postMessage({ type: 'run', view });
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
			await commands.executeCommand(
				SHOW_RUN_AS_TEXT_COMMAND, drawn.source.toString(), drawn.run, drawn.focus);
			return;
		}
		if (gesture.kind === 'reveal') {
			await this.jump(drawn.source, toRange(gesture.range));
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
	<p class="tools"><button class="link" id="asText">Als tekst openen</button></p>
</header>
<main id="body"></main>
<script nonce="${scriptNonce}">
	const vscode = acquireVsCodeApi();
	const body = document.getElementById('body');

	document.getElementById('asText').addEventListener('click', () => {
		vscode.postMessage({ kind: 'asText' });
	});

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
	 * template literal, so one would end it — twice now.)
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
			: row.kind === 'skipped' ? '\\u2298' : '');
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
		return line;
	}

	function rowItem(row) {
		const item = document.createElement('li');
		const foldable = Boolean(row.children && row.children.length > 0);
		if (!foldable) {
			item.append(rowLine(row, false));
			return item;
		}
		// Collapsed unless the row says otherwise: a write's operands matter for the
		// one value being chased and are noise for the other forty, while a finding
		// that hides why it was found is a report the reader has to interrogate.
		const details = document.createElement('details');
		details.open = row.open === true;
		const summary = document.createElement('summary');
		summary.append(rowLine(row, true));
		details.append(summary);
		const nested = document.createElement('ul');
		for (const child of row.children) {
			nested.append(rowItem(child));
		}
		details.append(nested);
		item.append(details);
		return item;
	}

	window.addEventListener('message', event => {
		const message = event.data;
		if (message.type !== 'run') {
			return;
		}
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
