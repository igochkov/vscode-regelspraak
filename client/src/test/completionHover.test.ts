import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, positionOf, setTestContent, waitUntil } from './helper';

suite('Aanvulling en hover (P2, P3)', () => {
	const docUri = getDocUri('regels/h2-lidmaatschap/art-04-lidmaatschap.rgs');
	let original: string;

	suiteSetup(async () => {
		await activate(docUri);
		original = doc.getText();
	});

	teardown(async () => {
		if (doc.getText() !== original) {
			await setTestContent(original);
		}
	});

	test('aanvulling stelt modelsymbolen voor', async () => {
		const started = `${original}\nRegel proefaanvulling\n\tgeldig altijd\n\t\tDe contributie van een L`;
		await setTestContent(started);

		const position = doc.positionAt(started.length);
		const list = await waitUntil('aanvullingen met een modelsymbool', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.CompletionList | undefined>(
				'vscode.executeCompletionItemProvider',
				docUri,
				position
			);
			const matches = outcome?.items.filter(item => labelOf(item).includes('Lid')) ?? [];
			return matches.length > 0 ? matches : undefined;
		});

		assert.ok(list.length > 0, 'geen aanvulling die Lid voorstelt');
	});

	test('hover toont informatie bij een verwijzing', async () => {
		const position = positionOf('lidmaatschapsduur van een');
		const hovers = await waitUntil('een hover', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
				'vscode.executeHoverProvider',
				docUri,
				position
			);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});

		const text = hovers
			.flatMap(h => h.contents)
			.map(c => (typeof c === 'string' ? c : (c as vscode.MarkdownString).value))
			.join('\n');

		assert.ok(text.trim().length > 0, 'hover leverde lege inhoud op');
		assert.ok(text.includes('lidmaatschapsduur'), `hover noemt het symbool niet: ${text}`);
	});
});

function labelOf(item: vscode.CompletionItem): string {
	return typeof item.label === 'string' ? item.label : item.label.label;
}
