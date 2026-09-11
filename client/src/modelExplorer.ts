// W2 — the Model Explorer (FSD §W2, BR-14, FR-W2.1), hosted by the W1 view
// container.
//
// A tree of the whole model grouped by kind, which the server answers in one
// `regelspraak/model` request (`model.ts` holds that half). This side draws it
// and does not derive it: what a group is called, which declaration is in it
// and where that declaration lives are all facts about the model, and the
// language server is the half that holds them.
//
// The one question that *is* this side's is the icon. Codicons are a workbench
// vocabulary the server has no notion of, so the map below is ours, and it is
// the only place a symbol kind is interpreted here.

import {
	Command, Disposable, Event, EventEmitter, Position, Range, ThemeIcon, TreeDataProvider,
	TreeItem, TreeItemCollapsibleState, Uri
} from 'vscode';

import { ModelGroup, ModelNode, ModelRoot, ModelSource, WirePosition, WireRange } from './model';

/**
 * A row of the tree: a workspace folder, a heading, or a declaration.
 *
 * The wire records are the elements themselves rather than a wrapper class,
 * because they are replaced wholesale on every refresh — VS Code re-asks for
 * children from the root, so nothing needs to survive that.
 *
 * The folder row exists only where the window has more than one ([N-10]), and
 * whether it does is the server's answer and not a count taken here: a scope is
 * a workspace folder, and which folder a model belongs to is what `indexFor`
 * decided. So this side draws `roots` when the answer carries them and `groups`
 * when it does not.
 */
export type ModelEntry =
	| { row: 'root'; root: ModelRoot }
	| { row: 'group'; group: ModelGroup }
	| { row: 'declaration'; node: ModelNode };

/**
 * Which codicon stands for a kind.
 *
 * The `symbol-*` family, so a declaration is drawn here exactly as the same
 * declaration is drawn in the outline and in completion — those are VS Code's
 * own icons for the `SymbolKind`s the server already maps these kinds to
 * (FSD §4.1). A different picture for the same thing in two lists reads as two
 * different things.
 *
 * **One deliberate exception: a beslistabel is a `table`.** It shares its
 * `SymbolKind` with a regel, because LSP has no kind that means "table" and
 * `Function` is the honest answer for both — they derive values. That was
 * invisible while decision tables had a group of their own; once a Regelgroep
 * adopted its file's tables ([D-52]), rules and tables landed in one list and
 * the icon became the only thing telling them apart. So this one leaves the
 * family, because nothing inside it says "table" and the distinction is worth
 * more here than the consistency is. The outline keeps `Function` for both: it
 * is per-file and short, and inventing a symbol kind to match a picture would
 * be the tail wagging the dog.
 */
const ICONS: Record<string, string> = {
	objecttype: 'symbol-class',
	attribuut: 'symbol-field',
	kenmerk: 'symbol-property',
	domein: 'symbol-struct',
	enumwaarde: 'symbol-enum-member',
	eenheidsysteem: 'symbol-namespace',
	eenheid: 'symbol-constant',
	dimensie: 'symbol-enum',
	dimensiewaarde: 'symbol-enum-member',
	dagsoort: 'symbol-constant',
	tijdlijn: 'symbol-event',
	parameter: 'symbol-constant',
	feittype: 'symbol-interface',
	rol: 'symbol-field',
	regel: 'symbol-function',
	beslistabel: 'table',
	variabele: 'symbol-variable'
};

const toPosition = (p: WirePosition): Position => new Position(p.line, p.character);
const toRange = (r: WireRange): Range => new Range(toPosition(r.start), toPosition(r.end));

export class ModelExplorer implements TreeDataProvider<ModelEntry>, Disposable {
	private readonly changed = new EventEmitter<void>();
	readonly onDidChangeTreeData: Event<void> = this.changed.event;

	constructor(private readonly source: ModelSource) {}

	/** The emitter is this object's own; nothing else can close it. */
	dispose(): void {
		this.changed.dispose();
	}

	/** Forgets the model and redraws; the next expansion re-asks the server. */
	refresh(): void {
		this.source.forget();
		this.changed.fire();
	}

	getTreeItem(entry: ModelEntry): TreeItem {
		if (entry.row === 'root') {
			return rootItem(entry.root);
		}
		return entry.row === 'group' ? groupItem(entry.group) : declarationItem(entry.node);
	}

	async getChildren(entry?: ModelEntry): Promise<ModelEntry[]> {
		if (entry?.row === 'root') {
			return entry.root.groups.map(group => ({ row: 'group', group }));
		}
		if (entry?.row === 'group') {
			return entry.group.nodes.map(node => ({ row: 'declaration', node }));
		}
		if (entry?.row === 'declaration') {
			return entry.node.children.map(node => ({ row: 'declaration', node }));
		}
		const tree = await this.source.workspace();
		// `roots` and `groups` are one answer in two shapes, never both: the
		// server leaves `groups` empty where it sends folders.
		return tree.roots
			? tree.roots.map(root => ({ row: 'root', root }))
			: tree.groups.map(group => ({ row: 'group', group }));
	}
}

/**
 * One workspace folder.
 *
 * `folder-library` rather than a plain `folder`: it is not a directory the
 * reader can open but the model held in one, and the row beneath it is a group
 * of declarations. Expanded, because a folder collapsed by default hides the
 * whole tree behind two clicks — and the description counts the groups, which
 * is what the top level used to count for the window as a whole.
 */
function rootItem(root: ModelRoot): TreeItem {
	const item = new TreeItem(root.label, TreeItemCollapsibleState.Expanded);
	item.contextValue = 'regelspraakRoot';
	item.iconPath = new ThemeIcon('folder-library');
	item.resourceUri = Uri.parse(root.uri);
	// The folder's own path, which is what tells two folders of one name apart —
	// and a reader supporting several jurists has exactly that.
	item.tooltip = Uri.parse(root.uri).fsPath;
	item.description = `${root.groups.length}`;
	return item;
}

function groupItem(group: ModelGroup): TreeItem {
	const item = new TreeItem(group.label, TreeItemCollapsibleState.Expanded);
	item.contextValue = `regelspraakGroup.${group.kind}`;
	item.description = `${group.nodes.length}`;
	return item;
}

function declarationItem(node: ModelNode): TreeItem {
	const item = new TreeItem(
		node.name,
		node.children.length > 0
			? TreeItemCollapsibleState.Collapsed
			: TreeItemCollapsibleState.None);
	item.description = node.detail;
	item.tooltip = node.detail ? `${node.label} — ${node.detail}` : node.label;
	item.iconPath = new ThemeIcon(ICONS[node.kind] ?? 'symbol-misc');
	// So a later action can be offered for one kind and not another (run a rule,
	// Phase 5) without this side having to re-read what kind a row is.
	item.contextValue = `regelspraakDeclaration.${node.kind}`;
	item.command = reveal(node);
	return item;
}

/**
 * Opening the declaration is the whole of the click, and `vscode.open` is the
 * editor's own way to do it.
 *
 * A command of our own would have to reproduce the column/preview behaviour
 * every other jump in the editor has. The selection is the name rather than the
 * whole declaration, which is what Go to Definition selects from anywhere else.
 */
function reveal(node: ModelNode): Command {
	return {
		command: 'vscode.open',
		title: 'Openen',
		arguments: [Uri.parse(node.uri), { selection: toRange(node.selectionRange) }]
	};
}
