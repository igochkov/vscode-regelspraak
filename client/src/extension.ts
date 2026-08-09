import * as fs from 'fs';
import * as path from 'path';
import { window, workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

const SERVER_PATH_SETTING = 'regelspraak.server.path';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
	// Re-resolve on change, so pointing the setting at a different server build
	// takes effect without reloading the window.
	context.subscriptions.push(
		workspace.onDidChangeConfiguration(async event => {
			if (event.affectsConfiguration(SERVER_PATH_SETTING)) {
				await stopClient();
				await startClient(context);
			}
		})
	);

	await startClient(context);
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
			origin: `the ${SERVER_PATH_SETTING} setting`
		};
	}

	return {
		module: context.asAbsolutePath(path.join('server', 'out', 'server.js')),
		origin: 'the server bundled with the extension'
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
			`The RegelSpraak language server was not found at ${serverModule}, resolved from ${origin}. ` +
			`Link a server build in as "server/" inside the extension folder, ` +
			`or point "${SERVER_PATH_SETTING}" at one (in this window's settings — ` +
			`when debugging that is the Extension Development Host, not the window you pressed F5 in). ` +
			`See the README section "Pointing the extension at a language server".`
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

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for RegelSpraak documents
		documentSelector: [{ scheme: 'file', language: 'regelspraak' }],
		synchronize: {
			// The server indexes every .rgs file in the workspace into one
			// model (FSD §3.5); watched-file events keep unopened files fresh.
			fileEvents: workspace.createFileSystemWatcher('**/*.rgs')
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
	const running = client;
	client = undefined;
	await running?.stop();
}
