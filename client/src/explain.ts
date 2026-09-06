// UX-1 — **Leg uit**: from a value to the derivation that produced it.
//
// The front door to the run surface. Everything it shows was already recorded
// and already drawn — §X7 stage 2 gave every derived slot the rule that wrote
// it, stage 3 gave the arithmetic in between, and `runView.ts` already renders
// the chain. What was missing is the gesture: a rules writer never starts from
// "I want to step through rules", they start from a red `Verwacht` line or a
// number they did not expect, and the question is always *why is this value what
// it is*. Until now the path to the answer ran through requesting a run, opening
// the panel and finding the row.
//
// So this module composes and decides nothing else. **Three entry points, one
// path**, and that is the shape rather than an economy:
//
//   - **a lens on the expectation that just failed**, which is the moment of
//     maximum intent and the reason the feature exists;
//   - the editor's context menu on a value, gated so it never appears where the
//     command would shrug;
//   - the palette, gated on the language like `showUitkomst`.
//
// All three reduce to **(document, position)** — a lens carries the line it sits
// on — so there is one question to the server, one way of finding the testgeval,
// and one thing that opens. Three paths to one panel would be three places for
// the answer to differ.
//
// **Why a lens, against §UX-1's own ruling.** The proposal said no new CodeLens,
// because a lens per `Verwacht` line is clutter — and that reason survives, since
// this is a lens per *failure*: it appears when a run leaves one and is gone the
// moment the expectation passes. What forced it is that VS Code has nowhere else
// to put the gesture where a reader is actually looking. Of the two places an
// extension may decorate a failure, `testing/message/content` draws a button
// inside the **peek** and `testing/message/context` is the results-tree menu;
// both need a gesture first, and the inline decoration — the red *40 euro !=
// 41,00 euro* badge, which is what a reader sees — accepts no contribution at
// all. A front door nobody finds is not a front door.

import {
	CodeLens, CodeLensProvider, Disposable, Event, EventEmitter, Position, Range,
	TestItem, TestMessage, TextDocument, TextEditor, Uri, commands, window
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import { ActiveScenario } from './activeScenario';
import { caseAtCursor } from './runDocument';
import { RunPanels } from './runPanel';
import { FailedExpectation, TestExplorer, splitId } from './testExplorer';

export const EXPLAIN_COMMAND = 'regelspraak.legUit';

/** The server's `regelspraak/explainTarget`, and the manifest's `when` key. */
const EXPLAIN_TARGET_REQUEST = 'regelspraak/explainTarget';
const EXPLAINABLE_CONTEXT = 'regelspraak.uitlegbaar';

/** The language both the gate and the menus are scoped to ([T-1]: one id). */
const LANGUAGE = 'regelspraak';

/**
 * How long the gate waits after the caret moves.
 *
 * The server's own debounce, deliberately: this is a request per cursor
 * position, and matching the interval the analysis already runs at means a
 * reader dragging a selection across a file asks once at the end of it rather
 * than once per character.
 */
const GATE_DEBOUNCE_MS = 250;

/** The slot the server says a position names — see its `protocol.ts`. */
export interface ExplainTarget {
	attribute: string;
	kind: 'attribuut' | 'kenmerk';
	instance?: string;
}

/**
 * What a `testing/message/context` menu hands its command.
 *
 * `test` is absent where the item has left the controller (VS Code says so), and
 * `message` carries the location this feature actually needs — so both are
 * optional here and the caller falls back to the editor, which is what the
 * palette entry does anyway.
 */
export interface MessageMenuArgs {
	test?: TestItem;
	message?: TestMessage;
}

/**
 * What a lens hands the command: a place, stated outright.
 *
 * The lens knows both halves — it was built from a failure that names its
 * document, its line and the case that produced it — so it says so rather than
 * letting the command re-derive them from wherever the caret happens to be. A
 * lens is clicked without moving the cursor, so re-deriving would explain a
 * different line than the one that was pressed.
 */
export interface ExplicitSite {
	uri: string;
	line: number;
	case: string;
}

/** Whatever entry point invoked the command. */
export type ExplainArgs = MessageMenuArgs | ExplicitSite;

/** Where the gesture was made, and — where the caller knows it — about what. */
export interface Site {
	uri: Uri;
	position: Position;
	/** The testgeval, where the entry point named one outright. */
	case?: { uri: string; case: string };
}

export class Explain implements Disposable {
	private readonly subscriptions: Disposable[] = [];
	private client: LanguageClient | undefined;
	private timer: NodeJS.Timeout | undefined;
	/** The last position the gate answered for, so a redraw does not re-ask. */
	private asked = '';

	constructor(
		private readonly tests: TestExplorer,
		private readonly panels: RunPanels,
		private readonly scenario: () => ActiveScenario | undefined
	) {
		this.subscriptions.push(
			window.onDidChangeTextEditorSelection(event => this.gate(event.textEditor)),
			window.onDidChangeActiveTextEditor(editor => this.gate(editor)));
	}

	/** Re-pointed on every (re)start; the gate closes when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
		this.asked = '';
		if (!client) {
			void commands.executeCommand('setContext', EXPLAINABLE_CONTEXT, false);
			return;
		}
		this.gate(window.activeTextEditor);
	}

	/**
	 * Answers the derivation of whatever the gesture pointed at.
	 *
	 * Every refusal says which of the three things was missing, because they have
	 * three different remedies: point somewhere else, choose a scenario, or start
	 * the server. A command that silently does nothing is indistinguishable from
	 * one that is broken.
	 */
	async explain(args?: ExplainArgs): Promise<void> {
		const site = siteOf(args);
		if (!site) {
			void window.showInformationMessage(
				'Zet de cursor op een waarde in een regel of in een testset.');
			return;
		}
		const target = await this.targetAt(site.uri, site.position);
		if (!target) {
			void window.showInformationMessage(
				'Op deze plek staat geen waarde waarvan een uitvoering de afleiding kent.');
			return;
		}
		const where = site.case ?? await this.testgeval(site.uri, site.position);
		if (!where) {
			return; // nothing to pick, or the pick was dismissed — both already said so
		}
		// Run first, exactly as **Regel uitvoeren** does: there is no retained run
		// to reuse yet (that is UX-3), and a panel drawn from an older run would
		// explain a model the reader has since edited.
		const run = await this.tests.runForDetail(where.uri, where.case);
		if (!run) {
			return;
		}
		// **The testset, not the document the gesture was made in.** Every range in
		// the view is a position in the file the run came from — see `RunPanels.show`.
		await this.panels.show(Uri.parse(where.uri), run, {
			kind: 'waarde',
			attribute: target.attribute,
			...(target.instance === undefined ? {} : { instance: target.instance })
		});
	}

	/**
	 * Which testgeval to run the explanation against.
	 *
	 * In a testset, the case the cursor is in — read from the Test Explorer's own
	 * tree, so "which testgeval is this" is decided by the same fact the Testing
	 * view draws with. In a rule file there is none, so it is the active
	 * scenario, which is X2b's answer to the identical question and carries its
	 * own status item saying which one it is.
	 */
	private async testgeval(
		uri: Uri,
		position: Position
	): Promise<{ uri: string; case: string } | undefined> {
		const here = caseAtCursor(this.tests.casesOfDocument(uri.toString()), position);
		if (here) {
			return { uri: uri.toString(), case: here };
		}
		const chosen = await this.scenario()?.require();
		return chosen ? { uri: chosen.uri, case: chosen.case } : undefined;
	}

	private async targetAt(uri: Uri, position: Position): Promise<ExplainTarget | undefined> {
		const client = this.client;
		if (!client) {
			void window.showWarningMessage('Er draait geen RegelSpraak-taalserver.');
			return undefined;
		}
		try {
			return await client.sendRequest<ExplainTarget | null>(EXPLAIN_TARGET_REQUEST, {
				textDocument: { uri: uri.toString() },
				position: { line: position.line, character: position.character }
			}) ?? undefined;
		} catch {
			// A server that is starting, restarting or gone answers nothing.
			return undefined;
		}
	}

	/**
	 * Keeps the context key the `editor/context` entry is gated on up to date.
	 *
	 * **The prepare-rename shape** (§UX-1): a menu entry that appears where the
	 * command would shrug teaches a reader that the feature does not work. A
	 * `when` clause can only read a context key, so the answer has to be pushed —
	 * there is no way to ask a server from a menu.
	 *
	 * It costs one round trip per settled caret position, and the server side of
	 * it is a lookup in a cached occurrence index over an unchanged model: a
	 * cursor move reparses nothing. Debounced all the same, and skipped where the
	 * position has not actually moved — a redraw fires the same event.
	 */
	private gate(editor: TextEditor | undefined): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
		if (!editor || editor.document.languageId !== LANGUAGE || !this.client) {
			this.asked = '';
			void commands.executeCommand('setContext', EXPLAINABLE_CONTEXT, false);
			return;
		}
		const at = editor.selection.active;
		const key = `${editor.document.uri.toString()}:${at.line}:${at.character}`;
		if (key === this.asked) {
			return;
		}
		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.asked = key;
			void this.targetAt(editor.document.uri, at).then(found =>
				commands.executeCommand('setContext', EXPLAINABLE_CONTEXT, Boolean(found)));
		}, GATE_DEBOUNCE_MS);
	}

	dispose(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.subscriptions.forEach(one => one.dispose());
		this.subscriptions.length = 0;
	}
}

/**
 * Where the gesture points, from whichever entry point made it.
 *
 * Pure and exported for the reason `rangeOfGesture` and `statusFor` are: a menu
 * cannot be driven from a test, so the half that decides anything lives where a
 * test reaches it. The two shapes are one decision — *whose* position is this —
 * and getting it wrong on the peek path would explain the line the editor
 * happens to be on rather than the expectation that failed.
 */
export function siteOf(
	args: ExplainArgs | undefined,
	active: { uri: Uri; position: Position } | undefined = fromEditor()
): Site | undefined {
	// A lens states its place; nothing is worked out from the editor, which on a
	// lens click is still wherever the reader left it.
	if (args && 'uri' in args && typeof args.uri === 'string') {
		return {
			uri: Uri.parse(args.uri),
			position: new Position(args.line, 0),
			case: { uri: args.uri, case: args.case }
		};
	}
	const location = (args as MessageMenuArgs | undefined)?.message?.location;
	if (location) {
		// The item's id is the only thing naming both the file and the case; where
		// the item is gone, the location still names the testset and the cursor
		// lookup finds the case in it.
		const item = (args as MessageMenuArgs).test;
		const [uri, name] = item ? splitId(item.id) : ['', ''];
		return {
			uri: location.uri,
			position: location.range.start,
			...(name ? { case: { uri, case: name } } : {})
		};
	}
	return active ? { uri: active.uri, position: active.position } : undefined;
}

function fromEditor(): { uri: Uri; position: Position } | undefined {
	const editor = window.activeTextEditor;
	return editor && editor.document.languageId === LANGUAGE
		? { uri: editor.document.uri, position: editor.selection.active }
		: undefined;
}

/**
 * A **leg uit** lens over every expectation the last run left failing.
 *
 * Lowercase, because that is the house style of the run lenses beside it
 * (`test uitvoeren`, `scenario uitvoeren`, `uitvoeren`) and this sits among
 * them. It reads what `TestExplorer` recorded and decides nothing: which line
 * failed and which case produced it are facts about a run, and a second reading
 * of them here could disagree with the Testing view's.
 */
export class FailureLenses implements CodeLensProvider {
	private readonly changed = new EventEmitter<void>();
	readonly onDidChangeCodeLenses: Event<void> = this.changed.event;
	private readonly subscription: Disposable;

	constructor(private readonly tests: TestExplorer) {
		this.subscription = tests.onDidChangeFailures(() => this.changed.fire());
	}

	provideCodeLenses(document: TextDocument): CodeLens[] {
		return this.tests.failuresIn(document.uri.toString()).map(one => lensFor(one));
	}

	dispose(): void {
		this.subscription.dispose();
		this.changed.dispose();
	}
}

/**
 * One lens, pure and exported so a test can read it.
 *
 * The whole line, deliberately: a lens is anchored by its range's start line and
 * the column decides nothing, so naming the line twice — here and in the
 * argument — would be one fact in two places.
 */
export function lensFor(failure: FailedExpectation): CodeLens {
	const site: ExplicitSite = {
		uri: failure.uri,
		line: failure.line,
		case: failure.case
	};
	return new CodeLens(new Range(failure.line, 0, failure.line, 0), {
		title: 'leg uit',
		// The expectation's own words, so hovering the lens says which of several
		// failures on adjacent lines this one is about.
		tooltip: `Hoe kwam '${failure.label}' tot stand?`,
		command: EXPLAIN_COMMAND,
		arguments: [site]
	});
}
