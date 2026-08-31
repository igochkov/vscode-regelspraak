// P14 — links in comments, checked against a running server.
//
// A URL and the name of another `.rgs` file of the model become clickable in the
// comment itself. It is a different request from hover (`textDocument/
// documentLink`), so the hover middleware that resolves source citations cannot
// affect it — but nothing said so, and the two features are close enough in
// purpose to be confused for one another. This is what says so.
//
// It also pins the shape a reference has to have. The provider resolves a
// reference *containing a slash* against the referring file's own folder and
// gives up if that misses, so `regels/kalender.rgs` written in `gegevens/` names
// `gegevens/regels/kalender.rgs` and is no link at all. A bare filename is looked
// up across the whole model, which is the form that works from anywhere — and
// the form the examples now use, since the rule files moved into chapter folders
// and every path-shaped reference in them had gone stale.

import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, waitUntil } from './helper';

suite('Links in comments (P14)', () => {
	const docUri = getDocUri('gegevens/dagsoorten.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	async function linksOf(uri: vscode.Uri): Promise<vscode.DocumentLink[]> {
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
		return await waitUntil('documentlinks', async () => {
			const found = await vscode.commands.executeCommand<vscode.DocumentLink[] | undefined>(
				'vscode.executeLinkProvider', uri);
			return found && found.length > 0 ? found : undefined;
		});
	}

	test('een bestandsnaam in een commentaar wijst naar dat bestand', async () => {
		const targets = (await linksOf(docUri)).map(one => one.target?.fsPath ?? '');
		assert.ok(
			targets.some(path => path.endsWith('art-17-sluitingsdagen.rgs')),
			`geen link naar de regels over sluitingsdagen: ${targets.join(' | ')}`);
	});

	test('een bronverwijzing wijst naar het reglement, op de regel van het artikel', async () => {
		// P14 and the hover answer from one implementation on the server
		// (`model/sourceCitations.ts`), so the two cannot send a reader to different
		// places. The line is what makes it worth clicking: a text editor scrolls to
		// `#L<n>` and never to a heading name.
		const rule = getDocUri('regels/h4-uitlening/art-08-boete.rgs');
		const citation = (await linksOf(rule))
			.find(one => one.target?.fsPath.endsWith('reglement.md'));
		assert.ok(citation, 'geen link naar het reglement');

		const line = Number(/^L(\d+)$/.exec(citation.target!.fragment)?.[1]);
		assert.ok(line > 0, `geen regelnummer: ${citation.target!.fragment}`);

		const bron = await vscode.workspace.openTextDocument(citation.target!);
		assert.match(bron.lineAt(line - 1).text, /^#+\s+Artikel 8\./);
	});

	test('en dat werkt over de hoofdstukmappen heen', async () => {
		// `tijdlijnen.rgs` sits in `gegevens/` and names a file three folders away
		// in `regels/h7-spaarprogramma/`. A bare name is resolved against the whole
		// model, so where the file lives does not come into it.
		const targets = (await linksOf(getDocUri('gegevens/tijdlijnen.rgs')))
			.map(one => one.target?.fsPath ?? '');
		assert.ok(
			targets.some(path => path.endsWith('art-13-spaartermijn.rgs')),
			`geen link naar de startpuntregel: ${targets.join(' | ')}`);
	});
});
