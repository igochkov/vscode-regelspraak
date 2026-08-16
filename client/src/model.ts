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

/** `regelspraak/decisionTables` — the beslistabellen of one document (W4). */
const DECISION_TABLES_REQUEST = 'regelspraak/decisionTables';

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

/** One beslistabel as a grid (W4). Mirrors the server's `protocol.ts`. */
export interface DecisionTable {
	name: string;
	nameRange: WireRange;
	range: WireRange;
	validity?: string;
	columns: DecisionColumn[];
	headerRange?: WireRange;
	rows: DecisionRow[];
}

export interface DecisionColumn {
	header: string;
	range: WireRange;
	role: 'conclusie' | 'conditie';
	/**
	 * Whether a case's value finishes this column's sentence, or the title states
	 * it whole and the value says whether it holds. Conclusion columns only.
	 */
	composed?: boolean;
}

export interface DecisionRow {
	range: WireRange;
	cells: DecisionCell[];
}

export interface DecisionCell {
	text: string;
	range: WireRange;
}

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

	/**
	 * Moved by every `forget`, so an answer can be told from a stale one.
	 *
	 * `this.workspaceTree ??= await this.request({})` re-tested the field after
	 * the await, but for *nullishness* rather than for freshness — and nullish is
	 * exactly what an invalidation leaves behind. Two `modelChanged`
	 * notifications inside one round trip put two requests in flight; replies
	 * arrive in order on one connection, so the **older** one landed in an empty
	 * cache and the fresher one found it filled and was dropped. The tree then
	 * showed a model one change out of date until the next change happened to
	 * come along.
	 */
	private generation = 0;

	/** Re-pointed on every (re)start, and cleared when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
		this.forget();
	}

	forget(): void {
		this.workspaceTree = undefined;
		this.generation++;
	}

	async workspace(): Promise<ModelTree> {
		if (this.workspaceTree) {
			return this.workspaceTree;
		}
		const asked = this.generation;
		const answer = await this.request({});
		// Only where nothing invalidated the cache while this was in flight. A
		// reply that arrives into a newer generation is still returned to *this*
		// caller — it is the best answer that exists for the question they asked —
		// but it is not kept, so the request already on its way behind it is what
		// the next reader sees.
		if (answer && asked === this.generation) {
			this.workspaceTree = answer;
		}
		return answer ?? EMPTY;
	}

	async document(uri: string): Promise<ModelTree> {
		return await this.request({ textDocument: { uri } }) ?? EMPTY;
	}

	/**
	 * Never cached, unlike the workspace tree: this answer is asked for on every
	 * change to the document it is about, so a cache of it would be a copy that is
	 * stale exactly when it is read.
	 */
	async decisionTables(uri: string): Promise<DecisionTable[]> {
		try {
			const answer = await this.client?.sendRequest<{ tables: DecisionTable[] }>(
				DECISION_TABLES_REQUEST, { textDocument: { uri } });
			return answer?.tables ?? [];
		} catch {
			return [];
		}
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
