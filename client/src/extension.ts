import * as fs from 'fs';
import * as path from 'path';
import { commands, window, workspace, ExtensionContext, FileSystemWatcher } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

const SERVER_PATH_SETTING = 'regelspraak.server.path';
const RESTART_COMMAND = 'regelspraak.restartServer';

let client: LanguageClient | undefined;
let watcher: FileSystemWatcher | undefined;

/**
 * Restarts run one at a time on this chain. They can now arrive close
 * together — a settings change, the restart command, an impatient second
 * invocation — and interleaved stop/start phases would leave a second server
 * process running with nothing left referring to it.
 */
let keten: Promise<void> = Promise.resolve();

function achterElkaar(werk: () => Promise<void>): Promise<void> {
	const volgende = keten.then(werk, werk);
	// The chain has to survive a failing link, and must never itself reject:
	// it is only a queue.
	keten = volgende.catch(() => undefined);
	return volgende;
}

async function herstart(context: ExtensionContext): Promise<void> {
	await stopClient();
	await startClient(context);
}

export async function activate(context: ExtensionContext): Promise<void> {
	// A crashed or wedged server is otherwise only recoverable by reloading
	// the whole window (FSD NFR-5).
	context.subscriptions.push(
		commands.registerCommand(RESTART_COMMAND, async () => {
			await achterElkaar(() => herstart(context));
			if (client) {
				window.setStatusBarMessage('RegelSpraak-taalserver opnieuw gestart.', 3000);
			}
		})
	);

	// Re-resolve on change, so pointing the setting at a different server build
	// takes effect without reloading the window.
	context.subscriptions.push(
		workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(SERVER_PATH_SETTING)) {
				void achterElkaar(() => herstart(context));
			}
		})
	);

	await achterElkaar(() => startClient(context));
}

export function deactivate(): Thenable<void> | undefined {
	return stopClient();
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

async function startClient(context: ExtensionContext): Promise<void> {
	const { module: serverModule, origin } = resolveServerModule(context);

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
			`Zie het README-hoofdstuk "Pointing the extension at a language server".`
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
		}
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
	const draaiend = client;
	const teSluiten = watcher;
	client = undefined;
	watcher = undefined;

	try {
		await draaiend?.stop();
	} catch (fout) {
		// A client that never started cleanly still has to let go of what it
		// holds; a restart matters more here than the failure being reported.
		console.error(fout);
	} finally {
		// `synchronize.fileEvents` subscribes to the watcher without adopting
		// it, so every restart would otherwise leave a live workspace-wide
		// file watcher behind.
		teSluiten?.dispose();
	}
}
