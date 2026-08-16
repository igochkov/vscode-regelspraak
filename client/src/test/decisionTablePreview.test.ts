// W4 — the beslistabelvoorbeeld, end to end against a real server.
//
// Two halves, tested where each of them lives. The view itself is a webview and
// cannot be driven from a test, so what is asserted here is everything around
// it: that the server draws the lens that opens it, that opening it produces a
// panel, that the table it draws is the server's — and, in more detail, the two
// pure halves of the jump. Those two are exported for exactly this reason, the
// way the editor this replaced exported the half that wrote.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { caseAt, rangeOfGesture } from '../decisionTablePreview';
import { DecisionTable } from '../model';
import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

const PREVIEW_COMMAND = 'regelspraak.previewBeslistabel';

interface SourceLike { decisionTables(uri: string): Promise<DecisionTable[]> }

suite('Beslistabelvoorbeeld (W4)', () => {
	const docUri = getDocUri('tuincentrum-regels.rgs');
	let source: SourceLike;

	suiteSetup(async () => {
		await activate(docUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ modelSource: SourceLike } | undefined;
		assert.ok(api?.modelSource, 'de extensie levert geen modelbron op');
		source = api.modelSource;
	});

	async function tables(): Promise<DecisionTable[]> {
		return waitUntil('een beslistabel van de taalserver', async () => {
			const found = await source.decisionTables(docUri.toString());
			return found.length > 0 ? found : undefined;
		});
	}

	// De enige ingang: het voorbeeld hoort bij één tabel, en de lens staat erboven
	// in de tekst waar die tabel staat.
	test('de taalserver hangt een voorbeeldlens boven de beslistabel', async () => {
		const lenses = await waitUntil('codelenzen van de taalserver', async () => {
			const found = await vscode.commands.executeCommand<vscode.CodeLens[]>(
				'vscode.executeCodeLensProvider', docUri, 20);
			return found && found.length > 0 ? found : undefined;
		});
		const preview = lenses.filter(lens => lens.command?.command === PREVIEW_COMMAND);
		assert.equal(preview.length, 1, 'precies één tabel, dus precies één voorbeeldlens');
		const [uri, position] = preview[0].command!.arguments as
			[string, { line: number; character: number }];
		assert.equal(uri, docUri.toString());
		// De lens staat op de naam van de tabel, en die positie is wat het voorbeeld
		// vertelt welke tabel het moet tonen.
		const [table] = await tables();
		assert.equal(position.line, table.nameRange.start.line);
	});

	test('het commando bestaat en opent een paneel', async () => {
		assert.ok((await vscode.commands.getCommands(true)).includes(PREVIEW_COMMAND));
		await vscode.commands.executeCommand(PREVIEW_COMMAND, docUri.toString(),
			{ line: 0, character: 0 });
		const tab = await waitUntil('een tabblad met het voorbeeld', () =>
			vscode.window.tabGroups.all.flatMap(group => group.tabs).find(one =>
				one.input instanceof vscode.TabInputWebview
				&& one.input.viewType.includes('beslistabelvoorbeeld')));
		// Weer dicht, zodat een volgende suite een gewone indeling aantreft.
		await vscode.window.tabGroups.close(tab);
	});

	test('leest de tabel van de fixture, met de rol van elke kolom', async () => {
		const [table] = await tables();
		assert.equal(table.name, 'Bezorgkosten');
		assert.equal(table.validity, 'geldig altijd');
		assert.deepEqual(table.columns.map(column => column.role),
			['conditie', 'conclusie', 'conditie']);
		assert.deepEqual(table.rows.map(row => row.cells.map(cell => cell.text)),
			[['1', '5 €', '50 €'], ['2', '0 €', 'n.v.t.']]);
	});

	// De zin van een geval staat nergens in de tekst: §12 verdeelt hem over de
	// kolomtitel en een cel. Of de waarde de zin afmaakt, is het antwoord van de
	// server — hier wordt alleen vastgelegd dat het meekomt.
	test('zegt van de conclusiekolom dat de waarde de zin afmaakt', async () => {
		const [table] = await tables();
		assert.equal(table.columns[1].composed, true);
		// En zegt er niets over waar er niets te zeggen valt.
		assert.equal(table.columns[0].composed, undefined);
		assert.equal(table.columns[2].composed, undefined);
	});

	suite('de sprong van het voorbeeld naar de tekst', () => {
		test('wijst een cel aan op precies het bereik van die cel', async () => {
			const found = await tables();
			const range = rangeOfGesture(found, { kind: 'reveal', table: 0, row: 0, cell: 1 });
			assert.deepEqual(range, found[0].rows[0].cells[1].range);
		});

		test('wijst een kolomtitel aan met rij -1, want de titelrij is geen geval', async () => {
			const found = await tables();
			const range = rangeOfGesture(found, { kind: 'reveal', table: 0, row: -1, cell: 1 });
			assert.deepEqual(range, found[0].columns[1].range);
		});

		test('wijst de tabel zelf op haar naam aan', async () => {
			const found = await tables();
			assert.deepEqual(rangeOfGesture(found, { kind: 'revealTable', table: 0 }),
				found[0].nameRange);
		});

		// Het voorbeeld kan een toetsaanslag achterlopen; een gebaar over een rij
		// die er niet meer is, wijst nergens heen in plaats van ergens verkeerd.
		test('wijst nergens heen waar de tabel of de rij niet bestaat', async () => {
			const found = await tables();
			assert.equal(rangeOfGesture(found, { kind: 'reveal', table: 9, row: 0, cell: 0 }),
				undefined);
			assert.equal(rangeOfGesture(found, { kind: 'reveal', table: 0, row: 9, cell: 0 }),
				undefined);
			assert.equal(rangeOfGesture(found, { kind: 'reveal', table: 0, row: 0, cell: 9 }),
				undefined);
		});
	});

	suite('de sprong van de tekst naar het voorbeeld', () => {
		test('vindt het geval waar de cursor in staat', async () => {
			const found = await tables();
			assert.deepEqual(caseAt(found, found[0].rows[1].range.start.line),
				{ table: 0, row: 1 });
		});

		// Een regel binnen de declaratie die geen geval is — de naam, de
		// geldigheid, de titelrij — hoort wel bij de tabel en niet bij een geval.
		test('noemt de tabel maar geen geval op een regel die er geen is', async () => {
			const found = await tables();
			assert.deepEqual(caseAt(found, found[0].nameRange.start.line), { table: 0, row: -1 });
		});

		test('vindt niets buiten elke tabel', async () => {
			assert.equal(caseAt(await tables(), 0), undefined);
		});
	});
});
