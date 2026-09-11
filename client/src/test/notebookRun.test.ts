import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { MODEL_LANGUAGE } from '../languages';
import { casesInCell } from '../notebook/controller';
import { NOTHING_RAN, asMarkdown, asText, verdictOf } from '../notebook/verdict';
import { TestRun } from '../testExplorer';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/**
 * §4.5's gate — running a rekenvoorbeeld in a cell.
 *
 * Two halves, and they are two on purpose. `verdict.ts` decides what a cell
 * says and is pure, so it is checked against runs built by hand — a pass, a
 * failure, a fault and a scenario, which is the set of things a run can come to
 * and which no single fixture produces at once. The controller is checked end
 * to end against a real server and a real worker, because what [N-7] and [N-8]
 * claim is about the workbench: what a cell does when its button is pressed, an
 * output under the cell it was run from, and an output that goes away when the
 * model under it changes.
 */

/** Self-contained, and outside every workspace folder — a scope of one ([N-10]). */
const NOTEBOOK = vscode.Uri.file(path.resolve(
	__dirname, '../../src/test/fixtures/notebook/artikel-5-erebonus.rgs.md'));

/** Any `.rgs` in the workspace, to have a server and a finished scan. */
const MODEL = getDocUri('gegevens/lid.rgs');

function run(over: Partial<TestRun>): TestRun {
	return {
		case: '001', outcome: 'uitgevoerd', assertions: [], faults: [], ...over
	};
}

function codeCells(notebook: vscode.NotebookDocument): vscode.NotebookCell[] {
	return notebook.getCells().filter(cell => cell.kind === vscode.NotebookCellKind.Code);
}

/** What a cell's `text/plain` item says, which is the copyable half of [N-8]. */
function plainOutput(cell: vscode.NotebookCell): string {
	return cell.outputs
		.flatMap(output => output.items)
		.filter(item => item.mime === 'text/plain')
		.map(item => new TextDecoder().decode(item.data))
		.join('\n');
}

function markdownOutput(cell: vscode.NotebookCell): string {
	return cell.outputs
		.flatMap(output => output.items)
		.filter(item => item.mime === 'text/markdown')
		.map(item => new TextDecoder().decode(item.data))
		.join('\n');
}

/**
 * Runs one cell the way the reader does — through the workbench command the run
 * button invokes, rather than by calling the handler.
 *
 * That is the point of an end-to-end gate here: it goes through controller
 * selection, which is the thing that decides whether a notebook has a run
 * gesture at all, and which calling the handler would step straight over.
 */
async function execute(notebook: vscode.NotebookDocument, index: number): Promise<void> {
	await vscode.commands.executeCommand('notebook.cell.execute', {
		ranges: [{ start: index, end: index + 1 }],
		document: notebook.uri
	});
}

suite('Rekenvoorbeeld uitvoeren (Notebook Plan §4.5)', () => {

	// -----------------------------------------------------------------------
	// The verdict, which is where everything a cell says is decided.
	// -----------------------------------------------------------------------

	suite('het oordeel', () => {

		test('een geslaagd testgeval noemt zijn verwachtingen en herhaalt geen waarde', () => {
			const verdict = verdictOf([run({
				assertions: [{
					label: 'G1 — erebonus', passed: true,
					range: { start: { line: 3, character: 0 }, end: { line: 3, character: 8 } },
					expected: '25,00 EUR', actual: '25,00 EUR'
				}]
			})]);
			assert.strictEqual(verdict.passed, true);
			assert.deepStrictEqual(verdict.cases[0].lines,
				[{ kind: 'pass', label: 'G1 — erebonus' }]);
			// A passing expectation states its value in its own label; saying it
			// again in a note says one thing twice.
			assert.ok(!asText(verdict).includes('25,00 EUR'), asText(verdict));
		});

		test('een mislukt testgeval zet het verwachte naast het werkelijke', () => {
			const verdict = verdictOf([run({
				assertions: [
					{
						label: 'G1 — erebonus', passed: true,
						range: { start: { line: 3, character: 0 }, end: { line: 3, character: 8 } }
					},
					{
						label: 'G1 — toeslag', passed: false,
						range: { start: { line: 4, character: 0 }, end: { line: 4, character: 8 } },
						expected: '10,00 EUR', actual: '5 EUR'
					}
				]
			})]);
			assert.strictEqual(verdict.passed, false);
			assert.strictEqual(verdict.cases[0].outcome, 'mislukt');
			assert.deepStrictEqual(verdict.cases[0].lines[1],
				{ kind: 'fail', label: 'G1 — toeslag', note: 'verwacht 10,00 EUR, werd 5 EUR' });
			// Both marks in one output, which is what a cell with a right and a
			// wrong expectation in it has to be able to show.
			assert.match(asMarkdown(verdict), /✓ G1/u);
			assert.match(asMarkdown(verdict), /✗ G1/u);
		});

		/**
		 * En een modelfout laat het testgeval vallen, ook als er niets rood is.
		 *
		 * The Test Explorer's rule ([E-29]): the run carried on, but it derived
		 * less than the model asked for, so anything green beside it passed by
		 * luck. A specification `fout` is reported and does not fail the case.
		 */
		test('een modelfout laat het testgeval vallen, een fout niet', () => {
			const passing = {
				label: 'G1 — erebonus', passed: true,
				range: { start: { line: 3, character: 0 }, end: { line: 3, character: 8 } }
			};
			const broken = verdictOf([run({
				assertions: [passing],
				faults: [{ rule: 'bepaal de toeslag', message: 'onbekende naam', kind: 'modelfout' }]
			})]);
			assert.strictEqual(broken.passed, false);
			assert.strictEqual(broken.cases[0].lines[0].kind, 'fault');
			// Ahead of the expectations: where one failed as well, the modelfout
			// is very often its cause.
			assert.strictEqual(broken.cases[0].lines[1].kind, 'pass');

			const tolerated = verdictOf([run({
				assertions: [passing],
				faults: [{ rule: 'bepaal de toeslag', message: 'deling door leeg', kind: 'fout' }]
			})]);
			assert.strictEqual(tolerated.passed, true);
		});

		test('een scenario controleert niets en telt dus niet als geslaagd', () => {
			const verdict = verdictOf([run({ case: '002' })]);
			assert.strictEqual(verdict.cases[0].outcome, 'niets gecontroleerd');
			// `undefined` and not `false`: VS Code draws no mark for it, which is
			// what "nothing was checked here" looks like ([T-6]).
			assert.strictEqual(verdict.passed, undefined);
			assert.match(asText(verdict), /scenario/u);
		});

		/**
		 * En een weigering draagt haar bestand en regelnummer mee.
		 *
		 * The blocking-error gate is workspace-wide ([E-7]) while
		 * `validation.scope` defaults to `openFiles`, so the error is quite often
		 * in a document the reader has not got open — which is exactly why the
		 * detail lines are what a refusal is worth reading for.
		 */
		test('een weigering toont haar bestand en regelnummer', () => {
			const verdict = verdictOf([run({
				outcome: 'geweigerd',
				reason: 'Het model bevat fouten en wordt niet uitgevoerd.',
				details: ['lid.rgs:12 RS101: De naam Boekenkabouter is niet gevonden.']
			})]);
			assert.strictEqual(verdict.passed, false);
			assert.strictEqual(verdict.cases[0].outcome, 'geweigerd');
			assert.match(asText(verdict), /lid\.rgs:12 RS101/u);
		});

		test('een cel zonder testgeval zegt dat er niets is uitgevoerd', () => {
			const verdict = verdictOf([]);
			assert.strictEqual(verdict.passed, undefined);
			assert.ok(asMarkdown(verdict).includes(NOTHING_RAN));
			assert.ok(asText(verdict).includes(NOTHING_RAN));
		});

		/**
		 * En een naam met Markdown erin blijft de naam die het model schreef.
		 *
		 * A label is the model's own text and a `naamdeel` admits characters
		 * Markdown reads as emphasis, so an output that rendered them would be
		 * showing a name the model does not have.
		 */
		test('een naam wordt niet als Markdown gelezen', () => {
			const verdict = verdictOf([run({
				assertions: [{
					label: 'G1 — een_naam_met_liggende_streepjes', passed: true,
					range: { start: { line: 3, character: 0 }, end: { line: 3, character: 8 } }
				}]
			})]);
			assert.match(asMarkdown(verdict), /een\\_naam\\_met\\_liggende\\_streepjes/u);
		});
	});

	// -----------------------------------------------------------------------
	// Which testgevallen are this cell's, which is the half of the controller
	// that decides anything.
	// -----------------------------------------------------------------------

	suite('welke testgevallen van deze cel zijn', () => {

		const HEADER = 'vscode-notebook-cell:/a.rgs.md#kop';
		const CASES = 'vscode-notebook-cell:/a.rgs.md#gevallen';

		test('een geval valt terug op de cel van zijn testset', () => {
			// What a `*.test.rgs` file and a single-cell notebook both look like:
			// the server sends no URI where it would equal the testset's, so the
			// fallback is the ordinary path and not a special case ([N-3]).
			assert.deepStrictEqual(
				casesInCell({ testsets: [{ uri: HEADER, cases: [{ name: '001' }] }] }, HEADER),
				['001']);
		});

		test('en staat waar zijn eigen tekst staat, niet waar zijn kop staat', () => {
			const answer = {
				testsets: [{
					uri: HEADER,
					cases: [{ name: '001', uri: CASES }, { name: '002', uri: CASES }]
				}]
			};
			assert.deepStrictEqual(casesInCell(answer, CASES), ['001', '002']);
			// The header cell has nothing of its own to run — the ordinary shape
			// of a notebook ([N-2]), and the case [N-8] says must say so.
			assert.deepStrictEqual(casesInCell(answer, HEADER), []);
		});
	});

	// -----------------------------------------------------------------------
	// And the whole of it against a running server and a real worker.
	// -----------------------------------------------------------------------

	suite('de cel tegen een draaiende server', () => {

		let notebook: vscode.NotebookDocument;

		/**
		 * En eerst `blockOnErrors` uit, wat hier een voorwaarde is en geen gemak.
		 *
		 * **Een bestand buiten elke werkmap deelt één scope met alle andere**
		 * ([N-10]), en de weigergrens kijkt naar *elke* fout in die scope, omdat
		 * een run het hele model uitvoert ([E-7]). De andere notebookfixtures in
		 * deze suitemap dragen met opzet een RS101 — dat is waar hun eigen gate
		 * over gaat — en een notebook dat eenmaal geopend is blijft de sessie lang
		 * open, ook nadat elke editor gesloten is. Dus zonder dit weigert deze run
		 * om een reden die niets met haar te maken heeft, en dan nog afhankelijk
		 * van de volgorde waarin de suites toevallig draaien.
		 *
		 * Wat dat kost is gezegd: de weigering zelf wordt hier niet meer end to end
		 * gezien. Ze wordt hierboven zuiver nagerekend, waar precies vastligt wat
		 * er in de cel komt te staan, en het *besluit* om te weigeren is dat van de
		 * server en staat daar vast.
		 */
		suiteSetup(async function () {
			this.timeout(120000);
			await activate(MODEL);
			await vscode.workspace.getConfiguration('regelspraak.execution')
				.update('blockOnErrors', false, vscode.ConfigurationTarget.Global);
			notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
			await vscode.window.showNotebookDocument(notebook);
		});

		suiteTeardown(async () => {
			await vscode.workspace.getConfiguration('regelspraak.execution')
				.update('blockOnErrors', undefined, vscode.ConfigurationTarget.Global);
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		});

		/**
		 * [N-7], asserted where it is actually decided — which is not where this
		 * suite used to look.
		 *
		 * It read `supportedLanguages` and called that *no run button on a rule
		 * cell*, on [N-7]'s own reading of the API. The workbench draws a button
		 * on **every** code cell of a notebook with a kernel, so the assertion
		 * was true of the field and false of the picture, and a reader pressed
		 * the button and got nothing. A field is a proxy for a picture only
		 * where somebody has checked that it is.
		 *
		 * So what is asserted is the behaviour: a rule cell runs nothing and
		 * says which cell to press instead, with **no verdict mark** — neither
		 * green nor red is honest about a run that did not happen.
		 */
		test('een regelcel voert niets uit en zegt wat je wél uitvoert ([N-7])', async function () {
			this.timeout(120000);
			const rule = codeCells(notebook)
				.find(cell => cell.document.languageId === MODEL_LANGUAGE)!;
			assert.ok(rule, 'de fixture hoort een regelcel te hebben');
			await execute(notebook, rule.index);
			const text = await waitUntil('de uitvoer van de regelcel',
				() => plainOutput(rule) || undefined);
			assert.ok(text.includes('rekenvoorbeeld uit, niet de regel'), text);
			assert.strictEqual(rule.executionSummary?.success, undefined);
			// And the controller reaches it at all only because it declares the
			// language: without that the workbench completes the execution
			// itself and `runCell` is never called.
			const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as {
				testgevalController: { notebookController: vscode.NotebookController }
			};
			assert.ok(api.testgevalController.notebookController
				.supportedLanguages?.includes(MODEL_LANGUAGE));
		});

		/**
		 * Een cel met alleen de kop van de testset voert niets uit, en zegt dat.
		 *
		 * An empty output under a cell reads as a run that failed, which is a
		 * different fact and the worse one to be told by accident.
		 */
		test('een cel met alleen de testsetkop zegt dat er niets is uitgevoerd', async function () {
			this.timeout(120000);
			const header = codeCells(notebook)
				.find(cell => cell.document.getText().startsWith('Testset'))!;
			await execute(notebook, header.index);
			const text = await waitUntil('de uitvoer van de kopcel',
				() => plainOutput(header) || undefined);
			assert.ok(text.includes(NOTHING_RAN), text);
			// No verdict mark: nothing ran, so neither green nor red is honest.
			assert.strictEqual(header.executionSummary?.success, undefined);
		});

		/**
		 * En de cel met het rekenvoorbeeld voert het uit, door de echte worker.
		 *
		 * The whole of §4.5 in one pass: discovery over the notebook, one
		 * `runTest` per testgeval with the cell's URI, the engine, and the
		 * verdict back under the cell it was pressed on.
		 */
		test('een rekenvoorbeeld levert beide oordelen en het verschil', async function () {
			this.timeout(120000);
			const example = codeCells(notebook)
				.find(cell => cell.document.getText().includes('Testgeval 001'))!;
			await execute(notebook, example.index);
			const text = await waitUntil('de uitvoer van het rekenvoorbeeld',
				() => plainOutput(example) || undefined);

			assert.match(text, /001/u);
			assert.match(text, /✓.*erebonus/u, text);
			assert.match(text, /✗.*toeslag/u, text);
			// The expected/actual pair, both already RegelSpraak literals ([T-14]).
			assert.match(text, /verwacht 10,00 EUR, werd 5 EUR/u, text);
			assert.strictEqual(example.executionSummary?.success, false);
			// And the Markdown item beside it, which is what a reader sees.
			assert.match(markdownOutput(example), /\*\*001\*\* — mislukt/u);
		});

		/**
		 * En een bewerking in een codecel haalt elke uitvoer weg ([N-8]).
		 *
		 * The verdict was against a model that no longer exists — UX-3's *gone*
		 * state one surface over. The whole notebook and not the edited cell,
		 * because a run is about the model: a rule edited three cells up is why
		 * the verdict under a worked example is no longer true.
		 */
		test('een bewerking in de regelcel wist elke uitvoer', async function () {
			this.timeout(120000);
			const example = codeCells(notebook)
				.find(cell => cell.document.getText().includes('Testgeval 001'))!;
			assert.ok(example.outputs.length > 0,
				'de test hiervoor hoort een uitvoer te hebben achtergelaten');

			const rule = codeCells(notebook)
				.find(cell => cell.document.languageId === MODEL_LANGUAGE)!;
			const edit = new vscode.WorkspaceEdit();
			edit.insert(rule.document.uri, new vscode.Position(0, 0), '// tijdelijk\n');
			assert.ok(await vscode.workspace.applyEdit(edit));

			await waitUntil('een lege uitvoer na de bewerking',
				() => example.outputs.length === 0 ? true : undefined, 20000);

			const undo = new vscode.WorkspaceEdit();
			undo.delete(rule.document.uri, new vscode.Range(0, 0, 1, 0));
			assert.ok(await vscode.workspace.applyEdit(undo));
		});

		/**
		 * En de stopknop eindigt de uitvoering, waarna de motor het nog doet.
		 *
		 * **Wat hier wordt vastgelegd is deze kant van de ketting**, en dat is
		 * gezegd omdat het de helft is. Het afbreken reist als een token: de
		 * werkbank annuleert het, `vscode-languageclient` stuurt
		 * `$/cancelRequest`, de server breekt af en `EngineHost.terminate()` doodt
		 * de worker midden in de evaluatie — dezelfde ketting als de stopknop van
		 * de Testing-weergave, en het verre eind ervan staat vast in de suite van
		 * de motor zelf, waar een stilstaande worker het waarneembaar maakt. Een
		 * notebookcel voert een model van drie regels uit en is in tientallen
		 * milliseconden klaar, dus wanneer de annulering aankomt valt hier niet af
		 * te dwingen; wat wel afdwingbaar is, is dat het gebaar de cel niet laat
		 * hangen en dat de motor erna weer een oordeel oplevert — want een gedode
		 * worker wordt vervangen ([E-4]), en een cel die daarna gewoon uitvoert
		 * zegt dat hij terugkwam.
		 */
		test('de stopknop laat de cel niet hangen, en daarna draait het weer', async function () {
			this.timeout(120000);
			const example = codeCells(notebook)
				.find(cell => cell.document.getText().includes('Testgeval 001'))!;
			const running = execute(notebook, example.index);
			await vscode.commands.executeCommand('notebook.cell.cancelExecution', {
				ranges: [{ start: example.index, end: example.index + 1 }],
				document: notebook.uri
			});
			await running;

			await execute(notebook, example.index);
			const text = await waitUntil('de uitvoer van de herhaalde uitvoering',
				() => plainOutput(example) || undefined);
			assert.match(text, /✓.*erebonus/u, text);
		});
	});
});
