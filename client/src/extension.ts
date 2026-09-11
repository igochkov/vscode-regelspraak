import * as fs from 'fs';
import * as path from 'path';
import {
	commands, languages, window, workspace, ExtensionContext, FileSystemWatcher,
	Location, OutputChannel, Position, Range, SnippetString, Uri
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

import {
	DecisionTablePreviews, PREVIEW_DECISION_TABLES_COMMAND, previewActiveDocument
} from './decisionTablePreview';
import { MODEL_CHANGED_NOTIFICATION, ModelSource } from './model';
import { ModelDocuments, MODEL_SCHEME, SHOW_MODEL_COMMAND, showModel } from './modelDocument';
import { ModelExplorer } from './modelExplorer';
import { registerDebugging } from './debugAdapter';
import { TestExplorer } from './testExplorer';
import { RunDocuments, SHOW_RUN_AS_TEXT_COMMAND, caseAtCursor } from './runDocument';
import { RunPanels, SHOW_RUN_COMMAND } from './runPanel';
import { RunFocus } from './runView';
import { TestRun } from './testExplorer';
import { ActiveScenario, CHOOSE_SCENARIO_COMMAND, SCENARIO_SETTING } from './activeScenario';
import { EXPLAIN_COMMAND, Explain, ExplainArgs, FailureLenses, siteOf } from './explain';
import { recordServerBuild, ServerStatus, SHOW_LOG_COMMAND } from './serverStatus';
import { OPEN_SOURCE_COMMAND, openSource } from './sourceDocument';
import { IMPORT_ALEF_COMMAND, importFromAlef } from './alefImport';
import { DOCUMENT_SELECTOR, TEST_EVERYWHERE, isOurs } from './languages';
import { NOTEBOOK_TYPE, RegelSpraakNotebookSerializer } from './notebook/serializer';
import {
	NEW_NOTEBOOK_COMMAND, PREVIEW_REGLEMENT_COMMAND, newNotebook, previewReglement
} from './notebook/commands';

const SERVER_PATH_SETTING = 'regelspraak.server.path';
const RESTART_COMMAND = 'regelspraak.restartServer';

/**
 * Says out loud that a running language server has died (C6).
 *
 * **The one thing here that interrupts, and it earns it.** C7's status item goes
 * red at the same moment, which is the right loudness for everything else this
 * extension reports — but nothing recovers from this on its own, and a reader
 * who is not watching the status bar learns about it by noticing that features
 * have quietly stopped answering. That is exactly the state NFR-5 names: the one
 * thing worse than no language support is language support that looks like an
 * opinion.
 *
 * Two actions, because there are two things to do about it and both already
 * exist: read why, or try again. Dismissing is the third and needs no button.
 */
async function announceCrash(): Promise<void> {
	const readLog = 'Toon log';
	const restart = 'Opnieuw starten';
	const chosen = await window.showErrorMessage(
		'De RegelSpraak-taalserver is gestopt. Diagnostiek, navigatie en aanvulling zijn tot die tijd leeg.',
		readLog,
		restart
	);
	if (chosen === readLog) {
		await commands.executeCommand(SHOW_LOG_COMMAND);
	} else if (chosen === restart) {
		await commands.executeCommand(RESTART_COMMAND);
	}
}

/**
 * Opens the peek list a CodeLens counted (P13).
 *
 * `editor.action.showReferences` is VS Code's own and does exactly this, but it
 * takes a `Uri` and a `Position` — class instances — while a `Command` reaches
 * the client as plain JSON, so the server cannot invoke it directly. This one
 * converts and delegates. Registered but not contributed: it is the server's to
 * call and has no business in the Command Palette.
 */
const SHOW_REFERENCES_COMMAND = 'regelspraak.showReferences';

/**
 * The two protocol shapes that command carries, which are plain JSON on the wire.
 *
 * Named, and converted **whole**, because collapsing each location to its start
 * lost the half of it that does the work: `editor.action.showReferences` takes
 * `Location[]`, and a location with a real range is what makes the peek highlight
 * the phrase it found rather than putting a caret in front of the line. The
 * server already computes both ends and puts both on the wire.
 */
interface WirePosition { line: number; character: number }
interface WireLocation { uri: string; range: { start: WirePosition; end: WirePosition } }

const toPosition = (p: WirePosition): Position => new Position(p.line, p.character);
const toRange = (r: { start: WirePosition; end: WirePosition }): Range =>
	new Range(toPosition(r.start), toPosition(r.end));

/**
 * Formats the active RegelSpraak document, and says so when it will not.
 *
 * The editor's own **Format Document** already reaches the server, so the value
 * of a command of our own is entirely in the two cases where formatting produces
 * nothing: the setting is off, or the file does not parse and the formatter
 * refuses to guess at its layout. Both leave `Shift+Alt+F` looking broken. This
 * one takes that keystroke inside `.rgs` files, delegates in the normal case, and
 * explains in the other two.
 */
const FORMAT_COMMAND = 'regelspraak.formatDocument';

/**
 * Two characters RegelSpraak needs that a QWERTY keyboard does not carry.
 *
 * The bullet opens a criterion (§13.4.8 #9) and the guillemets delimit an
 * interpolation inside a text value (§13.4.17). D7's on-enter rules already
 * *continue* a bullet run and D4 already closes a `«` once it is typed — what
 * neither could do is produce the first character, which is why these exist.
 *
 * **Insert, never substitute.** Replacing `•` with `-` in the grammar was the
 * other option and is refused: `-` is already §13.4.10's distribution item, so
 * the two lists would collide exactly where nesting matters, and a `.rgs` file
 * written that way is no longer the language the specification describes. The
 * cost of the character is that it is hard to type, and that is a keyboard
 * problem with a keyboard answer.
 */
const INSERT_BULLET_COMMAND = 'regelspraak.invoegenOpsommingsteken';
const INSERT_GUILLEMETS_COMMAND = 'regelspraak.invoegenInvulling';

/**
 * Asks the server why formatting would do nothing, rather than working it out.
 *
 * Both reasons are the server's own — it reads `regelspraak.format.enable`, and
 * whether a document parses is a fact about its parse tree. This used to be
 * inferred from the published `RS001`/`RS002`/`RS003` diagnostics, which is a
 * side channel with two holes in it: `regelspraak.validation.enable: false`
 * publishes nothing at all, and `regelspraak.validation.runOn: "save"` publishes
 * nothing between saves, so the command fell silent in exactly the states it
 * exists to speak in. It also meant holding a copy of the server's syntax codes
 * that nothing across the repository boundary could check.
 *
 * The method name is the one thing both halves still have to agree on by hand,
 * and a wire method is the smallest such contract there is.
 */
const FORMAT_STATE_REQUEST = 'regelspraak/formatState';

type FormatState = 'ok' | 'disabled' | 'syntaxError' | 'unknown';

/** Reveals the Model Explorer (W2), which is FSD §C2's `showModelExplorer`. */
const SHOW_MODEL_EXPLORER_COMMAND = 'regelspraak.showModelExplorer';

/**
 * X2a's run lens, and the server writes the same string.
 *
 * A lens's `Command` crosses the protocol as plain JSON, so what travels is the
 * document's URI and — for one case — the testgeval's name, which is the id the
 * `TestController` already files that item under.
 */
const RUN_TESTGEVAL_COMMAND = 'regelspraak.runTestgeval';

/**
 * X2b's run lens above a rule, and the server writes the same string.
 *
 * It carries the rule's document and its name. Only the name is used — the run
 * is of the active testgeval, so the view's source is that testset and not the
 * file the lens was pressed in. Which testgeval that is stays deliberately *off*
 * the wire: it is this side's state, and a lens that named a scenario would go
 * stale the moment another one is chosen.
 */
const RUN_REGEL_COMMAND = 'regelspraak.runRegel';

/**
 * UX-6 — this run of a testgeval against the previous one.
 *
 * Reached from the palette, from the results-tree menu on a failure, and from
 * the panel's own toolbar. The first two run the case (there being nothing in
 * hand to compare) and the third compares what is already drawn — one command
 * either way, so the two halves of the feature cannot come to mean different
 * things.
 */
const COMPARE_RUN_COMMAND = 'regelspraak.vergelijkUitvoering';

/** The view id, and so also the id of the `.focus` command VS Code derives. */
const MODEL_EXPLORER_VIEW = 'regelspraak.modelExplorer';

/**
 * Gates the view container on this extension being active.
 *
 * A contributed container is shown before its extension is activated, and this
 * one activates on `workspaceContains:**\/*.rgs` — so without the gate a
 * workspace with no RegelSpraak in it grows an activity-bar icon that opens an
 * empty panel and never fills.
 */
const ACTIVE_CONTEXT = 'regelspraak.active';

let client: LanguageClient | undefined;
let watcher: FileSystemWatcher | undefined;

/** One source for both model views (W2, W5), and the only holder of the client. */
const modelSource = new ModelSource();
const modelExplorer = new ModelExplorer(modelSource);
const modelDocuments = new ModelDocuments(modelSource);
const decisionTablePreviews = new DecisionTablePreviews(modelSource);
const testExplorer = new TestExplorer();
const runDocuments = new RunDocuments();
/**
 * W3. The panel is what a run opens; the text form is one click away in it.
 *
 * It is handed the Test Explorer, which answers the two things a panel cannot:
 * UX-4's expansion, which is a request to the server, and UX-6's previous run,
 * which is the history every detailed run already passes through.
 */
const runPanels = new RunPanels(testExplorer);
/**
 * UX-1. Holds the client for its own gate, so the context menu entry appears
 * exactly where the command has an answer — and disappears when the server does.
 */
const explain = new Explain(testExplorer, runPanels, () => activeScenario);
/**
 * UX-1's own lens, over the expectations the last run left failing.
 *
 * This side and not the server, unlike every other lens in this extension: what
 * failed is a fact about a run the client made, and the server is not told the
 * outcome. It is registered for the language rather than for `*.test.rgs`,
 * since both are one language id ([T-1]) and a model document simply has no
 * failures to report.
 */
const failureLenses = new FailureLenses(testExplorer);

/** X2b's, and the only one of these that needs the extension context. */
let activeScenario: ActiveScenario | undefined;

/** Created on activation, so it can say "starting" before there is a client. */
let serverStatus: ServerStatus | undefined;

/**
 * Owned here rather than left to `LanguageClient`, so the resolution report
 * below survives a restart and shares one channel with the server's own log.
 */
let output: OutputChannel | undefined;

/**
 * Restarts run one at a time on this chain. They can now arrive close
 * together — a settings change, the restart command, an impatient second
 * invocation — and interleaved stop/start phases would leave a second server
 * process running with nothing left referring to it.
 */
let chain: Promise<void> = Promise.resolve();

function inSuccession(work: () => Promise<void>): Promise<void> {
	const next = chain.then(work, work);
	// The chain has to survive a failing link, and must never itself reject:
	// it is only a queue.
	chain = next.catch(() => undefined);
	return next;
}

async function restart(context: ExtensionContext): Promise<void> {
	await stopClient();
	await startClient(context);
}

/**
 * What the extension hands back to whoever activated it.
 *
 * Only what the end-to-end suite has no other way to reach. A tree view, a
 * language status item and a webview are all drawn by the workbench and none
 * has a command surface to assert against — so without this, the only thing
 * that could check the custom requests across the repository boundary would be
 * a screenshot. The model source is here for the same reason and is the object
 * those requests are made through.
 */
export interface RegelSpraakApi {
	modelExplorer: ModelExplorer;
	serverStatus: ServerStatus;
	modelSource: ModelSource;
	testExplorer: TestExplorer;
	activeScenario: ActiveScenario;
}

export async function activate(context: ExtensionContext): Promise<RegelSpraakApi> {
	output = window.createOutputChannel('RegelSpraak Language Server');
	context.subscriptions.push(output);

	serverStatus = new ServerStatus(() => void announceCrash());
	context.subscriptions.push(
		serverStatus,
		commands.registerCommand(SHOW_LOG_COMMAND, () => output?.show(true)));
	context.subscriptions.push(
		commands.registerCommand(OPEN_SOURCE_COMMAND, openSource));

	void commands.executeCommand('setContext', ACTIVE_CONTEXT, true);
	context.subscriptions.push(
		// Withdrawn on the way out, with everything else this function registered:
		// a context key is global to the window, and one left set by an extension
		// that is no longer running keeps an activity-bar container on screen whose
		// view has nothing behind it.
		{ dispose: () => void commands.executeCommand('setContext', ACTIVE_CONTEXT, false) },
		modelExplorer,
		modelDocuments,
		testExplorer,
		runDocuments,
		runPanels,
		window.createTreeView(MODEL_EXPLORER_VIEW, {
			treeDataProvider: modelExplorer,
			// The declaration a row stands for is what a click opens; selecting
			// several of them would be a gesture with nothing behind it.
			canSelectMany: false,
			showCollapseAll: true
		}));

	context.subscriptions.push(
		commands.registerCommand(SHOW_MODEL_EXPLORER_COMMAND,
			() => commands.executeCommand(`${MODEL_EXPLORER_VIEW}.focus`)));

	// [N-1]. A notebook is a Markdown file and this is the view of it: the cells
	// are regions of the text, and what is written back is the text. Outputs are
	// transient because a run is a fact about a model and a scenario at one
	// moment, and a stored one goes stale the way UX-3's *gone* state already
	// handles.
	context.subscriptions.push(
		workspace.registerNotebookSerializer(
			NOTEBOOK_TYPE, new RegelSpraakNotebookSerializer(),
			{
				transientOutputs: true,
				transientCellMetadata: { executionOrder: true },
				transientDocumentMetadata: {}
			}),
		// The two gestures a notebook needs that VS Code has no default for: one
		// that makes the first one, and one that reads the whole of it as the
		// document it is ([N-1a]).
		commands.registerCommand(NEW_NOTEBOOK_COMMAND, newNotebook),
		commands.registerCommand(PREVIEW_REGLEMENT_COMMAND, previewReglement));

	context.subscriptions.push(
		workspace.registerTextDocumentContentProvider(MODEL_SCHEME, modelDocuments),
		commands.registerCommand(SHOW_MODEL_COMMAND, showModel));

	context.subscriptions.push(
		decisionTablePreviews,
		// Two callers, one command. The server's CodeLens passes the document and a
		// position inside the table it is above, as plain JSON; the palette passes
		// nothing and the active editor is the answer.
		commands.registerCommand(PREVIEW_DECISION_TABLES_COMMAND,
			(uri?: string, position?: WirePosition) => uri
				? decisionTablePreviews.show(Uri.parse(uri), position && toPosition(position))
				: previewActiveDocument(decisionTablePreviews)),
		// X2a. Handed to the Test Explorer rather than to the request, so a run
		// from the text and a run from the Testing view are one thing.
		commands.registerCommand(RUN_TESTGEVAL_COMMAND,
			(uri: string, caseName?: string) => testExplorer.runFromLens(uri, caseName)),
		// X4. From the palette, on the testgeval the cursor is in: a second lens
		// per case would double the noise above every one of them.
		commands.registerCommand(SHOW_RUN_COMMAND, showRunOutcome),
		// UX-1. Three menus reach this one command, and the argument is whatever
		// the entry point had: a `testing/message/context` menu hands over the
		// failing expectation, and the palette and the editor menu hand over
		// nothing, so the active editor answers. Registered here and owned by
		// `explain`, which is also what keeps the gate's context key in step.
		explain,
		failureLenses,
		// [N-9]. A failure lens sits on a `Verwacht` line, which is only ever in a
		// testset — so it follows the test language rather than both, in a file
		// and in a notebook cell alike. It covered `.test.rgs` by accident until
		// [N-5] gave those files their own id.
		languages.registerCodeLensProvider(TEST_EVERYWHERE, failureLenses),
		// A recorded line is a fact about the text that produced it, so an edit
		// retires it: after one the lens would sit on whatever moved into that
		// line, which is a confident wrong answer rather than a missing one.
		workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length > 0) {
				testExplorer.forgetFailures(event.document.uri.toString());
			}
		}),
		commands.registerCommand(EXPLAIN_COMMAND,
			(args?: ExplainArgs) => explain.explain(args)),
		// UX-6. The argument is whatever the entry point had: a
		// `testing/message/context` menu hands over the failing expectation, the
		// palette hands over nothing and the active editor answers.
		commands.registerCommand(COMPARE_RUN_COMMAND,
			(args?: ExplainArgs) => compareRuns(args)),
		// The panel's own **Als tekst openen**, and its only caller: a trace is
		// something people paste, and a webview cannot be copied out of.
		commands.registerCommand(SHOW_RUN_AS_TEXT_COMMAND,
			(uri: string, run: TestRun, focus?: RunFocus, previous?: TestRun) =>
				previous
					// UX-6's native layer: two rendered runs in VS Code's own diff
					// editor, which is every difference marked with no diffing code
					// on this side at all.
					? runDocuments.showDiff(Uri.parse(uri), previous, run, focus)
					: runDocuments.show(Uri.parse(uri), run, focus)));

	// X5. The adapter is inline — no second process, and no
	// `@vscode/debugadapter` dependency, so the bundle stays the size it is. It
	// is also the only module on either side that knows about DAP: the server
	// exposes five operations behind one method, and the mismatches between the
	// protocol and a rule engine (no call stack, no `stepIn`) stop here.
	context.subscriptions.push(...registerDebugging(() => client));

	// A crashed or wedged server is otherwise only recoverable by reloading
	// the whole window (FSD NFR-5).
	context.subscriptions.push(
		commands.registerCommand(RESTART_COMMAND, async () => {
			await inSuccession(() => restart(context));
			if (client) {
				window.setStatusBarMessage('RegelSpraak-taalserver opnieuw gestart.', 3000);
			}
		})
	);

	context.subscriptions.push(
		commands.registerCommand(SHOW_REFERENCES_COMMAND,
			(uri: string, position: WirePosition, locations: WireLocation[]) => {
				void commands.executeCommand(
					'editor.action.showReferences',
					Uri.parse(uri),
					toPosition(position),
					locations.map(location => new Location(Uri.parse(location.uri), toRange(location.range)))
				);
			})
	);

	context.subscriptions.push(commands.registerCommand(FORMAT_COMMAND, formatDocument));
	context.subscriptions.push(
		commands.registerCommand(INSERT_BULLET_COMMAND, insertBullet),
		commands.registerCommand(INSERT_GUILLEMETS_COMMAND, insertGuillemets));

	// C11. Ungated on the active file: importing a project is not about the
	// document in front of you, and there may not be one — an empty window is
	// exactly where somebody reaches for this.
	context.subscriptions.push(
		commands.registerCommand(IMPORT_ALEF_COMMAND, () => importFromAlef(client)));

	activeScenario = new ActiveScenario(context, testExplorer);
	context.subscriptions.push(
		activeScenario,
		commands.registerCommand(CHOOSE_SCENARIO_COMMAND, () => activeScenario?.choose()),
		// X2b. The rule comes from the lens; the scenario is this side's state, and
		// pressing with none chosen asks for one rather than refusing.
		commands.registerCommand(RUN_REGEL_COMMAND,
			(uri: string, ruleName: string) => runRule(uri, ruleName)),
		// The setting is one of the two layers, so the status item has to follow it:
		// a default edited in settings.json would otherwise still read as the old one.
		workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(SCENARIO_SETTING)) {
				activeScenario?.refresh();
			}
		}));

	// Re-resolve on change, so pointing the setting at a different server build
	// takes effect without reloading the window.
	context.subscriptions.push(
		workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(SERVER_PATH_SETTING)) {
				void inSuccession(() => restart(context));
			}
		})
	);

	await inSuccession(() => startClient(context));
	return { modelExplorer, serverStatus, modelSource, testExplorer, activeScenario };
}

export function deactivate(): Thenable<void> | undefined {
	return stopClient();
}

/**
 * Runs the testgeval the cursor is in and shows what it computed (X4).
 *
 * Which case that is comes from the Test Explorer's own tree, whose ranges are
 * the server's answer — so "which testgeval is this" is decided by the same fact
 * the Testing view draws with, and not by a second reading of the text on a side
 * that has no parser for it.
 */
async function showRunOutcome(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor) {
		void window.showInformationMessage('Open eerst een testset (*.test.rgs).');
		return;
	}
	const uri = editor.document.uri.toString();
	const caseName = caseAtCursor(
		testExplorer.casesOfDocument(uri), editor.selection.active);
	if (!caseName) {
		void window.showInformationMessage(
			'Zet de cursor in een testgeval waarvan u de uitkomst wilt zien.');
		return;
	}
	const run = await testExplorer.runForDetail(uri, caseName);
	if (run) {
		await runPanels.show(editor.document.uri, run);
	}
}

/**
 * UX-6 — runs a testgeval and shows it against the previous run of it.
 *
 * **A run and then a comparison**, in that order: the reader pressed this after
 * changing something, so the interesting half is the run they have not made
 * yet. The other half is the one `TestExplorer` retained, which is why this can
 * be pressed twice in a row and mean two different things — the second press
 * compares against the first press's run.
 *
 * Where there is no previous run it says so and opens the run anyway: a first
 * comparison that showed nothing at all would read as a broken command, and the
 * run itself is what makes the *next* press work.
 */
async function compareRuns(args?: ExplainArgs): Promise<void> {
	const site = siteOf(args);
	if (!site) {
		void window.showInformationMessage('Open eerst een testset (*.test.rgs).');
		return;
	}
	const uri = site.case?.uri ?? site.uri.toString();
	const caseName = site.case?.case
		?? caseAtCursor(testExplorer.casesOfDocument(uri), site.position);
	if (!caseName) {
		void window.showInformationMessage(
			'Zet de cursor in het testgeval dat u met de vorige uitvoering wilt vergelijken.');
		return;
	}
	// Read *before* the run, which moves the history along: what "the previous
	// uitvoering" means is the one before the one now being made.
	const previous = testExplorer.previousRun(uri, caseName);
	const run = await testExplorer.runForDetail(uri, caseName);
	if (!run) {
		return;
	}
	if (!previous) {
		void window.showInformationMessage(
			`Er is nog geen eerdere uitvoering van '${caseName}' om mee te vergelijken. `
			+ 'Pas het model aan en vergelijk opnieuw.');
	}
	await runPanels.show(Uri.parse(uri), run, undefined, previous);
}

/**
 * Runs the active scenario and shows what one rule did (X2b).
 *
 * This *is* a test run — the same request, read as an answer about a rule rather
 * than about an expectation — because the engine has no way to evaluate one rule
 * on its own: firing order is dependency-driven over the whole model ([E-7]), and
 * a rule's inputs are whatever the rules before it derived. So "run this rule"
 * can only mean run the model and show what this rule did, and a second kind of
 * run would be a second execution model.
 */
async function runRule(_uri: string, ruleName: string): Promise<void> {
	const scenario = await activeScenario?.require();
	if (!scenario) {
		return; // nothing to pick, or the pick was dismissed — both already said so
	}
	const run = await testExplorer.runForDetail(scenario.uri, scenario.case);
	if (run) {
		// **The testset, not the rule's own document.** The view's source is where
		// the run came from, and every range in it — each expectation's `Verwacht`
		// line — is a position in *that* file. Passing the rule's document made
		// those ranges line numbers in the wrong file, so clicking an expectation
		// landed wherever that line happened to be in the model. The lens's own
		// URI is not needed: the panel opens beside whatever is active, and the
		// jump back to a rule goes through the workspace symbols by name.
		await runPanels.show(Uri.parse(scenario.uri), run, { kind: 'regel', rule: ruleName });
	}
}

/**
 * A `•` at the caret, at the depth the line above is written at.
 *
 * The run states its own depth, so a criterion under a `••` line is another
 * `••` — reading the line above is how the editor can know that without being
 * told. An empty document, or a first bullet, gets one.
 */
async function insertBullet(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
		return;
	}
	const line = editor.selection.active.line;
	let run = '•';
	for (let above = line - 1; above >= 0; above--) {
		const text = editor.document.lineAt(above).text;
		const bullets = /^\s*(•+)\s/u.exec(text);
		if (bullets) {
			run = bullets[1];
			break;
		}
		if (text.trim().length > 0) {
			break;
		}
	}
	await editor.insertSnippet(new SnippetString(`${run} `));
}

/**
 * `«…»` around the selection, or an empty pair with the caret between them.
 *
 * A snippet rather than an edit, so that selecting a phrase and pressing the
 * key wraps it — which is the gesture somebody reaches for when a text value is
 * already written and one word of it has to become a reference.
 */
async function insertGuillemets(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
		return;
	}
	await editor.insertSnippet(new SnippetString('«${TM_SELECTED_TEXT:$1}»'));
}

async function formatDocument(): Promise<void> {
	const editor = window.activeTextEditor;
	// Both languages: the layout engine reads a testset as it reads a model file,
	// and the round-trip gate runs over both corpora.
	if (!editor || !isOurs(editor.document.languageId)) {
		return;
	}
	// The message is this half's — it knows what the user pressed — and the
	// reason is the server's. Where there is no server to ask, or it is too old
	// to know the request, delegating is the honest answer: the editor's own
	// Format Document is what the keystroke would have done anyway.
	switch (await formatState(editor.document.uri.toString())) {
		case 'disabled':
			void window.showInformationMessage(
				'Opmaken is uitgeschakeld. Zet "regelspraak.format.enable" aan om het te gebruiken.');
			return;
		case 'syntaxError':
			void window.showWarningMessage(
				'Dit bestand bevat een syntaxfout en wordt niet opgemaakt; los de fout eerst op.');
			return;
		default:
			await commands.executeCommand('editor.action.formatDocument');
	}
}

async function formatState(uri: string): Promise<FormatState> {
	if (!client) {
		return 'unknown';
	}
	try {
		return await client.sendRequest<FormatState>(FORMAT_STATE_REQUEST, { uri });
	} catch {
		return 'unknown';
	}
}

/**
 * Resolves the language server entry point.
 *
 * An explicit setting wins, so that a checkout of this repository — which
 * carries no server of its own — can run against a local server build. The
 * fallback is the server bundled inside a released .vsix.
 */
function resolveServerModule(context: ExtensionContext): { module: string; origin: string } {
	const configured = workspace.getConfiguration().get<string>(SERVER_PATH_SETTING)?.trim();

	if (configured) {
		// Relative paths resolve against the workspace, which is the useful
		// anchor for a sibling server checkout.
		const base = workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.extensionPath;

		return {
			module: path.isAbsolute(configured) ? configured : path.resolve(base, configured),
			origin: `de instelling "${SERVER_PATH_SETTING}"`
		};
	}

	return {
		module: context.asAbsolutePath(path.join('server', 'out', 'server.js')),
		origin: 'de met de extensie meegeleverde taalserver'
	};
}

/**
 * Records which server this session is actually running, and when it was built.
 *
 * Both are otherwise invisible: the two resolution slots look identical from
 * the outside, and a server left over from an earlier packaging run behaves
 * like a working one — it simply answers with the language as it was then.
 * That failure presents as "my change had no effect", which is a long way from
 * its cause.
 */
function reportServerOrigin(module: string, origin: string): void {
	let builtAt: string | undefined;
	try {
		builtAt = fs.statSync(module).mtime.toLocaleString('nl-NL');
	} catch {
		builtAt = undefined;
	}
	recordServerBuild({ module, origin, builtAt });
	output?.appendLine(`Taalserver : ${module}`);
	output?.appendLine(`Herkomst   : ${origin}`);
	output?.appendLine(`Gebouwd    : ${builtAt ?? 'niet gevonden'}`);
}

async function startClient(context: ExtensionContext): Promise<void> {
	const { module: serverModule, origin } = resolveServerModule(context);
	reportServerOrigin(serverModule, origin);
	serverStatus?.set('starting');

	if (!fs.existsSync(serverModule)) {
		// A released .vsix bundles the server, so reaching this in a release is
		// a packaging fault. In a checkout of this repository it is the normal
		// unconfigured state, and the way out is a development setup step —
		// name both options, because the setting has to be set in the window
		// that runs the extension (the development host), which is easy to get
		// wrong, whereas linking the build in needs no setting at all.
		void window.showErrorMessage(
			`De RegelSpraak-taalserver is niet gevonden op ${serverModule}, bepaald via ${origin}. ` +
			`Koppel een serverbuild als "server/" in de extensiemap, ` +
			`of laat "${SERVER_PATH_SETTING}" naar een serverbuild verwijzen (in de instellingen van dít ` +
			`venster — bij debuggen is dat de Extension Development Host, niet het venster waarin op F5 is gedrukt).`
		);
		// The notification is dismissed and then the window looks like one where
		// RegelSpraak simply has no opinions. The status item is what is still
		// there afterwards, and it names the path that was tried.
		serverStatus?.set('error',
			`De taalserver is niet gevonden op ${serverModule}, bepaald via ${origin}.`);
		return;
	}

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			// **The server opens no inspector of its own** (6 September 2026), and
			// this is the one place the two halves of debugging could ask for the
			// same thing twice.
			//
			// It read `--inspect=6009` and then `--inspect=0`, on the reasoning
			// that a debugger needs a port to attach to. It does not:
			// `.vscode/launch.json` sets `autoAttachChildProcesses`, so js-debug
			// attaches to this fork by injecting its own bootloader into the
			// child's environment, and it does that whether or not the child was
			// told to listen. Passing `--inspect` as well means **two mechanisms
			// attaching a debugger to one process**, which is a race rather than a
			// belt and braces — and the extension host, which is an Electron
			// UtilityProcess and the thing doing the forking, was aborting with
			// SIGABRT about a second into activation, most launches but not all.
			//
			// The fixed port was worth removing on its own account and the
			// reasoning is kept, because it is the shape of thing that gets
			// reinstated: a second development host could not start its server at
			// all (Node refuses a port in use and exits before the LSP handshake,
			// so the window comes up with no language features and nothing saying
			// why), and a host that dies without running `deactivate` orphans the
			// server on Windows, which then holds the port and breaks the *next*
			// F5 for a reason belonging to the run before it.
			//
			// What is left is `--nolazy`, which is about V8 compiling eagerly so
			// breakpoints bind, and has nothing to do with the inspector.
			options: { execArgv: ['--nolazy'] }
		}
	};

	// The server indexes every model file in the workspace into one model per
	// workspace folder ([N-10], FSD §3.5); watched-file events keep unopened
	// files fresh. Held in a variable because the client hooks it but never owns
	// it — see stopClient.
	//
	// **Both suffixes, and they are two**: a `.rgs.md` notebook ([N-1]) does not
	// match `**/*.rgs`, and it is part of the model exactly as a `.rgs` file is —
	// a declaration in a notebook cell is a declaration of the workspace. Left
	// out, a notebook nobody has open would be indexed once by the scan and never
	// re-read, so a `git pull` that changed it would leave every other file
	// judged against the old one. `workspace/files.ts`'s `findRgsFiles` is the
	// other half of this and collects the same two.
	watcher = workspace.createFileSystemWatcher('**/*.{rgs,rgs.md}');

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Four entries, and which four is `languages.ts` — the file rule and the
		// cell rule are one question ([N-5]) and answering it twice is how a
		// provider comes to be registered for a document the menus think it
		// covers.
		documentSelector: DOCUMENT_SELECTOR,
		synchronize: {
			fileEvents: watcher
		},
		// Ours, so the resolution report above and the server's log end up in
		// one place; the extension disposes it, not the client.
		outputChannel: output,
		// A source citation in a hover opens the provision rendered, which needs a
		// `command:` link — see sourceDocument.ts. Exactly that one command and no
		// others: the Markdown of a hover ends in doc comments the model's own author
		// wrote, so a blanket `isTrusted` would let any of them run anything.
		markdown: { isTrusted: { enabledCommands: [OPEN_SOURCE_COMMAND] } }
	};

	client = new LanguageClient(
		'regelspraakLanguageServer',
		'RegelSpraak Language Server',
		serverOptions,
		clientOptions
	);

	// Before `start`, so the item follows the whole life of this client and not
	// only the two moments this function drives. `LanguageClient` restarts a
	// crashed server on its own and eventually gives up, and neither happens
	// through the calls below — see `ServerStatus.follow`. A deliberate stop is
	// not misreported as a crash because `stopClient` says `stopped` *before* it
	// calls `stop()`, and `follow` only speaks up about a server that was `ready`.
	client.onDidChangeState(event => serverStatus?.follow(event.newState));

	// Start the client. This will also launch the server
	try {
		await client.start();
	} catch (error) {
		serverStatus?.set('error', `De taalserver kon niet starten: ${String(error)}`);
		throw error;
	}
	serverStatus?.set('ready');

	// The two model views are a third projection beside the colours and the
	// hints. They are told about more changes than those two, because nothing
	// re-reads a tree or a virtual document on its own — see the server's
	// `protocol.ts`. Subscribed after `start`, and per client, because a restart
	// builds a new one — and re-pointed at it, since the old one answers
	// nothing.
	client.onNotification(MODEL_CHANGED_NOTIFICATION, () => {
		modelExplorer.refresh();
		modelDocuments.refresh();
		// The Test Explorer is the third such projection, and it needs the same
		// notification for a wider reason: a testgeval composes against the whole
		// model, so a rule edited in another file can change whether one runs.
		void testExplorer.refresh();
	});
	modelSource.setClient(client);
	testExplorer.setClient(client);
	explain.setClient(client);
	modelExplorer.refresh();
}

async function stopClient(): Promise<void> {
	const running = client;
	const toClose = watcher;
	client = undefined;
	watcher = undefined;
	modelSource.setClient(undefined);
	testExplorer.setClient(undefined);
	explain.setClient(undefined);
	modelExplorer.refresh();
	// Only where one was running: a failed start already said something more
	// useful, and `stopClient` runs on the way into every restart.
	if (running) {
		serverStatus?.set('stopped');
	}

	try {
		await running?.stop();
	} catch (error) {
		// A client that never started cleanly still has to let go of what it
		// holds; a restart matters more here than the failure being reported.
		console.error(error);
	} finally {
		// `synchronize.fileEvents` subscribes to the watcher without adopting
		// it, so every restart would otherwise leave a live workspace-wide
		// file watcher behind.
		toClose?.dispose();
	}
}
