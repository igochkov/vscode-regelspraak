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
		void window.showErrorMessage(
			`The RegelSpraak language server was not found at ${serverModule}, resolved from ${origin}. ` +
			`Set "${SERVER_PATH_SETTING}" to a language server build.`
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
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
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
