// X2b — running a rule against the active testgeval, end to end.
//
// The feature is two halves that meet in a command. The server draws a lens
// above every rule and decision table and says only which rule it is about; this
// side decides *against what* — the setting, or a choice made in this window —
// and renders the run focused on that rule.
//
// So what is checked here is the seam: that the lens is there, that the scenario
// resolves out of the setting, and that pressing the lens produces the focused
// view rather than the whole-run one. The wording of the status item is checked
// as a function, because a language status item is drawn by the workbench and has
// no surface a test can read.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { Scenario, statusFor } from '../activeScenario';
import { activate, getDocUri, positionOf, waitUntil } from './helper';

const RUN_SCHEME = 'regelspraak-uitkomst';
const SETTING = 'regelspraak.execution.defaultScenario';

const SCENARIO = 'tests/lidmaatschap.test.rgs'
	+ '#Een kort lidmaatschap geeft een jeugdlid met korting';

interface Api {
	activeScenario: { current: Scenario | undefined };
}

suite('Regel uitvoeren tegen het actieve testgeval (X2b)', () => {
	const rulesUri = getDocUri('regels/lidmaatschap.rgs');
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

	test('voert de regel uit tegen dat testgeval en toont wat hij deed', async function () {
		this.timeout(60000);
		await vscode.commands.executeCommand(
			'regelspraak.runRegel', rulesUri.toString(), 'bepaal lidmaatschapsduur');
		const opened = await waitUntil('een uitkomstweergave voor de regel', () => {
			const found = vscode.workspace.textDocuments.find(one =>
				one.uri.scheme === RUN_SCHEME
				&& one.getText().includes("Wat 'bepaal lidmaatschapsduur' deed"));
			return found && found.getText().length > 0 ? found : undefined;
		});
		const text = opened.getText();
		// The rule leads, and the testgeval it ran in is named beside it: the answer
		// is about the rule, but it is only true of that one scenario.
		assert.match(text, /^\/\/ Wat 'bepaal lidmaatschapsduur' deed, in testgeval 'Een kort/);
		assert.match(text, /Geschreven door 'bepaal lidmaatschapsduur'/);
		assert.match(text, /Vuurde/);
		assert.match(text, /lidmaatschapsduur = /);
		// And the whole run is still below it, as context.
		for (const heading of ['Verwachtingen', 'Gegeven', 'Afgeleid', 'Gevuurde regels']) {
			assert.ok(text.includes(heading), `kop '${heading}' ontbreekt:\n${text}`);
		}
		// The tab names the rule, not the scenario: the question was asked about it.
		assert.ok(opened.uri.path.startsWith('bepaal lidmaatschapsduur'), opened.uri.path);
	});

	test('zegt van een regel die niet vuurde dat hij niet vuurde', async function () {
		this.timeout(60000);
		// `Slapende inschrijving` needs a long-inactive member, which the chosen
		// testgeval does not have — so the honest answer is that it did nothing,
		// and a view that showed nothing at all would look like a failed run.
		await vscode.commands.executeCommand(
			'regelspraak.runRegel', rulesUri.toString(), 'Slapende inschrijving');
		const text = (await waitUntil('de uitkomst van een regel die niet vuurde', () => {
			const found = vscode.workspace.textDocuments.find(one =>
				one.uri.scheme === RUN_SCHEME
				&& one.getText().includes("Wat 'Slapende inschrijving' deed"));
			return found && found.getText().length > 0 ? found : undefined;
		})).getText();
		// Both halves say so, and neither is redundant: the first is that it wrote
		// nothing, the second that it was not applied to a single instance.
		assert.match(text, /\(niets — deze regel vuurde niet in dit testgeval\)/);
		assert.match(text, /Vuurde\r?\n\tniet in dit testgeval/);
	});

	test('draagt het kiescommando uit', async () => {
		const all = await vscode.commands.getCommands(true);
		assert.ok(all.includes('regelspraak.kiesTestgeval'), 'het kiescommando is niet geregistreerd');
	});

	test('zegt bij de taalstatus welke van de twee lagen geldt', () => {
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
