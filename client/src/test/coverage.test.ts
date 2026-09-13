// De dekking van het model, end to end tegen een echte taalserver.
//
// Dit is het enige dat het contract van `regelspraak/coverage` controleert:
// het is geen LSP, de serverrepository houdt de andere helft, en niets
// vergelijkt de twee op bouwtijd. Dus draait het een testgeval via het
// dekkingsprofiel en kijkt wat er getekend is — precies zoals `testExplorer.
// test.ts` dat voor `regelspraak/tests` en `regelspraak/runTest` doet.
//
// Het profiel geeft zijn `TestRun` niet terug, dus wat getekend werd staat op
// `coverageDrawn`; dat veld bestaat om deze reden en wordt bij elke dekkingsrun
// eerst leeggemaakt, zodat een mislukte ophaalpoging hier niet als de vorige run
// doorgaat.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { coverageOf } from '../testExplorer';
import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

interface DrawnCoverage {
	uri: vscode.Uri;
	details: vscode.FileCoverageDetail[];
}

interface TestExplorerLike {
	refresh(): Promise<void>;
	readonly testController: vscode.TestController;
	readonly testCoverageProfile: vscode.TestRunProfile;
	readonly coverageDrawn: readonly DrawnCoverage[];
}

suite('Dekking van de regelversies', () => {
	const testsUri = getDocUri('tests/lidmaatschap.test.rgs');
	let explorer: TestExplorerLike;

	suiteSetup(async () => {
		await activate(testsUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ testExplorer: TestExplorerLike } | undefined;
		assert.ok(api?.testExplorer, 'de extensie levert geen testverkenner op');
		explorer = api.testExplorer;
	});

	async function testsets(): Promise<vscode.TestItem[]> {
		return waitUntil('een testboom met elke testset erin', async () => {
			await explorer.refresh();
			const found: vscode.TestItem[] = [];
			explorer.testController.items.forEach(one => found.push(one));
			return found.length >= 4 ? found : undefined;
		});
	}

	function childrenOf(item: vscode.TestItem): vscode.TestItem[] {
		const found: vscode.TestItem[] = [];
		item.children.forEach(one => found.push(one));
		return found;
	}

	test('kent een dekkingsprofiel naast het uitvoerprofiel', async () => {
		await testsets();
		assert.equal(explorer.testCoverageProfile.kind, vscode.TestRunProfileKind.Coverage);
		assert.ok(explorer.testCoverageProfile.loadDetailedCoverage,
			'zonder dit vraagt VS Code nooit om de regels, en blijft de goot leeg');
	});

	// De hele keten in één keer: ontdekken, draaien met `coverage: true`, de
	// handvatten terug over de draad, en de join tegen wat het model verklaart.
	test('tekent de dekking van een echte run', async function () {
		this.timeout(60000);
		const found = (await testsets()).find(one => one.uri?.fsPath === testsUri.fsPath)!;
		const one = childrenOf(found).find(each => each.label.includes('kort lidmaatschap'));
		assert.ok(one, 'het testgeval ontbreekt');

		const profile = explorer.testCoverageProfile;
		await profile.runHandler(
			new vscode.TestRunRequest([one], undefined, profile),
			new vscode.CancellationTokenSource().token);
		assert.equal(one.error, undefined, `${one.label} kon niet samengesteld worden`);

		const drawn = explorer.coverageDrawn;
		assert.ok(drawn.length > 0, 'er is geen enkel bestand met dekking getekend');

		// De noemer is het model: `samples/workspace/single-folder/regels/` telt
		// meer dan één regelbestand, en ze horen er allemaal in te staan — ook die
		// waar dit ene testgeval niets in raakt. Een rapport dat alleen de
		// bestanden noemt die draaiden, beantwoordt de omgekeerde vraag.
		assert.ok(drawn.length > 1, drawn.map(file => file.uri.fsPath).join(' | '));
		assert.ok(drawn.every(file => file.uri.fsPath.endsWith('.rgs')
			|| file.uri.fsPath.endsWith('.rgs.md') || file.uri.scheme === 'vscode-notebook-cell'),
			drawn.map(file => file.uri.toString()).join(' | '));

		const details = drawn.flatMap(file => file.details);
		const declarations = details.filter(
			(each): each is vscode.DeclarationCoverage => 'name' in each);
		assert.ok(declarations.length > 0, 'geen enkele regelversie is als declaratie gemeld');
		// Het label is de zin van het model: naam plus de geldig-clausule.
		assert.ok(declarations.every(each => / · [Gg]eldig /.test(each.name)),
			declarations.slice(0, 5).map(each => each.name).join(' | '));
		// Twee lezingen van één feit: elke versie meldt zich als declaratie én als
		// statement, want de eerste noemt haar en de tweede kleurt haar regels.
		assert.equal(details.length, declarations.length * 2);

		const gevuurd = declarations.filter(each => each.executed);
		assert.ok(gevuurd.length > 0, 'dit testgeval vuurt regels, dus er hoort dekking te zijn');
		assert.ok(gevuurd.length < declarations.length,
			'één testgeval dekt niet het hele model — anders meet dit niets');
	});

	// VS Code vraagt de regels pas als de lezer een bestand opent, en per run.
	test('levert de regels van een bestand na op verzoek', async function () {
		this.timeout(60000);
		const drawn = explorer.coverageDrawn;
		assert.ok(drawn.length > 0, 'de vorige test hoort dekking te hebben getekend');
		// Het geheugen hangt aan de `TestRun`, die de workbench niet teruggeeft —
		// dus wat hier te controleren valt is dat een onbekende run niets oplevert
		// in plaats van de verkeerde regels.
		const controller = explorer.testController;
		const vreemd = controller.createTestRun(new vscode.TestRunRequest());
		try {
			const answer = await explorer.testCoverageProfile.loadDetailedCoverage!(
				vreemd,
				vscode.FileCoverage.fromDetails(drawn[0].uri, [...drawn[0].details]),
				new vscode.CancellationTokenSource().token);
			assert.deepEqual(answer, []);
		} finally {
			vreemd.end();
		}
	});
});

// ---------------------------------------------------------------------------
// De pure helft, waar een test bij kan
// ---------------------------------------------------------------------------

suite('Dekking — wat een versie in de editor wordt', () => {
	const range = {
		start: { line: 4, character: 1 },
		end: { line: 6, character: 40 }
	};

	test('maakt van elke versie een declaratie en een statement', () => {
		const [file] = coverageOf({
			files: [{
				uri: 'file:///regels.rgs',
				versions: [{ label: 'bepaal boete · geldig altijd', range, fired: true }]
			}]
		});
		assert.equal(file.uri.toString(), 'file:///regels.rgs');
		const [declaration, statement] = file.details as
			[vscode.DeclarationCoverage, vscode.StatementCoverage];
		assert.equal(declaration.name, 'bepaal boete · geldig altijd');
		assert.equal(declaration.executed, true);
		// De declaratie zit op de regel die de versie opent — zoals lcov een
		// functie op haar kop meldt en haar lichaam als statements.
		assert.deepEqual(declaration.location, new vscode.Position(4, 1));
		assert.deepEqual(statement.location,
			new vscode.Range(4, 1, 6, 40), 'het statement beslaat de hele versie');
		assert.equal(statement.executed, true);
		assert.deepEqual(statement.branches, [],
			'een voorwaarde beslist óf de versie vuurt, en dat is de dekking zelf');
	});

	test('draagt een ongedekte versie als niet-uitgevoerd over', () => {
		const [file] = coverageOf({
			files: [{
				uri: 'file:///regels.rgs',
				versions: [{ label: 'bepaal oude contributie · geldig t/m 2026', range, fired: false }]
			}]
		});
		assert.ok(file.details.every(one => one.executed === false));
		// En VS Code telt het dan ook als ongedekt — het rekenwerk is van haar,
		// niet van ons, en dit pint dat we haar de goede vorm aanleveren.
		const summary = vscode.FileCoverage.fromDetails(file.uri, file.details);
		assert.equal(summary.statementCoverage.covered, 0);
		assert.equal(summary.statementCoverage.total, 1);
		assert.equal(summary.declarationCoverage?.covered, 0);
		assert.equal(summary.declarationCoverage?.total, 1);
	});
});
