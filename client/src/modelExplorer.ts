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

import { ModelGroup, ModelNode, ModelSource, WirePosition, WireRange } from './model';

/**
 * A row of the tree: a heading, or a declaration.
 *
 * The wire records are the elements themselves rather than a wrapper class,
 * because they are replaced wholesale on every refresh — VS Code re-asks for
 * children from the root, so nothing needs to survive that.
 */
export type ModelEntry =
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
	beslistabel: 'symbol-function',
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
		return entry.row === 'group' ? groupItem(entry.group) : declarationItem(entry.node);
	}

	async getChildren(entry?: ModelEntry): Promise<ModelEntry[]> {
		if (entry?.row === 'group') {
			return entry.group.nodes.map(node => ({ row: 'declaration', node }));
		}
		if (entry?.row === 'declaration') {
			return entry.node.children.map(node => ({ row: 'declaration', node }));
		}
		const tree = await this.source.workspace();
		return tree.groups.map(group => ({ row: 'group', group }));
	}
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
