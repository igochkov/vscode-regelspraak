// W5 — the read-only model view (FSD §W5, command `regelspraak.showAst`).
//
// A virtual document under the `regelspraak-model:` scheme showing what the
// language server sees in one file: its declarations, in the order the file
// writes them, with the members and the datatype each one states.
//
// **What this is not is an expression tree**, and that is not a gap left for
// later. This server has no expression AST — the declaration-level AST holds
// which symbol a chain names, and Phase 3's type layer reads the parse tree
// directly rather than build a second tree over the grammar's own alternatives
// ([D-50]). Rendering a full parse tree here would therefore mean shipping a
// structure nothing else in the product uses, over a wire format invented for
// this view alone. What the model actually holds is what is shown.
//
// It is generated from the same `regelspraak/model` answer the Model Explorer
// draws, scoped to one document — so the two views cannot disagree about what
// a file declares.

import {
	Event, EventEmitter, TextDocumentContentProvider, Uri, window, workspace
} from 'vscode';

import { ModelGroup, ModelNode, ModelSource } from './model';

export const MODEL_SCHEME = 'regelspraak-model';

/** FSD §C2's `showAst` — "AST/genormaliseerde vorm tonen". */
export const SHOW_MODEL_COMMAND = 'regelspraak.showAst';

/**
 * The document a model view describes, carried in the virtual URI's query.
 *
 * In the query rather than the path, because the path is what the editor shows
 * on the tab and a percent-encoded absolute path is unreadable there. The path
 * is the file's own name plus a word saying which of the two views this is.
 */
function modelUri(source: Uri): Uri {
	const name = source.path.split('/').pop() ?? 'model';
	return Uri.from({ scheme: MODEL_SCHEME, path: `${name} (model)`, query: source.toString() });
}

export class ModelDocuments implements TextDocumentContentProvider {
	private readonly changed = new EventEmitter<Uri>();
	readonly onDidChange: Event<Uri> = this.changed.event;

	constructor(private readonly source: ModelSource) {}

	/**
	 * Redraws every model view that is open.
	 *
	 * VS Code caches a virtual document's text until the provider says
	 * otherwise, so without this a view left open beside the file it describes
	 * would keep showing the model as it was when it was opened — the same
	 * staleness the tree is refreshed for, in a document instead of a tree.
	 */
	refresh(): void {
		for (const document of workspace.textDocuments) {
			if (document.uri.scheme === MODEL_SCHEME) {
				this.changed.fire(document.uri);
			}
		}
	}

	async provideTextDocumentContent(uri: Uri): Promise<string> {
		const described = Uri.parse(uri.query);
		const tree = await this.source.document(described.toString());
		return render(described, tree.groups);
	}
}

/** Opens the model view for the active RegelSpraak document, beside it. */
export async function showModel(): Promise<void> {
	const editor = window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'regelspraak') {
		void window.showInformationMessage(
			'Open eerst een RegelSpraak-bestand; de modelweergave beschrijft één bestand.');
		return;
	}
	const document = await workspace.openTextDocument(modelUri(editor.document.uri));
	await window.showTextDocument(document, { viewColumn: editor.viewColumn, preview: true });
}

function render(described: Uri, groups: ModelGroup[]): string {
	const name = described.path.split('/').pop() ?? described.toString();
	const lines = [
		`// Modelweergave van ${name}`,
		'//',
		'// Alleen-lezen: dit is wat de taalserver in dit bestand ziet, in de volgorde',
		'// waarin het bestand declareert. De weergave wordt bijgewerkt zodra het model',
		'// verandert. Expressies staan er niet in — het model beschrijft declaraties.',
		''
	];
	if (groups.length === 0) {
		lines.push('(Dit bestand declareert niets, of het bevat een syntaxfout.)');
		return `${lines.join('\n')}\n`;
	}
	for (const group of groups) {
		lines.push(group.label);
		for (const node of group.nodes) {
			renderNode(node, 1, lines);
		}
		lines.push('');
	}
	return `${lines.join('\n')}\n`;
}

function renderNode(node: ModelNode, depth: number, lines: string[]): void {
	const indent = '\t'.repeat(depth);
	// The kind is stated on a member and not on a top-level declaration, where
	// the group heading above it has already said so.
	const kind = depth > 1 ? `${node.label}` : '';
	const stated = [kind, node.detail].filter(part => part).join(' · ');
	lines.push(stated ? `${indent}${node.name} — ${stated}` : `${indent}${node.name}`);
	for (const child of node.children) {
		renderNode(child, depth + 1, lines);
	}
}
