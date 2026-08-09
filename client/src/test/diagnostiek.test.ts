import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, setTestContent, wachtTot } from './helper';

const codesVan = (uri: vscode.Uri) =>
	vscode.languages.getDiagnostics(uri).map(d => String(d.code));

suite('Diagnostiek (P1)', () => {
	const docUri = getDocUri('tuincentrum-regels.rgs');
	let origineel: string;

	suiteSetup(async () => {
		await activate(docUri);
		origineel = doc.getText();
	});

	teardown(async () => {
		// Every test leaves the fixture as it found it; the file is never
		// saved, so the copy on disk is untouched either way.
		if (doc.getText() !== origineel) {
			await setTestContent(origineel);
			await wachtTot('een schoon model na herstel', () =>
				codesVan(docUri).length === 0 ? true : undefined
			);
		}
	});

	test('een verwijzing naar een onbekend objecttype levert RS101', async () => {
		await setTestContent(
			`${origineel}\n` +
			'Regel bepaal onbekende korting\n' +
			'\tgeldig altijd\n' +
			'\t\tDe korting van een Tuinkabouter moet berekend worden als 1 €.\n'
		);

		const codes = await wachtTot('RS101', () => {
			const gevonden = codesVan(docUri);
			return gevonden.includes('RS101') ? gevonden : undefined;
		});

		assert.ok(codes.includes('RS101'), `verwachtte RS101, kreeg ${codes.join(', ') || 'niets'}`);
	});

	test('de melding verdwijnt weer zodra de fout weg is', async () => {
		await setTestContent(
			`${origineel}\n` +
			'Regel bepaal onbekende korting\n' +
			'\tgeldig altijd\n' +
			'\t\tDe korting van een Tuinkabouter moet berekend worden als 1 €.\n'
		);
		await wachtTot('RS101', () => codesVan(docUri).includes('RS101') || undefined);

		await setTestContent(origineel);

		const leeg = await wachtTot('een leeg probleempaneel', () =>
			codesVan(docUri).length === 0 ? true : undefined
		);
		assert.strictEqual(leeg, true);
	});

	test('het consistente model meldt geen enkele fout', async () => {
		// Meaningful because the two tests above have just proved that
		// diagnostics do arrive for this document: an empty list here is the
		// server's verdict, not a race with a server that has not answered yet.
		const codes = codesVan(docUri);
		assert.deepStrictEqual(codes, [], `onverwachte diagnostiek: ${codes.join(', ')}`);
	});
});
