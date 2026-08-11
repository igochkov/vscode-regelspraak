import * as assert from 'assert';
import * as vscode from 'vscode';

import { EXTENSION_ID, getDocUri } from './helper';

/**
 * D1 — the Markdown injection, from the client's side.
 *
 * What the injection *does* is tested in the language-server repository, against
 * VS Code's own Markdown grammar and the same tokenizer VS Code runs. There is
 * no API for reading TextMate scopes, so nothing here can re-check the colours.
 *
 * What this suite adds is the half that lives in the manifest and is easy to get
 * wrong in a way no grammar test would notice: a mistyped path, a scope name
 * that does not match the grammar file, or an `injectTo` naming the wrong host
 * language. A grammar test loads the file directly and would pass regardless.
 *
 * Worth knowing while reading this: none of it needs the extension to be
 * *active*. Grammars are declarative contributions, read from the manifest, so a
 * `.md` file is coloured with no `.rgs` file in sight and no server running.
 */
suite('Markdown-injectie (D1)', () => {
	interface Grammatica {
		language?: string;
		scopeName: string;
		path: string;
		injectTo?: string[];
		embeddedLanguages?: Record<string, string>;
	}

	const INJECTIE = 'markdown.regelspraak.codeblock';
	let bijdrage: Grammatica | undefined;

	suiteSetup(() => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `extensie ${EXTENSION_ID} niet gevonden`);
		const grammars = ext.packageJSON.contributes?.grammars as Grammatica[] | undefined;
		assert.ok(grammars, 'de extensie draagt geen grammatica bij');
		bijdrage = grammars.find(g => g.scopeName === INJECTIE);
	});

	test('de injectie wordt bijgedragen aan Markdown', () => {
		assert.ok(bijdrage, `geen bijdrage met scopeName ${INJECTIE}`);
		assert.deepStrictEqual(bijdrage.injectTo, ['text.html.markdown']);
		assert.strictEqual(bijdrage.language, undefined,
			'een injectie hoort aan geen enkele taal te hangen');
		assert.deepStrictEqual(bijdrage.embeddedLanguages,
			{ 'meta.embedded.block.regelspraak': 'regelspraak' });
	});

	test('het bestand bestaat en draagt dezelfde scopeName', async () => {
		assert.ok(bijdrage);
		const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
		const pad = vscode.Uri.joinPath(ext.extensionUri, bijdrage.path);
		const ruw = await vscode.workspace.fs.readFile(pad);
		const grammatica = JSON.parse(Buffer.from(ruw).toString('utf8')) as {
			scopeName: string;
			injectionSelector?: string;
		};
		assert.strictEqual(grammatica.scopeName, INJECTIE,
			'de scopeName in het bestand en die in het manifest horen gelijk te zijn');
		assert.ok(grammatica.injectionSelector?.startsWith('L:'),
			'zonder L: komt de injectie ná de eigen omheiningsregels van Markdown');
	});

	// De fixture is er ook om met F5 met eigen ogen te bekijken.
	test('de Markdown-fixture bevat een regelspraak-blok', async () => {
		const doc = await vscode.workspace.openTextDocument(getDocUri('voorbeeld.md'));
		assert.strictEqual(doc.languageId, 'markdown');
		assert.ok(doc.getText().includes('```regelspraak'));
	});
});
