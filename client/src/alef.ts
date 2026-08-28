// Importeren uit en exporteren naar ALEF (FSD §C11, IPD Phase 7 items 3 and 4).
//
// Both directions in one module because they share the two things this side
// owns — a folder picker and permission to write — and differ in nothing else.
// The asymmetry worth knowing is on the wire: an import sends the ALEF files,
// because the server has never heard of that project, while an export sends
// nothing, because the workspace is the model the server already holds.
//
// The client half of the import, and it is deliberately the smaller half: it
// picks a project, reads its model files, hands them to the server, and writes
// what comes back. Every decision about *what a RegelSpraak document says* is
// the server's — it holds the reader, the mapping and the layout engine — and
// this module holds the two things the server cannot have: a file picker, and
// permission to write.
//
// **The one-shot framing is the whole design** (FR-C11.2). An import scaffolds
// text and then gets out of the way: there is no link back to the project, no
// re-import gesture, and nothing that watches it. From the moment the files land
// they are the model, which is what makes this compatible with OBJ-8 where
// continuous synchronisation (FR-C11.3) is not.
//
// **It names the destination before it writes and again afterwards.** The first
// version defaulted the destination dialog to the open workspace and asked only
// where a *name* collided, which meant an accepted default wrote an imported
// model into the reader's own project without a word — and only when they had
// one open, which is how it was found. Neither the picker nor the write reports
// anything on its own, so this module has to.
//
// The report is written beside the files rather than into the Problems panel:
// "this construct has no RegelSpraak equivalent" is a fact about the conversion
// and would outlive the command that produced it.

import * as fs from 'fs';
import * as path from 'path';
import { commands, ProgressLocation, Uri, window, workspace } from 'vscode';
import { LanguageClient, State } from 'vscode-languageclient/node';

import { SHOW_LOG_COMMAND, startedServer } from './serverStatus';

/** The command that restarts the server, so this offers the same one C6 does. */
const RESTART_COMMAND = 'regelspraak.restartServer';

export const IMPORT_ALEF_COMMAND = 'regelspraak.importeerUitAlef';
export const EXPORT_ALEF_COMMAND = 'regelspraak.exporteerNaarAlef';

const IMPORT_ALEF_REQUEST = 'regelspraak/importAlef';
const EXPORT_ALEF_REQUEST = 'regelspraak/exportAlef';

interface ImportAlefResult {
	documents: { path: string; text: string }[];
	report: { kind: string; where: string; message: string }[];
	reportDocument: string;
}

/** The name the conversion report is written under, beside the documents. */
const REPORT_NAME = 'conversieverslag.md';

/**
 * Folders MPS writes into and nobody authors in.
 *
 * A project holds far more `.mps` files than it has models: every generation
 * leaves checkpoints under `source_gen` and `classes_gen`, and `.mps/` is the
 * IDE's own state. Handing those to the server would not break anything — a root
 * it cannot translate is reported and skipped — but it would fill the report
 * with lines about files no one meant to convert.
 */
const GENERATED = new Set(['source_gen', 'classes_gen', 'source_gen.caches', '.mps', 'node_modules']);

/** Every authored `.mps` under a folder, deepest last, as a stable list. */
function modelFiles(root: string): string[] {
	const found: string[] = [];
	const walk = (dir: string): void => {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!GENERATED.has(entry.name)) {
					walk(full);
				}
			} else if (entry.name.endsWith('.mps')) {
				found.push(full);
			}
		}
	};
	walk(root);
	return found;
}

/**
 * Where the files should land.
 *
 * **No `defaultUri`, and that is the fix for a real mistake** (28 August 2026).
 * It used to default to `workspaceFolders[0]`, which opened this dialog *inside*
 * the reader's own project — so accepting it without looking wrote an imported
 * model into the model they had open, and only when they had one open, which is
 * exactly how it was reported. A folder picker with no default opens where the
 * last one left off, which in this flow is the ALEF project the reader has just
 * chosen: still a place they may not want, but one they navigated to themselves.
 *
 * The first root of a multi-root workspace was the wrong guess for a second
 * reason besides: it is not "the project" to anyone who has more than one open.
 *
 * What actually makes this safe is the confirmation below, which names the
 * resolved path before a single byte is written.
 */
async function chooseTarget(): Promise<Uri | undefined> {
	const chosen = await window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Hierheen schrijven',
		title: 'Doelmap voor de RegelSpraak-bestanden'
	});
	return chosen?.[0];
}

/**
 * The destination, confirmed — with its full path and everything about to be
 * written into it.
 *
 * **Always, not only when a name collides.** The overwrite guard this replaces
 * asked about *names*; the question a reader actually needs answered is *where*,
 * and a folder whose files happen to be named differently accepted the write in
 * silence. Naming the path is also the only way the previous dialog's outcome
 * becomes visible at all: a folder picker reports nothing back.
 *
 * Modal, because it is the one moment this extension writes files the user did
 * not name, and because the alternative — noticing afterwards — is what went
 * wrong.
 */
async function confirmTarget(target: Uri, names: string[]): Promise<boolean> {
	const clash = names.filter(name => fs.existsSync(path.join(target.fsPath, name)));
	const detail = [
		`${names.length} bestand(en): ${names.join(', ')}.`,
		clash.length > 0
			? `\n\nLet op: ${clash.length} bestand(en) bestaan al en worden overschreven: `
				+ `${clash.join(', ')}.`
			: ''
	].join('');
	const write = clash.length > 0 ? 'Overschrijven' : 'Schrijven';
	const question = `Schrijven naar ${target.fsPath}?`;
	const answer = clash.length > 0
		? await window.showWarningMessage(question, { modal: true, detail }, write)
		: await window.showInformationMessage(question, { modal: true, detail }, write);
	return answer === write;
}

/**
 * Whether the server can be asked anything, and what to say when it cannot.
 *
 * **`!client` was not the whole question** (28 August 2026). `startClient`
 * assigns the client and *then* awaits `start()`, so a server that fails to
 * start leaves a `LanguageClient` behind that is not running — and a
 * `sendRequest` on one of those rejects with a message about a connection,
 * which VS Code shows as "command failed". Asking for the state is the
 * difference between that and a sentence somebody can act on.
 *
 * The two actions already exist and are the two things there are to do about
 * it. The line about an unopened folder is stated only when it is true: this
 * command is reachable from the palette in a window with nothing open, where
 * the server has had no reason to start.
 */
async function runningServer(client: LanguageClient | undefined): Promise<LanguageClient | undefined> {
	if (client?.state === State.Running) {
		return client;
	}
	const log = 'Toon log';
	const restart = 'Opnieuw starten';
	const noFolder = workspace.workspaceFolders === undefined
		? ' Er is in dit venster geen map geopend; open de map waarin het model moet komen en probeer het opnieuw.'
		: '';
	const answer = await window.showErrorMessage(
		`De RegelSpraak-taalserver draait niet, dus er kan niets omgezet worden.${noFolder}`,
		log, restart);
	if (answer === log) {
		await commands.executeCommand(SHOW_LOG_COMMAND);
	} else if (answer === restart) {
		await commands.executeCommand(RESTART_COMMAND);
	}
	return undefined;
}

/** LSP's own code for a method the server does not implement. */
const METHOD_NOT_FOUND = -32601;

/**
 * Why the request failed, and for the one failure that has a real answer, what
 * to do about it.
 *
 * **A method the server does not know is a version mismatch, not a bug in the
 * model.** `Error: Unhandled method regelspraak/importAlef` says nothing a
 * reader can act on, and it is the message a *stale server build* produces:
 * every custom request this extension adds will hit it the same way. The client
 * already knows which server it started, where the path came from and when that
 * file was built — it wrote all three to the output channel on start — so the
 * message states them instead of pointing at a log.
 *
 * The line about a window with no folder is stated only when it is true, and it
 * is the reason this turned up at all: a workspace setting like
 * `regelspraak.server.path` belongs to a folder, so in a window with none it
 * does not apply and the extension falls back to the server it ships with —
 * which in a development checkout is whatever was last built there.
 */
async function reportRequestFailure(error: unknown, project: string): Promise<void> {
	const code = (error as { code?: unknown } | undefined)?.code;
	const unknownMethod = code === METHOD_NOT_FOUND
		|| /unhandled method/i.test(String(error));
	if (!unknownMethod) {
		window.showErrorMessage(`De omzetting van '${project}' is mislukt: ${String(error)}`);
		return;
	}
	const build = startedServer();
	const where = build
		? ` Gestart is ${build.module} (via ${build.origin}), gebouwd op ${build.builtAt ?? 'onbekend'}.`
		: '';
	const noFolder = workspace.workspaceFolders === undefined
		? ' Let op: er is geen map geopend, dus een werkmapinstelling zoals'
			+ ' "regelspraak.server.path" geldt hier niet.'
		: '';
	const log = 'Toon log';
	const restart = 'Opnieuw starten';
	const answer = await window.showErrorMessage(
		`Deze taalserver kent het importverzoek niet: hij is ouder dan deze extensie.${where}${noFolder}`,
		log, restart);
	if (answer === log) {
		await commands.executeCommand(SHOW_LOG_COMMAND);
	} else if (answer === restart) {
		await commands.executeCommand(RESTART_COMMAND);
	}
}

export async function importFromAlef(client: LanguageClient | undefined): Promise<void> {
	// The running client, rather than a boolean: everything below sends through
	// it, and a `!` at each of those sites would be asserting what this already
	// established.
	const server = await runningServer(client);
	if (!server) {
		return;
	}
	const picked = await window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Project omzetten',
		title: 'Kies de map van het ALEF-project'
	});
	const project = picked?.[0];
	if (!project) {
		return;
	}
	const files = modelFiles(project.fsPath);
	if (files.length === 0) {
		window.showWarningMessage(`In '${path.basename(project.fsPath)}' staan geen ALEF-modelbestanden.`);
		return;
	}

	// Both halves can fail on their own account — a file that cannot be read, a
	// server that has died between the check above and here — and neither says
	// anything useful when it does: an unhandled rejection reaches the user as
	// "Running the contributed command … failed", with the reason in a log they
	// have not been told to open.
	let result: ImportAlefResult;
	try {
		result = await window.withProgress({
			location: ProgressLocation.Notification,
			title: `${files.length} ALEF-model(len) omzetten…`
		}, async () => await server.sendRequest<ImportAlefResult>(IMPORT_ALEF_REQUEST, {
			files: files.map(file => ({
				path: path.relative(project.fsPath, file).split(path.sep).join('/'),
				text: fs.readFileSync(file, 'utf8')
			}))
		}));
	} catch (error) {
		await reportRequestFailure(error, path.basename(project.fsPath));
		return;
	}

	if (result.documents.length === 0) {
		window.showWarningMessage(
			'De conversie heeft geen RegelSpraak-model opgeleverd. Het verslag vertelt waarom.');
		await showReport(result.reportDocument);
		return;
	}

	const target = await chooseTarget();
	if (!target) {
		return;
	}
	const names = [...result.documents.map(one => one.path), REPORT_NAME];
	if (!await confirmTarget(target, names)) {
		return;
	}

	try {
		for (const document of result.documents) {
			fs.writeFileSync(path.join(target.fsPath, document.path), document.text, 'utf8');
		}
		fs.writeFileSync(path.join(target.fsPath, REPORT_NAME), result.reportDocument, 'utf8');
	} catch (error) {
		// Named with the folder, because a write that fails halfway leaves some of
		// the files there and the reader has to know which folder to look in.
		window.showErrorMessage(
			`Schrijven naar ${target.fsPath} is mislukt: ${String(error)}`);
		return;
	}

	// The first document, opened — an import that writes silently leaves the
	// reader looking at the folder they started in, wondering whether it ran.
	const first = Uri.file(path.join(target.fsPath, result.documents[0].path));
	await window.showTextDocument(await workspace.openTextDocument(first));

	// **The destination is named here too**, and not only in the confirmation:
	// this is the message that is still on screen a minute later, and "where did
	// they go" is the question this command has actually been asked.
	const skipped = result.report.filter(one => one.kind === 'overgeslagen').length;
	const derived = result.report.filter(one => one.kind === 'afgeleid').length;
	const read = 'Verslag lezen';
	const reveal = 'Map tonen';
	const summary = `${result.documents.length} bestand(en) geschreven naar ${target.fsPath}`
		+ (skipped > 0
			? `; ${skipped} constructie(s) overgeslagen.`
			: `; ${derived} meervoudsvorm(en) afgeleid.`);
	const chosen = await window.showInformationMessage(summary, read, reveal);
	if (chosen === read) {
		await window.showTextDocument(
			await workspace.openTextDocument(Uri.file(path.join(target.fsPath, REPORT_NAME))));
	} else if (chosen === reveal) {
		await commands.executeCommand('revealFileInOS',
			Uri.file(path.join(target.fsPath, result.documents[0].path)));
	}
}

/** The report on its own, for the case where nothing was written. */
async function showReport(markdown: string): Promise<void> {
	const document = await workspace.openTextDocument({ language: 'markdown', content: markdown });
	await window.showTextDocument(document);
}

// ---------------------------------------------------------------------------
// Exporteren naar ALEF (FR-C11.1)
// ---------------------------------------------------------------------------

interface ExportAlefResult {
	models: { path: string; text: string }[];
	report: { kind: string; where: string; message: string }[];
	reportDocument: string;
}

/**
 * The workspace, written out as ALEF model files.
 *
 * **Nothing is sent to the server.** The workspace is the model it already holds
 * indexed, so the request carries only the name to give the exported ObjectModel
 * — the workspace folder's, which is what a reader would call this model.
 *
 * The files that come back are model files and not an MPS project: the report
 * says so, and the destination someone picks is the `models` folder of an ALEF
 * solution they already have.
 */
export async function exportToAlef(client: LanguageClient | undefined): Promise<void> {
	const server = await runningServer(client);
	if (!server) {
		return;
	}
	const projectName = workspace.workspaceFolders?.[0]?.name;
	let result: ExportAlefResult;
	try {
		result = await window.withProgress({
			location: ProgressLocation.Notification,
			title: 'Model omzetten naar ALEF…'
		}, async () => await server.sendRequest<ExportAlefResult>(EXPORT_ALEF_REQUEST, { projectName }));
	} catch (error) {
		await reportRequestFailure(error, projectName ?? 'de werkmap');
		return;
	}
	if (result.models.length === 0) {
		window.showWarningMessage(
			'De omzetting heeft geen ALEF-model opgeleverd. Het verslag vertelt waarom.');
		await showReport(result.reportDocument);
		return;
	}

	const target = await chooseTarget();
	if (!target) {
		return;
	}
	const names = [...result.models.map(one => one.path), REPORT_NAME];
	if (!await confirmTarget(target, names)) {
		return;
	}
	try {
		for (const model of result.models) {
			fs.writeFileSync(path.join(target.fsPath, model.path), model.text, 'utf8');
		}
		fs.writeFileSync(path.join(target.fsPath, REPORT_NAME), result.reportDocument, 'utf8');
	} catch (error) {
		window.showErrorMessage(`Schrijven naar ${target.fsPath} is mislukt: ${String(error)}`);
		return;
	}

	const skipped = result.report.filter(one => one.kind === 'overgeslagen').length;
	const read = 'Verslag lezen';
	const summary = `${result.models.length} ALEF-modelbestand(en) geschreven naar ${target.fsPath}`
		+ (skipped > 0 ? `; ${skipped} ding(en) niet overgenomen.` : '.');
	const chosen = await window.showInformationMessage(summary, read);
	if (chosen === read) {
		await window.showTextDocument(
			await workspace.openTextDocument(Uri.file(path.join(target.fsPath, REPORT_NAME))));
	}
}
