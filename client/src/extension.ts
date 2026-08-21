import * as fs from 'fs';
import * as path from 'path';
import {
	commands, window, workspace, ExtensionContext, FileSystemWatcher, Location,
	OutputChannel, Position, Range, Uri
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
import { TestExplorer } from './testExplorer';
import { RunDocuments, SHOW_RUN_COMMAND, caseAtCursor } from './runDocument';
import { ActiveScenario, CHOOSE_SCENARIO_COMMAND, SCENARIO_SETTING } from './activeScenario';
import { ServerStatus, SHOW_LOG_COMMAND } from './serverStatus';

const SERVER_PATH_SETTING = 'regelspraak.server.path';
const RESTART_COMMAND = 'regelspraak.restartServer';

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
 * It carries the rule's document and its name. Which testgeval to run it
 * against is deliberately *not* on the wire: that is this side's state, and a
 * lens that named a scenario would go stale the moment another one is chosen.
 */
const RUN_REGEL_COMMAND = 'regelspraak.runRegel';

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

	serverStatus = new ServerStatus();
	context.subscriptions.push(
		serverStatus,
		commands.registerCommand(SHOW_LOG_COMMAND, () => output?.show(true)));

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
		commands.registerCommand(SHOW_RUN_COMMAND, showRunOutcome));

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
		await runDocuments.show(editor.document.uri, run);
	}
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
async function runRule(uri: string, ruleName: string): Promise<void> {
	const scenario = await activeScenario?.require();
	if (!scenario) {
		return; // nothing to pick, or the pick was dismissed — both already said so
	}
	const run = await testExplorer.runForDetail(scenario.uri, scenario.case);
	if (run) {
		// Beside the *rule*, not beside the testset: the question was asked here.
		await runDocuments.show(Uri.parse(uri), run, ruleName);
	}
}

async function formatDocument(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
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
	output?.appendLine(`Taalserver : ${module}`);
	output?.appendLine(`Herkomst   : ${origin}`);
	try {
		output?.appendLine(`Gebouwd    : ${fs.statSync(module).mtime.toLocaleString('nl-NL')}`);
	} catch {
		output?.appendLine('Gebouwd    : niet gevonden');
	}
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
			`venster — bij debuggen is dat de Extension Development Host, niet het venster waarin op F5 is gedrukt). ` +
			`Zie docs/DEVELOPING.md, "Pointing the extension at a language server".`
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
			// Lets a debugger attach to the server process the extension spawns.
			options: { execArgv: ['--nolazy', '--inspect=6009'] }
		}
	};

	// The server indexes every .rgs file in the workspace into one model
	// (FSD §3.5); watched-file events keep unopened files fresh. Held in a
	// variable because the client hooks it but never owns it — see stopClient.
	watcher = workspace.createFileSystemWatcher('**/*.rgs');

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for RegelSpraak documents
		documentSelector: [{ scheme: 'file', language: 'regelspraak' }],
		synchronize: {
			fileEvents: watcher
		},
		// Ours, so the resolution report above and the server's log end up in
		// one place; the extension disposes it, not the client.
		outputChannel: output
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
	modelExplorer.refresh();
}

async function stopClient(): Promise<void> {
	const running = client;
	const toClose = watcher;
	client = undefined;
	watcher = undefined;
	modelSource.setClient(undefined);
	testExplorer.setClient(undefined);
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
