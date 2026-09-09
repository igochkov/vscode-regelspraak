// Importeren uit ALEF (FSD §C11 FR-C11.2, IPD Phase 7 item 4).
//
// One direction only. An exporter was built beside this on 29 August 2026 and
// **withdrawn the same day**: the files it produced break a real ALEF
// environment, because an ALEF project is not its model files. Import is
// unaffected — it reads ALEF and writes text, and hands nothing back.
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

const IMPORT_ALEF_REQUEST = 'regelspraak/importAlef';

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
 * Where the files should land: the model root the reader has open.
 *
 * **The folder picker is gone** (29 August 2026). It was there because the
 * import used to write a flat heap of files into whatever folder it was given,
 * so *which* folder was a question worth stopping for; now the server names a
 * path per document — `gegevens/`, `regels/`, `tests/`, the `docs/AUTHORING.md`
 * layout — and the answer to "where" is the project you are working in. A
 * dialog that asks a question with one sensible answer is a dialog that gets
 * accepted without reading, which is how the earlier `defaultUri` mistake
 * happened in the first place.
 *
 * What makes it safe is unchanged and is the confirmation below: it names the
 * resolved path and every file about to land under it, before a byte is
 * written.
 *
 * Two cases the word "the" does not cover. With **no folder open** there is
 * nothing to be relative to, and guessing a path on someone's disk is exactly
 * what this stopped doing — so it says so and stops. With **several roots
 * open**, "the project" is not a thing; the reader picks one from the roots
 * they already have, which is a list of their own folders rather than a walk of
 * the file system.
 */
async function modelRoot(): Promise<Uri | undefined> {
	const folders = workspace.workspaceFolders ?? [];
	if (folders.length === 0) {
		window.showWarningMessage(
			'Open eerst de map van het model waar de bestanden bij horen; daar schrijft de import naartoe.');
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0].uri;
	}
	const picked = await window.showWorkspaceFolderPick({
		placeHolder: 'In welke map van de werkruimte komt het model?'
	});
	return picked?.uri;
}

/**
 * The destination, confirmed — with its full path and how much is about to be
 * written into it.
 *
 * **Always, not only when a name collides.** The overwrite guard this replaces
 * asked about *names*; the question a reader actually needs answered is *where*,
 * and a folder whose files happen to be named differently accepted the write in
 * silence.
 *
 * Modal, because it is the one moment this extension writes files the user did
 * not name, and because the alternative — noticing afterwards — is what went
 * wrong. Since the folder picker was removed it is also the *only* moment the
 * destination is put in front of anybody before the write, which is why the
 * question states the resolved path in full.
 *
 * **Counts, not a list of names.** A real project imports as dozens of files,
 * and a modal that recites all of them is a wall of text nobody reads — which
 * is the failure it exists to prevent, arrived at from the other side. What a
 * reader decides on is *where* it lands and *how much of what is already there
 * goes*, so the detail says how many files are written and how many of those
 * replace one. The conversion report written beside them names every file, for
 * anyone who wants the list afterwards.
 */
async function confirmTarget(target: Uri, names: string[]): Promise<boolean> {
	const clash = names.filter(name => fs.existsSync(path.join(target.fsPath, name)));
	const detail = clash.length > 0
		? `${names.length} bestand(en), waarvan ${clash.length} bestaande worden overschreven.`
		: `${names.length} bestand(en) worden geschreven.`;
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
	// Under the progress notification, because the walk is synchronous and a real
	// project has thousands of files under it: without this the window simply
	// stops responding between the folder being picked and the first message,
	// which reads as the command having failed to start.
	const files = await window.withProgress({
		location: ProgressLocation.Notification,
		title: `Modelbestanden zoeken in '${path.basename(project.fsPath)}'…`
	}, async () => modelFiles(project.fsPath));
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

	const target = await modelRoot();
	if (!target) {
		return;
	}
	const names = [...result.documents.map(one => one.path), REPORT_NAME];
	if (!await confirmTarget(target, names)) {
		return;
	}

	try {
		for (const document of result.documents) {
			// ALEF's own folders — solution, model, virtual package — made where
			// they are missing, which for a converted project is all of them. The
			// server decides the whole path, this side only joins and creates: a
			// reader migrating off ALEF looks for the file where MPS showed it.
			const file = path.join(target.fsPath, document.path);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, document.text, 'utf8');
		}
		// The report stays at the root: it is not part of the model, and it is
		// what a reader should meet first in a folder that was empty a moment ago.
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
	const counted = (kind: string): number =>
		result.report.filter(one => one.kind === kind).length;
	const unreadable = counted('onleesbaar');
	const skipped = counted('overgeslagen');
	const derived = counted('afgeleid');
	const read = 'Verslag lezen';
	const reveal = 'Map tonen';
	// **What was written and does not parse leads whenever there is any.** It is
	// the most urgent kind the report has — the converter having been *wrong*,
	// rather than having declined — and this message never mentioned it: a reader
	// whose project produced two unreadable documents was told how many plurals
	// were derived, and met the RS001s later. A warning rather than a notice for
	// the same reason, since it is the one outcome that needs somebody.
	const tail = unreadable > 0
		? `; op ${unreadable} plek(ken) is geen RegelSpraak geschreven — zie het verslag.`
		: skipped > 0
			? `; ${skipped} constructie(s) overgeslagen.`
			: `; ${derived} meervoudsvorm(en) afgeleid.`;
	const summary = `${result.documents.length} bestand(en) geschreven naar ${target.fsPath}${tail}`;
	const chosen = unreadable > 0
		? await window.showWarningMessage(summary, read, reveal)
		: await window.showInformationMessage(summary, read, reveal);
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
