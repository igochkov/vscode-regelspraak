import * as vscode from 'vscode';

/**
 * The `.rgs.md` format ([N-1]) — read leniently, written canonically.
 *
 * A notebook is a Markdown file. A fenced code block whose info string is
 * `regelspraak` or `testspraak` is a code cell; everything between such blocks
 * is one Markdown cell. Any other fence is prose and stays inside its Markdown
 * cell verbatim. Outputs, execution counts and cell metadata are not written —
 * there is nothing a notebook knows about a cell that the text does not say.
 *
 * **Two readers of this format exist and must agree**: this one, and the
 * server's `notebook/markdown.ts` (§4.2). The end-to-end suite is what holds
 * them together, as it holds the two copies of the citation anchor rule.
 *
 * Everything above `RegelSpraakNotebookSerializer` is pure and takes no
 * `vscode` value, so the suite can drive it directly — the rule
 * `rangeOfGesture` and `caseAt` already follow, for the reason a webview and a
 * notebook share: the half that decides anything must live where a test
 * reaches it.
 */

/**
 * The notebook type id.
 *
 * *Reglement* is deliberately **not** in it: whether that is the word for this
 * document is a question for end users (plan §6 #2, product owner 11 September
 * 2026), and a type id is the one string here that is expensive to change —
 * it is what a workspace's `workbench.editorAssociations` names, so a user who
 * has pinned an association keeps pointing at a type that no longer exists. The
 * *display* name beside it in the manifest is free to change and is the one the
 * end-user conversation is actually about.
 */
export const NOTEBOOK_TYPE = 'regelspraak-notebook';

/** The two info strings that make a fence a code cell ([N-1], [N-5]). */
export const CODE_LANGUAGES = ['regelspraak', 'testspraak'] as const;

export type CodeLanguage = typeof CODE_LANGUAGES[number];

export interface ReadCell {
	kind: 'code' | 'markdown';
	/** `regelspraak`, `testspraak`, or `markdown` for prose. */
	language: CodeLanguage | 'markdown';
	/** The cell's own text, without its fences. */
	value: string;
	/** 0-based line in the file where `value` starts. */
	startLine: number;
	/** How many lines of the file `value` occupies. */
	lineCount: number;
}

/**
 * CommonMark's fence, read leniently.
 *
 * Three or more backticks or tildes, indented up to three spaces. The info
 * string may carry attributes (`regelspraak {.numberLines}`), which some
 * Markdown dialects write and which name the same language — so the first word
 * of it decides, and the rest is dropped when the file is written back
 * canonically.
 */
const FENCE = /^(?<indent> {0,3})(?<marker>`{3,}|~{3,})(?<info>.*)$/u;

interface Fence {
	indent: number;
	marker: string;
	/** The first word of the info string, lowercased. */
	language: string;
}

function fenceAt(line: string): Fence | undefined {
	const match = FENCE.exec(line);
	if (!match?.groups) {
		return undefined;
	}
	const info = match.groups.info.trim();
	// A backtick fence may not carry a backtick in its info string (CommonMark
	// §4.5) — that is an inline code span, not a fence.
	if (match.groups.marker.startsWith('`') && info.includes('`')) {
		return undefined;
	}
	return {
		indent: match.groups.indent.length,
		marker: match.groups.marker,
		language: (info.split(/[\s{]/u)[0] ?? '').toLowerCase()
	};
}

function isCodeLanguage(language: string): language is CodeLanguage {
	return (CODE_LANGUAGES as readonly string[]).includes(language);
}

/** A closing fence is the same character, at least as long, and carries no info. */
function closes(open: Fence, line: string): boolean {
	const fence = fenceAt(line);
	return fence !== undefined
		&& fence.marker[0] === open.marker[0]
		&& fence.marker.length >= open.marker.length
		&& fence.language === '';
}

/**
 * The cells of a `.rgs.md` file, in order, each knowing where it came from.
 *
 * A gap that is only whitespace yields **no** Markdown cell: two code cells
 * with a blank line between them are two cells and not three, and the blank
 * line is what the canonical form writes between them anyway. A file with no
 * fences at all is one Markdown cell ([N-1]).
 */
export function readCells(text: string): ReadCell[] {
	const lines = text.split(/\r?\n/u);
	const cells: ReadCell[] = [];
	let prose: string[] = [];
	let proseStart = 0;

	const flushProse = (): void => {
		if (prose.some(line => line.trim().length > 0)) {
			// Blank lines at either end belong to the layout rather than to the
			// prose, so that a cell round-trips through the canonical form.
			let first = 0;
			let last = prose.length - 1;
			while (first <= last && prose[first].trim().length === 0) { first++; }
			while (last >= first && prose[last].trim().length === 0) { last--; }
			cells.push({
				kind: 'markdown',
				language: 'markdown',
				value: prose.slice(first, last + 1).join('\n'),
				startLine: proseStart + first,
				lineCount: last - first + 1
			});
		}
		prose = [];
	};

	const keepAsProse = (from: number, upTo: number): void => {
		if (prose.length === 0) { proseStart = from; }
		prose.push(...lines.slice(from, upTo));
	};

	for (let i = 0; i < lines.length; i++) {
		const open = fenceAt(lines[i]);
		if (!open) {
			keepAsProse(i, i + 1);
			continue;
		}

		const body: string[] = [];
		let j = i + 1;
		for (; j < lines.length && !closes(open, lines[j]); j++) {
			// An indented fence indents its content by the same amount
			// (CommonMark §4.5); anything less is left alone.
			body.push(lines[j].slice(0, open.indent).trim().length === 0
				? lines[j].slice(open.indent)
				: lines[j]);
		}
		// A fence nobody closed runs to the end of the file, and the file's own
		// final newline is then the last thing in it — a blank line the author
		// did not write into the cell, which the canonical form would write back
		// above the closing fence it supplies.
		if (j >= lines.length && body.at(-1) === '') {
			body.pop();
		}

		if (!isCodeLanguage(open.language)) {
			// An unlabelled fence, or a ```json or ```python one: prose, and it
			// stays verbatim — fences and all — inside the Markdown cell around
			// it. So it is scanned *past* rather than into, and the dedent above
			// is thrown away with the rest of the reading.
			keepAsProse(i, Math.min(j + 1, lines.length));
			i = j;
			continue;
		}

		flushProse();
		cells.push({
			kind: 'code',
			language: open.language,
			value: body.join('\n'),
			startLine: i + 1,
			lineCount: body.length
		});
		i = j;
	}
	flushProse();

	if (cells.length === 0) {
		cells.push({
			kind: 'markdown', language: 'markdown', value: text, startLine: 0,
			lineCount: lines.length
		});
	}
	return cells;
}

/**
 * The canonical form: a fence of three backticks at column 0 with the language
 * as the whole info string, one blank line between cells, and a trailing
 * newline.
 *
 * So a file the notebook editor has saved re-opens with identical cells, and a
 * hand-written or converted one that deviates is normalised on its first save —
 * **with the code inside it untouched**, which is FR-P17.2's rule one surface
 * up.
 */
export function writeCells(cells: readonly { kind: 'code' | 'markdown'; language: string; value: string }[]): string {
	const parts = cells.map(cell => cell.kind === 'code'
		? `\`\`\`${cell.language}\n${cell.value}\n\`\`\``
		: cell.value);
	return parts.length === 0 ? '' : `${parts.join('\n\n')}\n`;
}

/**
 * Where a line of the *file* lands in the notebook — §4.1 #4's fence map.
 *
 * The server says everything about a **closed** notebook in file coordinates
 * ([N-3]), so opening a `Location` that points into one is the one place the
 * client reads the format for the server's sake. A line inside no cell — a
 * fence, or a blank line between two of them — yields nothing rather than the
 * nearest cell: a position that silently moved is worse than one the editor
 * declines to reveal.
 */
export function cellOfLine(cells: readonly ReadCell[], line: number): { index: number; line: number } | undefined {
	const index = cells.findIndex(cell =>
		line >= cell.startLine && line < cell.startLine + cell.lineCount);
	return index < 0 ? undefined : { index, line: line - cells[index].startLine };
}

/** The inverse, for a gesture that starts in a cell and is about the file. */
export function lineOfCell(cells: readonly ReadCell[], index: number, line: number): number | undefined {
	const cell = cells[index];
	return cell && line < cell.lineCount ? cell.startLine + line : undefined;
}

export class RegelSpraakNotebookSerializer implements vscode.NotebookSerializer {
	deserializeNotebook(content: Uint8Array): vscode.NotebookData {
		const text = new TextDecoder().decode(content);
		const cells = readCells(text).map(cell => new vscode.NotebookCellData(
			cell.kind === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
			cell.value,
			cell.language));
		return new vscode.NotebookData(cells);
	}

	serializeNotebook(data: vscode.NotebookData): Uint8Array {
		return new TextEncoder().encode(writeCells(data.cells.map(cell => ({
			kind: cell.kind === vscode.NotebookCellKind.Code ? 'code' as const : 'markdown' as const,
			language: cell.languageId,
			value: cell.value
		}))));
	}
}
