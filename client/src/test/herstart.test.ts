import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, wachtTot } from './helper';

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

		const na = await wachtTot('symbolen na de herstart', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return uitkomst && uitkomst.length > 0 ? uitkomst : undefined;
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

		const symbolen = await wachtTot('symbolen na twee herstarts', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return uitkomst && uitkomst.length > 0 ? uitkomst : undefined;
		});

		// Two servers answering the same request would double the outline.
		const namen = symbolen.map(s => s.name);
		assert.strictEqual(
			new Set(namen).size,
			namen.length,
			`dubbele symbolen na herstart: ${namen.join(', ')}`
		);
	});
});
