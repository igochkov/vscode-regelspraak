// Het voorbeeldreglement in juridische modus, tegen een draaiende taalserver.
//
// `samples/workspace/sample-notebook/` is [N-1b]'s layout as the only thing
// that can state it: executable. A folder per level the document has, a
// notebook per artikel, the worked example under the bepaling it checks, and
// the declarations beside them in technical mode — one model, two ways of
// writing it (§0.1). So the same three properties `samples.test.ts` holds over
// `samples/workspace/single-folder/` are held here, and they are what would
// break first if the layout stopped working.
//
//   - It reports nothing, in every cell of every notebook and in every `.rgs`.
//     That also covers the cross-root half of §4.0's collision: `Regel Jeugdlid`
//     is declared in this root **and** in `samples/workspace/single-folder/`,
//     and in one index that was RS607 on two files whose authors each wrote
//     something correct.
//   - Every testgeval passes, through the Test Explorer, which is the same
//     request the cell's own run button makes ([N-7]).
//   - The formatter leaves every code cell alone, so a line can be copied out of
//     the example as it stands.
//
// **The last three run in the multi-root run only** (`npm run test:multiroot`),
// and not because they are awkward: a model's scope is a workspace folder
// ([N-10]), so the properties above are about this folder *being one*. In
// `npm test` the sample is outside every folder and shares the loose scope with
// whatever else is open, where a neighbour's deliberate error would refuse this
// run for a reason that has nothing to do with it. What is asserted in **both**
// runs is the layout itself, which is a fact about the documents and needs no
// scope — so a suite that quietly did nothing would still be noticed.

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { MODEL_LANGUAGE, TEST_LANGUAGE } from '../languages';
import { readCells } from '../notebook/serializer';
import { TestExplorer } from '../testExplorer';
import { EXTENSION_ID, activate, getDocUri, waitUntil } from './helper';

/** The sample lives at the repository root; this runs out of `client/out/test`. */
const SAMPLE = path.resolve(__dirname, '../../../samples/workspace/sample-notebook');
const CHAPTER = path.join(SAMPLE, 'h10-leeskringen');

const notebooks = (): vscode.Uri[] => fs.readdirSync(CHAPTER)
	.filter(name => name.endsWith('.rgs.md')).sort()
	.map(name => vscode.Uri.file(path.join(CHAPTER, name)));

const declarations = (): vscode.Uri[] => fs.readdirSync(path.join(SAMPLE, 'gegevens'))
	.filter(name => name.endsWith('.rgs')).sort()
	.map(name => vscode.Uri.file(path.join(SAMPLE, 'gegevens', name)));

/** True in the multi-root run: the `.code-workspace` declares two folders. */
const twoFolders = (): boolean => (vscode.workspace.workspaceFolders?.length ?? 0) > 1;

function codeCells(notebook: vscode.NotebookDocument): vscode.NotebookCell[] {
	return notebook.getCells().filter(cell => cell.kind === vscode.NotebookCellKind.Code);
}

interface Api { testExplorer: TestExplorer }

suite('Reglement als notebooks (samples/workspace/sample-notebook)', () => {

	suiteSetup(async function () {
		this.timeout(120000);
		// The first folder in both runs, so activation is the same gesture either
		// way — and a reference diagnostic is withheld until the scan has finished
		// (C9), which is what the cases below wait behind.
		await activate(getDocUri('gegevens/lid.rgs'));
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	/**
	 * De vorm die [N-1b] voorschrijft, als eigenschap van de documenten zelf.
	 *
	 * One notebook per artikel, each written in the two languages, each carrying
	 * its own testset: the first `testspraak` cell has the header and the ones
	 * after it carry the worked examples ([N-2]).
	 *
	 * **Read through the serializer rather than by opening the notebooks**, which
	 * is what makes this the half that runs in both runs. It needs no server, and
	 * opening a notebook document is not free of consequence for the rest of the
	 * session: a notebook stays open long after every editor is closed, and the
	 * spike suite counts the notebooks a stub client is told about.
	 */
	test('is één notebook per artikel, elk met zijn eigen rekenvoorbeelden', () => {
		const found = notebooks();
		assert.ok(found.length >= 3, `verwachtte meer artikelen: ${found.length}`);
		for (const uri of found) {
			assert.match(path.basename(uri.fsPath), /^art-\d+-[a-z0-9-]+\.rgs\.md$/,
				`${uri.fsPath} heet niet naar zijn artikel`);
			const cells = readCells(fs.readFileSync(uri.fsPath, 'utf8'));
			assert.ok(cells.some(cell => cell.language === MODEL_LANGUAGE),
				`${uri.fsPath} heeft geen regelspraakcel`);
			const examples = cells.filter(cell => cell.language === TEST_LANGUAGE);
			assert.ok(examples.length >= 2,
				`${uri.fsPath} heeft geen kop plus rekenvoorbeeld`);
			assert.ok(examples[0].value.startsWith('Testset '),
				`de eerste testspraakcel van ${uri.fsPath} draagt de kop van de testset niet`);
			assert.ok(examples.slice(1).every(
				cell => cell.value.trimStart().startsWith('Testgeval ')),
			`${uri.fsPath} heeft een testspraakcel die geen rekenvoorbeeld is`);
			// Prose between the code, which is what makes it a reglement rather
			// than a file of rules with fences round it.
			assert.ok(cells.some(cell => cell.language === 'markdown'),
				`${uri.fsPath} heeft geen proza`);
		}
	});

	test('meldt geen enkele diagnostiek, in geen enkele cel', async function () {
		this.timeout(180000);
		if (!twoFolders()) {
			return;
		}
		const found: string[] = [];
		const report = (uri: vscode.Uri, where: string): void => {
			found.push(...vscode.languages.getDiagnostics(uri).map(one =>
				`${where} r${one.range.start.line + 1} ${String(one.code)}: ${one.message}`));
		};

		for (const uri of declarations()) {
			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document, { preview: true });
			// The outline is the cheapest proof the server has this file in its
			// model: it builds the model and publishes what it thinks of it in one
			// pass, so there is no state in between.
			await waitUntil(`een geïndexeerd ${uri.fsPath}`, async () => {
				const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
					'vscode.executeDocumentSymbolProvider', uri);
				return symbols && symbols.length > 0 ? symbols : undefined;
			});
			report(uri, path.basename(uri.fsPath));
		}

		for (const uri of notebooks()) {
			const notebook = await vscode.workspace.openNotebookDocument(uri);
			await vscode.window.showNotebookDocument(notebook);
			const cells = codeCells(notebook);
			await waitUntil(`een geïndexeerd ${uri.fsPath}`, async () => {
				const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
					'vscode.executeDocumentSymbolProvider', cells[0].document.uri);
				return symbols && symbols.length > 0 ? symbols : undefined;
			});
			for (const cell of cells) {
				report(cell.document.uri, `${path.basename(uri.fsPath)} cel ${cell.index + 1}`);
			}
			// An open notebook reports per cell and never on its own file ([N-3]).
			report(uri, path.basename(uri.fsPath));
		}
		assert.deepStrictEqual(found, []);
	});

	test('elk rekenvoorbeeld slaagt', async function () {
		this.timeout(180000);
		if (!twoFolders()) {
			return;
		}
		const api = await vscode.extensions.getExtension(EXTENSION_ID)!.activate() as Api;
		const mine = (uri: string): boolean => uri.includes('sample-notebook');
		// Discovery settles on the server's own schedule, and every notebook has to
		// be in it: a gate that silently covered one artikel would pass forever.
		const cases = await waitUntil('de rekenvoorbeelden van het reglement', async () => {
			await api.testExplorer.refresh();
			const own = api.testExplorer.allCases().filter(one => mine(one.uri));
			const files = new Set(own.map(one => one.uri.replace(/#.*$/, '')));
			return files.size >= notebooks().length ? own : undefined;
		});
		assert.ok(cases.length >= 6, `verwachtte meer rekenvoorbeelden: ${cases.length}`);

		const failed: string[] = [];
		for (const one of cases) {
			const run = await api.testExplorer.runForDetail(one.uri, one.case);
			const where = `${one.uri.split('/').pop()} · ${one.case}`;
			if (!run) {
				failed.push(`${where}: geen antwoord`);
				continue;
			}
			if (run.outcome !== 'uitgevoerd') {
				failed.push(`${where}: ${run.outcome} — ${run.reason ?? ''}`
					+ ` ${(run.details ?? []).join('; ')}`);
				continue;
			}
			// A fault is not a failure — the run carried on ([E-29]) — but nothing
			// in the example is supposed to produce one.
			for (const fault of run.faults) {
				failed.push(`${where}: fout in ${fault.rule} — ${fault.message}`);
			}
			for (const bad of run.assertions.filter(a => !a.passed)) {
				failed.push(`${where}: ${bad.label} — verwacht ${bad.expected ?? 'leeg'},`
					+ ` werkelijk ${bad.actual ?? 'leeg'}`);
			}
		}
		assert.deepStrictEqual(failed, []);
	});

	test('de formatter laat elke cel ongemoeid', async function () {
		this.timeout(180000);
		if (!twoFolders()) {
			return;
		}
		const changed: string[] = [];
		for (const uri of [...declarations(), ...notebooks()]) {
			const targets: vscode.Uri[] = [];
			if (uri.fsPath.endsWith('.rgs.md')) {
				const notebook = await vscode.workspace.openNotebookDocument(uri);
				await vscode.window.showNotebookDocument(notebook);
				targets.push(...codeCells(notebook).map(cell => cell.document.uri));
			} else {
				const document = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(document, { preview: true });
				targets.push(uri);
			}
			for (const target of targets) {
				const edits = await vscode.commands.executeCommand<vscode.TextEdit[] | undefined>(
					'vscode.executeFormatDocumentProvider', target,
					{ tabSize: 4, insertSpaces: false });
				if (edits && edits.length > 0) {
					changed.push(`${path.basename(uri.fsPath)} ${target.fragment}: `
						+ `${edits.length} bewerking(en), de eerste op regel `
						+ `${edits[0].range.start.line + 1}`);
				}
			}
		}
		assert.deepStrictEqual(changed, [],
			'het voorbeeld hoort te staan zoals de formatter het oplevert');
	});
});
