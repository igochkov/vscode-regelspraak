// X4/W3 — what a run shows, and the two surfaces that show it.
//
// The split follows where the decisions are. **What** to show is `buildView`,
// which is pure, so it is checked against a real run of a real testgeval by a
// real server — the whole path, minus the drawing. **How** it is drawn is a
// webview and a text document: a webview cannot be driven from a test at all, so
// what is asserted of the panel is that it opens; the text form is asserted in
// full, which is the other reason it was kept.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { renderText } from '../runDocument';
import { RunPanels, ruleLocation, trackOf } from '../runPanel';
import { RunFocus, RunSection, buildView } from '../runView';
import { RunDetail, TestRun } from '../testExplorer';

import { activate, getDocUri, waitUntil } from './helper';

const RUN_SCHEME = 'regelspraak-uitkomst';
const SHOW_COMMAND = 'regelspraak.showUitkomst';
const AS_TEXT_COMMAND = 'regelspraak.showUitkomstAlsTekst';

interface Api {
	testExplorer: {
		runForDetail(uri: string, caseName: string): Promise<TestRun | undefined>;
	};
}

suite('Uitkomst van een run (X4, W3)', () => {
	const testsUri = getDocUri('tests/lidmaatschap.test.rgs');
	const PASSING = 'Een kort lidmaatschap geeft een jeugdlid met korting';
	let document: vscode.TextDocument;
	let api: Api;

	suiteSetup(async () => {
		await activate(testsUri);
		document = await vscode.workspace.openTextDocument(testsUri);
		api = await vscode.extensions.getExtension('igochkov.vscode-regelspraak')!
			.activate() as Api;
	});

	/** A real run of a real testgeval, which is what the view is built from. */
	async function run(caseName: string): Promise<TestRun> {
		const outcome = await api.testExplorer.runForDetail(testsUri.toString(), caseName);
		assert.ok(outcome, `${caseName} leverde geen uitkomst op`);
		return outcome;
	}

	const textOf = async (caseName: string, focus?: RunFocus): Promise<string> =>
		renderText(buildView('lidmaatschap.test.rgs', await run(caseName), focus));

	/** X2b's focus, which is the commonest one in this suite. */
	const onRule = (rule: string): RunFocus => ({ kind: 'regel', rule });

	test('noemt het testgeval, de rekendatum en elke afdeling', async function () {
		this.timeout(60000);
		const text = await textOf(PASSING);
		assert.ok(text.startsWith(`// Uitkomst van '${PASSING}'`), text.slice(0, 120));
		// The date the run was made against is context a reader needs first: every
		// derived value depends on it.
		assert.match(text, /rekendatum 15-06-2027/);
		for (const heading of ['Verwachtingen', 'Gegeven', 'Afgeleid', 'Trace', 'Gevuurde regels']) {
			assert.ok(text.includes(heading), `kop '${heading}' ontbreekt:\n${text}`);
		}
		// A passing expectation shows what it got; the trace names the rule that
		// produced it, with an arrow rather than prose.
		assert.match(text, /✓ Noor — lidmaatschapsduur/);
		assert.match(text, /← bepaal lidmaatschapsduur/);
	});

	test('geeft een testgeval zonder verwachtingen dat als zodanig terug', async function () {
		this.timeout(60000);
		const text = await textOf('Alleen uitvoeren, zonder verwachtingen');
		assert.match(text, /\(geen — dit testgeval voert alleen uit\)/);
		// It still ran, so it still says what it computed.
		assert.ok(text.includes('Gevuurde regels'), text);
	});

	test('leidt een regelweergave met wat die regel schreef', async function () {
		this.timeout(60000);
		const text = await textOf(PASSING, onRule('bepaal lidmaatschapsduur'));
		assert.ok(text.startsWith("// Wat 'bepaal lidmaatschapsduur' deed, in testgeval"),
			text.slice(0, 120));
		assert.match(text, /Geschreven door 'bepaal lidmaatschapsduur'/);
		assert.match(text, /lidmaatschapsduur = /);
		// And the whole run is still below it, as context: a rule's inputs are
		// whatever the rules before it derived.
		assert.ok(text.includes('Verwachtingen') && text.includes('Gegeven'), text);
	});

	test('elke afdeling van de weergave is een beslissing, niet een sortering', async function () {
		this.timeout(60000);
		const view = buildView('lidmaatschap.test.rgs', await run(PASSING));
		const titles = view.sections.map(one => one.title);
		// Input before derived, because a reader checking a surprising number starts
		// from what was given rather than from what was worked out.
		assert.ok(titles.indexOf('Gegeven') < titles.indexOf('Afgeleid'), titles.join(' | '));
		const trace = view.sections.find(one => one.title.startsWith('Trace'))!;
		// The trace is in the order the writes happened, because that order *is* the
		// derivation — so every row carries the rule it came from.
		assert.ok(trace.rows.every(one => one.rule !== undefined && one.rule.length > 0));
		// A write's operands are its children, which is what the panel collapses.
		assert.ok(trace.rows.some(one => (one.children ?? []).length > 0));
	});

	test('zet de tussenstappen onder een schrijving, vóór haar operanden', async function () {
		this.timeout(60000);
		const view = buildView('lidmaatschap.test.rgs', await run(PASSING));
		const trace = view.sections.find(one => one.title.startsWith('Trace'))!;
		const withSteps = trace.rows.find(one =>
			(one.children ?? []).some(child => child.kind === 'step'));
		assert.ok(withSteps, 'ergens in deze run wordt gerekend');

		// §X7 fase 3: wat de regel *deed*, en daarna waar de getallen vandaan
		// kwamen — in die volgorde, en achter dezelfde ene klik.
		const kinds = (withSteps.children ?? []).map(one => one.kind);
		assert.equal(kinds.indexOf('step'), 0, kinds.join(' | '));
		assert.ok(kinds.lastIndexOf('step') < (kinds.indexOf('operand') === -1
			? kinds.length
			: kinds.indexOf('operand')), kinds.join(' | '));

		// Een stap is `tekst = waarde` en verder niets: hij is geen plek, dus hij
		// krijgt ook geen doorklik.
		const step = (withSteps.children ?? []).find(one => one.kind === 'step')!;
		assert.ok(step.label.length > 0 && step.value !== undefined);
		assert.equal(step.link, undefined);
		assert.equal(step.rule, undefined);
	});

	test('geeft elke verwachting het bereik van haar eigen Verwacht-regel', async function () {
		this.timeout(60000);
		const view = buildView('lidmaatschap.test.rgs', await run(PASSING));
		const expectations = view.sections.find(one => one.title === 'Verwachtingen')!;
		assert.ok(expectations.rows.every(one => one.range !== undefined));
		assert.ok(expectations.rows.every(one => one.link?.on === 'label'));
	});

	test('noemt bij elke afgeleide waarde de regel die haar schreef', async function () {
		this.timeout(60000);
		const view = buildView('lidmaatschap.test.rgs', await run(PASSING));
		const derived = view.sections.find(one => one.title === 'Afgeleid')!;
		// Every derived value has a writer, and the trace is where it comes from —
		// so a reader checking a surprising number gets there from the number.
		assert.ok(derived.rows.length > 0);
		assert.ok(derived.rows.every(one => one.rule !== undefined && one.ruleAt === 'beside'),
			derived.rows.filter(one => !one.rule).map(one => one.label).join(' | '));
		// And a given value has none, because nothing derived it.
		const given = view.sections.find(one => one.title === 'Gegeven')!;
		assert.ok(given.rows.every(one => one.rule === undefined));
	});

	test('zegt van een geweigerde run dat hij geweigerd is, en verder niets', () => {
		const refused: TestRun = {
			case: 'Onbestaand', outcome: 'geweigerd', reason: 'geen testgeval met die naam',
			details: ['RS952 — id onbekend'], assertions: [], faults: []
		};
		const view = buildView('x.test.rgs', refused);
		assert.deepEqual(view.sections, []);
		assert.equal(view.refusal?.reason, 'geen testgeval met die naam');
		assert.match(renderText(view), /Geweigerd\r?\n\tgeen testgeval met die naam/);
	});

	test('zegt van een regel die niet vuurde dat hij niet vuurde', () => {
		const ran: TestRun = {
			case: 'Iets', outcome: 'uitgevoerd', assertions: [], faults: [],
			detail: {
				rekendatum: '01-01-2027', values: [], kenmerken: [],
				firedRules: [{ rule: 'een andere regel', count: 2 }],
				inconsistencies: [], trace: []
			}
		};
		const text = renderText(buildView('x.test.rgs', ran, onRule('deze regel')));
		// Both halves say so, and neither is redundant: the first is that it wrote
		// nothing, the second that it was not applied to a single instance. An
		// absent section would read as a run that failed, which is a worse lie.
		assert.match(text, /\(niets — deze regel vuurde niet in dit testgeval\)/);
		assert.match(text, /Vuurde\r?\n\tniet in dit testgeval/);
	});

	test('het commando opent een paneel', async function () {
		this.timeout(60000);
		const at = document.getText().indexOf(`Testgeval ${PASSING}`);
		assert.ok(at >= 0, `${PASSING} staat niet in de testset`);
		const editor = await vscode.window.showTextDocument(document);
		const position = document.positionAt(at);
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand(SHOW_COMMAND);
		const tab = await waitUntil('een tabblad met de uitkomst', () =>
			vscode.window.tabGroups.all.flatMap(group => group.tabs).find(one =>
				one.input instanceof vscode.TabInputWebview
				&& one.input.viewType.includes('uitkomst')));
		// Named for the testgeval, so two panels side by side can be told apart.
		assert.ok(tab.label.includes(PASSING), tab.label);
		// Closed again, so a following suite finds an ordinary layout.
		await vscode.window.tabGroups.close(tab);
	});

	test('het paneel kan zijn inhoud als tekst openen', async function () {
		this.timeout(60000);
		await vscode.commands.executeCommand(
			AS_TEXT_COMMAND, testsUri.toString(), await run(PASSING));
		const opened = await waitUntil('een tekstweergave van de uitkomst', () => {
			const found = vscode.workspace.textDocuments.find(one =>
				one.uri.scheme === RUN_SCHEME && one.getText().includes(PASSING));
			return found && found.getText().length > 0 ? found : undefined;
		});
		assert.ok(opened.uri.path.endsWith('(uitkomst)'), opened.uri.path);
		assert.match(opened.getText(), /Gevuurde regels/);
	});

	test('zegt waar de cursor in geen testgeval staat', async () => {
		const editor = await vscode.window.showTextDocument(document);
		// Line 0 is the file's own comment.
		editor.selection = new vscode.Selection(0, 0, 0, 0);
		const before = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
			one.input instanceof vscode.TabInputWebview
			&& one.input.viewType.includes('uitkomst')).length;
		// The command reports and returns; what is asserted is that it does not
		// throw and opens nothing new.
		await vscode.commands.executeCommand(SHOW_COMMAND);
		assert.equal(
			vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
				one.input instanceof vscode.TabInputWebview
				&& one.input.viewType.includes('uitkomst')).length,
			before);
	});

	// Every row carries at most one click-through, and which piece of the row it
	// hangs on follows from what the row is. The first version decided this in the
	// webview script, where no test could read it, and got two sections wrong.
	suite('waar de sprong van een rij op hangt', () => {
		const view = (run: TestRun): Map<string, RunSection> =>
			new Map(buildView('x.test.rgs', run).sections.map(one => [one.title, one]));

		const ran = (detail: Partial<RunDetail>, assertions: TestRun['assertions'] = []): TestRun => ({
			case: 'Iets', outcome: 'uitgevoerd', assertions, faults: [],
			detail: {
				rekendatum: '01-01-2027', values: [], kenmerken: [],
				firedRules: [], inconsistencies: [], trace: [], ...detail
			}
		});

		test('een verwachting springt naar haar eigen Verwacht-regel', () => {
			const range = { start: { line: 9, character: 1 }, end: { line: 9, character: 8 } };
			const rows = view(ran({}, [
				{ label: 'Noor — contributie', passed: false, range, rule: 'bepaal contributie',
					expected: '30 euro', actual: '25 euro' }
			])).get('Verwachtingen')!.rows;
			// The label, and to the line — where the reader changes it. Not to the rule,
			// even though the run names one: an expectation has one obvious
			// destination, and the rule is a click away on the value in Afgeleid.
			assert.deepEqual(rows[0].link, { on: 'label', kind: 'reveal', range });
			assert.equal(rows[0].ruleAt, undefined, 'de regel wordt hier niet getoond');
		});

		test('een gevuurde regel springt naar de regel, met of zonder aantal', () => {
			const rows = view(ran({
				firedRules: [{ rule: 'bepaal boete', count: 2 }, { rule: 'Jeugdlid', count: 1 }]
			})).get('Gevuurde regels')!.rows;
			// Both, and on the label. The count used to take the note and with it the
			// link, so a rule that fired twice was unclickable; a rule that fired once
			// had no note and got its own name appended behind it as the link.
			assert.deepEqual(rows[0].link, { on: 'label', kind: 'revealRule', rule: 'bepaal boete' });
			assert.deepEqual(rows[1].link, { on: 'label', kind: 'revealRule', rule: 'Jeugdlid' });
			assert.equal(rows[0].note, '2×');
			assert.equal(rows[1].note, undefined, 'geen aantal bij één keer, en geen herhaalde naam');
		});

		test('een inconsistentie springt naar de regel die haar vond', () => {
			const rows = view(ran({
				inconsistencies: [{ rule: 'Controleer poteisen', instance: 'Bonuspot #1' }]
			})).get('Inconsistent bevonden')!.rows;
			assert.deepEqual(rows[0].link,
				{ on: 'label', kind: 'revealRule', rule: 'Controleer poteisen' });
			assert.equal(rows[0].note, undefined, 'de naam staat al in het label');
		});

		test('een inconsistentie toont waarom, en toont het meteen', () => {
			const rows = view(ran({
				inconsistencies: [{
					rule: 'Controleer poteisen',
					instance: 'Bonuspot #1',
					criteria: [
						{ text: 'het totale tegoed van de Bonuspot is groter dan 0', holds: true },
						{ text: 'de Bonuspot is een ruime pot', holds: false }
					],
					operands: [{ label: 'totale tegoed', instance: 'Bonuspot #1', value: '40 pt' }]
				}]
			})).get('Inconsistent bevonden')!.rows;
			// The criteria first — that is the answer — then what the check read.
			assert.deepEqual(rows[0].children?.map(one => [one.kind, one.label]), [
				['pass', 'het totale tegoed van de Bonuspot is groter dan 0'],
				['fail', 'de Bonuspot is een ruime pot'],
				['operand', 'Bonuspot #1 · totale tegoed']
			]);
			// A finding shows its reason without being asked: one behind a click is a
			// report the reader has to interrogate.
			assert.equal(rows[0].open, true);
			// The criteria are not links: a criterion is a clause of the rule the row
			// already goes to, and has no destination of its own.
			assert.ok(rows[0].children!.every(one => one.link === undefined));
		});

		test('laat een uniciteitscontrole zonder reden gewoon staan', () => {
			// §8.1.6 compares instances rather than reading a value, so it has neither
			// criteria nor operands — and a row with no children must not grow an
			// empty fold.
			const rows = view(ran({
				inconsistencies: [{ rule: 'Uniek pasnummer' }]
			})).get('Inconsistent bevonden')!.rows;
			assert.equal(rows[0].children, undefined);
			assert.equal(rows[0].open, undefined);
		});

		// X7 fase 2 — de trace is terugloopbaar. Een operand die zijn schrijvende
		// regel noemt is een schakel, en die volgen ís het antwoord op 'waarom is
		// deze waarde wat hij is'. Vóór `source` was de enige weg terug zoeken naar
		// een traceregel wier doeltekst op het label van de operand leek.
		test('een operand vouwt open naar de afleiding erachter', () => {
			const rows = view(ran({
				trace: [
					{
						instance: 'Noor', target: 'korting', rule: 'bepaal korting',
						value: '5 euro',
						operands: [{
							label: 'contributie', instance: 'Noor', value: '40 euro',
							source: { kind: 'regel', rule: 'bepaal contributie' }
						}]
					},
					{
						instance: 'Noor', target: 'contributie', rule: 'bepaal contributie',
						value: '40 euro',
						operands: [
							{ label: 'basisbedrag', value: '35 euro', source: { kind: 'parameter' } },
							{ label: 'leeftijd', instance: 'Noor', value: '30 jaar', source: { kind: 'invoer' } }
						]
					}
				]
			})).get('Trace, in de volgorde waarin geschreven werd')!.rows;

			const korting = rows[0];
			const operand = korting.children![0];
			// De operand noemt de regel ernaast, net als een geschreven waarde doet.
			assert.equal(operand.rule, 'bepaal contributie');
			assert.equal(operand.ruleAt, 'beside');
			// En draagt de afleiding erachter als kinderen.
			assert.deepEqual(operand.children?.map(one => [one.label, one.note]), [
				['basisbedrag', 'parameter'],
				['Noor · leeftijd', 'invoer']
			]);
		});

		test('laat een operand zonder herkomst een blad', () => {
			const rows = view(ran({
				trace: [{
					instance: 'Noor', target: 'korting', rule: 'bepaal korting', value: '5 euro',
					operands: [{ label: 'contributie', instance: 'Noor', value: '40 euro' }]
				}]
			})).get('Trace, in de volgorde waarin geschreven werd')!.rows;
			const operand = rows[0].children![0];
			assert.equal(operand.children, undefined);
			assert.equal(operand.rule, undefined);
			assert.equal(operand.note, undefined);
		});

		// Faalt dicht: nest alleen waar de trace precies deze instantie, regel en
		// dit label kent. Een keten die niet te volgen is wordt kort, niet fout.
		test('nest niet waar de trace de schrijvende regel niet heeft', () => {
			const rows = view(ran({
				trace: [{
					instance: 'Noor', target: 'korting', rule: 'bepaal korting', value: '5 euro',
					operands: [{
						label: 'contributie', instance: 'Noor', value: '40 euro',
						source: { kind: 'regel', rule: 'een regel die niet in de trace staat' }
					}]
				}]
			})).get('Trace, in de volgorde waarin geschreven werd')!.rows;
			const operand = rows[0].children![0];
			assert.equal(operand.rule, 'een regel die niet in de trace staat');
			assert.equal(operand.children, undefined);
		});

		test('een traceregel springt op de regelnaam ernaast, met of zonder operanden', () => {
			const rows = view(ran({
				trace: [
					{
						instance: 'Noor', target: 'contributie', rule: 'bepaal contributie',
						value: '25 euro', operands: [{ label: 'kortingsfactor', value: '2,5 %' }]
					},
					// No operands, so this row does not fold. Whether a write happens to
					// have any is nothing to a reader, and an earlier version tested it
					// first — which put this row's link on the attribute and the row
					// above's on the rule, in one column of one section.
					{
						instance: 'Sam', target: 'aantal zware zendingen',
						rule: 'Aantal zware zendingen', value: '0', operands: []
					}
				]
			})).get('Trace, in de volgorde waarin geschreven werd')!.rows;
			assert.deepEqual(rows[0].link,
				{ on: 'beside', kind: 'revealRule', rule: 'bepaal contributie' });
			assert.deepEqual(rows[1].link,
				{ on: 'beside', kind: 'revealRule', rule: 'Aantal zware zendingen' });
			assert.equal(rows[0].children?.[0].link, undefined, 'een operand gaat nergens heen');
		});

		test('een afgeleide waarde noemt de regel die haar het laatst schreef', () => {
			const wrote = (rule: string) => ({
				instance: 'Noor', target: 'contributie', rule, value: '50 euro', operands: []
			});
			const rows = view(ran({
				values: [
					{ instance: 'Noor', attribute: 'contributie', derived: true, value: '50 euro' },
					{ instance: 'Noor', attribute: 'inschrijfdatum', derived: false, value: '12-03-2010' }
				],
				// Written twice, which is ordinary: an initialisation and then the rule
				// that supersedes it. The value standing in the state is the last one's.
				trace: [wrote('Initialiseer contributie'), wrote('Contributie nieuwe stijl')]
			}));
			assert.deepEqual(rows.get('Afgeleid')!.rows[0].link,
				{ on: 'beside', kind: 'revealRule', rule: 'Contributie nieuwe stijl' });
			// A given value has no writer, so it names none and goes nowhere.
			const given = rows.get('Gegeven')!.rows[0];
			assert.equal(given.rule, undefined);
			assert.equal(given.link, undefined);
		});

		test('een afgeleid kenmerk noemt de regel die het toekende', () => {
			const rows = view(ran({
				kenmerken: [
					{ instance: 'Noor', kenmerk: 'jeugdlid', present: true, derived: true },
					{ instance: 'Sam', kenmerk: 'proeflid', present: true, derived: false }
				],
				trace: [{
					instance: 'Noor', target: 'jeugdlid', rule: 'Jeugdlid', value: 'waar', operands: []
				}]
			})).get('Kenmerken')!.rows;
			// A kenmerktoekenning is a write like any other, so it is in the trace.
			assert.deepEqual(rows[0].link, { on: 'beside', kind: 'revealRule', rule: 'Jeugdlid' });
			assert.equal(rows[1].link, undefined, 'een gegeven kenmerk is door niets afgeleid');
		});

		test('een waarde met periodes vouwt open en noemt haar regel ernaast', () => {
			const rows = view(ran({
				values: [{
					instance: 'Sam', attribute: 'proefcontributie', derived: true,
					segments: [{ from: '01-01-2027', value: '10 euro' }]
				}],
				trace: [{
					instance: 'Sam', target: 'proefcontributie', rule: 'Proefcontributie tot de omslag',
					value: '10 euro', operands: []
				}]
			})).get('Afgeleid')!.rows;
			assert.ok((rows[0].children ?? []).length > 0, 'een tijdlijnwaarde is vouwbaar');
			// Beside, never on the label: the label is the fold.
			assert.equal(rows[0].link?.on, 'beside');
		});
	});

	// UX-5 — een tijdsafhankelijke waarde als spoor. De lijst met periodes is
	// getrouw en onleesbaar zodra een knip één dag verkeerd valt; het spoor toont
	// waar de knippen liggen. Alleen het paneel tekent het: de tekstvorm houdt de
	// lijst, en de twee mogen verschillend *tekenen* en niet verschillend
	// *beslissen*.
	suite('het tijdlijnspoor (UX-5)', () => {
		/** A period; a bound is a day plus the date a reader sees under its tick. */
		const period = (from: number | undefined, to: number | undefined, value = '10 euro') => ({
			kind: 'segment' as const,
			label: 'van … tot …',
			value,
			span: {
				...(from === undefined ? {} : { from: { day: from, text: `dag ${from}` } }),
				...(to === undefined ? {} : { to: { day: to, text: `dag ${to}` } })
			}
		});
		const now = (day: number) => ({ day, text: `dag ${day}` });

		test('verdeelt de breedte naar rato van de duur', () => {
			const track = trackOf([period(100, 200), period(200, 400)])!;
			// Afgerond vergeleken: de coördinaten zijn percentages voor een SVG en
			// niet iets waar iemand mee rekent, dus de laatste bit van een derde
			// deel is geen bewering die deze suite hoort te doen.
			const round = (n: number): number => Math.round(n * 100) / 100;
			assert.deepEqual(track.segments.map(one => [round(one.at), round(one.width)]),
				[[0, 33.33], [33.33, 66.67]]);
		});

		test('laat een open eind van de rand af lopen', () => {
			// Een periode zonder grens is geen periode die bij de laatste knip
			// ophoudt: het domein krijgt er ruimte bij, zodat het blok zichtbaar
			// het plaatje uit loopt — en een tiende van de spanne, zodat het er op
			// elke schaal hetzelfde uitziet.
			const track = trackOf([period(100, 200), period(200, undefined)])!;
			assert.equal(track.segments[0].at, 0);
			assert.ok(track.segments[1].openEnd);
			// Een vijfde van de spanne, zodat de open staart niet alleen zichtbaar
			// is maar ook breed genoeg om zijn eigen waarde te dragen — en dat is
			// meestal de huidige, dus degene die de lezer zoekt.
			assert.ok(track.segments[1].width > 12 && track.segments[1].width < 22,
				String(track.segments[1].width));
			// En het loopt tot de rand: de staart is de rest van de tijd.
			assert.equal(Math.round(track.segments[1].at + track.segments[1].width), 100);
		});

		test('laat een open begin bij de rand beginnen', () => {
			const track = trackOf([period(undefined, 200), period(200, 300)])!;
			assert.equal(track.segments[0].at, 0);
			assert.ok(track.segments[0].openStart);
			assert.ok(track.segments[1].at > 5, String(track.segments[1].at));
		});

		test('tekent niets waar er niets te tekenen valt', () => {
			// **Eén periode is één blok over de volle breedte**, naar rato van
			// niets, met als enige inhoud het label dat de rij eronder al draagt.
			// Dat kost een regel paneel per tijdlijnrij en levert geen feit op.
			assert.equal(trackOf([period(100, 200)]), undefined);
			// `altijd`: geen enkele eindige grens en geen cursor om te plaatsen.
			assert.equal(trackOf([period(undefined, undefined)]), undefined);
			// Maar mét de rekendatum erin zegt hij waar de run staat, en dat is
			// waar de meeste tijdlijnfouten op neerkomen.
			assert.equal(trackOf([period(100, 200)], now(150))?.now?.at, 50);
			// En twee periodes hebben een knip ertussen, wat de hele functie is.
			assert.equal(trackOf([period(100, 200), period(200, 300)])?.segments.length, 2);
		});

		test('deelt niet door een spanne van niets', () => {
			// Elke grens op één dag: zonder de terugval is elke coördinaat NaN.
			const track = trackOf([period(100, 100), period(100, 100)])!;
			assert.equal(track.segments.length, 2);
			for (const one of track.segments) {
				assert.ok(Number.isFinite(one.at) && Number.isFinite(one.width),
					`${one.at} / ${one.width}`);
			}
		});

		// **Een as met datums erop**, want een blauwe balk zonder één datum is voor
		// wie hem niet zelf gebouwd heeft geen tijdlijn maar een balk.
		test('dateert elke knip op de as', () => {
			const track = trackOf([period(100, 200), period(200, 400)])!;
			assert.deepEqual(track.ticks.map(one => [one.label, Math.round(one.at)]),
				[['dag 100', 0], ['dag 200', 33], ['dag 400', 100]]);
			// Naar binnen verankerd aan de randen: een datum gecentreerd op een merk
			// op 0% hangt met de helft buiten het paneel.
			assert.deepEqual(track.ticks.map(one => one.anchor), ['start', 'middle', 'end']);
		});

		test('dateert een knip die twee periodes delen één keer', () => {
			// Anders staat dezelfde datum tweemaal op dezelfde plek.
			const track = trackOf([period(100, 200), period(200, 300)])!;
			assert.deepEqual(track.ticks.map(one => one.label),
				['dag 100', 'dag 200', 'dag 300']);
		});

		test('tekent de rekendatum waar hij binnen het spoor valt', () => {
			// *Welk segment staat de run eigenlijk in* is waar de meeste
			// tijdlijnfouten op neerkomen.
			const track = trackOf([period(100, 200), period(200, 300)], now(150))!;
			assert.equal(track.now?.at, 25);
			// Met zijn eigen datum erbij: een oranje streep zonder label is voor een
			// lezer zonder voorkennis een raadsel.
			assert.equal(track.now?.label, 'dag 150');
			// En niet daarbuiten, want dan zou de cursor op een rand geplakt worden
			// en een positie suggereren die hij niet heeft. Twee periodes, zodat het
			// spoor er nog is: bij één zou het hele spoor vervallen, wat dezelfde
			// conclusie is maar een niveau hoger.
			assert.equal(trackOf([period(100, 200), period(200, 300)], now(900))!.now, undefined);
		});

		test('geeft geen spoor waar geen periodes staan', () => {
			assert.equal(trackOf([{ kind: 'operand', label: 'x', value: '1' }]), undefined);
			assert.equal(trackOf([]), undefined);
		});

		test('draagt de lege periode als lege periode over', () => {
			// Een gat in de dekking moet er als een gat uitzien; het uit de tekst
			// `leeg` aflezen zou deze kant een literaal laten ontleden.
			const track = trackOf(
				[{ ...period(100, 200, 'leeg'), empty: true }, period(200, 300)])!;
			assert.deepEqual(track.segments.map(one => one.empty), [true, false]);
		});

		test('geeft een tijdsafhankelijke schrijving haar periodes in de trace', () => {
			// Die kwam als de scalair `leeg` over de lijn, dus een regel die een
			// prima tijdlijn afleidde las als een regel die niets afleidde.
			const rows = buildView('x.test.rgs', {
				case: 'Iets', outcome: 'uitgevoerd', assertions: [], faults: [],
				detail: {
					rekendatum: '01-01-2027', rekendatumDay: 150, values: [], kenmerken: [],
					firedRules: [], inconsistencies: [], trace: [{
						instance: 'Sam', target: 'maandtoeslag', rule: 'bepaal maandtoeslag',
						segments: [
							{ from: '01-01-2026', to: '01-04-2026', value: '10 euro', fromDay: 100, toDay: 200 },
							{ from: '01-04-2026', value: '12 euro', fromDay: 200 }
						],
						operands: []
					}]
				}
			}).sections.find(one => one.title.startsWith('Trace'))!.rows;
			// Geen scalaire waarde op de rij zelf — óf periodes óf een waarde.
			assert.equal(rows[0].value, undefined);
			assert.deepEqual(rows[0].children?.map(one => [one.kind, one.value]),
				[['segment', '10 euro'], ['segment', '12 euro']]);
			// En de periodes staan vóór de stappen en operanden: ze zijn wat de
			// regel schreef, de rest is hoe hij eraan kwam.
			assert.equal(rows[0].children?.[0].kind, 'segment');
		});
	});

	suite('de sprong van het paneel naar de regel', () => {
		const symbol = (name: string, kind: vscode.SymbolKind): vscode.SymbolInformation =>
			new vscode.SymbolInformation(name, kind, '',
				new vscode.Location(vscode.Uri.parse('file:///w/regels/x.rgs'),
					new vscode.Range(3, 6, 3, 6 + name.length)));

		test('vindt de declaratie van de regel bij haar naam', () => {
			const found = ruleLocation([symbol('bepaal boete', vscode.SymbolKind.Function)],
				'bepaal boete');
			assert.equal(found?.range.start.line, 3);
		});

		test('kiest de naam exact, niet een naam die ermee begint', () => {
			// `Regel Jeugdlid` and `Regel Jeugdlid met korting` are two rules, and a
			// prefix match would open whichever the index listed first.
			const symbols = [
				symbol('Jeugdlid met korting', vscode.SymbolKind.Function),
				symbol('Jeugdlid', vscode.SymbolKind.Function)
			];
			const found = ruleLocation(symbols, 'Jeugdlid');
			assert.equal(found?.range.end.character, 6 + 'Jeugdlid'.length);
		});

		test('gaat nergens heen voor een naam die niets declareert', () => {
			assert.equal(ruleLocation([], 'bestaat niet'), undefined);
			// An attribute of that name is not the rule, so it is not the jump either.
			assert.equal(
				ruleLocation([symbol('boete', vscode.SymbolKind.Field)], 'boete'),
				undefined);
		});
	});

	test('de panelen worden samen opgeruimd', () => {
		// The container owns them, so closing the extension closes every panel it
		// opened rather than leaving one behind with a dead message channel.
		const panels = new RunPanels();
		panels.dispose();
	});
});
