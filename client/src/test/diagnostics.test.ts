import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, setTestContent, waitUntil } from './helper';

const codesOf = (uri: vscode.Uri) =>
	vscode.languages.getDiagnostics(uri).map(d => String(d.code));

suite('Diagnostiek (P1)', () => {
	const docUri = getDocUri('regels/h3-contributie/art-06-contributie.rgs');
	let original: string;

	suiteSetup(async () => {
		await activate(docUri);
		original = doc.getText();
	});

	teardown(async () => {
		// Every test leaves the fixture as it found it; the file is never
		// saved, so the copy on disk is untouched either way.
		if (doc.getText() !== original) {
			await setTestContent(original);
			await waitUntil('een schoon model na herstel', () =>
				codesOf(docUri).length === 0 ? true : undefined
			);
		}
	});

	test('een verwijzing naar een onbekend objecttype levert RS101', async () => {
		await setTestContent(
			`${original}\n` +
			'Regel bepaal onbekende contributie\n' +
			'\tgeldig altijd\n' +
			'\t\tDe contributie van een Boekenkabouter moet berekend worden als 1 €.\n'
		);

		const codes = await waitUntil('RS101', () => {
			const found = codesOf(docUri);
			return found.includes('RS101') ? found : undefined;
		});

		assert.ok(codes.includes('RS101'), `verwachtte RS101, kreeg ${codes.join(', ') || 'niets'}`);
	});

	test('de melding verdwijnt weer zodra de fout weg is', async () => {
		await setTestContent(
			`${original}\n` +
			'Regel bepaal onbekende contributie\n' +
			'\tgeldig altijd\n' +
			'\t\tDe contributie van een Boekenkabouter moet berekend worden als 1 €.\n'
		);
		await waitUntil('RS101', () => codesOf(docUri).includes('RS101') || undefined);

		await setTestContent(original);

		const empty = await waitUntil('een leeg probleempaneel', () =>
			codesOf(docUri).length === 0 ? true : undefined
		);
		assert.strictEqual(empty, true);
	});

	test('het consistente model meldt geen enkele fout', async () => {
		// Meaningful because the two tests above have just proved that
		// diagnostics do arrive for this document: an empty list here is the
		// server's verdict, not a race with a server that has not answered yet.
		const codes = codesOf(docUri);
		assert.deepStrictEqual(codes, [], `onverwachte diagnostiek: ${codes.join(', ')}`);
	});
});
