import {
	NotebookCellData, NotebookCellKind, NotebookData, Uri, commands, window, workspace
} from 'vscode';

import { MODEL_LANGUAGE, TEST_LANGUAGE } from '../languages';
import { NOTEBOOK_TYPE } from './serializer';

export const NEW_NOTEBOOK_COMMAND = 'regelspraak.nieuwNotebook';
export const PREVIEW_REGLEMENT_COMMAND = 'regelspraak.bekijkReglement';

/**
 * The first notebook anybody opens, and what it teaches.
 *
 * A heading, a paragraph, an empty `regelspraak` cell and an empty `testspraak`
 * cell under it — which is [N-7] drawn rather than explained: the run button
 * appears on the worked example and on nothing else, so the shape of the
 * document says what runs before anyone has to be told. Three cells would have
 * left the reader to discover the second language from the picker.
 *
 * The prose is the shape of an artikel ([N-1b]), because the unit this product
 * recommends is the one a new file should already be.
 */
const TEMPLATE: readonly { kind: 'markdown' | 'code'; language: string; value: string }[] = [
	{
		kind: 'markdown', language: 'markdown', value: [
			'# Artikel 1 — ',
			'',
			'Schrijf hier de bepaling, en zet de regel die haar weergeeft eronder.',
			'Een verwijzing naar de wet schrijf je als link, bijvoorbeeld',
			'[artikel 13 Wsob](https://wetten.overheid.nl/jci1.3:c:BWBR0035878&artikel=13).'
		].join('\n')
	},
	{ kind: 'code', language: MODEL_LANGUAGE, value: '' },
	{
		kind: 'markdown', language: 'markdown', value: [
			'## Rekenvoorbeeld',
			'',
			'Je voert het rekenvoorbeeld uit, niet de regel.'
		].join('\n')
	},
	{ kind: 'code', language: TEST_LANGUAGE, value: '' }
];

/**
 * **RegelSpraak: Nieuw notebook** — an untitled notebook of our type.
 *
 * Untitled rather than a file written to a folder the command picked, which is
 * what the plan's §3.2 sketch said. Three reasons. It is the gesture every
 * notebook user already has (**New Jupyter Notebook** does exactly this), so
 * nothing has to be taught. Nothing lands on somebody's disk until they say
 * where, and *where* matters here more than usual — [N-1b] makes the folder
 * above a notebook a level of the document, so the path is a decision and not a
 * formality, and a dialog whose one sensible answer is pre-selected is a dialog
 * that gets accepted without reading (the ALEF import's lesson). And Save As is
 * VS Code's own answer to the question, with the `.rgs.md` filter that comes
 * from the `notebooks` contribution.
 *
 * The price is that the notebook is under no workspace folder until it is
 * saved, so it sits in the loose scope ([N-10]) and resolves nothing from the
 * model beside it. That costs nothing on a notebook whose code cells are empty,
 * and saving it is what joins it to the folder's model.
 */
export async function newNotebook(): Promise<void> {
	const data = new NotebookData(TEMPLATE.map(cell => new NotebookCellData(
		cell.kind === 'code' ? NotebookCellKind.Code : NotebookCellKind.Markup,
		cell.value,
		cell.language)));
	const notebook = await workspace.openNotebookDocument(NOTEBOOK_TYPE, data);
	await window.showNotebookDocument(notebook);
}

/** What a `notebook/toolbar` entry hands its command. */
interface ToolbarArgs {
	notebookEditor?: { notebookUri?: Uri };
}

/**
 * **RegelSpraak: Reglement bekijken** — the whole document, rendered ([N-1a]).
 *
 * The read-through a jurist does before sending the reglement to a colleague,
 * and it costs nothing to give them: the file *is* Markdown, so VS Code's own
 * preview renders the prose, the figures and the fences — the last of those
 * highlighted by our own TextMate grammar, since `regelspraak` and `testspraak`
 * are contributed languages ([N-5]). No renderer of ours is involved, which is
 * the property [N-1a] is about.
 *
 * **It shows the saved text.** The preview opens the *file*, and a notebook's
 * unsaved edits live in the notebook model rather than in a text document — so
 * a dirty notebook would be previewed as it was last written, silently. Saying
 * so beats both alternatives: saving on the reader's behalf is a write they did
 * not ask for, and refusing is a command that stops working exactly while
 * somebody is editing.
 */
export async function previewReglement(args?: ToolbarArgs): Promise<void> {
	const uri = args?.notebookEditor?.notebookUri
		?? window.activeNotebookEditor?.notebook.uri;
	if (!uri) {
		void window.showInformationMessage(
			'Open eerst een RegelSpraak-notebook; het reglement is het notebookbestand.');
		return;
	}
	if (uri.scheme !== 'file') {
		void window.showInformationMessage(
			'Sla het notebook eerst op; het voorbeeld toont het bestand op schijf.');
		return;
	}
	const notebook = workspace.notebookDocuments
		.find(one => one.uri.toString() === uri.toString());
	if (notebook?.isDirty) {
		void window.showInformationMessage(
			'Dit notebook heeft niet-opgeslagen wijzigingen; het voorbeeld toont de opgeslagen tekst.');
	}
	await commands.executeCommand('markdown.showPreview', uri);
}
