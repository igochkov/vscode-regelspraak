import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, positieVan, setTestContent, wachtTot } from './helper';

suite('Aanvulling en hover (P2, P3)', () => {
	const docUri = getDocUri('tuincentrum-regels.rgs');
	let origineel: string;

	suiteSetup(async () => {
		await activate(docUri);
		origineel = doc.getText();
	});

	teardown(async () => {
		if (doc.getText() !== origineel) {
			await setTestContent(origineel);
		}
	});

	test('aanvulling stelt modelsymbolen voor', async () => {
		const aanzet = `${origineel}\nRegel proefaanvulling\n\tgeldig altijd\n\t\tDe korting van een K`;
		await setTestContent(aanzet);

		const positie = doc.positionAt(aanzet.length);
		const lijst = await wachtTot('aanvullingen met een modelsymbool', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.CompletionList | undefined>(
				'vscode.executeCompletionItemProvider',
				docUri,
				positie
			);
			const treffers = uitkomst?.items.filter(item => etiketVan(item).includes('Klant')) ?? [];
			return treffers.length > 0 ? treffers : undefined;
		});

		assert.ok(lijst.length > 0, 'geen aanvulling die Klant voorstelt');
	});

	test('hover toont informatie bij een verwijzing', async () => {
		const positie = positieVan('korting');
		const hovers = await wachtTot('een hover', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
				'vscode.executeHoverProvider',
				docUri,
				positie
			);
			return uitkomst && uitkomst.length > 0 ? uitkomst : undefined;
		});

		const tekst = hovers
			.flatMap(h => h.contents)
			.map(c => (typeof c === 'string' ? c : (c as vscode.MarkdownString).value))
			.join('\n');

		assert.ok(tekst.trim().length > 0, 'hover leverde lege inhoud op');
		assert.ok(tekst.includes('korting'), `hover noemt het symbool niet: ${tekst}`);
	});
});

function etiketVan(item: vscode.CompletionItem): string {
	return typeof item.label === 'string' ? item.label : item.label.label;
}
