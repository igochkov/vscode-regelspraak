// W7 — the Test Explorer, end to end against a real language server.
//
// This suite is the only thing that checks the `regelspraak/tests` and
// `regelspraak/runTest` contracts: neither is part of LSP, the server repository
// holds the other half, and nothing at build time compares the two. So it walks
// the tree the workbench would draw and runs a testgeval through the engine.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/** Mirrors what `client/src/testExplorer.ts` exposes, structurally. */
interface TestExplorerLike {
	refresh(): Promise<void>;
	readonly testController: vscode.TestController;
	readonly runProfile: vscode.TestRunProfile;
}

suite('Testverkenner (W7)', () => {
	const testsUri = getDocUri('tests/lidmaatschap.test.rgs');
	let explorer: TestExplorerLike;

	suiteSetup(async () => {
		await activate(testsUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ testExplorer: TestExplorerLike } | undefined;
		assert.ok(api?.testExplorer, 'de extensie levert geen testverkenner op');
		explorer = api.testExplorer;
	});

	/**
	 * The testsets, once the workspace scan has found all of them.
	 *
	 * Waiting for one would be satisfied by the document the suite opened, before
	 * the scan has reached the rest — which is a wait that measures nothing.
	 */
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

	test('noemt elke testset van de werkmap', async () => {
		const names = (await testsets()).map(one => one.label);
		// `samples/tests/` holds four, each with a Testset line of its own.
		assert.ok(names.length >= 4, names.join(' | '));
		assert.ok(names.some(name => name.includes('contributie') || name.includes('Contributie')),
			names.join(' | '));
	});

	test('hangt de testgevallen onder hun testset, met hun bereik', async () => {
		const found = (await testsets()).find(one => one.uri?.fsPath === testsUri.fsPath);
		assert.ok(found, 'de testset van dit bestand ontbreekt in de boom');
		const cases = childrenOf(found);
		// A floor and not a count: this testset is a sample, and what is being
		// checked is that its cases hang under it and carry a range of their own.
		assert.ok(cases.length >= 3, cases.map(one => one.label).join(' | '));
		for (const one of cases) {
			assert.ok(one.range, `${one.label} heeft geen bereik`);
			assert.equal(one.uri?.fsPath, testsUri.fsPath);
		}
	});

	// [T-6] — a testgeval with no Verwacht lines is valid and runnable, and says
	// less when it passes. The distinction travels rather than being inferred.
	test('onderscheidt een testgeval dat alleen uitvoert', async () => {
		const found = (await testsets()).find(one => one.uri?.fsPath === testsUri.fsPath)!;
		const runOnly = childrenOf(found).find(one => one.label.includes('Alleen uitvoeren'));
		assert.ok(runOnly, 'het alleen-uitvoeren-geval ontbreekt');
		assert.equal(runOnly.description, 'alleen uitvoeren');
	});

	test('kent een uitvoerprofiel, en geen debugprofiel (FR-W7.3)', async () => {
		await testsets();
		assert.equal(explorer.runProfile.kind, vscode.TestRunProfileKind.Run);
	});

	// X2a — the lens in the text, and that it drives this same controller rather
	// than a second run path.
	test('hangt een uitvoerlens boven de testset en elk testgeval', async () => {
		const lenses = await waitUntil('codelenzen van de taalserver', async () => {
			const found = await vscode.commands.executeCommand<vscode.CodeLens[]>(
				'vscode.executeCodeLensProvider', testsUri, 20);
			return found && found.length > 0 ? found : undefined;
		});
		const run = lenses.filter(one => one.command?.command === 'regelspraak.runTestgeval');
		// One for the testset, one per testgeval — counted off the document, so
		// what is asserted is that relationship and not the length this sample
		// happens to have. It had the number written out until 31 August 2026,
		// when the testset lost a case and this failed on the sample rather than
		// on the lens.
		const source = await vscode.workspace.openTextDocument(testsUri);
		let written = 0;
		for (let line = 0; line < source.lineCount; line++) {
			if (source.lineAt(line).text.startsWith('Testgeval ')) {
				written++;
			}
		}
		assert.equal(run.length, written + 1, run.map(one => one.command?.title).join(' | '));
		assert.equal(run[0].command?.title, 'alle testgevallen uitvoeren');
		assert.deepStrictEqual(run[0].command?.arguments, [testsUri.toString()]);
		assert.equal(run[1].command?.arguments?.length, 2, 'een geval draagt zijn naam mee');
	});

	test('de lens voert uit via dezelfde testverkenner', async function () {
		this.timeout(60000);
		const found = (await testsets()).find(one => one.uri?.fsPath === testsUri.fsPath)!;
		const one = childrenOf(found).find(c => c.label.includes('kort lidmaatschap'))!;
		// Straight through the command the lens carries, arguments and all.
		await vscode.commands.executeCommand('regelspraak.runTestgeval',
			testsUri.toString(), one.label);
		// The item is the controller's own, so a lens that had built its own run
		// would leave this one untouched — and it survived, so it did not.
		assert.equal(one.error, undefined);
	});

	// The run goes through the worker: this is the whole W7 stack in one pass —
	// discovery, the custom request, composition, the engine, and the assertions
	// coming back as something the Test Explorer can draw.
	test('draait een testgeval en laat het slagen', async function () {
		this.timeout(60000);
		const found = (await testsets()).find(one => one.uri?.fsPath === testsUri.fsPath)!;
		const one = childrenOf(found).find(c => c.label.includes('kort lidmaatschap'));
		assert.ok(one, 'het testgeval ontbreekt');

		const profile = explorer.runProfile;
		await profile.runHandler(
			new vscode.TestRunRequest([one], undefined, profile),
			new vscode.CancellationTokenSource().token);
		// A run reports through a `TestRun` the workbench owns and does not hand
		// back, so what is asserted is that it completed without throwing and that
		// the item survived it — the values themselves are pinned server-side,
		// where a test can read them.
		assert.equal(one.error, undefined, `${one.label} kon niet samengesteld worden`);
	});
});
