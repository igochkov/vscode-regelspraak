// C7 — the server half of the status bar, end to end.
//
// Through the extension's own API rather than the workbench: a language status
// item is drawn by VS Code and cannot be read back, so the state it is showing
// is asserted where it is decided.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

interface ServerStatusLike { readonly state: string }

suite('Taalserverstatus (C7)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');
	let status: ServerStatusLike;

	suiteSetup(async () => {
		await activate(docUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ serverStatus: ServerStatusLike } | undefined;
		assert.ok(api?.serverStatus, 'de extensie levert geen status op');
		status = api.serverStatus;
	});

	test('meldt een draaiende taalserver', () => {
		assert.equal(status.state, 'ready');
	});

	test('kent het commando dat het logboek opent', async () => {
		assert.ok((await vscode.commands.getCommands(true)).includes('regelspraak.showServerLog'));
	});

	// Zonder dit is een taalserver die niet start niet te onderscheiden van een
	// die vindt dat er niets te melden valt (NFR-5).
	test('volgt een herstart, en staat daarna weer op actief', async () => {
		await vscode.commands.executeCommand('regelspraak.restartServer');
		await waitUntil('een taalserver die weer actief is', () =>
			status.state === 'ready' ? true : undefined);

		// En de server is werkelijk terug, niet alleen volgens de status.
		const symbols = await waitUntil('documentsymbolen na de herstart', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider', docUri);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});
		assert.ok(symbols.length > 0);
	});
});
