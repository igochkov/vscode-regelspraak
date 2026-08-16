// W4 — the visual Beslistabel editor, end to end against a real server.
//
// Two halves, tested where each of them lives. The grid itself is a webview and
// cannot be driven from a test, so what is asserted here is everything around
// it: that the custom editor is registered and resolves, and — in far more
// detail — that `gridEdit` turns a gesture into the right edit over the tables
// the server actually answers with. That second half is the one that writes.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { DECISION_TABLE_VIEW, emptyRow, gridEdit } from '../decisionTableEditor';
import { DecisionTable } from '../model';
import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

interface SourceLike { decisionTables(uri: string): Promise<DecisionTable[]> }

suite('Beslistabelrooster (W4)', () => {
	const docUri = getDocUri('tuincentrum-regels.rgs');
	let source: SourceLike;
	let doc: vscode.TextDocument;
	let original: string;

	suiteSetup(async () => {
		await activate(docUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ modelSource: SourceLike } | undefined;
		assert.ok(api?.modelSource, 'de extensie levert geen modelbron op');
		source = api.modelSource;
		doc = await vscode.workspace.openTextDocument(docUri);
		original = doc.getText();
	});

	teardown(async () => {
		// De fixture blijft zoals hij gevonden werd; er wordt nooit opgeslagen,
		// dus het bestand op schijf blijft hoe dan ook ongemoeid.
		if (doc.getText() !== original) {
			const edit = new vscode.WorkspaceEdit();
			edit.replace(docUri, whole(), original);
			assert.ok(await vscode.workspace.applyEdit(edit));
		}
	});

	const whole = (): vscode.Range =>
		new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));

	async function tables(): Promise<DecisionTable[]> {
		return waitUntil('een beslistabel van de taalserver', async () => {
			const found = await source.decisionTables(docUri.toString());
			return found.length > 0 ? found : undefined;
		});
	}

	async function apply(gesture: Parameters<typeof gridEdit>[2]): Promise<void> {
		const outcome = gridEdit(docUri, await tables(), gesture);
		assert.ok(outcome instanceof vscode.WorkspaceEdit, 'geen bewerking opgeleverd');
		assert.ok(await vscode.workspace.applyEdit(outcome), 'de bewerking is niet doorgevoerd');
	}

	test('is als aparte editor geregistreerd, en het commando bestaat', async () => {
		assert.ok((await vscode.commands.getCommands(true))
			.includes('regelspraak.openBeslistabelEditor'));
		await vscode.commands.executeCommand('vscode.openWith', docUri, DECISION_TABLE_VIEW);
		await waitUntil('een tabblad met het rooster', () =>
			vscode.window.tabGroups.all.some(group => group.tabs.some(tab =>
				tab.input instanceof vscode.TabInputCustom
				&& tab.input.viewType === DECISION_TABLE_VIEW)) ? true : undefined);
		// Terug naar tekst, zodat de volgende test een gewone editor aantreft.
		await vscode.commands.executeCommand('vscode.openWith', docUri, 'default');
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

	test('schrijft een celbewerking op precies die cel', async () => {
		await apply({ kind: 'cell', table: 0, row: 0, cell: 1, text: '7 €', was: '5 €' });
		const [table] = await tables();
		assert.deepEqual(table.rows[0].cells.map(cell => cell.text), ['1', '7 €', '50 €']);
		// En verder niets. Op de uitlijning na, want die loopt met de celbreedte
		// mee: de opmaak wordt na elke bewerking opnieuw gedraaid, en die
		// verandert alleen witruimte.
		const norm = (text: string): string => text.replace(/[ \t]+/g, ' ');
		assert.equal(norm(doc.getText()), norm(original).replace('| 5 € |', '| 7 € |'));
	});

	// De bewerking wordt berekend uit een antwoord dat een toetsaanslag oud kan
	// zijn; een bereik dat intussen verschoven is, zou over iets anders heen
	// schrijven.
	test('weigert een bewerking die van een verouderde cel uitgaat', async () => {
		const outcome = gridEdit(docUri, await tables(),
			{ kind: 'cell', table: 0, row: 0, cell: 1, text: '7 €', was: 'iets anders' });
		assert.ok(outcome && 'reason' in outcome, 'de verouderde bewerking is niet geweigerd');
	});

	test('voegt een rij toe en telt het gevalsnummer door', async () => {
		await apply({ kind: 'addRow', table: 0, row: 2 });
		const [table] = await tables();
		assert.equal(table.rows.length, 3);
		assert.equal(table.rows[2].cells[0].text, '3');
		assert.deepEqual(table.rows[2].cells.slice(1).map(cell => cell.text), ['', '']);
	});

	test('wist een rij zonder een lege regel achter te laten', async () => {
		const before = doc.lineCount;
		await apply({ kind: 'deleteRow', table: 0, row: 0 });
		const [table] = await tables();
		assert.equal(table.rows.length, 1);
		assert.deepEqual(table.rows[0].cells.map(cell => cell.text), ['2', '0 €', 'n.v.t.']);
		assert.equal(doc.lineCount, before - 1);
	});

	// §12 geeft de eerste kolom geen betekenis; hij is per afspraak een
	// gevalsnummer. Waar er iets anders staat, hoort er niets ingevuld te worden.
	test('nummert een nieuwe rij niet waar de tabel niet nummert', () => {
		const table = {
			columns: [{}, {}, {}],
			rows: [{ cells: [{ text: 'a' }, { text: 'x' }, { text: 'y' }] }]
		} as unknown as DecisionTable;
		assert.equal(emptyRow(table), '|  |  |  |');
	});

	test('nummert wel waar elke rij een nummer heeft', () => {
		const table = {
			columns: [{}, {}],
			rows: [{ cells: [{ text: '1' }] }, { cells: [{ text: '2' }] }]
		} as unknown as DecisionTable;
		assert.equal(emptyRow(table), '| 3 |  |');
	});
});
