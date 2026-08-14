/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

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
