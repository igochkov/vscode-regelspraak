// The example model itself, checked against a running language server.
//
// `samples/` is this repository's demonstration of the language and the only
// copy of it: the server repository keeps its conformance corpus instead. Three
// properties travelled with it, and they are asserted here rather than nowhere.
//
//   - It reports nothing. Every construct RegelSpraak has is written here, so a
//     diagnostic on any of it is either a real modelling error or a false
//     positive — and a false positive on a correct sentence is the one failure
//     mode the validation design puts above all others (risk IR-4).
//   - The formatter leaves it alone. The files are stored in the form the
//     formatter produces, so a reader can copy any line of them and a change to
//     the layout engine cannot silently restyle the examples underneath.
//   - Every testgeval passes. This is the third property and it arrived with X2:
//     it needs a way to run a testgeval, and until there was one the `Verwacht`
//     lines were checked by hand. They are the examples of what the language is
//     *for*, and an expectation nobody runs is not a test — writing these by
//     hand found two literal-reading bugs in the server that no static check
//     could reach.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { TestRun } from '../testExplorer';
import { buildView } from '../runView';
import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/** Enough of the extension's API to reach the runner, as the C7 suite does. */
interface Api {
	testExplorer: {
		refresh(): Promise<void>;
		allCases(): { uri: string; case: string }[];
		runForDetail(uri: string, caseName: string): Promise<TestRun | undefined>;
	};
}

suite('Voorbeeldmodel', () => {
	let files: vscode.Uri[];

	suiteSetup(async () => {
		await activate(getDocUri('gegevens/lid.rgs'));
		files = (await vscode.workspace.findFiles('**/*.rgs'))
			.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
		assert.ok(files.length >= 5, `verwachtte meer voorbeeldbestanden: ${files.length}`);
	});

	/**
	 * The document, open and answered for.
	 *
	 * Diagnostics are published for the files an editor owns (the default
	 * `validation.scope`), so each one is opened before it is asked about —
	 * and the outline is the cheapest proof the server has this file in its
	 * model, as `activate` uses it for the first one.
	 */
	async function indexed(uri: vscode.Uri): Promise<vscode.TextDocument> {
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document, { preview: true });
		await waitUntil(`een geïndexeerd ${uri.fsPath}`, async () => {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider', uri);
			return symbols && symbols.length > 0 ? symbols : undefined;
		});
		return document;
	}

	test('elk voorbeeldbestand meldt geen enkele diagnostiek', async () => {
		const found: string[] = [];
		for (const uri of files) {
			// An empty list means "nothing to report" rather than "not answered
			// yet" because the outline has already answered: the server builds the
			// model and publishes the diagnostics in one analysis pass, so there is
			// no state in which it has an outline for a file and has not yet said
			// what it thinks of it.
			await indexed(uri);
			found.push(...vscode.languages.getDiagnostics(uri).map(one =>
				`${uri.fsPath.split(/[\\/]/).pop()} r${one.range.start.line + 1} ` +
				`${String(one.code)}: ${one.message}`));
		}
		assert.deepStrictEqual(found, []);
	});

	test('elk testgeval in de voorbeelden slaagt', async function () {
		// Sixteen cases, each a full evaluation of the model in a worker.
		this.timeout(180000);
		const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as Api;
		// The scan runs on the server's own schedule, and every testset has to be
		// in it: a gate that silently covered half the cases would pass forever.
		const cases = await waitUntil('alle testsets van de voorbeelden', async () => {
			await api.testExplorer.refresh();
			const found = api.testExplorer.allCases();
			const testsets = new Set(found.map(one => one.uri));
			return testsets.size >= 4 ? found : undefined;
		});
		assert.ok(cases.length >= 16, `verwachtte meer testgevallen: ${cases.length}`);

		const failed: string[] = [];
		for (const one of cases) {
			const run = await api.testExplorer.runForDetail(one.uri, one.case);
			const where = `${one.uri.split('/').pop()} · ${one.case}`;
			if (!run) {
				failed.push(`${where}: geen antwoord`);
				continue;
			}
			if (run.outcome !== 'uitgevoerd') {
				failed.push(`${where}: ${run.outcome} — ${run.reason ?? ''} ${(run.details ?? []).join('; ')}`);
				continue;
			}
			// A fault is not a failure — the run carried on ([E-29]) — but nothing in
			// the examples is supposed to produce one, so it is listed here too.
			for (const fault of run.faults) {
				failed.push(`${where}: fout in ${fault.rule} — ${fault.message}`);
			}
			for (const bad of run.assertions.filter(a => !a.passed)) {
				failed.push(`${where}: ${bad.label} — verwacht ${bad.expected ?? 'leeg'},`
					+ ` werkelijk ${bad.actual ?? 'leeg'}`);
			}
		}
		assert.deepStrictEqual(failed, []);
	});

	test('elke inconsistentie in de voorbeelden zegt waarom zij er is', async function () {
		this.timeout(120000);
		const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as Api;
		await waitUntil('de testsets van de voorbeelden', async () => {
			await api.testExplorer.refresh();
			return api.testExplorer.allCases().length >= 16 ? true : undefined;
		});
		// `kenmerken.test.rgs` runs the corpus's consistency rules, so this is where
		// the whole path is visible: the engine walks the criteria, the wire carries
		// them, and the view turns them into the reason under the finding.
		const one = api.testExplorer.allCases()
			.find(each => each.case === 'Twee leden bij één vestiging');
		assert.ok(one, 'het testgeval met de consistentieregels ontbreekt');
		const run = await api.testExplorer.runForDetail(one.uri, one.case);
		const found = run?.detail?.inconsistencies ?? [];
		assert.ok(found.length > 0, 'dit testgeval hoort inconsistenties op te leveren');
		for (const each of found) {
			// Every finding says why: a compound check names its criteria, and any
			// check that read a value reports what it read. A finding with neither
			// would be the bare "one of them failed" this replaced.
			assert.ok((each.criteria ?? []).length > 0 || (each.operands ?? []).length > 0,
				`${each.rule} meldt geen reden`);
		}
		// And the view puts that reason under the finding, opened.
		const section = buildView('kenmerken.test.rgs', run!)
			.sections.find(each => each.title === 'Inconsistent bevonden');
		assert.ok(section, 'de afdeling ontbreekt');
		assert.ok(section.rows.every(row => (row.children ?? []).length > 0 && row.open === true));
	});

	test('de formatter laat elk voorbeeldbestand ongemoeid', async () => {
		const changed: string[] = [];
		for (const uri of files) {
			await indexed(uri);
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[] | undefined>(
				'vscode.executeFormatDocumentProvider', uri, { tabSize: 4, insertSpaces: false });
			if (edits && edits.length > 0) {
				changed.push(`${uri.fsPath.split(/[\\/]/).pop()}: ${edits.length} bewerking(en), ` +
					`de eerste op regel ${edits[0].range.start.line + 1}`);
			}
		}
		assert.deepStrictEqual(changed, [],
			'de voorbeelden horen te staan zoals de formatter ze oplevert');
	});
});
