// X2b — running a rule against the active testgeval, end to end.
//
// The feature is two halves that meet in a command. The server draws a lens
// above every rule and decision table and says only which rule it is about; this
// side decides *against what* — the setting, or a choice made in this window —
// and shows the run focused on that rule.
//
// So what is checked here is the seam: that the lens is there, that the scenario
// resolves out of the setting, and that pressing the lens opens a panel named
// after the rule. What is *in* that panel is checked through the view it is drawn
// from, because a webview cannot be read from a test — and the wording of the
// status item likewise, since a status-bar item is drawn by the workbench and
// cannot be read back either.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { Scenario, statusFor } from '../activeScenario';
import { renderText } from '../runDocument';
import { buildView } from '../runView';
import { fitted } from '../statusItem';
import { TestRun } from '../testExplorer';
import { activate, getDocUri, positionOf, waitUntil } from './helper';

const SETTING = 'regelspraak.execution.defaultScenario';

const SCENARIO = 'tests/lidmaatschap.test.rgs'
	+ '#Een kort lidmaatschap geeft een jeugdlid met korting';

interface Api {
	activeScenario: { current: Scenario | undefined };
	testExplorer: { runForDetail(uri: string, caseName: string): Promise<TestRun | undefined> };
}

/** The panel tabs this feature opens, which is what a run is asserted through. */
const outcomeTabs = (): vscode.Tab[] =>
	vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(one =>
		one.input instanceof vscode.TabInputWebview
		&& one.input.viewType.includes('uitkomst'));

suite('Regel uitvoeren tegen het actieve testgeval (X2b)', () => {
	const rulesUri = getDocUri('regels/h2-lidmaatschap/art-04-lidmaatschap.rgs');
	let document: vscode.TextDocument;
	let api: Api;

	suiteSetup(async () => {
		await activate(rulesUri);
		document = await vscode.workspace.openTextDocument(rulesUri);
		const extension = vscode.extensions.getExtension('igochkov.vscode-regelspraak');
		api = await extension!.activate() as Api;
		// The window's own choice is never set by this suite, so the setting is the
		// layer under test — and it is restored on the way out.
		await vscode.workspace.getConfiguration().update(
			SETTING, SCENARIO, vscode.ConfigurationTarget.Workspace);
	});

	suiteTeardown(async () => {
		await vscode.workspace.getConfiguration().update(
			SETTING, undefined, vscode.ConfigurationTarget.Workspace);
	});

	/** The active scenario, run for its detail — the command's own second step. */
	async function runActive(): Promise<TestRun> {
		const scenario = api.activeScenario.current;
		assert.ok(scenario, 'er hoort een actief testgeval te zijn');
		const run = await api.testExplorer.runForDetail(scenario.uri, scenario.case);
		assert.ok(run, 'het actieve testgeval leverde geen uitkomst op');
		return run;
	}

	test('hangt boven elke regel een uitvoerlens', async function () {
		this.timeout(60000);
		const lenses = await waitUntil('de lenzen van het regelbestand', async () => {
			const found = await vscode.commands.executeCommand<vscode.CodeLens[]>(
				'vscode.executeCodeLensProvider', rulesUri, 50);
			return found && found.length > 0 ? found : undefined;
		});
		const at = positionOf('bepaal lidmaatschapsduur', document).line;
		const run = lenses.filter(one =>
			one.range.start.line === at && one.command?.command === 'regelspraak.runRegel');
		assert.equal(run.length, 1, 'precies één uitvoerlens boven de regel');
		assert.equal(run[0].command?.title, 'uitvoeren');
		// The rule's *name*, not its range: the trace labels every write with it.
		assert.deepEqual(run[0].command?.arguments?.[1], 'bepaal lidmaatschapsduur');
	});

	test('leest het actieve testgeval uit de instelling', () => {
		const current = api.activeScenario.current;
		assert.ok(current, 'de instelling hoort een testgeval op te leveren');
		assert.equal(current.case, 'Een kort lidmaatschap geeft een jeugdlid met korting');
		// The path in the setting is relative to the first workspace folder, so what
		// comes out has to be the document the testset actually lives in.
		assert.ok(current.uri.endsWith('tests/lidmaatschap.test.rgs'), current.uri);
	});

	test('voert de regel uit en opent een paneel dat naar de regel heet', async function () {
		this.timeout(60000);
		await vscode.commands.executeCommand(
			'regelspraak.runRegel', rulesUri.toString(), 'bepaal lidmaatschapsduur');
		const tab = await waitUntil('een uitkomstpaneel voor de regel',
			() => outcomeTabs().find(one => one.label.startsWith('bepaal lidmaatschapsduur')));
		// The tab names the rule and not the scenario: the question was asked about
		// the rule, and the scenario is only which situation it was asked in.
		assert.ok(tab.label.includes('uitkomst'), tab.label);
		// Closed again, so a following suite finds an ordinary layout.
		await vscode.window.tabGroups.close(tab);
	});

	test('en die uitkomst is die van het actieve testgeval, gericht op de regel', async function () {
		this.timeout(60000);
		const text = renderText(
			buildView('lidmaatschap.test.rgs', await runActive(), 'bepaal lidmaatschapsduur'));
		assert.ok(text.startsWith("// Wat 'bepaal lidmaatschapsduur' deed, in testgeval 'Een kort"),
			text.slice(0, 120));
		assert.match(text, /Geschreven door 'bepaal lidmaatschapsduur'/);
		assert.match(text, /lidmaatschapsduur = /);
		// And the whole run is still below it, as context: a rule's inputs are
		// whatever the rules before it derived.
		for (const heading of ['Verwachtingen', 'Gegeven', 'Afgeleid', 'Gevuurde regels']) {
			assert.ok(text.includes(heading), `kop '${heading}' ontbreekt`);
		}
	});

	test('zegt van een regel die niet vuurde dat hij niet vuurde', async function () {
		this.timeout(60000);
		// `Slapende inschrijving` needs a long-inactive member, which the chosen
		// testgeval does not have — so the honest answer is that it did nothing,
		// and a view that showed nothing at all would look like a failed run.
		const text = renderText(
			buildView('lidmaatschap.test.rgs', await runActive(), 'Slapende inschrijving'));
		assert.match(text, /\(niets — deze regel vuurde niet in dit testgeval\)/);
		assert.match(text, /Vuurde\r?\n\tniet in dit testgeval/);
	});

	test('draagt het kiescommando uit', async () => {
		const all = await vscode.commands.getCommands(true);
		assert.ok(all.includes('regelspraak.kiesTestgeval'), 'het kiescommando is niet geregistreerd');
	});

	test('kort een lange testgevalnaam af op een woordgrens', () => {
		// A testgeval's label is free text to the line break, so names this long are
		// normal and would push every other status-bar entry off the screen.
		const long = 'Een kort lidmaatschap geeft een jeugdlid met korting';
		const short = fitted(long);
		assert.ok(short.length < long.length, short);
		assert.ok(short.endsWith('…'), short);
		// Cut at a word: a truncation inside one reads as a different name.
		assert.ok(!/\s…$/.test(short), short);
		assert.ok(long.startsWith(short.slice(0, -1)), short);
		// And a name that fits is left exactly as it is.
		assert.equal(fitted('Een boete'), 'Een boete');
	});

	test('zegt bij de statusbalk welke van de twee lagen geldt', () => {
		const scenario = { uri: 'file:///w/tests/lidmaatschap.test.rgs', case: 'Een kort lidmaatschap' };
		assert.match(statusFor(scenario, true).detail, /^Gekozen in dit venster/);
		assert.match(statusFor(scenario, false).detail, /^Uit de instelling/);
		// Both name the file, because a case name alone does not say which testset.
		for (const chosen of [true, false]) {
			assert.match(statusFor(scenario, chosen).detail, /lidmaatschap\.test\.rgs$/);
		}
		// And with nothing set it says so, rather than showing an empty name.
		assert.match(statusFor(undefined, false).text, /geen actief testgeval/);
	});
});
