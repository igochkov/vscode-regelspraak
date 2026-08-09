import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, wachtTot } from './helper';

suite('Overzicht en vouwen (P10, P16)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('de outline bevat de gedeclareerde objecttypen', async () => {
		const symbolen = await wachtTot('documentsymbolen', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return uitkomst && uitkomst.length > 0 ? uitkomst : undefined;
		});

		const namen = symbolen.map(s => s.name).join(' | ');
		for (const verwacht of ['Klant', 'Bestelling', 'Plant']) {
			assert.ok(
				symbolen.some(s => s.name.includes(verwacht)),
				`${verwacht} ontbreekt in de outline: ${namen}`
			);
		}
	});

	test('elk outlinebereik valt binnen het document', async () => {
		const symbolen = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			docUri
		);
		const laatste = doc.lineCount - 1;

		for (const symbool of symbolen) {
			assert.ok(symbool.range.start.line <= symbool.range.end.line, `omgekeerd bereik bij ${symbool.name}`);
			assert.ok(symbool.range.end.line <= laatste, `bereik van ${symbool.name} loopt voorbij het document`);
		}
	});

	test('declaraties leveren vouwbereiken op', async () => {
		const bereiken = await wachtTot('vouwbereiken', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.FoldingRange[] | undefined>(
				'vscode.executeFoldingRangeProvider',
				docUri
			);
			return uitkomst && uitkomst.length > 0 ? uitkomst : undefined;
		});

		for (const bereik of bereiken) {
			assert.ok(bereik.start < bereik.end, `leeg of omgekeerd vouwbereik op regel ${bereik.start}`);
			assert.ok(bereik.end <= doc.lineCount - 1, `vouwbereik loopt voorbij het document: ${bereik.end}`);
		}
	});
});
