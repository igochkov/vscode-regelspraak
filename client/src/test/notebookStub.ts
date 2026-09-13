/**
 * A language server that answers nothing and records everything — the "stub
 * server" the Notebook Plan's build order names (§4, *4.4 can begin against a
 * stub server once 4.1 has settled the format*).
 *
 * §4.1 #2 asks whether `notebookDocumentSync` **through vscode-languageclient
 * 9.0.1** delivers cells and Markdown cells for our notebook type, and whether a
 * hover in a cell round-trips with translated positions. That is a question
 * about the library and the workbench, not about RegelSpraak — so the thing on
 * the other end of the wire is an observer: it declares the capability, keeps
 * what arrives, hands it back through one custom request, and echoes every
 * hover position straight back so the test can read what the client sent.
 *
 * Deliberately **not** the real server. The production server learns about
 * notebooks in §4.2; wiring this spike to it would have measured our own
 * `ModelIndex` at the same time as the library, and would have meant landing a
 * capability declaration before the design that has to honour it.
 *
 * Raw JSON-RPC over stdio, with no dependency at all: the framing is nine lines
 * and `vscode-jsonrpc` is only in this repository as a transitive dependency of
 * the language client.
 */

interface Message {
	jsonrpc: '2.0';
	id?: number | string;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { code: number; message: string };
}

interface CellRecord {
	uri: string;
	kind: number;
	languageId: string;
}

/** What the suite asks for, through `spike/report`. */
interface Report {
	/** `notebookDocument/didOpen` — the notebook and the cells it carried. */
	notebooks: { uri: string; notebookType: string; cells: CellRecord[] }[];
	/**
	 * Every `textDocument/didOpen`, in arrival order — kept apart from the
	 * cells that rode along inside the notebook notification, because *which of
	 * the two carries a cell* is a thing §4.2 has to know and this is the only
	 * place it can be read off.
	 */
	opened: { uri: string; languageId: string; lines: number }[];
	/** Every `notebookDocument/didChange`, summarised. */
	changes: { uri: string; structure: boolean; text: string[] }[];
	/** Every hover asked of us, with the position exactly as it arrived. */
	hovers: { uri: string; line: number; character: number }[];
}

const report: Report = { notebooks: [], opened: [], changes: [], hovers: [] };
const text = new Map<string, string>();

function send(message: Message): void {
	const body = Buffer.from(JSON.stringify(message), 'utf8');
	process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
	process.stdout.write(body);
}

function reply(id: number | string, result: unknown): void {
	send({ jsonrpc: '2.0', id, result });
}

/** As much of each notification as this observer reads. */
interface TextDocumentItem { uri: string; languageId: string; text: string }
interface CellItem { kind: number; document: string }
interface NotebookParams {
	notebookDocument?: { uri: string; notebookType: string; cells?: CellItem[] };
	cellTextDocuments?: TextDocumentItem[];
	change?: {
		cells?: {
			structure?: unknown;
			textContent?: { document: { uri: string }; changes?: { range?: unknown; text: string }[] }[];
		};
	};
	textDocument?: TextDocumentItem & { uri: string };
	position?: { line: number; character: number };
}

function handle(message: Message): void {
	const params = (message.params ?? {}) as NotebookParams;
	switch (message.method) {
		case 'initialize':
			reply(message.id!, {
				capabilities: {
					// 1 = full. The cells arrive as ordinary text documents beside
					// the notebook notification, and this is what says so.
					textDocumentSync: 1,
					hoverProvider: true,
					// [N-3]'s declaration: our notebook type, and the three cell
					// languages — the prose included, which [N-6] needs.
					notebookDocumentSync: {
						notebookSelector: [{
							// Spelled out rather than imported: this runs as a plain
							// Node process with no `vscode` and no extension around
							// it, and what it is standing in for is a *server*, which
							// will hold its own copy of the id for the same reason.
							notebook: { notebookType: 'regelspraak-notebook' },
							cells: [
								{ language: 'regelspraak' },
								{ language: 'testspraak' },
								{ language: 'markdown' }
							]
						}]
					}
				}
			});
			return;

		case 'notebookDocument/didOpen': {
			const cells = params.cellTextDocuments ?? [];
			report.notebooks.push({
				uri: params.notebookDocument?.uri ?? '?',
				notebookType: params.notebookDocument?.notebookType ?? '?',
				cells: (params.notebookDocument?.cells ?? []).map(cell => ({
					uri: cell.document,
					kind: cell.kind,
					// The cell list gives a kind and a URI; the *text* and the
					// language of each come in `cellTextDocuments` beside it, so
					// the two have to be paired here to say anything at all.
					languageId: cells.find(d => d.uri === cell.document)?.languageId ?? '?'
				}))
			});
			for (const document of cells) {
				text.set(document.uri, document.text);
			}
			return;
		}

		case 'notebookDocument/didChange': {
			const edited = params.change?.cells?.textContent ?? [];
			report.changes.push({
				uri: params.notebookDocument?.uri ?? '?',
				structure: params.change?.cells?.structure !== undefined,
				text: edited.map(change => change.document.uri)
			});
			for (const change of edited) {
				for (const edit of change.changes ?? []) {
					if (edit.range === undefined) {
						text.set(change.document.uri, edit.text);
					}
				}
			}
			return;
		}

		case 'textDocument/didOpen': {
			const document = params.textDocument!;
			text.set(document.uri, document.text);
			report.opened.push({
				uri: document.uri,
				languageId: document.languageId,
				lines: document.text.split('\n').length
			});
			return;
		}

		case 'textDocument/hover': {
			const uri = params.textDocument!.uri;
			const { line, character } = params.position!;
			report.hovers.push({ uri, line, character });
			// The answer states what arrived, so the suite can read the position
			// the client sent rather than infer it from a side effect. The word
			// under it comes from what we were told the document says, which is
			// the other half of the round trip.
			const held = (text.get(uri) ?? '').split('\n')[line] ?? '';
			const word = /[\p{L}\p{N}_-]+/u.exec(held.slice(character)) ?? [''];
			reply(message.id!, {
				contents: { kind: 'plaintext', value: `${line}:${character}|${word[0]}` }
			});
			return;
		}

		case 'spike/report':
			reply(message.id!, report);
			return;

		case 'shutdown':
			reply(message.id!, null);
			return;

		case 'exit':
			process.exit(0);
			return;

		default:
			// A request we do not answer still has to be answered, or the client
			// waits for ever.
			if (message.id !== undefined) {
				reply(message.id, null);
			}
	}
}

let buffer = Buffer.alloc(0);
process.stdin.on('data', chunk => {
	buffer = Buffer.concat([buffer, chunk]);
	for (;;) {
		const header = buffer.indexOf('\r\n\r\n');
		if (header < 0) { return; }
		const length = Number(/Content-Length: (\d+)/u.exec(buffer.subarray(0, header).toString('ascii'))?.[1]);
		if (!Number.isFinite(length) || buffer.length < header + 4 + length) { return; }
		const body = buffer.subarray(header + 4, header + 4 + length).toString('utf8');
		buffer = buffer.subarray(header + 4 + length);
		try {
			handle(JSON.parse(body) as Message);
		} catch (error) {
			process.stderr.write(`stub: ${String(error)}\n`);
		}
	}
});
