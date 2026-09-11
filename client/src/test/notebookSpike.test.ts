import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import {
	NOTEBOOK_TYPE, cellOfLine, lineOfCell, readCells, writeCells
} from '../notebook/serializer';
import { waitUntil } from './helper';

/**
 * The §4.1 spike — seven things the Notebook Plan asserts from the VS Code API
 * rather than from this codebase, asked of a running host.
 *
 * The plan's deliverable is the answers, written down in
 * `docs/work-item-notebook.md` §4.1 of the server repository. This suite is
 * what the answers were read off, and it stays afterwards for the reason every
 * measurement in this product stays: the next person to change the format, the
 * contribution or the library version finds out here rather than in an editor.
 *
 * Question 6, the keystroke cost of the one-document projection, is not here:
 * it is a parser measurement and has no VS Code in it. It is
 * `npm run notebook:bench` in the server repository.
 */

const FIXTURE = vscode.Uri.file(path.resolve(
	__dirname, '../../src/test/fixtures/notebook/artikel-8-boete.rgs.md'));

/** A plain `.md` in the workspace: the control for question 1. */
const PLAIN_MARKDOWN = vscode.Uri.file(path.resolve(
	__dirname, '../../../samples/bron/reglement.md'));

const MARKDOWN_EXTENSION = 'vscode.markdown-language-features';

/**
 * The Markdown extension, which owns two of the seven answers — the paste
 * provider that writes a figure beside the notebook, and the preview a
 * reglement is read through.
 *
 * **Asserted rather than skipped past.** The first cut of this suite guarded
 * both on its presence and gave them a run of their own without
 * `--disable-extensions`, on the assumption that the flag turns the built-in
 * extensions off too. It does not (VS Code 1.101, measured), so the extra run
 * was deleted — and what is left is an assertion, because a suite that quietly
 * skips in the ordinary run is one nobody notices has stopped working, which is
 * `scopes.test.ts`'s own lesson.
 */
function markdownExtension(): vscode.Extension<unknown> {
	const found = vscode.extensions.getExtension(MARKDOWN_EXTENSION);
	assert.ok(found, `${MARKDOWN_EXTENSION} ontbreekt in deze host`);
	return found;
}

async function closeEverything(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

async function openAsNotebook(): Promise<vscode.NotebookDocument> {
	const notebook = await vscode.workspace.openNotebookDocument(FIXTURE);
	await vscode.window.showNotebookDocument(notebook);
	return notebook;
}

suite('Notebook spike (Notebook Plan §4.1)', () => {

	suiteTeardown(closeEverything);

	// -----------------------------------------------------------------------
	// The format itself — what §4.1 had to settle before §4.2 and §4.4 could
	// start, and what question 4's fence map is computed from.
	// -----------------------------------------------------------------------

	suite('het formaat ([N-1])', () => {

		test('een hekjesblok met onze taal is een codecel, de rest is proza', () => {
			const cells = readCells([
				'# Kop',
				'',
				'Proza.',
				'',
				'```regelspraak',
				'Regel r',
				'```',
				'',
				'```json',
				'{ "dit": "is proza" }',
				'```',
				'',
				'```testspraak',
				'Testset t',
				'```'
			].join('\n'));

			assert.deepStrictEqual(
				cells.map(cell => `${cell.language}:${cell.value.split('\n')[0]}`),
				['markdown:# Kop', 'regelspraak:Regel r', 'markdown:```json', 'testspraak:Testset t']);
		});

		test('een bestand zonder hekjes is één markdowncel', () => {
			const cells = readCells('# Alleen proza\n\nEn niets anders.\n');
			assert.strictEqual(cells.length, 1);
			assert.strictEqual(cells[0].kind, 'markdown');
		});

		test('golfjes, inspringing en attributen worden soepel gelezen', () => {
			const cells = readCells([
				'~~~regelspraak',
				'Regel golfjes',
				'~~~',
				'',
				'  ```regelspraak {.numberLines}',
				'  Regel ingesprongen',
				'  ```'
			].join('\n'));

			assert.deepStrictEqual(cells.map(cell => cell.language), ['regelspraak', 'regelspraak']);
			// The indent belongs to the fence, not to the code: an indented
			// block's content is dedented by the fence's own indent
			// (CommonMark §4.5), or every line of it would carry two spaces the
			// author never typed and the formatter would want to remove.
			assert.strictEqual(cells[1].value, 'Regel ingesprongen');
		});

		test('een niet-gesloten hekjesblok loopt tot het eind', () => {
			const cells = readCells('```regelspraak\nRegel r\n');
			assert.strictEqual(cells.length, 1);
			assert.strictEqual(cells[0].value, 'Regel r');
		});

		test('de canonieke vorm is een vaste puntkomma-loze vorm', () => {
			assert.strictEqual(
				writeCells([
					{ kind: 'markdown', language: 'markdown', value: '# Kop' },
					{ kind: 'code', language: 'regelspraak', value: 'Regel r' }
				]),
				'# Kop\n\n```regelspraak\nRegel r\n```\n');
		});

		test('de fixture is al canoniek, dus lezen en schrijven is bytegelijk', async () => {
			const text = new TextDecoder().decode(await vscode.workspace.fs.readFile(FIXTURE));
			assert.strictEqual(writeCells(readCells(text)), text.replace(/\r\n/gu, '\n'));
		});

		test('een soepel gelezen bestand wordt canoniek teruggeschreven, de code onaangeroerd', () => {
			const written = writeCells(readCells('~~~regelspraak\nRegel r\n~~~\n'));
			assert.strictEqual(written, '```regelspraak\nRegel r\n```\n');
		});
	});

	// -----------------------------------------------------------------------
	// 1. `priority: default` on `**/*.rgs.md`
	// -----------------------------------------------------------------------

	suite('1. de editorkeuze ([N-4])', () => {

		teardown(closeEverything);

		test('een .rgs.md opent als notebook van ons type', async () => {
			await vscode.commands.executeCommand('vscode.open', FIXTURE);
			const editor = await waitUntil('een notebookeditor',
				() => vscode.window.activeNotebookEditor, 20000);
			assert.strictEqual(editor.notebook.notebookType, NOTEBOOK_TYPE);
			assert.strictEqual(editor.notebook.uri.fsPath, FIXTURE.fsPath);
		});

		test('een gewone .md blijft een gewone .md', async () => {
			await vscode.commands.executeCommand('vscode.open', PLAIN_MARKDOWN);
			const editor = await waitUntil('een teksteditor',
				() => vscode.window.activeTextEditor, 20000);
			assert.strictEqual(editor.document.uri.fsPath, PLAIN_MARKDOWN.fsPath);
			assert.strictEqual(vscode.window.activeNotebookEditor, undefined,
				'een .md zonder .rgs ervoor hoort geen notebook te worden');
		});

		test('de tekstvorm is één gebaar ver — Open With → Text Editor', async () => {
			// `default` is a priority and not a claim: the built-in text editor
			// still opens the same bytes, which is what makes OBJ-8's "the text
			// is the one place a model is authored" checkable rather than
			// asserted.
			await vscode.commands.executeCommand('vscode.openWith', FIXTURE, 'default');
			const editor = await waitUntil('een teksteditor op het notebookbestand',
				() => vscode.window.activeTextEditor?.document.uri.fsPath === FIXTURE.fsPath
					? vscode.window.activeTextEditor
					: undefined, 20000);
			assert.ok(editor.document.getText().includes('```regelspraak'));
			assert.strictEqual(editor.document.languageId, 'markdown');
		});
	});

	// -----------------------------------------------------------------------
	// 2. `notebookDocumentSync` through vscode-languageclient 9.0.1
	// -----------------------------------------------------------------------

	suite('2. notebookDocumentSync ([N-3])', () => {

		let client: LanguageClient | undefined;
		let notebook: vscode.NotebookDocument;

		interface StubReport {
			notebooks: { uri: string; notebookType: string; cells: { uri: string; kind: number; languageId: string }[] }[];
			opened: { uri: string; languageId: string; lines: number }[];
			changes: { uri: string; structure: boolean; text: string[] }[];
			hovers: { uri: string; line: number; character: number }[];
		}

		suiteSetup(async function () {
			this.timeout(60000);
			// A second client, pointed at the observer described in
			// `notebookStub.ts`. Since §4.4 it stands *beside* the extension's
			// own, which now claims the cell scheme too ([N-5]) — so a hover on
			// a code cell is answered twice and the assertions below look for
			// the stub's answer among them rather than taking the first. What
			// the extension's client cannot do is answer for a **markdown**
			// cell, which is the half the selector test below turns on.
			const stub = path.resolve(__dirname, 'notebookStub.js');
			client = new LanguageClient(
				'regelspraakNotebookSpike',
				'RegelSpraak notebook spike',
				{ run: { module: stub, transport: TransportKind.stdio }, debug: { module: stub, transport: TransportKind.stdio } },
				{
					documentSelector: [
						{ scheme: 'vscode-notebook-cell', language: 'regelspraak' },
						{ scheme: 'vscode-notebook-cell', language: 'testspraak' }
					],
					notebookDocumentOptions: {}
				});
			await client.start();
			notebook = await openAsNotebook();
			// The notification is sent on open and the reply is a round trip, so
			// nothing here is instantaneous.
			await waitUntil('de stub die het notebook zag',
				async () => (await client!.sendRequest<StubReport>('spike/report')).notebooks.length > 0 || undefined,
				20000);
		});

		suiteTeardown(async () => {
			await closeEverything();
			await client?.stop();
			client = undefined;
		});

		const report = () => client!.sendRequest<StubReport>('spike/report');

		test('het notebook komt aan, met zijn type', async () => {
			const seen = (await report()).notebooks;
			assert.strictEqual(seen.length, 1);
			assert.strictEqual(seen[0].notebookType, NOTEBOOK_TYPE);
			assert.ok(seen[0].uri.endsWith('artikel-8-boete.rgs.md'), seen[0].uri);
		});

		test('de codecellen komen aan, met hun taal', async () => {
			const seen = (await report()).notebooks[0].cells;
			const code = seen.filter(cell => cell.languageId === 'regelspraak' || cell.languageId === 'testspraak');
			assert.deepStrictEqual(code.map(cell => cell.languageId),
				['regelspraak', 'regelspraak', 'testspraak']);
			assert.ok(code.every(cell => cell.uri.startsWith('vscode-notebook-cell:')), JSON.stringify(code));
		});

		test('en de markdowncellen ook — waar de server ze in zijn selector zet', async () => {
			// [N-6] needs the prose, so the server's selector names `markdown`
			// beside the two code languages. Whether those cells arrive is the
			// half of the question this answers; that the *client's* own
			// `documentSelector` does not mention markdown is the other half,
			// and it does not have to.
			const seen = (await report()).notebooks[0].cells;
			assert.ok(seen.some(cell => cell.languageId === 'markdown'),
				`geen markdowncel geleverd: ${JSON.stringify(seen.map(c => c.languageId))}`);
		});

		test('cellen komen mee in de notebookmelding, niet als losse didOpen', async () => {
			// Which of the two carries a cell decides how §4.2 receives one: the
			// cells ride inside `notebookDocument/didOpen` as `cellTextDocuments`,
			// and there is **no** `textDocument/didOpen` per cell beside it. So a
			// server that only listens to the text-document handlers hears
			// nothing at all about a notebook, however wide its documentSelector.
			const seen = await report();
			assert.strictEqual(seen.opened.length, 0,
				`losse didOpen gezien: ${JSON.stringify(seen.opened)}`);
			assert.ok(seen.notebooks[0].cells.length >= 4);
		});

		test('de synchronisatie volgt de server, de providers volgen de client', async () => {
			// Two selectors, two jobs, and conflating them is the mistake to
			// avoid. The **server's** `notebookSelector` decides which cells are
			// synchronised — markdown is in it, so the prose arrives ([N-6]).
			// The **client's** `documentSelector` decides which documents the
			// language features are registered for — markdown is *not* in it
			// here, so a hover on a prose cell never reaches us.
			const notebook = vscode.workspace.notebookDocuments
				.find(document => document.uri.fsPath === FIXTURE.fsPath)!;
			const prose = notebook.getCells()
				.find(cell => cell.kind === vscode.NotebookCellKind.Markup)!;
			const before = (await report()).hovers.length;
			await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider', prose.document.uri, new vscode.Position(0, 2));
			assert.strictEqual((await report()).hovers.length, before,
				'een hover op een prozacel hoort ons niet te bereiken');
		});

		test('een hover in een cel komt aan met celcoördinaten', async () => {
			const cell = notebook.getCells().find(c => c.document.languageId === 'regelspraak')!;
			// `Regel bepaal boete` is line 2 of the first code cell, and the
			// notebook's own line 22 or so. What arrives has to be the cell's.
			const line = cell.document.getText().split('\n')
				.findIndex(text => text.startsWith('Regel bepaal boete'));
			assert.ok(line > 0, 'de fixture hoort deze regel niet op regel 0 te hebben');
			const character = 'Regel '.length;

			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider', cell.document.uri, new vscode.Position(line, character));

			assert.ok(hovers.length > 0, 'geen hover; antwoordde de stub wel?');
			// The real server answers this position as well, so what is looked
			// for is the stub's own marker among the answers and not whichever
			// of the two the editor happened to put first.
			const answered = hovers
				.flatMap(one => one.contents)
				.map(one => typeof one === 'string' ? one : (one as vscode.MarkdownString).value)
				.join('\n');
			assert.ok(answered.includes(`${line}:${character}|bepaal`),
				`de stub kreeg iets anders dan de celpositie: ${answered}`);

			const asked = (await report()).hovers.at(-1)!;
			assert.strictEqual(asked.line, line);
			assert.ok(asked.uri.startsWith('vscode-notebook-cell:'), asked.uri);
		});

		test('een bewerking in een cel komt aan als notebookwijziging', async () => {
			const cell = notebook.getCells().find(c => c.document.languageId === 'regelspraak')!;
			const before = (await report()).changes.length;
			const edit = new vscode.WorkspaceEdit();
			edit.insert(cell.document.uri, new vscode.Position(0, 0), '// spike\n');
			assert.ok(await vscode.workspace.applyEdit(edit));
			const after = await waitUntil('een didChange over de cel',
				async () => {
					const changes = (await report()).changes;
					return changes.length > before ? changes : undefined;
				}, 20000);
			assert.ok(after.at(-1)!.text.some(uri => uri === cell.document.uri.toString()),
				JSON.stringify(after.at(-1)));
			// Left as we found it: the fixture is round-tripped by another test.
			const undo = new vscode.WorkspaceEdit();
			undo.delete(cell.document.uri, new vscode.Range(0, 0, 1, 0));
			await vscode.workspace.applyEdit(undo);
		});
	});

	// -----------------------------------------------------------------------
	// 3. A figure in a Markdown cell, and where a pasted one lands
	// -----------------------------------------------------------------------

	suite('3. figuren ([N-1a])', () => {

		teardown(closeEverything);

		test('de plakbestemming staat als configurationDefault en geldt voor .rgs.md', () => {
			markdownExtension();
			const destination = vscode.workspace
				.getConfiguration('markdown', FIXTURE)
				.get<Record<string, string>>('copyFiles.destination') ?? {};
			assert.deepStrictEqual(destination['**/*.rgs.md'],
				'${documentDirName}/media/${documentBaseName/\\.rgs$//}/${fileName}');
		});

		test('een markdowncel is voor de plakker een document van het notebook', async () => {
			markdownExtension();
			// There is no API to drive a paste, so what is asserted is the lookup
			// the paste provider performs: `getParentDocumentUri` walks
			// `workspace.notebookDocuments` for the cell and answers with the
			// notebook's own URI, and `getDocumentDir` takes the directory of
			// *that*. So both halves of the question follow — a relative
			// `media/figuur.png` resolves against the `.rgs.md`, and the
			// destination template's `${documentDirName}` is the notebook's
			// folder rather than anything cell-shaped.
			const notebook = await openAsNotebook();
			const prose = notebook.getCells()
				.find(cell => cell.kind === vscode.NotebookCellKind.Markup)!;
			const parent = vscode.workspace.notebookDocuments
				.find(document => document.getCells()
					.some(cell => cell.document.uri.toString() === prose.document.uri.toString()));
			assert.strictEqual(parent?.uri.fsPath, FIXTURE.fsPath);
			assert.strictEqual(path.dirname(parent!.uri.fsPath), path.dirname(FIXTURE.fsPath));
		});
	});

	// -----------------------------------------------------------------------
	// 4. A `Location` in file coordinates, landing in the right cell
	// -----------------------------------------------------------------------

	suite('4. van bestandsregel naar cel ([N-3])', () => {

		teardown(closeEverything);

		test('de hekjeskaart wijst elke coderegel aan', async () => {
			const text = (new TextDecoder().decode(await vscode.workspace.fs.readFile(FIXTURE)))
				.replace(/\r\n/gu, '\n');
			const cells = readCells(text);
			const lines = text.split('\n');
			const fileLine = lines.findIndex(line => line.startsWith('Regel begrens boete'));
			assert.ok(fileLine > 0);

			const found = cellOfLine(cells, fileLine);
			assert.ok(found, 'geen cel voor deze regel');
			assert.strictEqual(cells[found.index].language, 'regelspraak');
			assert.strictEqual(cells[found.index].value.split('\n')[found.line], 'Regel begrens boete');
			assert.strictEqual(lineOfCell(cells, found.index, found.line), fileLine);
		});

		test('een regel die in geen cel valt levert niets op, en niet de dichtstbijzijnde', async () => {
			const text = (new TextDecoder().decode(await vscode.workspace.fs.readFile(FIXTURE)))
				.replace(/\r\n/gu, '\n');
			const cells = readCells(text);
			const fence = text.split('\n').findIndex(line => line === '```regelspraak');
			assert.strictEqual(cellOfLine(cells, fence), undefined);
		});

		test('en het notebook opent op die cel', async () => {
			const text = (new TextDecoder().decode(await vscode.workspace.fs.readFile(FIXTURE)))
				.replace(/\r\n/gu, '\n');
			const cells = readCells(text);
			const fileLine = text.split('\n').findIndex(line => line.startsWith('Regel begrens boete'));
			const target = cellOfLine(cells, fileLine)!;

			const notebook = await vscode.workspace.openNotebookDocument(FIXTURE);
			const editor = await vscode.window.showNotebookDocument(notebook, {
				selections: [new vscode.NotebookRange(target.index, target.index + 1)]
			});
			assert.strictEqual(editor.selection.start, target.index);
			assert.ok(notebook.cellAt(target.index).document.getText()
				.split('\n')[target.line].startsWith('Regel begrens boete'));
		});
	});

	// -----------------------------------------------------------------------
	// 5. The notebook outline
	// -----------------------------------------------------------------------

	suite('5. de overzichtsweergave', () => {

		teardown(closeEverything);

		test('een symbolenprovider voor cellen wordt bereikt', async () => {
			const notebook = await openAsNotebook();
			const cell = notebook.getCells().find(c => c.document.languageId === 'regelspraak')!;
			const registration = vscode.languages.registerDocumentSymbolProvider(
				{ scheme: 'vscode-notebook-cell', language: 'regelspraak' },
				{
					provideDocumentSymbols: () => [new vscode.DocumentSymbol(
						'bepaal boete', '', vscode.SymbolKind.Function,
						new vscode.Range(0, 0, 0, 1), new vscode.Range(0, 0, 0, 1))]
				});
			try {
				const symbols = await waitUntil('symbolen voor de cel', async () => {
					const found = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
						'vscode.executeDocumentSymbolProvider', cell.document.uri);
					return found && found.length > 0 ? found : undefined;
				}, 20000);
				assert.strictEqual(symbols[0].name, 'bepaal boete');
			} finally {
				registration.dispose();
			}
		});

		test('showCodeCells is de ene knop, en hij staat uit', () => {
			// §4.1 #5 names `notebook.outline.showCodeCells`, and it is right:
			// the workbench's filter hides **every** entry belonging to a code
			// cell while that is off — the cell's own row and the symbols under
			// it alike — and `showCodeCellSymbols`, which gates only the second,
			// is already on. So one switch stands between a reader and our
			// names, and it is off by default: an untouched VS Code shows a
			// reglement's headings and nothing else, which is what §4.9 has to
			// say out loud.
			const setting = vscode.workspace.getConfiguration('notebook.outline');
			const defaults = ['showCodeCells', 'showCodeCellSymbols', 'showMarkdownHeadersOnly']
				.map(name => [name, setting.inspect<boolean>(name)?.defaultValue] as const);
			assert.deepStrictEqual(Object.fromEntries(defaults), {
				showCodeCells: false,
				showCodeCellSymbols: true,
				// On, and it is what makes the default outline read as a table of
				// contents: a prose cell contributes its `#` headings and not its
				// first line.
				showMarkdownHeadersOnly: true
			});
		});
	});

	// -----------------------------------------------------------------------
	// 7. The Markdown preview over a notebook's file
	// -----------------------------------------------------------------------

	suite('7. het reglement in één stuk ([N-1a])', () => {

		teardown(closeEverything);

		test('de markdownvoorbeeldweergave opent op een geopend notebook', async function () {
			markdownExtension();
			this.timeout(40000);
			await openAsNotebook();
			await vscode.commands.executeCommand('markdown.showPreview', FIXTURE);
			// The preview is a webview, so what can be asserted is that it opened
			// and that it is about this file. What it *draws* — our fences
			// highlighted by our own grammar, because `regelspraak` is a
			// contributed language — is read by eye, and is recorded as such.
			const opened = await waitUntil('een geopend voorbeeldtabblad', () =>
				vscode.window.tabGroups.all
					.flatMap(group => group.tabs)
					.find(tab => tab.label.includes('artikel-8-boete')
						&& tab.input instanceof vscode.TabInputWebview), 20000);
			assert.ok(opened);
		});
	});
});
