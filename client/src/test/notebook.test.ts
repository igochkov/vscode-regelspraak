import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { CODE_LANGUAGES, MODEL_LANGUAGE, TEST_LANGUAGE } from '../languages';
import { NEW_NOTEBOOK_COMMAND, PREVIEW_REGLEMENT_COMMAND } from '../notebook/commands';
import { NOTEBOOK_TYPE, readCells, writeCells } from '../notebook/serializer';
import { activate, getDocUri, waitUntil } from './helper';

/**
 * §4.4's gate — the client's half of the notebook, end to end.
 *
 * Four things, and the fourth reaches furthest: [N-5] gives `.test.rgs` files
 * their own language id, which is a change with ripples through the
 * `documentSelector`, the menus, the keybindings, the breakpoints and every
 * lens drawn in a testset. What proves it is not that the id changed but that
 * *nothing which was working stopped* — and each of those ripples fails
 * silently, as a command that cannot be reached or a lens that is no longer
 * drawn.
 *
 * The §4.1 spike's suite stays beside this one and covers the format itself,
 * the editor choice and the synchronisation against a stub. This one is about
 * the real client and the real server.
 */

/** Self-contained, and outside every workspace folder — a scope of one ([N-10]). */
const NOTEBOOK = vscode.Uri.file(path.resolve(
	__dirname, '../../src/test/fixtures/notebook/artikel-4-contributie.rgs.md'));

/** A testset in `samples/`, which is where the id change is felt. */
const TESTSET = getDocUri('tests/lidmaatschap.test.rgs');

/** Any `.rgs` in the workspace, to have a server and a finished scan. */
const MODEL = getDocUri('gegevens/lid.rgs');

const EXTENSION = 'igochkov.vscode-regelspraak';

async function closeEverything(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

function codeCells(notebook: vscode.NotebookDocument): vscode.NotebookCell[] {
	return notebook.getCells().filter(cell => cell.kind === vscode.NotebookCellKind.Code);
}

function hoverText(hovers: readonly vscode.Hover[]): string {
	return hovers
		.flatMap(one => one.contents)
		.map(one => typeof one === 'string' ? one : (one as vscode.MarkdownString).value)
		.join('\n');
}

function contributes<T>(section: string): T {
	return vscode.extensions.getExtension(EXTENSION)!.packageJSON.contributes[section] as T;
}

suite('Notebook (Notebook Plan §4.4)', () => {

	suiteSetup(async function () {
		this.timeout(120000);
		// The server, the scan and the extension. A reference diagnostic is
		// withheld until the workspace scan has finished (C9), and this is what
		// the rest of the suite waits behind.
		await activate(MODEL);
	});

	suiteTeardown(closeEverything);

	// -----------------------------------------------------------------------
	// The document: its cells, and the bytes it is written back as.
	// -----------------------------------------------------------------------

	suite('het notebook als document', () => {

		test('opent als cellen, in de twee talen van [N-5]', async () => {
			const notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
			assert.strictEqual(notebook.notebookType, NOTEBOOK_TYPE);
			// Six cells and not seven: everything between two fences is **one**
			// Markdown cell ([N-1]), so the fixture's title, its first heading
			// and the paragraph under it are one prose cell and not three. A
			// heading does not open a cell; a fence does.
			assert.deepStrictEqual(
				notebook.getCells().map(cell => cell.document.languageId),
				['markdown', MODEL_LANGUAGE, 'markdown', MODEL_LANGUAGE,
					'markdown', TEST_LANGUAGE]);
			assert.strictEqual(codeCells(notebook).length, 3);
		});

		/**
		 * Opslaan en teruglezen, en dan pas byte voor byte.
		 *
		 * **On a copy in the temp folder, and not on the fixture**, for two
		 * reasons that are both about what else is in the room. A save writes,
		 * and a suite that writes into its own repository leaves the working
		 * tree dirty for whatever runs next. And an open notebook is a document
		 * of the model: a second copy of the fixture's declarations in one scope
		 * would give every reference in it two answers, which is the collision
		 * §4.0's own fixture exists to pin. So the copy declares its own names
		 * and shares nothing with the fixture but the shape.
		 *
		 * It is written with LF whatever the checkout did, because the canonical
		 * form writes LF and the comparison is of bytes — the hazard [R-16]
		 * names, one file kind over.
		 */
		test('opslaan en teruglezen levert dezelfde bytes', async function () {
			this.timeout(60000);
			const folder = vscode.Uri.file(
				fs.mkdtempSync(path.join(os.tmpdir(), 'rgs-notebook-')));
			const copy = vscode.Uri.joinPath(folder, 'rondrit.rgs.md');
			const canonical = writeCells(readCells([
				'# Rondrit',
				'',
				'Proza, en daaronder de twee talen.',
				'',
				'```regelspraak',
				'Regelgroep rondrit',
				'',
				'Regel bepaal de rondrit',
				'\tgeldig altijd',
				'\t\tDe rondrit van een Rondrijder moet gesteld worden op 1.',
				'```',
				'',
				'```testspraak',
				'Testset Rondrit',
				'Rekendatum 01-01-2027',
				'```'
			].join('\n')));
			await vscode.workspace.fs.writeFile(copy, new TextEncoder().encode(canonical));

			const notebook = await vscode.workspace.openNotebookDocument(copy);
			await vscode.window.showNotebookDocument(notebook);
			const cell = codeCells(notebook)[0];

			// Dirtied and then put back, so that `serializeNotebook` genuinely
			// runs: VS Code writes nothing for a document with no changes, and a
			// save that wrote nothing would compare the file with itself.
			const dirty = new vscode.WorkspaceEdit();
			dirty.insert(cell.document.uri, new vscode.Position(0, 0), '// tijdelijk\n');
			assert.ok(await vscode.workspace.applyEdit(dirty));
			assert.ok(await notebook.save());
			assert.strictEqual(
				new TextDecoder().decode(await vscode.workspace.fs.readFile(copy)),
				canonical.replace('```regelspraak\n', '```regelspraak\n// tijdelijk\n'),
				'de bewerking hoort ongewijzigd binnen haar hekjes terug te komen');

			const undo = new vscode.WorkspaceEdit();
			undo.delete(cell.document.uri, new vscode.Range(0, 0, 1, 0));
			assert.ok(await vscode.workspace.applyEdit(undo));
			assert.ok(await notebook.save());

			assert.strictEqual(
				new TextDecoder().decode(await vscode.workspace.fs.readFile(copy)),
				canonical);

			await closeEverything();
			await vscode.workspace.fs.delete(folder, { recursive: true });
		});

		/**
		 * En de regel waar dat op rust, zonder een editor eromheen.
		 *
		 * The test above found it and only a Windows host can: a cell's text
		 * comes from a `TextDocument` the workbench owns, whose end-of-line is
		 * the platform's — so the saved file carried a CR on every line inside
		 * a fence and none on the blank lines between the cells. This is the
		 * same fact asserted where CI can see it, which is Linux.
		 */
		test('de canonieke vorm schrijft LF, wat de editor ook aanlevert', () => {
			assert.strictEqual(
				writeCells([
					{ kind: 'markdown', language: 'markdown', value: '# Kop\r\n\r\nProza.' },
					{ kind: 'code', language: MODEL_LANGUAGE, value: 'Regel r\r\n\tgeldig altijd' }
				]),
				'# Kop\n\nProza.\n\n```regelspraak\nRegel r\n\tgeldig altijd\n```\n');
		});
	});

	// -----------------------------------------------------------------------
	// The cells against the running server — which is what the widened
	// `documentSelector` buys, and the one thing a stub cannot show.
	// -----------------------------------------------------------------------

	suite('de cellen tegen een draaiende server', () => {

		let notebook: vscode.NotebookDocument;

		suiteSetup(async function () {
			this.timeout(120000);
			notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
			await vscode.window.showNotebookDocument(notebook);
		});

		suiteTeardown(closeEverything);

		test('een hover in een codecel wordt beantwoord', async function () {
			this.timeout(120000);
			const cell = codeCells(notebook)[0];
			const at = cell.document.getText().indexOf('Proeflezer moet gesteld');
			assert.ok(at >= 0, 'de fixture hoort deze zin te bevatten');
			const position = cell.document.positionAt(at);

			const hovers = await waitUntil('een hover in de cel', async () => {
				const found = await vscode.commands.executeCommand<vscode.Hover[] | undefined>(
					'vscode.executeHoverProvider', cell.document.uri, position);
				const filled = found?.filter(one => hoverText([one]).trim().length > 0) ?? [];
				return filled.length > 0 ? filled : undefined;
			});

			const text = hoverText(hovers);
			assert.ok(text.includes('Proeflezer'), `hover noemt het symbool niet: ${text}`);
		});

		/**
		 * En een diagnose komt terecht in de cel waar zij over gaat.
		 *
		 * The whole of §4.2's routing in one assertion: the code cells are one
		 * model document in one line space, and what is said about it is said
		 * back per cell. A report filed under the notebook's own file URI, or
		 * under the first cell, would be a squiggle in the wrong place.
		 */
		test('een diagnose staat in de cel waar zij over gaat', async function () {
			this.timeout(120000);
			const [first, second] = codeCells(notebook);
			const found = await waitUntil('RS101 in de tweede codecel', () => {
				const codes = vscode.languages.getDiagnostics(second.document.uri)
					.map(one => String(one.code));
				return codes.includes('RS101') ? codes : undefined;
			});
			assert.ok(found.includes('RS101'), found.join(', '));

			assert.deepStrictEqual(
				vscode.languages.getDiagnostics(first.document.uri).map(one => String(one.code)),
				[], 'de eerste codecel is in orde en hoort niets te melden');
			assert.deepStrictEqual(
				vscode.languages.getDiagnostics(notebook.uri).map(one => String(one.code)),
				[], 'een open notebook meldt per cel, niet op zijn bestand ([N-3])');
		});

		test('de omtrek van een cel is die van de cel, niet van het notebook', async function () {
			this.timeout(120000);
			const cell = codeCells(notebook)[1];
			const symbols = await waitUntil('de omtrek van de tweede codecel', async () => {
				const found = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
					'vscode.executeDocumentSymbolProvider', cell.document.uri);
				return found && found.length > 0 ? found : undefined;
			});
			assert.deepStrictEqual(symbols.map(one => one.name),
				['bepaal de onbekende contributie']);
		});
	});

	// -----------------------------------------------------------------------
	// [N-5]'s other half: the files.
	// -----------------------------------------------------------------------

	suite('.test.rgs is testspraak ([N-5])', () => {

		suiteTeardown(closeEverything);

		test('een testset krijgt de taal-id testspraak', async () => {
			const document = await vscode.workspace.openTextDocument(TESTSET);
			assert.strictEqual(document.languageId, TEST_LANGUAGE);
			// The other half of the same association rule: a model file is not
			// dragged along by the longer suffix.
			assert.strictEqual(
				(await vscode.workspace.openTextDocument(MODEL)).languageId, MODEL_LANGUAGE);
		});

		test('en houdt zijn lenzen, dus de providers zijn er nog voor', async function () {
			this.timeout(120000);
			const lenses = await waitUntil('de uitvoerlenzen van de testset', async () => {
				const found = await vscode.commands.executeCommand<vscode.CodeLens[] | undefined>(
					'vscode.executeCodeLensProvider', TESTSET);
				return found && found.length > 0 ? found : undefined;
			});
			assert.ok(lenses.some(one => one.command?.command === 'regelspraak.runTestgeval'),
				lenses.map(one => one.command?.title).join(' | '));
		});

		test('de fragmenten zijn gesplitst, elk voor zijn eigen taal', () => {
			const snippets = contributes<{ language: string; path: string }[]>('snippets');
			assert.deepStrictEqual(snippets.map(one => one.language), [...CODE_LANGUAGES]);
		});

		/**
		 * En een breekpunt mag nog in een testset staan.
		 *
		 * A mark on a `Verwacht` line means *stop where this value comes from*
		 * (§X5), so a testset is where breakpoints are mostly set. It followed
		 * from `.test.rgs` being `regelspraak` and has to be contributed now, and
		 * nothing says so out loud — VS Code simply refuses to place one.
		 */
		test('breekpunten zijn bijgedragen voor beide talen', () => {
			const breakpoints = contributes<{ language: string }[]>('breakpoints');
			assert.deepStrictEqual(breakpoints.map(one => one.language), [...CODE_LANGUAGES]);
		});

		/**
		 * En elk `when` dat over een document gaat noemt de taal die het bedoelt.
		 *
		 * The manifest half of `isOurs`, asserted rather than read because the
		 * two halves fail differently and both silently: a widened gate under a
		 * narrow `when` is a command nobody can reach, and a widened `when` over
		 * a narrow gate is a command that shrugs.
		 */
		test('de menu-ingangen noemen de taal waar ze over gaan', () => {
			const menus = contributes<Record<string, { command: string; when?: string }[]>>('menus');
			const palette = new Map(menus.commandPalette.map(one => [one.command, one.when ?? '']));
			for (const command of ['regelspraak.formatDocument', 'regelspraak.legUit']) {
				assert.match(palette.get(command) ?? '', /regelspraak/);
				assert.match(palette.get(command) ?? '', /testspraak/);
			}
			// A testgeval lives in a testset, so these two narrow rather than widen.
			for (const command of ['regelspraak.showUitkomst', 'regelspraak.vergelijkUitvoering']) {
				assert.strictEqual(palette.get(command), 'editorLangId == testspraak');
			}
			// And the model view describes declarations, which a test document
			// has none of ([T-26]).
			assert.strictEqual(palette.get('regelspraak.showAst'), 'editorLangId == regelspraak');
		});
	});

	// -----------------------------------------------------------------------
	// The two commands.
	// -----------------------------------------------------------------------

	suite('de twee commando’s', () => {

		teardown(closeEverything);

		test('Nieuw notebook opent een notebook dat zegt wat er draait', async function () {
			this.timeout(60000);
			await vscode.commands.executeCommand(NEW_NOTEBOOK_COMMAND);
			const editor = await waitUntil('een nieuw notebook',
				() => vscode.window.activeNotebookEditor, 20000);
			assert.strictEqual(editor.notebook.notebookType, NOTEBOOK_TYPE);
			// A heading, a rule cell, and the worked example that is the only
			// thing with a run button ([N-7]) — the shape saying what runs
			// before anybody has to be told.
			assert.deepStrictEqual(
				editor.notebook.getCells().map(cell => cell.document.languageId),
				['markdown', MODEL_LANGUAGE, 'markdown', TEST_LANGUAGE]);
			assert.ok(editor.notebook.isUntitled,
				'een nieuw notebook hoort nog nergens op schijf te staan');
		});

		test('Reglement bekijken opent het voorbeeld van het notebookbestand', async function () {
			this.timeout(60000);
			const notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
			await vscode.window.showNotebookDocument(notebook);
			await vscode.commands.executeCommand(PREVIEW_REGLEMENT_COMMAND);
			const tab = await waitUntil('een markdownvoorbeeld', () =>
				vscode.window.tabGroups.all.flatMap(group => group.tabs).find(one =>
					one.input instanceof vscode.TabInputWebview
					&& one.input.viewType.includes('markdown')), 20000);
			assert.ok(tab.label.includes('artikel-4-contributie'), tab.label);
		});
	});
});
