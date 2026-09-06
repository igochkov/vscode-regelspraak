// UX-1 — **Leg uit**, checked where the decisions are.
//
// The same split as X4/W3, for the same reason. **What** the gesture opens is
// `buildView`'s `waarde` focus, which is pure, so it is checked against a real
// run of a real testgeval by a real server. **Which position** it is about is
// `siteOf`, which is pure for the reason `rangeOfGesture` and `statusFor` are: a
// menu cannot be driven from a test, and that half decides whether the peek path
// explains the failing expectation or whatever line the editor happens to be on.
// The command itself is asserted only to open a panel.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { ExplicitSite, lensFor, siteOf } from '../explain';
import { renderText } from '../runDocument';
import { RunFocus, buildView } from '../runView';
import { EXPLAINABLE_MESSAGE, RunDetail, TestRun } from '../testExplorer';

import { activate, getDocUri, waitUntil } from './helper';

const EXPLAIN_COMMAND = 'regelspraak.legUit';

interface Api {
	testExplorer: {
		runForDetail(uri: string, caseName: string): Promise<TestRun | undefined>;
	};
}

/** A run with nothing in it but what a case needs — the pure half's fixture. */
const ran = (detail: Partial<RunDetail>): TestRun => ({
	case: 'Iets', outcome: 'uitgevoerd', assertions: [], faults: [],
	detail: {
		rekendatum: '01-01-2027', values: [], kenmerken: [],
		firedRules: [], inconsistencies: [], trace: [], ...detail
	}
});

const onValue = (attribute: string, instance?: string): RunFocus =>
	({ kind: 'waarde', attribute, ...(instance ? { instance } : {}) });

/**
 * One write of Noor's contributie — the slot the samples make surprising.
 *
 * With an operand by default, because that is the ordinary write; a beslistabel
 * records none, which is the case the `zonder operanden` test is about.
 */
const wrote = (rule: string, value: string, operands = [
	{ label: 'standaardcontributie', value: '50,00 euro', source: { kind: 'parameter' as const } }
]) => ({ instance: 'Noor', target: 'contributie', rule, value, operands });

suite('Leg uit (UX-1)', () => {
	suite('waar de weergave op wordt gericht', () => {
		test('leidt met de afleiding van die ene waarde, opengeklapt', () => {
			const view = buildView('x.test.rgs', ran({
				trace: [{
					instance: 'Noor', target: 'contributie', rule: 'bepaal contributie',
					value: '25,00 EUR',
					steps: [{ text: 'de standaardcontributie maal 0,5', value: '25,00 EUR' }],
					operands: [{
						label: 'standaardcontributie', value: '50,00 EUR',
						source: { kind: 'parameter' }
					}]
				}]
			}), onValue('contributie', 'Noor'));

			// The first section is the answer, and it names the slot rather than a
			// rule: the reader pointed at a value.
			const first = view.sections[0];
			assert.equal(first.title, "Afleiding van 'Noor · contributie'");
			assert.equal(view.heading,
				"Hoe 'Noor · contributie' tot stand kwam, in testgeval 'Iets'");

			// **Two levels open.** The write and what it was computed out of are on
			// screen; deeper would unfold a chain nobody asked to follow, and the
			// whole point of opening at all is that the first answer is visible.
			const write = first.rows[0];
			assert.equal(write.kind, 'write');
			assert.equal(write.open, true);
			assert.deepEqual(write.children?.map(one => one.kind), ['step', 'operand']);
			// The row below the trace is the same row collapsed, which is right
			// there and would be forty open chains here.
			const trace = view.sections.find(one => one.title.startsWith('Trace'))!;
			assert.equal(trace.rows[0].open, undefined);
		});

		test('toont elke schrijving, in de volgorde waarin geschreven werd', () => {
			// Twee keer schrijven is gewoon — een initialisatie en dan de regel die
			// hem overneemt — en juist dáár is een verrassend getal vaak de tweede
			// die de eerste overschrijft. Alleen de laatste tonen zou dat verbergen.
			const rows = buildView('x.test.rgs', ran({
				trace: [wrote('Initialiseer contributie', '50,00 EUR'),
					wrote('Contributie nieuwe stijl', '25,00 EUR')]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.deepEqual(rows.map(one => one.rule),
				['Initialiseer contributie', 'Contributie nieuwe stijl']);
		});

		// **Which of them still stands is the question the section is opened to
		// answer.** Four rules writing `contributie` came out as four equal rows,
		// all expanded, with nothing saying that only the last accounts for the
		// number the expectation failed on — which is how a reader reads the
		// section and cannot find the reason in it.
		test('zegt welke schrijving de eindwaarde is, en welke overschreven zijn', () => {
			const rows = buildView('x.test.rgs', ran({
				trace: [
					wrote('Initialiseer contributie', '50 euro'),
					wrote('Contributie met overgangsperiode', 'leeg'),
					wrote('Contributie nieuwe stijl', 'leeg'),
					wrote('Contributiestaffel', '40 euro')
				]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.deepEqual(rows.map(one => [one.rule, one.note]), [
				['Initialiseer contributie', 'overschreven'],
				['Contributie met overgangsperiode', 'overschreven'],
				['Contributie nieuwe stijl', 'overschreven'],
				['Contributiestaffel', 'eindwaarde']
			]);
			// Nothing is reordered — write order *is* the derivation — and only the
			// row that still stands is opened, so the answer is the one on screen.
			assert.deepEqual(rows.map(one => one.open),
				[undefined, undefined, undefined, true]);
		});

		// **The row that decides the value is often the one that cannot expand.**
		// A beslistabel records no operands, so where one has the last word its
		// row has nothing to fold while the superseded rules above it do — which
		// is exactly the shape that read upside down before the note existed, the
		// dead rows being the fat ones. The note has to carry it alone.
		test('markeert ook een eindwaarde zonder operanden', () => {
			const rows = buildView('x.test.rgs', ran({
				trace: [
					wrote('Initialiseer contributie', '50 euro'),
					wrote('Contributiestaffel', '40 euro', [])
				]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.deepEqual(rows.map(one => [one.note, one.open]), [
				['overschreven', undefined],
				['eindwaarde', undefined]
			]);
			// En een rij zonder kinderen krijgt geen lege vouw, wat elders ook geldt.
			assert.equal(rows[1].children?.length, 0);
		});

		// **Welke rij besliste, zonder dat er iets opengeklapt hoeft te worden.**
		// De stappen zeggen het al, maar pas na een klik — en dat is precies de
		// vraag die een tabel oproept.
		test('noemt de beslissende rij achter de naam van de tabel', () => {
			const rows = buildView('x.test.rgs', ran({
				trace: [{ ...wrote('Contributiestaffel', '40 euro', []), row: 'rij 2' }]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.equal(rows[0].rule, 'Contributiestaffel');
			assert.equal(rows[0].ruleDetail, 'rij 2');
			// **De naam blijft de naam.** De sprong matcht hem exact tegen de
			// werkruimtesymbolen, en 'Contributiestaffel (rij 2)' declareert niets.
			assert.deepEqual(rows[0].link,
				{ on: 'beside', kind: 'revealRule', rule: 'Contributiestaffel' });
			assert.match(renderText(buildView('x.test.rgs', ran({
				trace: [{ ...wrote('Contributiestaffel', '40 euro', []), row: 'rij 2' }]
			}), onValue('contributie', 'Noor'))), /← Contributiestaffel \(rij 2\)/);
		});

		test('noemt geen rij waar de run er geen kent', () => {
			// Een gewone regel kent geen gevallen; een lege haakjes-toevoeging zou
			// een onderscheid tekenen dat er niet is.
			const rows = buildView('x.test.rgs', ran({
				trace: [wrote('bepaal contributie', '25,00 EUR')]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.equal(rows[0].ruleDetail, undefined);
			assert.doesNotMatch(renderText(buildView('x.test.rgs', ran({
				trace: [wrote('bepaal contributie', '25,00 EUR')]
			}), onValue('contributie', 'Noor'))), /\(rij/);
		});

		test('trekt geen onderscheid waar er niets overschreven is', () => {
			// `eindwaarde` op een slot dat één keer geschreven werd stelt het
			// vanzelfsprekende vast, en leest als een onderscheid dat er niet is.
			const rows = buildView('x.test.rgs', ran({
				trace: [wrote('bepaal contributie', '25,00 EUR')]
			}), onValue('contributie', 'Noor')).sections[0].rows;
			assert.equal(rows[0].note, undefined);
			assert.equal(rows[0].open, true);
		});

		test('houdt de eindwaarde per instantie apart', () => {
			// Een focus zonder instantie dekt ze allemaal, en elke instantie houdt
			// haar eigen laatste schrijving: één `standing` voor het geheel zou de
			// geschiedenis van elke instantie overschreven verklaren door wie
			// toevallig als laatste schreef.
			const forOne = (instance: string, rule: string, value: string) => ({
				...wrote(rule, value), instance
			});
			const rows = buildView('x.test.rgs', ran({
				trace: [
					forOne('Noor', 'Initialiseer contributie', '50 euro'),
					forOne('Noor', 'Contributiestaffel', '40 euro'),
					forOne('Sam', 'Initialiseer contributie', '50 euro'),
					forOne('Sam', 'Contributiestaffel', '30 euro')
				]
			}), onValue('contributie')).sections[0].rows;
			assert.deepEqual(rows.map(one => one.note),
				['overschreven', 'eindwaarde', 'overschreven', 'eindwaarde']);
		});

		test('houdt een gerichte weergave bij één instantie', () => {
			const wrote = (instance: string) => ({
				instance, target: 'contributie', rule: 'bepaal contributie',
				value: '25,00 EUR', operands: []
			});
			const rows = buildView('x.test.rgs', ran({ trace: [wrote('Noor'), wrote('Sam')] }),
				onValue('contributie', 'Noor')).sections[0].rows;
			assert.equal(rows.length, 1);
			assert.match(rows[0].label, /^Noor · /);

			// Zonder instantie — de lezing in een regelbestand, waar een regel over
			// elke instantie van zijn onderwerp geschreven is — staan ze er allebei.
			assert.equal(
				buildView('x.test.rgs', ran({ trace: [wrote('Noor'), wrote('Sam')] }),
					onValue('contributie')).sections[0].rows.length,
				2);
		});

		// Elke rij is een vastgelegd feit; wat de run níet weet wordt gezegd en
		// niet afgeleid (IR-4). De volledige diagnose is UX-2 en staat hier niet.
		test('zegt van een gegeven waarde dat geen regel haar schreef', () => {
			const text = renderText(buildView('x.test.rgs', ran({
				values: [{
					instance: 'Sam', attribute: 'inschrijfdatum', derived: false,
					value: '12-03-1985'
				}]
			}), onValue('inschrijfdatum', 'Sam')));
			assert.match(text, /12-03-1985/);
			assert.match(text,
				/\(gegeven in dit testgeval — geen regel heeft deze waarde geschreven\)/);
		});

		test('zegt van een waarde die de run niet kent dat hij haar niet kent', () => {
			// Een afdeling die simpelweg ontbreekt leest als een mislukte run, wat
			// een ander en erger bericht is.
			const text = renderText(
				buildView('x.test.rgs', ran({}), onValue('bestaat niet', 'Noor')));
			assert.match(text, /Afleiding van 'Noor · bestaat niet'/);
			assert.match(text, /\(niets — deze uitvoering kent deze waarde niet\)/);
		});

		test('laat de hele run eronder staan, als context', () => {
			// Een regel leest wat de regels vóór hem afleidden ([E-7]), dus de rest
			// van de run ís hoe het getal erboven tot stand kwam.
			const titles = buildView('x.test.rgs', ran({
				values: [{ instance: 'Noor', attribute: 'contributie', derived: true, value: '25,00 EUR' }],
				firedRules: [{ rule: 'bepaal contributie', count: 1 }]
			}), onValue('contributie', 'Noor')).sections.map(one => one.title);
			assert.equal(titles[0], "Afleiding van 'Noor · contributie'");
			for (const heading of ['Verwachtingen', 'Afgeleid', 'Gevuurde regels']) {
				assert.ok(titles.includes(heading), titles.join(' | '));
			}
		});
	});

	suite('waar het gebaar naar wijst', () => {
		const uri = vscode.Uri.parse('file:///w/tests/lid.test.rgs');
		const elsewhere = { uri: vscode.Uri.parse('file:///w/regels/x.rgs'), position: new vscode.Position(0, 0) };

		test('neemt van een gefaalde verwachting haar eigen plek en testgeval', () => {
			// Het moment van de grootste intentie: de lezer kijkt naar *verwacht 120
			// €, werkelijk 80 €*. De plek moet die van de verwachting zijn en niet
			// die van de editor, of de uitleg gaat over een andere regel.
			const message = vscode.TestMessage.diff('Noor — contributie', '30,00 EUR', '25,00 EUR');
			message.location = new vscode.Location(uri, new vscode.Range(27, 2, 27, 13));
			const controller = vscode.tests.createTestController('ux1', 'UX-1');
			try {
				const item = controller.createTestItem(`${uri.toString()}#Een geval`, 'Een geval', uri);
				const site = siteOf({ test: item, message }, elsewhere);
				assert.equal(site?.uri.toString(), uri.toString());
				assert.equal(site?.position.line, 27);
				// En het testgeval komt uit de id van het item, het enige dat zowel
				// het bestand als het geval noemt.
				assert.deepEqual(site?.case, { uri: uri.toString(), case: 'Een geval' });
			} finally {
				controller.dispose();
			}
		});

		test('valt zonder item terug op de plek alleen', () => {
			// VS Code zegt dat `test` weg kan zijn; de locatie noemt dan nog steeds
			// de testset, en de cursorlezing vindt het geval erin.
			const message = vscode.TestMessage.diff('x', 'a', 'b');
			message.location = new vscode.Location(uri, new vscode.Range(9, 0, 9, 4));
			const site = siteOf({ message }, elsewhere);
			assert.equal(site?.uri.toString(), uri.toString());
			assert.equal(site?.case, undefined);
		});

		test('valt zonder bericht terug op de actieve editor', () => {
			assert.deepEqual(siteOf(undefined, elsewhere)?.uri.toString(),
				elsewhere.uri.toString());
			assert.equal(siteOf({}, elsewhere)?.position.line, 0);
			// En zonder allebei is er niets aan te wijzen.
			assert.equal(siteOf(undefined, undefined), undefined);
		});
	});

	// **Where the gesture is offered**, which is what this feature got wrong
	// first and is therefore worth a gate of its own. The failure a reader sees
	// is the inline decoration — the red *40 euro != 41,00 euro* badge — and VS
	// Code accepts no contribution on it: `testing/message/content` draws inside
	// the peek and `testing/message/context` is the results-tree menu, so both
	// need a gesture before they exist. Only a lens sits where the reader is
	// looking. §UX-1 ruled a lens out, and its reason survives being overruled:
	// it objected to a lens per `Verwacht` line, and this is one per *failure*.
	suite('waar het gebaar wordt aangeboden', () => {
		const failure = {
			uri: 'file:///w/tests/lid.test.rgs',
			case: 'Een lange inschrijving betaalt het volle bedrag',
			line: 40,
			label: 'Sam — contributie'
		};

		test('hangt een lens op de regel die faalde, en nergens anders', () => {
			const lens = lensFor(failure);
			assert.equal(lens.range.start.line, 40);
			// Lowercase, as the run lenses beside it are (`test uitvoeren`).
			assert.equal(lens.command?.title, 'leg uit');
			assert.match(lens.command?.tooltip ?? '', /Sam — contributie/);
		});

		test('draagt zijn eigen plek mee, niet die van de cursor', () => {
			// Een lens klik je zonder de cursor te verplaatsen, dus opnieuw afleiden
			// zou een andere regel uitleggen dan de aangeklikte.
			const [args] = lensFor(failure).command!.arguments as [ExplicitSite];
			const elsewhere = {
				uri: vscode.Uri.parse('file:///w/regels/x.rgs'),
				position: new vscode.Position(0, 0)
			};
			const site = siteOf(args, elsewhere);
			assert.equal(site?.uri.toString(), vscode.Uri.parse(failure.uri).toString());
			assert.equal(site?.position.line, 40);
			// En het testgeval is dat wat de fout opleverde, niet dat waar de cursor
			// toevallig in staat.
			assert.deepEqual(site?.case, { uri: failure.uri, case: failure.case });
		});

		test('houdt het resultatenmenu aan als tweede bereik', () => {
			// De boomweergave van Test Results somt fouten over bestanden heen op, wat
			// een ander bereik is dan een lens in een geopend bestand. De peekknop is
			// er niet: die was precies degene die niemand vond.
			const menus: Record<string, { command: string; when?: string }[]> =
				vscode.extensions.getExtension('igochkov.vscode-regelspraak')!
					.packageJSON.contributes.menus;
			const entry = menus['testing/message/context']
				?.find(one => one.command === EXPLAIN_COMMAND);
			assert.ok(entry, 'geen bijdrage aan testing/message/context');
			// Exact de vlag die `testExplorer.ts` schrijft: een `when` die iets
			// anders noemt is een menu-ingang die nooit verschijnt.
			assert.equal(entry.when, `testMessage == ${EXPLAINABLE_MESSAGE}`);
			assert.equal(menus['testing/message/content'], undefined);
		});

		test('verschijnt in de editor alleen waar er een antwoord is', () => {
			// The prepare-rename shape: an entry that appears where the command would
			// shrug teaches a reader that the feature does not work.
			const menus: Record<string, { command: string; when?: string }[]> =
				vscode.extensions.getExtension('igochkov.vscode-regelspraak')!
					.packageJSON.contributes.menus;
			const entry = menus['editor/context']?.find(one => one.command === EXPLAIN_COMMAND);
			assert.ok(entry);
			assert.match(entry.when ?? '', /regelspraak\.uitlegbaar/);
		});
	});

	suite('het commando, van cursor tot paneel', () => {
		const testsUri = getDocUri('tests/lidmaatschap.test.rgs');
		let document: vscode.TextDocument;

		suiteSetup(async function () {
			this.timeout(120000);
			await activate(testsUri);
			document = await vscode.workspace.openTextDocument(testsUri);
			// The API is awaited so the extension is up before the command is sent.
			await vscode.extensions.getExtension('igochkov.vscode-regelspraak')!
				.activate() as Api;
		});

		test('opent de uitkomst gericht op de waarde onder de cursor', async function () {
			this.timeout(120000);
			const at = document.getText().indexOf('contributie        25,00 EUR');
			assert.ok(at >= 0, 'de voorbeeldtestset hoort deze verwachting te bevatten');
			const editor = await vscode.window.showTextDocument(document);
			const position = document.positionAt(at);
			editor.selection = new vscode.Selection(position, position);

			await vscode.commands.executeCommand(EXPLAIN_COMMAND);
			const tab = await waitUntil('een uitkomstpaneel voor de waarde', () =>
				vscode.window.tabGroups.all.flatMap(group => group.tabs).find(one =>
					one.input instanceof vscode.TabInputWebview
					&& one.input.viewType.includes('uitkomst')
					&& one.label.startsWith('Noor · contributie')));
			// Named for the slot, so it can be told from a rule-focused panel beside
			// it — and so pressing the same value twice redraws one panel.
			assert.ok(tab.label.includes('uitkomst'), tab.label);
			await vscode.window.tabGroups.close(tab);
		});

		test('hangt geen lens waar niets faalde', async function () {
			this.timeout(120000);
			// The samples are green by construction — `samples.test.ts` requires every
			// expectation in them to pass — so this is the "gone again when it
			// passes" half of the rule, checked end to end: a lens that outlived the
			// failure it names would send a reader to explain a value that is now
			// right, which reads as the test still failing.
			const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
				'vscode.executeCodeLensProvider', testsUri) ?? [];
			// The run lenses are there, which is what says the request reached the
			// providers at all rather than answering empty for some other reason.
			assert.ok(lenses.some(one => one.command?.command === 'regelspraak.runTestgeval'),
				lenses.map(one => one.command?.title).join(' | '));
			assert.equal(lenses.filter(one => one.command?.command === EXPLAIN_COMMAND).length, 0);
		});

		test('zegt waar de cursor op geen waarde staat', async function () {
			this.timeout(120000);
			const editor = await vscode.window.showTextDocument(document);
			// Line 0 is the file's own comment: it names nothing the model knows.
			editor.selection = new vscode.Selection(0, 0, 0, 0);
			const before = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
				one.input instanceof vscode.TabInputWebview
				&& one.input.viewType.includes('uitkomst')).length;
			// What is asserted is that it reports and opens nothing — a command that
			// silently does nothing is indistinguishable from one that is broken.
			await vscode.commands.executeCommand(EXPLAIN_COMMAND);
			assert.equal(
				vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
					one.input instanceof vscode.TabInputWebview
					&& one.input.viewType.includes('uitkomst')).length,
				before);
		});
	});
});
