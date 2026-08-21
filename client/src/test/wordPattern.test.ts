import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri } from './helper';

/**
 * The word pattern from language-configuration.json, exercised through the
 * editor rather than by re-parsing the file: VS Code compiles the string form
 * of a pattern with no flags, so `\p{L}` silently became the literal
 * characters and a double-click selected "p" instead of the word. Nothing in
 * a unit test would have noticed — the JSON was valid either way.
 */
suite('Woordpatroon', () => {
	const docUri = getDocUri('gegevens/lid.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('een woord met diakriet telt als één woord', async () => {
		const document = await vscode.workspace.openTextDocument(docUri);
		const offset = document.getText().indexOf('leestegoed');
		assert.ok(offset > 0, 'fixture bevat "leestegoed" niet');

		// Halfway into the word, where a broken pattern gives a stray match.
		const position = document.positionAt(offset + 4);
		const range = document.getWordRangeAtPosition(position);

		assert.ok(range, 'geen woordbereik gevonden');
		assert.strictEqual(document.getText(range), 'leestegoed');
	});

	test('een hoofdletterwoord telt als één woord', async () => {
		const document = await vscode.workspace.openTextDocument(docUri);
		const offset = document.getText().indexOf('Leden');
		const position = document.positionAt(offset + 2);
		const range = document.getWordRangeAtPosition(position);

		assert.ok(range, 'geen woordbereik gevonden');
		assert.strictEqual(document.getText(range), 'Leden');
	});
});
