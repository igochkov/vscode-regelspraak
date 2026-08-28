// Importeren uit ALEF (FSD §C11, IPD Phase 7 item 4).
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
// It refuses to overwrite without asking, and it writes the report beside the
// files rather than into the Problems panel: "this construct has no RegelSpraak
// equivalent" is a fact about the conversion and would outlive the command that
// produced it.

import * as fs from 'fs';
import * as path from 'path';
import { ProgressLocation, Uri, window, workspace } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

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

/** Where the files should land: asked once, defaulting to the open workspace. */
async function chooseTarget(): Promise<Uri | undefined> {
	const chosen = await window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		defaultUri: workspace.workspaceFolders?.[0]?.uri,
		openLabel: 'Hierin schrijven',
		title: 'Waar moeten de RegelSpraak-bestanden komen?'
	});
	return chosen?.[0];
}

/**
 * Which of the files already exist, so the reader is asked once rather than
 * per file.
 *
 * Asked at all because this is the only thing in the extension that writes files
 * the user did not name — rename writes, but only into documents that already
 * say what it is rewriting.
 */
function existing(target: Uri, names: string[]): string[] {
	return names.filter(name => fs.existsSync(path.join(target.fsPath, name)));
}

export async function importFromAlef(client: LanguageClient | undefined): Promise<void> {
	if (!client) {
		window.showErrorMessage('De RegelSpraak-taalserver draait niet, dus er kan niets omgezet worden.');
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

	const result = await window.withProgress({
		location: ProgressLocation.Notification,
		title: `${files.length} ALEF-model(len) omzetten…`
	}, async () => await client.sendRequest<ImportAlefResult>(IMPORT_ALEF_REQUEST, {
		files: files.map(file => ({
			path: path.relative(project.fsPath, file).split(path.sep).join('/'),
			text: fs.readFileSync(file, 'utf8')
		}))
	}));

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
	const clash = existing(target, names);
	if (clash.length > 0) {
		const overwrite = 'Overschrijven';
		const chosen = await window.showWarningMessage(
			`${clash.length} bestand(en) bestaan al in deze map: ${clash.join(', ')}.`,
			{ modal: true }, overwrite);
		if (chosen !== overwrite) {
			return;
		}
	}

	for (const document of result.documents) {
		fs.writeFileSync(path.join(target.fsPath, document.path), document.text, 'utf8');
	}
	fs.writeFileSync(path.join(target.fsPath, REPORT_NAME), result.reportDocument, 'utf8');

	// The first document, opened — an import that writes silently leaves the
	// reader looking at the folder they started in, wondering whether it ran.
	const first = Uri.file(path.join(target.fsPath, result.documents[0].path));
	await window.showTextDocument(await workspace.openTextDocument(first));

	const skipped = result.report.filter(one => one.kind === 'overgeslagen').length;
	const derived = result.report.filter(one => one.kind === 'afgeleid').length;
	const read = 'Verslag lezen';
	const summary = skipped > 0
		? `${result.documents.length} bestand(en) geschreven; ${skipped} constructie(s) overgeslagen.`
		: `${result.documents.length} bestand(en) geschreven; ${derived} meervoudsvorm(en) afgeleid.`;
	const chosen = await window.showInformationMessage(summary, read);
	if (chosen === read) {
		await window.showTextDocument(
			await workspace.openTextDocument(Uri.file(path.join(target.fsPath, REPORT_NAME))));
	}
}

/** The report on its own, for the case where nothing was written. */
async function showReport(markdown: string): Promise<void> {
	const document = await workspace.openTextDocument({ language: 'markdown', content: markdown });
	await window.showTextDocument(document);
}
