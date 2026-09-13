/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

/**
 * Run from a VS Code integrated terminal, this process inherits the host's own
 * Electron environment, and `runTests` spawns the test host with a copy of it
 * (`Object.assign({}, process.env, …)`). `ELECTRON_RUN_AS_NODE` in particular
 * makes the VS Code we launch behave as plain Node, which then tries to execute
 * the workspace folder as a script and fails with MODULE_NOT_FOUND. None of it
 * belongs to the child.
 *
 * This used to be `unset` in a shell wrapper, which made `npm test` runnable
 * only from a POSIX shell: npm runs scripts through `ComSpec` on Windows, and
 * a default Git for Windows install puts `git.exe` on PATH but not `sh.exe`.
 * Deleting the keys here does the same job in the one place every shell reaches.
 *
 * `VSCODE_TEST_VERSION` is exempt because it is this runner's own knob rather
 * than inherited host state. The wrapper cleared it along with the rest, before
 * the process that reads it had started, so the override below never worked
 * from an integrated terminal — the one place the clearing runs at all.
 */
const OWN_SETTINGS = new Set(['VSCODE_TEST_VERSION']);

function dropInheritedHostEnvironment(): void {
	delete process.env.ELECTRON_RUN_AS_NODE;
	for (const name of Object.keys(process.env)) {
		if (name.startsWith('VSCODE_') && !OWN_SETTINGS.has(name)) {
			delete process.env[name];
		}
	}
}

/**
 * The oldest VS Code the manifest claims to support. Testing there rather than
 * on stable is deliberate: newer hosts are the ones most likely to work, and
 * an extension that only ever runs on the newest build has no evidence for the
 * floor it advertises. Override with VSCODE_TEST_VERSION to check another one.
 */
function supportedFloor(root: string): string {
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
	const range: string = manifest.engines?.vscode ?? '';
	const version = range.replace(/^[^0-9]*/, '');
	return version.length > 0 ? version : 'stable';
}

/**
 * The two-folder workspace to open, written out with the development server's
 * path in it.
 *
 * The committed fixture declares the two folders and nothing else, because
 * `regelspraak.server.path` names a build this repository does not own — which
 * is why `.gitignore` keeps `samples/workspace/single-folder/.vscode/` out and
 * `setup:dev` writes it there. But that file is *folder*-scoped, and a resource-less
 * `getConfiguration()` — which is what `resolveServerModule` asks, the server
 * being one per window rather than one per folder — does not see a folder's
 * settings in a `.code-workspace`. So the setting is lifted to the workspace
 * level in a generated copy under `out/`, which is gitignored and regenerated
 * on every run.
 *
 * Where there is no such setting the copy carries none, and the extension falls
 * back to the server staged at its own `server/out/server.js` — exactly as the
 * single-folder run does.
 */
function multiRootWorkspace(here: string): string {
	const root = path.resolve(here, '../../..');
	const declared = path.join(root, 'client/src/test/fixtures/twee-werkmappen.code-workspace');
	const workspace = JSON.parse(fs.readFileSync(declared, 'utf8')) as {
		folders: { path: string }[];
		settings?: Record<string, unknown>;
	};

	// Folder paths in a `.code-workspace` are relative to the file, and the copy
	// lives somewhere else — so they are made absolute rather than re-derived.
	workspace.folders = workspace.folders.map(folder => ({
		path: path.resolve(path.dirname(declared), folder.path)
	}));

	const serverPath = developmentServerPath(root);
	if (serverPath) {
		workspace.settings = { ...workspace.settings, 'regelspraak.server.path': serverPath };
	}

	const generated = path.join(here, 'twee-werkmappen.code-workspace');
	fs.writeFileSync(generated, JSON.stringify(workspace, undefined, '\t'), 'utf8');
	return generated;
}

/**
 * `regelspraak.server.path` as `setup:dev` left it in
 * `samples/workspace/single-folder/`, if it did.
 */
function developmentServerPath(root: string): string | undefined {
	const settings = path.join(root, 'samples/workspace/single-folder/.vscode/settings.json');
	if (!fs.existsSync(settings)) {
		return undefined;
	}
	try {
		const held = JSON.parse(fs.readFileSync(settings, 'utf8')) as Record<string, unknown>;
		const configured = held['regelspraak.server.path'];
		if (typeof configured !== 'string' || configured.trim().length === 0) {
			return undefined;
		}
		// Made absolute against `samples/workspace/single-folder/`, which is what
		// the setting is relative to there and is no longer the first folder of
		// the generated copy.
		return path.isAbsolute(configured)
			? configured
			: path.resolve(root, 'samples/workspace/single-folder', configured);
	} catch {
		// A settings file with a comment in it is JSON with comments, which this
		// cannot read. Falling back to the staged server beats failing the run.
		return undefined;
	}
}

async function main() {
	try {
		dropInheritedHostEnvironment();

		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './index');

		// Without a folder there is no workspace for `workspaceContains:**/*.rgs`
		// to match, so the extension never activates and the server never
		// indexes anything.
		//
		// `--twee-werkmappen` opens a `.code-workspace` of two folders instead
		// ([N-10]): a scope is a workspace folder, so the multi-root shape is a
		// thing only a second folder can show. The second folder is
		// `samples/workspace/sample-notebook/`, the reglement in juridische
		// modus, so one run checks both the scope arithmetic and the sample that
		// is a model of its own. It is a second *run* rather than a flag inside
		// the existing one because VS Code decides the workspace at launch, and
		// every other suite here is written against
		// `samples/workspace/single-folder/` alone.
		const multiRoot = process.argv.includes('--twee-werkmappen');
		const workspacePath = process.env.CODE_TESTS_WORKSPACE
			?? (multiRoot
				? multiRootWorkspace(__dirname)
				: path.resolve(__dirname, '../../../samples/workspace/single-folder'));
		// Narrowed to the two suites that are about a workspace folder: the rest
		// assume one, and a run that fails them would say nothing about this.
		// `scopes` is the arithmetic, `reglement` the notebook sample that is the
		// second folder — and glob reads the braces, so adding a third is a word.
		if (multiRoot) {
			process.env.TEST_FILE = process.env.TEST_FILE ?? '{scopes,reglement}';
		}

		const version = process.env.VSCODE_TEST_VERSION
			?? supportedFloor(extensionDevelopmentPath);

		// Download VS Code, unzip it and run the integration test
		await runTests({
			version,
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				workspacePath,
				// Other extensions would only add noise and timing to the run;
				// the one under development is unaffected by this flag. Nor are
				// the **built-in** ones, which is why the notebook spike can ask
				// about the Markdown extension here rather than in a run of its
				// own (§4.1 #3 and #7, measured 11 September 2026).
				'--disable-extensions',
				// An untrusted folder puts extensions in restricted mode, where
				// the language server would never start.
				'--disable-workspace-trust'
			]
		});
	} catch (error) {
		console.error('Failed to run tests');
		console.error(error);
		process.exit(1);
	}
}

main();
