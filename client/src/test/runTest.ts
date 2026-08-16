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
		const workspacePath = process.env.CODE_TESTS_WORKSPACE
			?? path.resolve(__dirname, '../../testFixture');

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
				// the one under development is unaffected by this flag.
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
