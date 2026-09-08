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

	/**
	 * RS005, and the only gate that checks its quick fix across the boundary.
	 *
	 * The action's input rides on `Diagnostic.data`, which for this code is filled
	 * by the **parse** layer rather than by a diagnostic family — a route no other
	 * code uses — and it round-trips through this client before the server builds
	 * the edit. A serialisation that dropped the field would leave a squiggle with
	 * no fix and nothing on either side to notice, which is what this is for.
	 *
	 * The appended text declares its own object type, so the test says nothing
	 * about how `samples/` happens to type its attributes and the panel is clean
	 * again once the number is written as the language has it.
	 */
	test('een duizendscheidingsteken levert RS005, en de fix schrijft het getal', async () => {
		const appendix = [
			'',
			'Objecttype de Bedragproef (mv: Bedragproeven)',
			'\thet proefbedrag                                        Numeriek (getal met 2 decimalen) met eenheid €;',
			'',
			'Regel bepaal het proefbedrag',
			'\tgeldig altijd',
			'\t\tHet proefbedrag van een Bedragproef moet gesteld worden op 11.395,00 €.',
			''
		].join('\n');
		await setTestContent(`${original}${appendix}`);

		const diagnostic = await waitUntil('RS005', () =>
			vscode.languages.getDiagnostics(docUri).find(d => String(d.code) === 'RS005')
		);
		assert.ok(
			diagnostic.message.includes("'11395,00'"),
			`verwachtte de vervanging in de melding, kreeg: ${diagnostic.message}`
		);

		const actions = await waitUntil('een quick fix', async () => {
			const found = await vscode.commands.executeCommand<vscode.CodeAction[]>(
				'vscode.executeCodeActionProvider', docUri, diagnostic.range);
			return found && found.length > 0 ? found : undefined;
		});
		const fix = actions.find(action => action.title === "Vervangen door '11395,00'");
		assert.ok(fix, `verwachtte de fix, kreeg ${actions.map(a => a.title).join(', ') || 'niets'}`);
		assert.ok(fix.edit, 'de fix hoort een WorkspaceEdit te dragen');

		assert.ok(await vscode.workspace.applyEdit(fix.edit));
		assert.ok(doc.getText().includes('op 11395,00 €.'),
			doc.getText().split('\n').slice(-4).join('\n'));

		// And nothing is left, which is what says the fix repaired the cause rather
		// than moving it: the sentence parses, and it is the only sentence about the
		// object type the appendix declares.
		const clean = await waitUntil('een leeg probleempaneel', () =>
			codesOf(docUri).length === 0 ? true : undefined
		);
		assert.strictEqual(clean, true);
	});

	test('het consistente model meldt geen enkele fout', async () => {
		// Meaningful because the two tests above have just proved that
		// diagnostics do arrive for this document: an empty list here is the
		// server's verdict, not a race with a server that has not answered yet.
		const codes = codesOf(docUri);
		assert.deepStrictEqual(codes, [], `onverwachte diagnostiek: ${codes.join(', ')}`);
	});
});
