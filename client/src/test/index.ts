/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
// mocha is CommonJS and this build does not enable esModuleInterop, so the
// require-style import is the only form that yields a callable constructor.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Mocha = require('mocha');
import { glob } from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});
	mocha.timeout(100000);

	const testsRoot = __dirname;

	// TEST_FILE=diagnostiek narrows a run to one suite; end-to-end failures are
	// otherwise hard to pull apart from the state earlier suites leave behind.
	const patroon = process.env.TEST_FILE ? `${process.env.TEST_FILE}*.test.js` : '**.test.js';

	return glob.glob(patroon, { cwd: testsRoot }).then(async files => {

		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

		try {
			// Run the mocha test
			await new Promise<void>((resolve, reject) => {
				mocha.run(failures => {
					if (failures > 0) {
						reject(`${failures} tests failed.`);
					} else {
						resolve();
					}
				});
			});
		} catch (err) {
			console.error(err);
			throw err;
		}
	});
}