import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, waitUntil } from './helper';

suite('Overzicht en vouwen (P10, P16)', () => {
	const docUri = getDocUri('gegevens/lid.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('de outline bevat de gedeclareerde objecttypen', async () => {
		const symbols = await waitUntil('documentsymbolen', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
				'vscode.executeDocumentSymbolProvider',
				docUri
			);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});

		// One declaration per file now, so the outline of this one is the object
		// type with its members under it — which is the nesting the flat
		// three-types-in-one-file assertion could not check.
		assert.deepStrictEqual(symbols.map(s => s.name), ['Lid']);
		const members = symbols[0].children.map(one => one.name);
		for (const expected of ['pasnummer', 'jeugdlid', 'leestegoed']) {
			assert.ok(members.includes(expected),
				`${expected} ontbreekt onder Lid: ${members.join(' | ')}`);
		}
	});

	test('elk outlinebereik valt binnen het document', async () => {
		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			docUri
		);
		const last = doc.lineCount - 1;

		for (const symbol of symbols) {
			assert.ok(symbol.range.start.line <= symbol.range.end.line, `omgekeerd bereik bij ${symbol.name}`);
			assert.ok(symbol.range.end.line <= last, `bereik van ${symbol.name} loopt voorbij het document`);
		}
	});

	test('declaraties leveren vouwbereiken op', async () => {
		const ranges = await waitUntil('vouwbereiken', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.FoldingRange[] | undefined>(
				'vscode.executeFoldingRangeProvider',
				docUri
			);
			return outcome && outcome.length > 0 ? outcome : undefined;
		});

		for (const range of ranges) {
			assert.ok(range.start < range.end, `leeg of omgekeerd vouwbereik op regel ${range.start}`);
			assert.ok(range.end <= doc.lineCount - 1, `vouwbereik loopt voorbij het document: ${range.end}`);
		}
	});
});
