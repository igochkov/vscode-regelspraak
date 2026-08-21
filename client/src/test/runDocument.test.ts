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
import { RunPanels, ruleLocation } from '../runPanel';
import { RunSection, buildView } from '../runView';
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

	const textOf = async (caseName: string, focus?: string): Promise<string> =>
		renderText(buildView('lidmaatschap.test.rgs', await run(caseName), focus));

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
		const text = await textOf(PASSING, 'bepaal lidmaatschapsduur');
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

	test('geeft een verwachting het bereik mee van de regel die haar schreef', async function () {
		this.timeout(60000);
		const view = buildView('lidmaatschap.test.rgs', await run(PASSING));
		const expectations = view.sections.find(one => one.title === 'Verwachtingen')!;
		// Two click-through targets, and they answer different questions: the range
		// is the `Verwacht` line the reader wrote, the rule is what produced the
		// value it is about.
		assert.ok(expectations.rows.every(one => one.range !== undefined));
		assert.ok(expectations.rows.some(one => one.rule !== undefined));
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
		const text = renderText(buildView('x.test.rgs', ran, 'deze regel'));
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
			// The label, and to the line — where the reader changes it. Not to the
			// rule, even though the row knows which rule produced the value: one row,
			// one destination.
			assert.deepEqual(rows[0].link, { on: 'label', kind: 'reveal', range });
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

		test('een traceregel springt op de regelnaam, want het label is de vouw', () => {
			const rows = view(ran({
				trace: [{
					instance: 'Noor', target: 'contributie', rule: 'bepaal contributie',
					value: '25 euro', operands: [{ label: 'kortingsfactor', value: '2,5 %' }]
				}]
			})).get('Trace, in de volgorde waarin geschreven werd')!.rows;
			// Clicking the label there would both fold and navigate, so the rule beside
			// the value is the link instead.
			assert.deepEqual(rows[0].link,
				{ on: 'note', kind: 'revealRule', rule: 'bepaal contributie' });
			assert.equal(rows[0].children?.[0].link, undefined, 'een operand gaat nergens heen');
		});

		test('een waarde met periodes vouwt open en springt nergens heen', () => {
			const rows = view(ran({
				values: [{
					instance: 'Sam', attribute: 'proefcontributie', derived: true,
					segments: [{ from: '01-01-2027', value: '10 euro' }]
				}]
			})).get('Afgeleid')!.rows;
			assert.ok((rows[0].children ?? []).length > 0, 'een tijdlijnwaarde is vouwbaar');
			assert.equal(rows[0].link, undefined, 'er is geen regel en geen bereik om heen te gaan');
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
