import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, doc, getDocUri, positionOf, waitUntil } from './helper';

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
	const rulesUri = getDocUri('tuincentrum-regels.rgs');
	const dataUri = getDocUri('tuincentrum-gegevens.rgs');
	let data: vscode.TextDocument;

	suiteSetup(async () => {
		await activate(rulesUri);
		data = await vscode.workspace.openTextDocument(dataUri);
	});

	/**
	 * The position of `tekst` in the rules document (the one under test).
	 *
	 * Search strings include a following word where the bare name also occurs in
	 * a rule header: `Regel bepaal orderbedrag` names the *rule*, and a test that
	 * lands there passes for the wrong reason.
	 */
	const inRules = (text: string): vscode.Position => positionOf(text, doc);

	/**
	 * Locations as "<bestand> «tekst»", so a failure says what it found. The
	 * client may hand back either shape depending on what it negotiated, so both
	 * are unwrapped here.
	 */
	function describeLocations(locations: readonly (vscode.Location | vscode.LocationLink)[]): string[] {
		return locations.map(l => {
			const link = l as vscode.LocationLink;
			const spot = l as vscode.Location;
			const uri = link.targetUri ?? spot.uri;
			const range = link.targetRange ?? spot.range;
			const source = uri.fsPath === dataUri.fsPath ? data : doc;
			return `${uri.fsPath.endsWith('gegevens.rgs') ? 'gegevens' : 'regels'} «${source.getText(range)}»`;
		});
	}

	async function locations(command: string, uri: vscode.Uri, position: vscode.Position): Promise<string[]> {
		const outcome = await waitUntil(command, async () => {
			const found = await vscode.commands.executeCommand<
				(vscode.Location | vscode.LocationLink)[] | undefined
			>(command, uri, position);
			return found && found.length > 0 ? found : undefined;
		});
		return describeLocations(outcome);
	}

	test('P5 — ga naar declaratie springt naar het andere bestand', async () => {
		assert.deepStrictEqual(
			await locations('vscode.executeDefinitionProvider', rulesUri, inRules('orderbedrag van een')),
			['gegevens «orderbedrag»']);
	});

	test('P5 — ga naar declaratie werkt vanuit een meerwoordige naam', async () => {
		assert.deepStrictEqual(
			await locations('vscode.executeDefinitionProvider', rulesUri, inRules('planten van de')),
			['gegevens «aantal planten»']);
	});

	test('P6 — ga naar type springt naar het domein', async () => {
		assert.deepStrictEqual(
			await locations('vscode.executeTypeDefinitionProvider', rulesUri, inRules('orderbedrag van een')),
			['gegevens «Geldbedrag»']);
	});

	test('P7 — implementatie noemt de regel die het attribuut afleidt', async () => {
		const found = await locations('vscode.executeImplementationProvider', dataUri,
			positionOf('orderbedrag', data));
		assert.deepStrictEqual(found, ['regels «bepaal orderbedrag»']);
	});

	test('P8 — alle verwijzingen omvatten beide bestanden', async () => {
		const found = await locations('vscode.executeReferenceProvider', rulesUri,
			inRules('Bestelling'));
		assert.ok(found.some(t => t.startsWith('gegevens')), found.join(' | '));
		assert.ok(found.filter(t => t.startsWith('regels')).length >= 2, found.join(' | '));
	});

	test('P9 — markeringen onderscheiden schrijven van lezen', async () => {
		const matches = await waitUntil('markeringen', async () => {
			const found = await vscode.commands.executeCommand<vscode.DocumentHighlight[] | undefined>(
				'vscode.executeDocumentHighlights', rulesUri, inRules('orderbedrag van een'));
			return found && found.length > 1 ? found : undefined;
		});
		// Beide soorten staan in dit bestand: de regel schrijft het orderbedrag, en
		// de conditiekolom van de Beslistabel leest het. Die tweede telde niet mee
		// zolang een tabel alleen haar conclusiekolom als voorkomen opleverde —
		// waardoor die tabel in de afhankelijkheidsgraaf een knoop zonder invoer was.
		assert.deepStrictEqual([...new Set(matches.map(t => t.kind))].sort(),
			[vscode.DocumentHighlightKind.Read, vscode.DocumentHighlightKind.Write]);
		// En de plek onder de cursor is de schrijvende.
		assert.equal(
			matches.find(m => m.range.contains(inRules('orderbedrag van een')))?.kind,
			vscode.DocumentHighlightKind.Write);
	});

	test('P11 — werkmapzoeken vindt een meerwoordige naam op een middenwoord', async () => {
		const symbols = await waitUntil('werkmapsymbolen', async () => {
			const found = await vscode.commands.executeCommand<vscode.SymbolInformation[] | undefined>(
				'vscode.executeWorkspaceSymbolProvider', 'aantal planten');
			return found && found.length > 0 ? found : undefined;
		});
		assert.ok(symbols.some(s => s.name === 'aantal planten'),
			symbols.map(s => s.name).join(' | '));
	});

	test('P20 — hernoemen levert bewerkingen in beide bestanden', async () => {
		const edit = await waitUntil('hernoembewerking', async () => {
			const outcome = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
				'vscode.executeDocumentRenameProvider', rulesUri, inRules('orderbedrag van een'), 'ordertotaal');
			return outcome && outcome.size > 0 ? outcome : undefined;
		});
		const files = edit.entries().map(([uri]) => uri.fsPath).sort();
		assert.deepStrictEqual(files, [dataUri.fsPath, rulesUri.fsPath].sort());
		for (const [, edits] of edit.entries()) {
			for (const edit of edits) {
				assert.strictEqual(edit.newText, 'ordertotaal');
			}
		}
	});

	// FR-P20.3 — the new name already exists as an attribute of Bestelling, so the
	// rename must not go through.
	test('P20 — hernoemen weigert een botsende naam', async () => {
		await assert.rejects(
			async () => vscode.commands.executeCommand(
				'vscode.executeDocumentRenameProvider', rulesUri, inRules('orderbedrag van een'), 'besteldatum'),
			/al in gebruik/);
	});
});
