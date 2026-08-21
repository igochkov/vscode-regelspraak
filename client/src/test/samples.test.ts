// The example model itself, checked against a running language server.
//
// `samples/` is this repository's demonstration of the language and the only
// copy of it: the server repository keeps its conformance corpus instead. Two
// properties travelled with it, and they are asserted here rather than nowhere.
//
//   - It reports nothing. Every construct RegelSpraak has is written here, so a
//     diagnostic on any of it is either a real modelling error or a false
//     positive — and a false positive on a correct sentence is the one failure
//     mode the validation design puts above all others (risk IR-4).
//   - The formatter leaves it alone. The files are stored in the form the
//     formatter produces, so a reader can copy any line of them and a change to
//     the layout engine cannot silently restyle the examples underneath.
//
// What cannot be asserted here yet is that the `Verwacht` lines in the testsets
// hold. That needs a way to run a testgeval from the editor, which is the next
// release; until then the run is checked by hand.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, waitUntil } from './helper';

suite('Voorbeeldmodel', () => {
	let files: vscode.Uri[];

	suiteSetup(async () => {
		await activate(getDocUri('gegevens/lid.rgs'));
		files = (await vscode.workspace.findFiles('**/*.rgs'))
			.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
		assert.ok(files.length >= 5, `verwachtte meer voorbeeldbestanden: ${files.length}`);
	});

	/**
	 * The document, open and answered for.
	 *
	 * Diagnostics are published for the files an editor owns (the default
	 * `validation.scope`), so each one is opened before it is asked about —
	 * and the outline is the cheapest proof the server has this file in its
	 * model, as `activate` uses it for the first one.
	 */
	async function indexed(uri: vscode.Uri): Promise<vscode.TextDocument> {
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document, { preview: true });
		await waitUntil(`een geïndexeerd ${uri.fsPath}`, async () => {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider', uri);
			return symbols && symbols.length > 0 ? symbols : undefined;
		});
		return document;
	}

	test('elk voorbeeldbestand meldt geen enkele diagnostiek', async () => {
		const found: string[] = [];
		for (const uri of files) {
			// An empty list means "nothing to report" rather than "not answered
			// yet" because the outline has already answered: the server builds the
			// model and publishes the diagnostics in one analysis pass, so there is
			// no state in which it has an outline for a file and has not yet said
			// what it thinks of it.
			await indexed(uri);
			found.push(...vscode.languages.getDiagnostics(uri).map(one =>
				`${uri.fsPath.split(/[\\/]/).pop()} r${one.range.start.line + 1} ` +
				`${String(one.code)}: ${one.message}`));
		}
		assert.deepStrictEqual(found, []);
	});

	test('de formatter laat elk voorbeeldbestand ongemoeid', async () => {
		const changed: string[] = [];
		for (const uri of files) {
			await indexed(uri);
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[] | undefined>(
				'vscode.executeFormatDocumentProvider', uri, { tabSize: 4, insertSpaces: false });
			if (edits && edits.length > 0) {
				changed.push(`${uri.fsPath.split(/[\\/]/).pop()}: ${edits.length} bewerking(en), ` +
					`de eerste op regel ${edits[0].range.start.line + 1}`);
			}
		}
		assert.deepStrictEqual(changed, [],
			'de voorbeelden horen te staan zoals de formatter ze oplevert');
	});
});
