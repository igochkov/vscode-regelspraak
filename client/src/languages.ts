/**
 * Which languages are ours, and where they are spoken — one answer ([N-5]).
 *
 * Until [N-5] one id served both `.rgs` and `.test.rgs`, because the *suffix*
 * decided which grammar read a file (`isTestUri` on the server). A notebook
 * cell has no suffix, so the fence's info string is the discriminator, and it
 * is also VS Code's cell language — which means `testspraak` has to exist as an
 * id. Two ids for one language, one for files and another for cells, is a
 * wrinkle that would be explained for ever, so `.test.rgs` files take the new
 * id too.
 *
 * **The server never reads a file's language id**: its document kind is still
 * decided by suffix for files and by cell language for cells. Everything here
 * is the editor's side of that — which documents the language features are
 * registered for, which menus appear, which status item shows.
 *
 * It lives in one module because the alternative is a dozen `languageId ===
 * 'regelspraak'` comparisons that each get to be right or wrong on their own,
 * and the ones that are wrong are silent: a menu that never appears, a lens
 * that stops being drawn, a status item that hides beside the file it is about.
 *
 * No `vscode` value is imported, so this is reachable from the serializer,
 * which is pure for the reason `rangeOfGesture` is.
 */

/** `.rgs` files, and a notebook's `regelspraak` cells. */
export const MODEL_LANGUAGE = 'regelspraak';

/** `.test.rgs` files, and a notebook's `testspraak` cells ([N-5]). */
export const TEST_LANGUAGE = 'testspraak';

/** The two info strings that make a fence a code cell ([N-1], [N-5]). */
export const CODE_LANGUAGES = [MODEL_LANGUAGE, TEST_LANGUAGE] as const;

export type CodeLanguage = typeof CODE_LANGUAGES[number];

/**
 * The scheme a notebook cell's text document carries.
 *
 * A cell is a document of its own — a different document from the `.rgs.md`
 * file around it — which is why claiming the file would not claim the cells and
 * why [N-4]'s sentence about the `documentSelector` is about the file alone.
 */
export const CELL_SCHEME = 'vscode-notebook-cell';

/** Whether a document's language is one this extension speaks. */
export function isOurs(languageId: string): languageId is CodeLanguage {
	return (CODE_LANGUAGES as readonly string[]).includes(languageId);
}

/**
 * What the language client registers its features for.
 *
 * Four entries and not two: the **server's** `notebookSelector` decides which
 * cells are *synchronised* and this decides which documents the features are
 * *registered for* — two jobs, and the §4.1 spike measured what happens when
 * they are conflated (a prose cell arrived at the server and a hover on it
 * never did, because `markdown` was in the first and not in the second). So
 * every provider a notebook needs has the cell scheme here.
 *
 * The `.rgs.md` **file** is deliberately absent ([N-4]): its text form is
 * Markdown to the editor, and the server learns about a closed notebook from
 * the workspace scan rather than from a `didOpen`.
 */
export const DOCUMENT_SELECTOR: { scheme: string; language: string }[] = [
	{ scheme: 'file', language: MODEL_LANGUAGE },
	{ scheme: 'file', language: TEST_LANGUAGE },
	{ scheme: CELL_SCHEME, language: MODEL_LANGUAGE },
	{ scheme: CELL_SCHEME, language: TEST_LANGUAGE }
];

/** Only where a testset is written: files and cells alike. */
export const TEST_EVERYWHERE: { scheme: string; language: string }[] = [
	{ scheme: 'file', language: TEST_LANGUAGE },
	{ scheme: CELL_SCHEME, language: TEST_LANGUAGE }
];
