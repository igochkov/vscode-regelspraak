// W5 — the read-only model view, end to end against a real language server.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, waitUntil } from './helper';

const SCHEME = 'regelspraak-model';

suite('Modelweergave (W5)', () => {
	const docUri = getDocUri('gegevens.rgs');
	let original: string;

	suiteSetup(async () => {
		await activate(docUri);
		original = doc.getText();
	});

	teardown(async () => {
		// As the diagnostics suite does: the fixture is left as it was found,
		// and never saved, so the copy on disk is untouched either way. Through
		// a `WorkspaceEdit` rather than the helper's editor, because showing the
		// model view moved the active editor off it.
		if (doc.getText() !== original) {
			await replaceFixture(original);
		}
	});

	async function replaceFixture(text: string): Promise<void> {
		const edit = new vscode.WorkspaceEdit();
		edit.replace(docUri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), text);
		assert.ok(await vscode.workspace.applyEdit(edit), 'de fixture kon niet bewerkt worden');
	}

	/** The view for the open document, once the server has answered for it. */
	async function view(): Promise<vscode.TextDocument> {
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(docUri));
		await vscode.commands.executeCommand('regelspraak.showAst');
		return waitUntil('een modelweergave met inhoud', async () => {
			const opened = vscode.workspace.textDocuments.find(d => d.uri.scheme === SCHEME);
			return opened && opened.getText().includes('Objecttypen') ? opened : undefined;
		});
	}

	test('opent een alleen-lezen weergave naast het bestand', async () => {
		const opened = await view();
		assert.equal(opened.uri.scheme, SCHEME);
		assert.ok(opened.uri.path.endsWith('(model)'), `onverwacht pad: ${opened.uri.path}`);

		// Naast, niet erbovenop: een beschrijving die de plaats inneemt van wat ze
		// beschrijft, is er geen. De kolom van de bron blijft bezet.
		const columns = vscode.window.visibleTextEditors
			.filter(one => one.document.uri.scheme === SCHEME || one.document.uri.fsPath === docUri.fsPath)
			.map(one => one.viewColumn);
		assert.equal(new Set(columns).size, 2, `beide staan in kolom ${columns.join(', ')}`);
	});

	test('noemt het bestand dat beschreven wordt, in de kop', async () => {
		assert.ok((await view()).getText().startsWith('// Modelweergave van gegevens.rgs'));
	});

	test('toont de declaraties met hun leden en hun gedeclareerde datatype', async () => {
		const text = (await view()).getText();
		assert.ok(text.includes('\tLid'), 'het objecttype Lid ontbreekt');
		assert.ok(text.includes('pasnummer — Attribuut · Tekst'),
			`geen lid met datatype in:\n${text}`);
	});

	test('draagt het bestand dat het beschrijft mee in de zoekopdracht van de uri', async () => {
		const opened = await view();
		assert.equal(vscode.Uri.parse(opened.uri.query).fsPath, docUri.fsPath);
	});

	// VS Code caches a virtual document's text until its provider says
	// otherwise, so a view left open beside the file it describes would
	// otherwise keep showing the model as it was when it was opened.
	test('werkt bij zodra het model verandert', async () => {
		const opened = await view();
		assert.equal(opened.getText().includes('Boekenkabouter'), false);

		await replaceFixture(`${original}\nObjecttype de Boekenkabouter\n\tde hoogte\tTekst;\n`);
		await waitUntil('een bijgewerkte modelweergave', () =>
			opened.getText().includes('Boekenkabouter') ? true : undefined);
	});
});
