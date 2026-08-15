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

let client: LanguageClient | undefined;
let watcher: FileSystemWatcher | undefined;

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

export async function activate(context: ExtensionContext): Promise<void> {
	output = window.createOutputChannel('RegelSpraak Language Server');
	context.subscriptions.push(output);

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
}

export function deactivate(): Thenable<void> | undefined {
	return stopClient();
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

	// Start the client. This will also launch the server
	await client.start();
}

async function stopClient(): Promise<void> {
	const running = client;
	const toClose = watcher;
	client = undefined;
	watcher = undefined;

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
