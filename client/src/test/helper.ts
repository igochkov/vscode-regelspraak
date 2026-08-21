/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as path from 'path';

/** `publisher.name` from the extension manifest. */
export const EXTENSION_ID = 'igochkov.vscode-regelspraak';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;

export const getDocPath = (p: string) => {
	return path.resolve(__dirname, '../../../samples', p);
};
export const getDocUri = (p: string) => {
	return vscode.Uri.file(getDocPath(p));
};

/**
 * The extension's status item, read structurally — the suite goes through the
 * extension's own API rather than importing its classes, as the C7 suite does.
 */
interface ServerStatusLike {
	readonly state: string;
	readonly detail?: string;
}

/**
 * Why a run without a language server stops now rather than in a minute.
 *
 * This repository is the client half; the server is built from a separate one,
 * and `.gitignore` reserves both resolution slots, so a **fresh clone has no
 * server** and no suite that needs one can pass. Polled blindly, each of the
 * eleven suites that call `activate` spends its whole timeout finding that out
 * — about eleven minutes, to be told that a document symbol provider did not
 * answer, which is the symptom and not the cause.
 *
 * The extension already knows: it sets the C7 status item to `error` naming the
 * path it tried. Watching that turns the wait into seconds and the message into
 * one the reader can act on. It is the item's own reason for existing (§C7,
 * NFR-5) applied to the suite — a server that never started should not be
 * mistaken for one that has nothing to say.
 */
const NO_SERVER =
	'Er draait geen RegelSpraak-taalserver, dus deze suite kan niet slagen. Deze ' +
	'repository bevat er zelf geen: koppel een serverbuild als "server/" in de ' +
	'extensiemap, of laat "regelspraak.server.path" ernaar verwijzen. Zie ' +
	'docs/DEVELOPING.md, "Pointing the extension at a language server".';

/**
 * Polls `poll` until it yields a value, and fails with what it was waiting
 * for when it does not.
 *
 * Everything here crosses a process boundary and settles when it settles: the
 * server starts, indexes the workspace and publishes on its own schedule, and
 * the client debounces on top. A fixed sleep either makes the suite slow or
 * makes it flaky, and a flaky end-to-end suite is worse than none — it teaches
 * people to re-run instead of to look.
 *
 * `bail` is the other half of that: waiting out the full timeout is right while
 * an answer is still possible and wrong once it is not. Returning a reason from
 * it ends the wait with that reason instead of with the timeout.
 */
export async function waitUntil<T>(
	awaited: string,
	poll: () => Thenable<T | undefined> | (T | undefined),
	timeoutMs = 60000,
	bail?: () => string | undefined
): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;

	for (;;) {
		try {
			const outcome = await poll();
			if (outcome !== undefined) {
				return outcome;
			}
		} catch (error) {
			lastError = error;
		}
		const giveUp = bail?.();
		if (giveUp !== undefined) {
			throw new Error(giveUp);
		}
		if (Date.now() >= deadline) {
			const tail = lastError === undefined ? '' : ` Laatste fout: ${String(lastError)}`;
			throw new Error(`Time-out na ${timeoutMs} ms bij het wachten op ${awaited}.${tail}`);
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}

/** Activates the extension and opens `docUri`, once the server answers for it. */
export async function activate(docUri: vscode.Uri): Promise<void> {
	const ext = vscode.extensions.getExtension(EXTENSION_ID);
	if (!ext) {
		throw new Error(
			`Extensie ${EXTENSION_ID} niet gevonden. Draait deze suite tegen de juiste ` +
			'extensionDevelopmentPath, en klopt publisher.name in package.json?'
		);
	}
	const api = await ext.activate() as { serverStatus?: ServerStatusLike } | undefined;
	const status = api?.serverStatus;

	doc = await vscode.workspace.openTextDocument(docUri);
	editor = await vscode.window.showTextDocument(doc);

	// The server starts, scans the workspace and indexes asynchronously. The
	// outline is the cheapest proof that it is up *and* has this document in
	// its model — every other provider needs the same thing.
	await waitUntil('een taalserver die dit document geïndexeerd heeft', async () => {
		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			docUri
		);
		return symbols && symbols.length > 0 ? symbols : undefined;
	}, 60000, () => status?.state === 'error'
		? `${NO_SERVER}${status.detail ? ` (${status.detail})` : ''}`
		: undefined);
}

export async function setTestContent(content: string): Promise<boolean> {
	const all = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length)
	);
	return editor.edit(eb => eb.replace(all, content));
}

/** Positions the cursor-independent lookup helpers used across the suite. */
export function positionOf(text: string, within = doc): vscode.Position {
	const offset = within.getText().indexOf(text);
	if (offset < 0) {
		throw new Error(`"${text}" komt niet voor in ${within.uri.fsPath}`);
	}
	return within.positionAt(offset);
}
