// The model as this side receives it (W2, W5).
//
// One place, because two views draw the same answer: the Model Explorer takes
// the whole workspace grouped by kind, the read-only model view takes one
// document in the order it declares things, and both come from
// `regelspraak/model`. A second copy of the wire records would be a second
// thing to keep in step with the server's `protocol.ts`, which is already the
// one contract nothing across the repository boundary can check.

import { LanguageClient } from 'vscode-languageclient/node';

/** `regelspraak/model` — see the server's `protocol.ts`, which defines it. */
const MODEL_TREE_REQUEST = 'regelspraak/model';

/** `regelspraak/modelChanged` — sent whenever that answer would differ. */
export const MODEL_CHANGED_NOTIFICATION = 'regelspraak/modelChanged';

export interface WirePosition { line: number; character: number }
export interface WireRange { start: WirePosition; end: WirePosition }

export interface ModelNode {
	name: string;
	kind: string;
	label: string;
	detail?: string;
	uri: string;
	range: WireRange;
	selectionRange: WireRange;
	children: ModelNode[];
}

export interface ModelGroup {
	kind: string;
	label: string;
	nodes: ModelNode[];
}

export interface ModelTree {
	groups: ModelGroup[];
}

export const EMPTY: ModelTree = { groups: [] };

/**
 * Where both views get their model, and the only holder of the client.
 *
 * The workspace answer is cached and the per-document one is not: the first is
 * asked once per expansion of every row in a tree, the second once per opening
 * of a view that is regenerated whole anyway.
 */
export class ModelSource {
	private client: LanguageClient | undefined;
	private workspaceTree: ModelTree | undefined;

	/** Re-pointed on every (re)start, and cleared when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
		this.forget();
	}

	forget(): void {
		this.workspaceTree = undefined;
	}

	async workspace(): Promise<ModelTree> {
		this.workspaceTree ??= await this.request({});
		return this.workspaceTree ?? EMPTY;
	}

	async document(uri: string): Promise<ModelTree> {
		return await this.request({ textDocument: { uri } }) ?? EMPTY;
	}

	/**
	 * No server, or one too old to know the request: nothing, and never a
	 * rejection. A tree view that rejects shows a bare "Error" where the reason
	 * is that the server has not started yet, and the view's welcome content
	 * says that far better.
	 */
	private async request(params: unknown): Promise<ModelTree | undefined> {
		try {
			return await this.client?.sendRequest<ModelTree>(MODEL_TREE_REQUEST, params);
		} catch {
			return undefined;
		}
	}
}
