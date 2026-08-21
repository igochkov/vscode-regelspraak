import * as assert from 'assert';
import * as vscode from 'vscode';

import { activate, getDocUri, EXTENSION_ID } from './helper';

suite('Activatie', () => {
	const docUri = getDocUri('gegevens.rgs');

	suiteSetup(async () => {
		await activate(docUri);
	});

	test('de extensie is aanwezig en actief', () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `extensie ${EXTENSION_ID} niet gevonden`);
		assert.ok(ext.isActive, 'extensie is niet geactiveerd');
	});

	test('.rgs krijgt de taal-id regelspraak', async () => {
		const document = await vscode.workspace.openTextDocument(docUri);
		assert.strictEqual(document.languageId, 'regelspraak');
	});

	test('het herstartcommando is geregistreerd', async () => {
		const commandNames = await vscode.commands.getCommands(true);
		assert.ok(
			commandNames.includes('regelspraak.restartServer'),
			'regelspraak.restartServer ontbreekt in het commandoregister'
		);
	});
});
