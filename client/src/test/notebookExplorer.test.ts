import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { FailureLenses } from '../explain';
import { TEST_EVERYWHERE, TEST_LANGUAGE } from '../languages';
import { TestExplorer } from '../testExplorer';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/**
 * §4.6's gate — the Testing view, the failure lens and **Leg uit** in a notebook.
 *
 * [N-9] says all three follow from [N-3] and [N-5] rather than being built: they
 * are (document, position) or (document, case) gestures, and a cell is a
 * document. What that leaves to check is exactly the places where *which*
 * document was taken for granted — a case inheriting its testset's URI, an
 * expectation inheriting the run's — because a notebook is the first testset
 * whose header and whose cases are in different documents, and every one of
 * those shortcuts is silent when it is wrong: a lens simply not drawn, a jump
 * simply landing somewhere else.
 *
 * So the suite is written the way [N-9] reads: one run, and then each of the
 * three surfaces asked whether it can see it. Which is also why it runs the
 * testgeval through the **Test Explorer's own profile** rather than through the
 * cell — [N-7]'s *one request, one verdict* means the two surfaces must agree,
 * and §4.5 already pinned the cell's half.
 */

/** §4.5's fixture: a passing expectation and a failing one in one cell. */
const NOTEBOOK = vscode.Uri.file(path.resolve(
	__dirname, '../../src/test/fixtures/notebook/artikel-5-erebonus.rgs.md'));

/** Any `.rgs` in the workspace, to have a server and a finished scan. */
const MODEL = getDocUri('gegevens/lid.rgs');

const EXPLAIN_COMMAND = 'regelspraak.legUit';
const CASE = '001';
/** The one whose `Verwacht` block is a cell further down ([N-3]). */
const SPLIT_CASE = '003';

interface Api { testExplorer: TestExplorer }

function codeCells(notebook: vscode.NotebookDocument): vscode.NotebookCell[] {
	return notebook.getCells().filter(cell => cell.kind === vscode.NotebookCellKind.Code);
}

function openPanels(): vscode.Tab[] {
	return vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
		one.input instanceof vscode.TabInputWebview
		&& one.input.viewType.includes('uitkomst'));
}

suite('Testverkenner, lens en Leg uit in een notebook (Notebook Plan §4.6)', () => {

	let tests: TestExplorer;
	let notebook: vscode.NotebookDocument;
	/** The cell testgeval 001 is written in — not the one its testset's header is in. */
	let caseCell: vscode.NotebookCell;
	/** The cell testgeval 003's `Verwacht` block is in — not the one it opens in. */
	let expectationCell: vscode.NotebookCell;

	/**
	 * En `blockOnErrors` uit, om de reden die §4.5 vaststelde en die hier
	 * onveranderd geldt.
	 *
	 * Een bestand buiten elke werkmap deelt één scope met alle andere ([N-10]) en
	 * de weigergrens kijkt naar elke fout in die scope, omdat een run het hele
	 * model uitvoert ([E-7]). De andere notebookfixtures in deze map dragen met
	 * opzet een fout — daar gaat hun eigen gate over — en een notebook blijft de
	 * sessie lang open zodra iets het geopend heeft. Zonder dit weigert deze run
	 * om een reden die niets met haar te maken heeft.
	 */
	suiteSetup(async function () {
		this.timeout(120000);
		await activate(MODEL);
		await vscode.workspace.getConfiguration('regelspraak.execution')
			.update('blockOnErrors', false, vscode.ConfigurationTarget.Global);
		const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as Api;
		tests = api.testExplorer;
		notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
		await vscode.window.showNotebookDocument(notebook);
		caseCell = codeCells(notebook).find(
			cell => cell.document.getText().includes(`Testgeval ${CASE}`))!;
		assert.ok(caseCell, 'de fixture hoort een cel met testgeval 001 te hebben');
		expectationCell = codeCells(notebook).find(
			cell => cell.document.getText().trimStart().startsWith('Verwacht G3'))!;
		assert.ok(expectationCell, 'de fixture hoort een losse Verwacht-cel te hebben');

		// Discovery is driven by `modelChanged`, which the notebook's own didOpen
		// sets off — so the tree fills on its own schedule and is waited for.
		await waitUntil('het testgeval in de testverkenner',
			() => tests.casesOfDocument(caseCell.document.uri.toString())
				.some(one => one.name === CASE) || undefined);
	});

	/**
	 * De lenzen die deze suite leest, van de provider zelf.
	 *
	 * See the test below for why not through the workbench command. Built per
	 * call rather than held, because a `FailureLenses` subscribes to the Test
	 * Explorer and one left behind would outlive the suite.
	 */
	function lensesOfCell(): vscode.CodeLens[] {
		const provider = new FailureLenses(tests);
		try {
			return provider.provideCodeLenses(caseCell.document);
		} finally {
			provider.dispose();
		}
	}

	suiteTeardown(async () => {
		await vscode.workspace.getConfiguration('regelspraak.execution')
			.update('blockOnErrors', undefined, vscode.ConfigurationTarget.Global);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	/**
	 * Het testgeval staat in de cel waar het geschreven is, niet bij de kop.
	 *
	 * This is the whole of [N-3] on this surface. The testset's header is in a
	 * cell of its own — the ordinary shape of a notebook — so a client that let a
	 * case inherit its testset's URI would file both cases under the header's
	 * cell, and everything below (the lens, the jump, **Leg uit** from the cell)
	 * would be about a document the expectation is not in.
	 */
	test('zet elk testgeval bij de cel waar het staat, niet bij de kop', () => {
		const own = tests.casesOfDocument(caseCell.document.uri.toString());
		assert.deepEqual(own.map(one => one.name), [CASE]);

		const header = codeCells(notebook).find(
			cell => cell.document.getText().startsWith('Testset'))!;
		assert.notEqual(header.document.uri.toString(), caseCell.document.uri.toString());
		assert.deepEqual(
			tests.casesOfDocument(header.document.uri.toString()).map(one => one.name), []);

		// And the notebook's cases are cases of the notebook: the testset item a
		// run is asked for is a cell of this file and not some other document.
		const here = tests.allCases().filter(
			one => one.uri.includes(path.basename(NOTEBOOK.fsPath)));
		assert.deepEqual(here.map(one => one.case).sort(), [CASE, '002', SPLIT_CASE]);

		// And the cell holding nothing but a `Verwacht` block holds no *case*: the
		// case is where its own `Testgeval` line is, which is one cell up.
		assert.deepEqual(
			tests.casesOfDocument(expectationCell.document.uri.toString()).map(one => one.name),
			[]);
	});

	/**
	 * En de uitvoering vanuit de testverkenner levert hetzelfde oordeel op.
	 *
	 * One request, one verdict ([N-7]): the Testing view and the cell ask the
	 * same two methods, so the failing expectation the cell reported in §4.5's
	 * gate is the one recorded here. What this adds is the *location* — the
	 * failure is filed under the cell it is written in, which is what the lens
	 * below is drawn from and what a peek would open.
	 */
	test('voert het uit vanuit de testverkenner, met de fout in de juiste cel', async function () {
		this.timeout(120000);
		const testset = tests.allCases().find(one => one.case === CASE
			&& one.uri.includes(path.basename(NOTEBOOK.fsPath)))!;
		await tests.runFromLens(testset.uri, CASE);

		const failures = tests.failuresIn(caseCell.document.uri.toString());
		assert.equal(failures.length, 1, JSON.stringify(failures));
		assert.equal(failures[0].case, CASE);
		assert.match(failures[0].label, /toeslag/u);
		// The line is the cell's own, so it is inside the cell rather than
		// somewhere down the notebook file.
		assert.ok(failures[0].line < caseCell.document.lineCount,
			`regel ${failures[0].line} valt buiten de cel`);
		assert.match(caseCell.document.lineAt(failures[0].line).text, /toeslag/u);

		// And nowhere else: a failure filed under the notebook's file or under the
		// header cell is one no lens would ever be drawn for.
		assert.deepEqual(tests.failuresIn(NOTEBOOK.toString()), []);
	});

	/**
	 * En een verwachting die een cel verderop staat, wordt dáár gemeld.
	 *
	 * The one shape in which `TestAssertion.uri` says something the case's own
	 * URI does not, and the reason §4.3 put it on the wire. A notebook's cells
	 * are one document ([N-3]), so a `Testgeval` line in one cell and its
	 * `Verwacht` block in the next is an ordinary sentence running on — and the
	 * failure then belongs to the cell it is *written* in, not to the cell the
	 * case opens in. Falling back to the case's document would file it a cell too
	 * high, where the lens would sit on whatever line happens to be there.
	 */
	test('meldt een verwachting uit een andere cel in die cel', async function () {
		this.timeout(120000);
		const testset = tests.allCases().find(one => one.case === SPLIT_CASE
			&& one.uri.includes(path.basename(NOTEBOOK.fsPath)))!;
		await tests.runFromLens(testset.uri, SPLIT_CASE);

		const failures = tests.failuresIn(expectationCell.document.uri.toString());
		assert.equal(failures.length, 1, JSON.stringify(failures));
		assert.equal(failures[0].case, SPLIT_CASE);
		assert.match(
			expectationCell.document.lineAt(failures[0].line).text, /toeslag/u);
		// And not in the cell the testgeval opens in, which is what the item's own
		// URI would have said.
		assert.deepEqual(
			tests.failuresIn(caseCell.document.uri.toString())
				.filter(one => one.case === SPLIT_CASE), []);
	});

	/**
	 * De lens staat op de mislukte verwachting, in de cel.
	 *
	 * **Not through `vscode.executeCodeLensProvider`**, which every other lens
	 * gate here uses: that command refuses a `vscode-notebook-cell:` URI outright
	 * — *Illegal argument*, measured rather than assumed, while
	 * `executeDocumentSymbolProvider` answers for the same document. The reason is
	 * that it answers about a text model an editor is holding, and a cell can
	 * never be shown as a text document. So the two halves it would have covered
	 * at once are asserted separately: that the
	 * provider *applies* to this document, through the same selector
	 * `extension.ts` registers it with and the same matcher VS Code itself uses,
	 * and that it then draws the lens the failure earns. The workbench's own
	 * rendering of a lens inside a cell is not something this end can see.
	 */
	test('tekent leg uit op de mislukte verwachting in de cel ([N-9])', () => {
		assert.ok(vscode.languages.match(TEST_EVERYWHERE, caseCell.document) > 0,
			'de lensprovider is niet voor een testspraak-cel geregistreerd');

		const lenses = lensesOfCell();
		assert.equal(lenses.length, 1, lenses.map(one => one.command?.title).join(' | '));
		assert.equal(lenses[0].command?.title, 'leg uit');
		assert.match(caseCell.document.lineAt(lenses[0].range.start.line).text, /toeslag/u);
	});

	/**
	 * En er staat geen uitvoerlens naast ([N-9]).
	 *
	 * Redundant with the cell's own run button, which the workbench draws a
	 * centimetre away. **Decided and gated on the server**, where the container
	 * knows it is answering about a cell — `notebookTwin.test.ts` asks for a
	 * cell's lenses over both corpora and requires none of them to run anything,
	 * with the file's own run lenses counted beside it so the absence is an
	 * absence and not an empty answer. This end cannot ask the question at all
	 * (see above), so what it asserts is the half that is its own: a `.test.rgs`
	 * file still has its run lenses, which is what says the narrowing is about
	 * notebooks and not about a provider that stopped answering.
	 */
	test('laat de uitvoerlens in een bestand staan ([N-9])', async function () {
		this.timeout(120000);
		// Shown first: `executeCodeLensProvider` answers about a text model the
		// editor is holding and refuses one it is not — measured, and the other
		// half of why it can never be asked about a cell.
		const file = getDocUri('tests/lidmaatschap.test.rgs');
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));
		const inFile = await vscode.commands.executeCommand<vscode.CodeLens[]>(
			'vscode.executeCodeLensProvider', file) ?? [];
		assert.ok(inFile.some(one => one.command?.command === 'regelspraak.runTestgeval'),
			inFile.map(one => one.command?.title).join(' | '));
	});

	/**
	 * En erop drukken opent het paneel, gericht op die waarde.
	 *
	 * The lens's own arguments, not the cursor: a lens is pressed without moving
	 * the caret, so re-deriving the place would explain a different line than the
	 * one that was clicked (`ExplicitSite`). Everything after that is the
	 * ordinary UX-1 path — `explainTarget` at a cell position, the testgeval
	 * found by the cell the caret is in, and one panel.
	 */
	test('opent de uitkomst op de waarde waar de lens over gaat', async function () {
		this.timeout(120000);
		const lens = lensesOfCell()[0];
		assert.ok(lens?.command?.arguments, 'de lens hoort zijn plek mee te geven');

		await vscode.commands.executeCommand(EXPLAIN_COMMAND, ...lens.command.arguments);
		const tab = await waitUntil('een uitkomstpaneel voor de waarde',
			() => openPanels().find(one => one.label.includes('toeslag')));
		// Named for the slot, as every **Leg uit** panel is: the instance the
		// testgeval declared and the attribute the expectation was about.
		assert.match(tab.label, /G1 · toeslag/u);
		await vscode.window.tabGroups.close(tab);
	});

	/**
	 * En het uitvoeren blijft aan de knop van de cel — hier herhaald omdat deze
	 * suite de andere kant van dezelfde keuze aantoont.
	 *
	 * [N-7]'s run button and [N-9]'s absent run lens are one decision seen from
	 * two sides, and a change that put the lens back would most likely be made by
	 * somebody who had just read this file rather than §4.5's.
	 *
	 * **What this used to assert was that the list held one language**, read as
	 * *only a testgeval cell has a button*. The workbench draws one on every code
	 * cell whatever the list says, so that reading was wrong in two files at once
	 * (11 September 2026); what a rule cell's button *does* is §4.5's case, and
	 * what is left here is the half this suite is about — a testgeval is run by
	 * the controller and not by a lens.
	 */
	test('laat het uitvoeren aan de knop van de cel ([N-7])', async () => {
		const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as {
			testgevalController: { notebookController: vscode.NotebookController }
		};
		assert.ok(api.testgevalController.notebookController
			.supportedLanguages?.includes(TEST_LANGUAGE));
	});
});
