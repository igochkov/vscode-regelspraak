import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, waitUntil } from './helper';

suite('Semantische tokens (S1)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('de legenda draagt de RegelSpraak-tokentypen', async () => {
		const legend = await waitUntil('de tokenlegenda', () =>
			vscode.commands.executeCommand<vscode.SemanticTokensLegend | undefined>(
				'vscode.provideDocumentSemanticTokensLegend',
				docUri
			)
		);

		for (const type of ['objecttype', 'attribuut', 'kenmerk', 'parameter']) {
			assert.ok(
				legend.tokenTypes.includes(type),
				`tokentype ${type} ontbreekt in de legenda: ${legend.tokenTypes.join(', ')}`
			);
		}
	});

	test('declaraties leveren tokens op', async () => {
		const tokens = await waitUntil('semantische tokens', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.SemanticTokens | undefined>(
				'vscode.provideDocumentSemanticTokens',
				docUri
			);
			return outcome && outcome.data.length > 0 ? outcome : undefined;
		});

		// Five uint32 per token: deltaLine, deltaStart, length, type, modifiers.
		assert.strictEqual(tokens.data.length % 5, 0, 'tokendata is geen veelvoud van 5');
		assert.ok(tokens.data.length / 5 > 10, 'verwachtte meer tokens in een bestand vol declaraties');
	});
});
