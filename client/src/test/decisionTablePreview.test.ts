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
	const docUri = getDocUri('regels/h3-contributie/art-06-contributie.rgs');
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
		assert.equal(table.name, 'Contributiestaffel');
		// Eén versie: §4.2's "één of meer" is er ook één, en dan leest het als
		// altijd — één raster onder één geldigheid.
		assert.equal(table.versions.length, 1);
		const [version] = table.versions;
		assert.equal(version.validity, 'geldig vanaf 2027');
		assert.deepEqual(version.columns.map(column => column.role),
			['conditie', 'conclusie', 'conditie']);
		assert.deepEqual(version.rows.map(row => row.cells.map(cell => cell.text)),
			[['1', '25 €', '3 jaar'], ['2', '40 €', 'n.v.t.']]);
	});

	// De zin van een geval staat nergens in de tekst: §12 verdeelt hem over de
	// kolomtitel en een cel. Of de waarde de zin afmaakt, is het antwoord van de
	// server — hier wordt alleen vastgelegd dat het meekomt.
	test('zegt van de conclusiekolom dat de waarde de zin afmaakt', async () => {
		const [version] = (await tables())[0].versions;
		assert.equal(version.columns[1].composed, true);
		// En zegt er niets over waar er niets te zeggen valt.
		assert.equal(version.columns[0].composed, undefined);
		assert.equal(version.columns[2].composed, undefined);
	});

	// §12 geeft een tabel het versiepatroon van §4.2, en `samples/` demonstreert
	// het op de Genrekorting: twee rasters onder één naam, elk met een eigen
	// geldigheid. Alle versies komen mee — welke de rekendatum kiest, weet de
	// server niet, want een rekendatum hoort bij een scenario.
	test('levert elke versie van een tabel als een eigen raster', async () => {
		const genre = getDocUri('regels/h6-collectie/art-10-publicaties.rgs');
		const found = await waitUntil('de beslistabel van publicatie.rgs', async () => {
			const answer = await source.decisionTables(genre.toString());
			return answer.length > 0 ? answer : undefined;
		});
		const [table] = found;
		assert.equal(table.name, 'Genrekorting');
		assert.deepEqual(table.versions.map(version => version.validity),
			['geldig t/m 31-12-2026', 'geldig vanaf 01-01-2027']);
		// Elk raster heeft zijn eigen gevallen, en zijn eigen conclusiekolom.
		assert.deepEqual(table.versions.map(version => version.rows[0].cells[1].text),
			['5%', '10%']);
		for (const version of table.versions) {
			assert.deepEqual(version.columns.map(column => column.role),
				['conditie', 'conclusie', 'conditie']);
		}
		// En elke geldigheidsregel wijst haar eigen plek in de tekst aan.
		const first = rangeOfGesture(found, { kind: 'revealVersion', table: 0, version: 0 });
		const second = rangeOfGesture(found, { kind: 'revealVersion', table: 0, version: 1 });
		assert.notDeepEqual(first, second);
		assert.deepEqual(first, table.versions[0].validityRange);
	});

	suite('de sprong van het voorbeeld naar de tekst', () => {
		test('wijst een cel aan op precies het bereik van die cel', async () => {
			const found = await tables();
			const range = rangeOfGesture(found,
				{ kind: 'reveal', table: 0, version: 0, row: 0, cell: 1 });
			assert.deepEqual(range, found[0].versions[0].rows[0].cells[1].range);
		});

		test('wijst een kolomtitel aan met rij -1, want de titelrij is geen geval', async () => {
			const found = await tables();
			const range = rangeOfGesture(found,
				{ kind: 'reveal', table: 0, version: 0, row: -1, cell: 1 });
			assert.deepEqual(range, found[0].versions[0].columns[1].range);
		});

		test('wijst de tabel zelf op haar naam aan', async () => {
			const found = await tables();
			assert.deepEqual(rangeOfGesture(found, { kind: 'revealTable', table: 0 }),
				found[0].nameRange);
		});

		// Het voorbeeld kan een toetsaanslag achterlopen; een gebaar over een rij
		// die er niet meer is, wijst nergens heen in plaats van ergens verkeerd.
		test('wijst nergens heen waar de tabel, de versie of de rij niet bestaat', async () => {
			const found = await tables();
			const nowhere = (gesture: Parameters<typeof rangeOfGesture>[1]): void =>
				assert.equal(rangeOfGesture(found, gesture), undefined);
			nowhere({ kind: 'reveal', table: 9, version: 0, row: 0, cell: 0 });
			nowhere({ kind: 'reveal', table: 0, version: 9, row: 0, cell: 0 });
			nowhere({ kind: 'reveal', table: 0, version: 0, row: 9, cell: 0 });
			nowhere({ kind: 'reveal', table: 0, version: 0, row: 0, cell: 9 });
			nowhere({ kind: 'revealVersion', table: 0, version: 9 });
		});
	});

	suite('de sprong van de tekst naar het voorbeeld', () => {
		test('vindt het geval waar de cursor in staat', async () => {
			const found = await tables();
			assert.deepEqual(caseAt(found, found[0].versions[0].rows[1].range.start.line),
				{ table: 0, version: 0, row: 1 });
		});

		// Een regel binnen een versie die geen geval is — haar geldigheid, haar
		// titelrij — hoort wel bij die versie en niet bij een geval.
		test('noemt de versie maar geen geval op een regel die er geen is', async () => {
			const found = await tables();
			assert.deepEqual(caseAt(found, found[0].versions[0].headerRange!.start.line),
				{ table: 0, version: 0, row: -1 });
		});

		// En de naamregel hoort bij de tabel en bij geen enkele versie: daar staat
		// geen raster, dus is er ook geen raster om te markeren.
		test('noemt de tabel maar geen versie op de naamregel', async () => {
			const found = await tables();
			assert.deepEqual(caseAt(found, found[0].nameRange.start.line),
				{ table: 0, version: -1, row: -1 });
		});

		test('vindt niets buiten elke tabel', async () => {
			assert.equal(caseAt(await tables(), 0), undefined);
		});
	});
});
