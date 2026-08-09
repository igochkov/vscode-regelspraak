import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, wachtTot } from './helper';

suite('Semantische tokens (S1)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('de legenda draagt de RegelSpraak-tokentypen', async () => {
		const legenda = await wachtTot('de tokenlegenda', () =>
			vscode.commands.executeCommand<vscode.SemanticTokensLegend | undefined>(
				'vscode.provideDocumentSemanticTokensLegend',
				docUri
			)
		);

		for (const type of ['objecttype', 'attribuut', 'kenmerk', 'parameter']) {
			assert.ok(
				legenda.tokenTypes.includes(type),
				`tokentype ${type} ontbreekt in de legenda: ${legenda.tokenTypes.join(', ')}`
			);
		}
	});

	test('declaraties leveren tokens op', async () => {
		const tokens = await wachtTot('semantische tokens', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.SemanticTokens | undefined>(
				'vscode.provideDocumentSemanticTokens',
				docUri
			);
			return uitkomst && uitkomst.data.length > 0 ? uitkomst : undefined;
		});

		// Five uint32 per token: deltaLine, deltaStart, length, type, modifiers.
		assert.strictEqual(tokens.data.length % 5, 0, 'tokendata is geen veelvoud van 5');
		assert.ok(tokens.data.length / 5 > 10, 'verwachtte meer tokens in een bestand vol declaraties');
	});
});
