import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, waitUntil } from './helper';

/**
 * NFR-5: a crashed or wedged server has to be recoverable without reloading
 * the window. The command is only worth having if the server is actually
 * serving again afterwards, so that — not the command's return value — is
 * what this asserts.
 */
suite('Taalserver herstarten (NFR-5)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('na een herstart beantwoordt de server opnieuw', async () => {
		const voor = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			docUri
		);
		assert.ok(voor.length > 0, 'geen symbolen vóór de herstart');

		await vscode.commands.executeCommand('regelspraak.restartServer');

		const na = await waitUntil('symbolen na de herstart', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});

		assert.strictEqual(na.length, voor.length, 'de outline is na de herstart niet dezelfde');
	});

	test('twee herstarts vlak na elkaar laten één werkende server achter', async () => {
		// Serialised in the extension: interleaved stop/start phases would
		// leave a second server running that nothing refers to any more.
		await Promise.all([
			vscode.commands.executeCommand('regelspraak.restartServer'),
			vscode.commands.executeCommand('regelspraak.restartServer')
		]);

		const symbols = await waitUntil('symbolen na twee herstarts', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});

		// Two servers answering the same request would double the outline.
		const names = symbols.map(s => s.name);
		assert.strictEqual(
			new Set(names).size,
			names.length,
			`dubbele symbolen na herstart: ${names.join(', ')}`
		);
	});
});
