// W1/W2 — the Model Explorer, end to end against a real language server.
//
// This suite is the only thing that checks the `regelspraak/model` contract:
// the request is not part of LSP, the server repository holds the other half,
// and nothing at build time compares the two. So it walks the tree the
// workbench would draw, over the fixture workspace, through a running server.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { ModelSource } from '../model';
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
	const docUri = getDocUri('gegevens/lid.rgs');
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
		for (const expected of ['Lid', 'Uitlening', 'Boekerijvestiging']) {
			assert.ok(names.includes(expected), `${expected} ontbreekt: ${names.join(' | ')}`);
		}
	});

	test('hangt de leden onder het objecttype dat ze declareert', async () => {
		const objectTypes = (await groups()).find(entry => entry.group!.kind === 'objecttype')!;
		const lid = (await explorer.getChildren(objectTypes))
			.find(entry => entry.node!.name === 'Lid');
		assert.ok(lid, 'geen Lid in de boom');
		const members = (await explorer.getChildren(lid)).map(entry => entry.node!.name);
		assert.ok(members.includes('pasnummer'), `pasnummer ontbreekt: ${members.join(' | ')}`);
		assert.ok(members.includes('jeugdlid'), `jeugdlid ontbreekt: ${members.join(' | ')}`);
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

// De werkmapboom wordt gecachet omdat elke uitklap ernaar vraagt. Het antwoord
// dat onderweg was toen de cache leeggegooid werd, hoort daar niet meer in
// terecht te komen: antwoorden komen op één verbinding in volgorde binnen, dus
// dat is juist het oudste antwoord dat het verse zou verdringen.
suite('Modelbron — een cache die ongeldig verklaard is (W2)', () => {
	/** A client that answers when the test says so, in the order the test says. */
	function stub(): { source: ModelSource; answer(tree: unknown): void; asked: number } {
		const pending: ((tree: unknown) => void)[] = [];
		const state = {
			source: new ModelSource(),
			answer: (tree: unknown) => pending.shift()?.(tree),
			asked: 0
		};
		state.source.setClient({
			sendRequest: () => {
				state.asked++;
				return new Promise(resolve => pending.push(resolve));
			}
		} as never);
		return state;
	}

	const tree = (label: string) => ({ groups: [{ kind: 'objecttype', label, nodes: [] }] });
	const labelOf = (answer: { groups: { label: string }[] }) => answer.groups[0]?.label;

	test('houdt een antwoord dat tijdens de vlucht ongeldig werd niet vast', async () => {
		const { source, answer } = stub();
		const first = source.workspace();
		source.forget();
		answer(tree('oud'));
		assert.equal(labelOf(await first), 'oud', 'de vrager krijgt het beste antwoord dat er is');

		// Maar het is niet bewaard: de volgende lezer moet opnieuw vragen.
		const second = source.workspace();
		answer(tree('nieuw'));
		assert.equal(labelOf(await second), 'nieuw');
	});

	test('vraagt niet opnieuw zolang niets veranderde', async () => {
		const state = stub();
		const first = state.source.workspace();
		state.answer(tree('een'));
		await first;
		assert.equal(labelOf(await state.source.workspace()), 'een');
		assert.equal(state.asked, 1, 'de boom is twee keer opgehaald');
	});
});
