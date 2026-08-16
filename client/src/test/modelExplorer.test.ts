// W1/W2 — the Model Explorer, end to end against a real language server.
//
// This suite is the only thing that checks the `regelspraak/model` contract:
// the request is not part of LSP, the server repository holds the other half,
// and nothing at build time compares the two. So it walks the tree the
// workbench would draw, over the fixture workspace, through a running server.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/** Mirrors what `client/src/modelExplorer.ts` exposes, structurally. */
interface ModelEntry {
	row: 'group' | 'declaration';
	group?: { kind: string; label: string; nodes: unknown[] };
	node?: { name: string; kind: string; label: string; detail?: string; children: unknown[] };
}

interface ModelExplorerLike {
	refresh(): void;
	getChildren(entry?: ModelEntry): Promise<ModelEntry[]>;
	getTreeItem(entry: ModelEntry): vscode.TreeItem;
}

suite('Modelverkenner (W1, W2)', () => {
	const docUri = getDocUri('tuincentrum-gegevens.rgs');
	let explorer: ModelExplorerLike;

	suiteSetup(async () => {
		await activate(docUri);
		const api = vscode.extensions.getExtension(EXTENSION_ID)?.exports as
			{ modelExplorer: ModelExplorerLike } | undefined;
		assert.ok(api?.modelExplorer, 'de extensie levert geen modelverkenner op');
		explorer = api.modelExplorer;
	});

	/** The groups, once the server has indexed the workspace and answered. */
	async function groups(): Promise<ModelEntry[]> {
		return waitUntil('een modelboom van de taalserver', async () => {
			explorer.refresh();
			const rows = await explorer.getChildren();
			return rows.length > 0 ? rows : undefined;
		});
	}

	test('groepeert het model op soort, met de Nederlandse meervoudsvorm', async () => {
		const labels = (await groups()).map(entry => entry.group!.label);
		for (const expected of ['Objecttypen', 'Domeinen', 'Parameters', 'Feittypen']) {
			assert.ok(labels.includes(expected), `${expected} ontbreekt: ${labels.join(' | ')}`);
		}
	});

	test('noemt de objecttypen van de werkmap', async () => {
		const objectTypes = (await groups()).find(entry => entry.group!.kind === 'objecttype');
		assert.ok(objectTypes, 'geen groep objecttypen');
		const names = (await explorer.getChildren(objectTypes)).map(entry => entry.node!.name);
		for (const expected of ['Klant', 'Bestelling', 'Plant']) {
			assert.ok(names.includes(expected), `${expected} ontbreekt: ${names.join(' | ')}`);
		}
	});

	test('hangt de leden onder het objecttype dat ze declareert', async () => {
		const objectTypes = (await groups()).find(entry => entry.group!.kind === 'objecttype')!;
		const klant = (await explorer.getChildren(objectTypes))
			.find(entry => entry.node!.name === 'Klant');
		assert.ok(klant, 'geen Klant in de boom');
		const members = (await explorer.getChildren(klant)).map(entry => entry.node!.name);
		assert.ok(members.includes('klantnummer'), `klantnummer ontbreekt: ${members.join(' | ')}`);
		assert.ok(members.includes('stamklant'), `stamklant ontbreekt: ${members.join(' | ')}`);
	});

	test('brengt de regels uit het andere bestand in dezelfde boom', async () => {
		const rules = (await groups()).find(entry => entry.group!.kind === 'regel');
		assert.ok(rules, 'geen groep regels — de boom omvat maar één bestand');
		assert.ok(rules.group!.nodes.length > 0, 'de groep regels is leeg');
	});

	test('opent de declaratie waar een rij op wijst', async () => {
		const objectTypes = (await groups()).find(entry => entry.group!.kind === 'objecttype')!;
		const [first] = await explorer.getChildren(objectTypes);
		const item = explorer.getTreeItem(first);

		assert.equal(item.command?.command, 'vscode.open');
		const [uri, options] = item.command!.arguments as [vscode.Uri, { selection: vscode.Range }];
		assert.ok(uri.fsPath.endsWith('.rgs'), `geen .rgs-bestand: ${uri.fsPath}`);

		const document = await vscode.workspace.openTextDocument(uri);
		assert.equal(document.getText(options.selection), first.node!.name);
	});

	test('tekent een declaratie met het pictogram dat de outline er ook voor gebruikt', async () => {
		const objectTypes = (await groups()).find(entry => entry.group!.kind === 'objecttype')!;
		const [first] = await explorer.getChildren(objectTypes);
		const icon = explorer.getTreeItem(first).iconPath as vscode.ThemeIcon;
		assert.equal(icon.id, 'symbol-class');
	});

	test('kent het commando dat de verkenner naar voren haalt', async () => {
		const all = await vscode.commands.getCommands(true);
		assert.ok(all.includes('regelspraak.showModelExplorer'));
	});
});
