// Opening the provision a citation names, rendered.
//
// A `// Bron:` comment links to the document the model is derived from, and the
// language server resolves that to `file:…/reglement.md#L120`
// (`model/sourceCitations.ts` there). A plain link like that opens the Markdown
// **source** at the line, which is not what a reader wants from a reglement —
// they want the article, rendered.
//
// There is no URI that means "the preview of this file", so the hover's link is
// a `command:` link to this instead. That is why `LanguageClientOptions.markdown`
// trusts exactly one command and no others: a hover ultimately renders doc
// comments written by whoever wrote the model, and a blanket `isTrusted` would
// let any of them run anything.
//
// The recipe is the one with evidence behind it. `markdown.showPreview` takes a
// resource and no position, so the line is reached by revealing it in the text
// editor first and letting the preview follow — which it does, through
// `markdown.preview.scrollPreviewWithEditor`. Where that setting is off the
// preview still opens, at the top.

import { Position, Range, Selection, TextEditorRevealType, Uri, commands, window, workspace } from 'vscode';

/** Named in the hover the server builds; the two spellings must match. */
export const OPEN_SOURCE_COMMAND = 'regelspraak.openBron';

/** `#L120` — the only fragment the server puts on a resolved citation. */
const LINE = /^L(\d+)$/;

export async function openSource(target?: string): Promise<void> {
	if (typeof target !== 'string' || target === '') {
		return;
	}
	const uri = Uri.parse(target);
	const line = Number(LINE.exec(uri.fragment)?.[1] ?? 0);

	const document = await workspace.openTextDocument(uri.with({ fragment: '' }));
	const editor = await window.showTextDocument(document, { preview: true });
	if (line > 0) {
		const spot = new Position(Math.min(line - 1, document.lineCount - 1), 0);
		editor.selection = new Selection(spot, spot);
		// At the top of the viewport rather than centred: the reader is going to an
		// article, and what they want to see is the article and what follows it.
		editor.revealRange(new Range(spot, spot), TextEditorRevealType.AtTop);
	}

	// Only Markdown has a preview. Anything else a model might cite is left as the
	// editor it just opened, which is the whole of what a plain link would do.
	if (document.languageId === 'markdown') {
		await commands.executeCommand('markdown.showPreview');
	}
}
