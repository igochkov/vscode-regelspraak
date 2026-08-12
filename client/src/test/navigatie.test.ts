import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, positieVan, wachtTot } from './helper';

/**
 * End-to-end navigation over the real language server: definition, type
 * definition, "what derives this?", references, occurrence highlighting,
 * workspace symbol search and rename.
 *
 * These cross a file boundary on purpose. Everything here resolves a name in
 * `tuincentrum-regels.rgs` against a declaration in `tuincentrum-gegevens.rgs`,
 * which is the property a unit test cannot establish: it needs a server that has
 * actually scanned the workspace folder the host opened.
 */
suite('Navigatie en hernoemen (P5–P9, P11, P20)', () => {
	const regelsUri = getDocUri('tuincentrum-regels.rgs');
	const gegevensUri = getDocUri('tuincentrum-gegevens.rgs');
	let gegevens: vscode.TextDocument;

	suiteSetup(async () => {
		await activate(regelsUri);
		gegevens = await vscode.workspace.openTextDocument(gegevensUri);
	});

	/**
	 * The position of `tekst` in the rules document (the one under test).
	 *
	 * Search strings include a following word where the bare name also occurs in
	 * a rule header: `Regel bepaal orderbedrag` names the *rule*, and a test that
	 * lands there passes for the wrong reason.
	 */
	const inRegels = (tekst: string): vscode.Position => positieVan(tekst, doc);

	/**
	 * Locations as "<bestand> «tekst»", so a failure says what it found. The
	 * client may hand back either shape depending on what it negotiated, so both
	 * are unwrapped here.
	 */
	function beschrijf(locaties: readonly (vscode.Location | vscode.LocationLink)[]): string[] {
		return locaties.map(l => {
			const link = l as vscode.LocationLink;
			const plek = l as vscode.Location;
			const uri = link.targetUri ?? plek.uri;
			const bereik = link.targetRange ?? plek.range;
			const bron = uri.fsPath === gegevensUri.fsPath ? gegevens : doc;
			return `${uri.fsPath.endsWith('gegevens.rgs') ? 'gegevens' : 'regels'} «${bron.getText(bereik)}»`;
		});
	}

	async function locaties(command: string, uri: vscode.Uri, positie: vscode.Position): Promise<string[]> {
		const uitkomst = await wachtTot(command, async () => {
			const gevonden = await vscode.commands.executeCommand<
				(vscode.Location | vscode.LocationLink)[] | undefined
			>(command, uri, positie);
			return gevonden && gevonden.length > 0 ? gevonden : undefined;
		});
		return beschrijf(uitkomst);
	}

	test('P5 — ga naar declaratie springt naar het andere bestand', async () => {
		assert.deepStrictEqual(
			await locaties('vscode.executeDefinitionProvider', regelsUri, inRegels('orderbedrag van een')),
			['gegevens «orderbedrag»']);
	});

	test('P5 — ga naar declaratie werkt vanuit een meerwoordige naam', async () => {
		assert.deepStrictEqual(
			await locaties('vscode.executeDefinitionProvider', regelsUri, inRegels('planten van de')),
			['gegevens «aantal planten»']);
	});

	test('P6 — ga naar type springt naar het domein', async () => {
		assert.deepStrictEqual(
			await locaties('vscode.executeTypeDefinitionProvider', regelsUri, inRegels('orderbedrag van een')),
			['gegevens «Geldbedrag»']);
	});

	test('P7 — implementatie noemt de regel die het attribuut afleidt', async () => {
		const gevonden = await locaties('vscode.executeImplementationProvider', gegevensUri,
			positieVan('orderbedrag', gegevens));
		assert.deepStrictEqual(gevonden, ['regels «bepaal orderbedrag»']);
	});

	test('P8 — alle verwijzingen omvatten beide bestanden', async () => {
		const gevonden = await locaties('vscode.executeReferenceProvider', regelsUri,
			inRegels('Bestelling'));
		assert.ok(gevonden.some(t => t.startsWith('gegevens')), gevonden.join(' | '));
		assert.ok(gevonden.filter(t => t.startsWith('regels')).length >= 2, gevonden.join(' | '));
	});

	test('P9 — markeringen onderscheiden schrijven van lezen', async () => {
		const treffers = await wachtTot('markeringen', async () => {
			const gevonden = await vscode.commands.executeCommand<vscode.DocumentHighlight[] | undefined>(
				'vscode.executeDocumentHighlights', regelsUri, inRegels('orderbedrag van een'));
			return gevonden && gevonden.length > 0 ? gevonden : undefined;
		});
		assert.deepStrictEqual(treffers.map(t => t.kind), [vscode.DocumentHighlightKind.Write]);
	});

	test('P11 — werkmapzoeken vindt een meerwoordige naam op een middenwoord', async () => {
		const symbolen = await wachtTot('werkmapsymbolen', async () => {
			const gevonden = await vscode.commands.executeCommand<vscode.SymbolInformation[] | undefined>(
				'vscode.executeWorkspaceSymbolProvider', 'aantal planten');
			return gevonden && gevonden.length > 0 ? gevonden : undefined;
		});
		assert.ok(symbolen.some(s => s.name === 'aantal planten'),
			symbolen.map(s => s.name).join(' | '));
	});

	test('P20 — hernoemen levert bewerkingen in beide bestanden', async () => {
		const edit = await wachtTot('hernoembewerking', async () => {
			const uitkomst = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
				'vscode.executeDocumentRenameProvider', regelsUri, inRegels('orderbedrag van een'), 'ordertotaal');
			return uitkomst && uitkomst.size > 0 ? uitkomst : undefined;
		});
		const bestanden = edit.entries().map(([uri]) => uri.fsPath).sort();
		assert.deepStrictEqual(bestanden, [gegevensUri.fsPath, regelsUri.fsPath].sort());
		for (const [, bewerkingen] of edit.entries()) {
			for (const bewerking of bewerkingen) {
				assert.strictEqual(bewerking.newText, 'ordertotaal');
			}
		}
	});

	// FR-P20.3 — de nieuwe naam bestaat al als attribuut van Bestelling, dus mag
	// het hernoemen niet doorgaan.
	test('P20 — hernoemen weigert een botsende naam', async () => {
		await assert.rejects(
			async () => vscode.commands.executeCommand(
				'vscode.executeDocumentRenameProvider', regelsUri, inRegels('orderbedrag van een'), 'besteldatum'),
			/al in gebruik/);
	});
});
