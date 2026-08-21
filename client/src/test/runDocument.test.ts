// X4 — the run outcome view, end to end against a real language server.
//
// The whole path in one pass: the cursor decides which testgeval, the server
// runs it and answers with what it computed, and the view renders that as text.
// Which is also why this is a text view for now — a webview cannot be driven
// from a test, and here the thing worth checking *is* the rendering.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, waitUntil } from './helper';

const RUN_SCHEME = 'regelspraak-uitkomst';

suite('Uitkomstweergave (X4)', () => {
	const testsUri = getDocUri('tests/lidmaatschap.test.rgs');
	let document: vscode.TextDocument;

	suiteSetup(async () => {
		await activate(testsUri);
		document = await vscode.workspace.openTextDocument(testsUri);
	});

	/** Puts the cursor on the first line of the named testgeval and runs X4. */
	async function outcomeFor(caseName: string): Promise<vscode.TextDocument> {
		const at = document.getText().indexOf(`Testgeval ${caseName}`);
		assert.ok(at >= 0, `${caseName} staat niet in de testset`);
		const editor = await vscode.window.showTextDocument(document);
		const position = document.positionAt(at);
		editor.selection = new vscode.Selection(position, position);

		await vscode.commands.executeCommand('regelspraak.showUitkomst');
		return waitUntil('een uitkomstweergave met inhoud', () => {
			const opened = vscode.workspace.textDocuments.find(one =>
				one.uri.scheme === RUN_SCHEME && one.getText().includes(caseName));
			return opened && opened.getText().length > 0 ? opened : undefined;
		});
	}

	test('opent de uitkomst naast de testset, met het testgeval in de kop', async function () {
		this.timeout(60000);
		const opened = await outcomeFor('Een kort lidmaatschap geeft een jeugdlid met korting');
		assert.equal(opened.uri.scheme, RUN_SCHEME);
		assert.ok(opened.uri.path.endsWith('(uitkomst)'), opened.uri.path);
		assert.ok(opened.getText().startsWith("// Uitkomst van 'Een kort lidmaatschap"),
			opened.getText().slice(0, 120));
		// The date the run was made against is context a reader needs first: every
		// derived value depends on it.
		assert.match(opened.getText(), /rekendatum 15-06-2027/);
	});

	test('noemt de verwachtingen, de afgeleide waarden en de trace', async function () {
		this.timeout(60000);
		const text = (await outcomeFor('Een kort lidmaatschap geeft een jeugdlid met korting')).getText();
		for (const heading of ['Verwachtingen', 'Gegeven', 'Afgeleid', 'Trace', 'Gevuurde regels']) {
			assert.ok(text.includes(heading), `kop '${heading}' ontbreekt:\n${text}`);
		}
		// A passing expectation shows what it got; the trace names the rule that
		// produced it, with an arrow rather than prose.
		assert.match(text, /✓ Noor — lidmaatschapsduur/);
		assert.match(text, /← bepaal lidmaatschapsduur/);
	});

	test('geeft een testgeval zonder verwachtingen dat als zodanig terug', async function () {
		this.timeout(60000);
		const text = (await outcomeFor('Alleen uitvoeren, zonder verwachtingen')).getText();
		assert.match(text, /\(geen — dit testgeval voert alleen uit\)/);
		// It still ran, so it still says what it computed.
		assert.ok(text.includes('Gevuurde regels'), text);
	});

	test('zegt waar de cursor in geen testgeval staat', async () => {
		const editor = await vscode.window.showTextDocument(document);
		// Line 0 is the file's own comment.
		editor.selection = new vscode.Selection(0, 0, 0, 0);
		// The command reports and returns; what is asserted is that it does not
		// throw and opens nothing new.
		const before = vscode.workspace.textDocuments.filter(one => one.uri.scheme === RUN_SCHEME).length;
		await vscode.commands.executeCommand('regelspraak.showUitkomst');
		assert.equal(
			vscode.workspace.textDocuments.filter(one => one.uri.scheme === RUN_SCHEME).length,
			before);
	});
});
