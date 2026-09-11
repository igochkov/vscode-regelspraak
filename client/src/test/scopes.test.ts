// One model per workspace folder ([N-10]), end to end against a real server.
//
// This is the half of §4.0's gate that only a running server can check. The
// scope arithmetic itself is gated in the server repository
// (`test/server/scopes.test.ts`); what is here is the **wire contract** —
// `ModelTree.roots`, which is not part of LSP and whose other half nothing at
// build time compares against this one — and the two model facts a reader
// actually meets: two folders that declare the same names report nothing about
// each other, and a reference resolves inside its own folder.
//
// **It asserts something in both runs**, which is deliberate. `npm test` opens
// `samples/` alone and the cases below then check the complement: one folder,
// no root rows, the tree exactly as it has always been. `npm run test:multiroot`
// opens `client/src/test/fixtures/twee-werkmappen.code-workspace` and the same
// file checks the two-folder shape. A suite that quietly skipped in the
// ordinary run would be a suite nobody notices has stopped working.

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/** Mirrors `client/src/modelExplorer.ts`, structurally, as the W2 suite does. */
interface ModelEntry {
	row: 'root' | 'group' | 'declaration';
	root?: { label: string; uri: string; groups: unknown[] };
	group?: { kind: string; label: string; nodes: unknown[] };
	node?: { name: string; kind: string; label: string; children: unknown[] };
}

interface ModelExplorerLike {
	refresh(): void;
	getChildren(entry?: ModelEntry): Promise<ModelEntry[]>;
	getTreeItem(entry: ModelEntry): vscode.TreeItem;
}

/**
 * The second root's own files — test data, not a sample anybody reads.
 *
 * Resolved from the compiled location the way `getDocPath` resolves `samples/`:
 * this runs out of `client/out/test`, and the fixture is beside its source.
 */
const secondRootUri = (name: string): vscode.Uri =>
	vscode.Uri.file(path.resolve(__dirname, '../../src/test/fixtures/tweede-werkmap', name));

/** True in the multi-root run: the `.code-workspace` declares two folders. */
const twoFolders = (): boolean => (vscode.workspace.workspaceFolders?.length ?? 0) > 1;

suite('Model per werkmap ([N-10])', () => {
	let explorer: ModelExplorerLike;

	suiteSetup(async () => {
		// The document that activates the extension is in the *first* folder in
		// both runs, so activation is the same gesture either way.
		await activate(getDocUri('gegevens/lid.rgs'));
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ modelExplorer: ModelExplorerLike } | undefined;
		assert.ok(api?.modelExplorer, 'de extensie levert geen modelverkenner op');
		explorer = api.modelExplorer;
	});

	/**
	 * The top level of the tree, once every row on it has something under it.
	 *
	 * **Not merely "the server answered"**, which is the trap the multi-root case
	 * springs: the folders are declared at `initialize`, so both root rows exist
	 * from the first answer while the scan is still reading the second folder's
	 * files — and a row with no groups yet reads exactly like a folder whose
	 * model is empty. The scan is asynchronous by design (C9), so the wait has to
	 * be for what is being asserted about.
	 */
	async function top(): Promise<ModelEntry[]> {
		return waitUntil('een modelboom met inhoud onder elke rij', async () => {
			explorer.refresh();
			const rows = await explorer.getChildren();
			if (rows.length === 0) {
				return undefined;
			}
			const filled = rows.every(row => row.row !== 'root' || row.root!.groups.length > 0);
			return filled ? rows : undefined;
		});
	}

	test('geeft bij één werkmap geen werkmaprij, maar de groepen zelf', async () => {
		if (twoFolders()) {
			return; // the complement; the multi-root cases below are the point
		}
		const rows = await top();
		assert.deepEqual([...new Set(rows.map(row => row.row))], ['group'],
			`verwachtte alleen groepen, kreeg ${rows.map(row => row.row).join(' | ')}`);
	});

	test('geeft bij twee werkmappen één rij per werkmap, met haar naam', async () => {
		if (!twoFolders()) {
			return;
		}
		const rows = await top();
		assert.deepEqual([...new Set(rows.map(row => row.row))], ['root'],
			`verwachtte alleen werkmaprijen, kreeg ${rows.map(row => row.row).join(' | ')}`);
		const labels = rows.map(row => row.root!.label);
		assert.ok(labels.includes('samples'), `samples ontbreekt: ${labels.join(' | ')}`);
		assert.ok(labels.includes('tweede-werkmap'),
			`tweede-werkmap ontbreekt: ${labels.join(' | ')}`);
	});

	test('zet de objecttypen van elke werkmap onder haar eigen rij', async () => {
		if (!twoFolders()) {
			return;
		}
		const rows = await top();
		const namesUnder = async (label: string): Promise<string[]> => {
			const row = rows.find(one => one.root!.label === label);
			assert.ok(row, `geen rij voor ${label}`);
			const groups = await explorer.getChildren(row);
			const objectTypes = groups.find(one => one.group!.kind === 'objecttype');
			assert.ok(objectTypes, `geen groep objecttypen onder ${label}`);
			return (await explorer.getChildren(objectTypes)).map(one => one.node!.name);
		};
		// Both roots declare `Lid`, and each row shows its own — which is the
		// collision drawn as what it is rather than as one model.
		assert.ok((await namesUnder('samples')).includes('Lid'));
		assert.deepEqual(await namesUnder('tweede-werkmap'), ['Lid']);
		// And the second root's tree is its own: samples' own object types are
		// not in it.
		assert.ok(!(await namesUnder('tweede-werkmap')).includes('Uitlening'));
	});

	// The model fact underneath the tree, and the one a reader meets first: two
	// folders declaring `Objecttype het Lid` and `Regel Jeugdlid` report nothing
	// about each other. In one index the rule name is RS607 on two files whose
	// authors each wrote something correct.
	test('meldt niets over de andere werkmap, RS607 noch een dubbelzinnige naam', async () => {
		if (!twoFolders()) {
			return;
		}
		const rules = secondRootUri('regels.rgs');
		const document = await vscode.workspace.openTextDocument(rules);
		await vscode.window.showTextDocument(document);
		// Waited for rather than read once: diagnostics arrive after the 250 ms
		// debounce, and an empty list is also what "not analysed yet" looks like.
		await waitUntil('een geanalyseerd tweede model', async () => {
			const own = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
				'vscode.executeDocumentSymbolProvider', rules);
			return own && own.length > 0 ? own : undefined;
		});
		const found = vscode.languages.getDiagnostics(rules)
			.map(one => `${String(one.code)}: ${one.message}`);
		assert.deepEqual(found, [], `verwachtte geen meldingen, kreeg ${found.join(' | ')}`);
	});

	// The silent half, and the worse one: an object type declared in two folders
	// is no report at all, it is a reference with two answers. Under one index
	// F12 on `een Lid` here offered samples' declaration beside this folder's,
	// and an evaluation took whichever was indexed first.
	test('laat F12 binnen de eigen werkmap landen', async () => {
		if (!twoFolders()) {
			return;
		}
		const rules = secondRootUri('regels.rgs');
		const document = await vscode.workspace.openTextDocument(rules);
		await vscode.window.showTextDocument(document);
		// **On the sentence and not on the bare phrase.** A position inside a
		// comment names nothing, so a header comment that happened to quote the
		// rule would make this a 60-second timeout on a correct server instead of
		// a failure that says what is wrong — which is what it did. The fixture's
		// comment now quotes nothing from the rule, and this anchors on the whole
		// sentence so the two guards are independent.
		const text = document.getText();
		const sentence = 'De drempel van een Lid';
		const at = text.indexOf(sentence);
		assert.ok(at >= 0, `de fixture mist «${sentence}»`);
		const position = document.positionAt(at + sentence.length - 'Lid'.length);
		const targets = await waitUntil('een definitie voor `Lid`', async () => {
			const found = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeDefinitionProvider', rules, position);
			return found && found.length > 0 ? found : undefined;
		});
		assert.deepEqual(targets.map(one => one.uri.fsPath),
			[secondRootUri('gegevens.rgs').fsPath],
			'de definitie hoort in deze werkmap te staan, niet in samples');
	});
});
