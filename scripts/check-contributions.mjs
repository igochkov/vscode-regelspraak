#!/usr/bin/env node
// Checks the files this extension *contributes* rather than the code it runs:
// the manifest, the two snippet sets, the language configuration, the generated
// TextMate grammar, and the Marketplace icon.
//
// None of it is reached by `tsc` or by `eslint`, and none of it is loaded by the
// test suite either — VS Code reads these at install time, so a trailing comma
// in a snippet file or an icon of the wrong size is a broken *published*
// extension with every gate green. That is what this is for.
//
// It lived inline in `ci.yml` until 12 September 2026 and moved here for the
// reason `docs/RELEASING.md` gives: every CI gate is a release gate, so a gate
// the rehearsal cannot run is one that gets supplemented from memory. CI and the
// rehearsal now call the same thing.
//
//   node scripts/check-contributions.mjs

import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

// VS Code allows `//` comments in a snippet file and in the language
// configuration, so strip whole-line ones before parsing. Nothing here holds a
// `//` inside a string, and a check that had to know would need a real parser.
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '');

const JSON_FILES = [
	'package.json',
	'language-configuration.json',
	'snippets/regelspraak.code-snippets',
	'snippets/testspraak.code-snippets',
	'syntaxes/regelspraak.tmLanguage.json',
];

// The Marketplace draws the icon at 128×128 and rejects a non-PNG outright.
const MIN_ICON = 128;

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const file of JSON_FILES) {
	try {
		JSON.parse(strip(readFileSync(file, 'utf8')));
		console.log(`✓ ${file}`);
	} catch (error) {
		fail(`${file}: ${error.message}`);
	}
}

// The icon's own bytes, because the manifest naming a file says nothing about
// what is in it. IHDR's width and height are big-endian uint32 at 16 and 20.
try {
	const bytes = readFileSync('images/icon.png');
	if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
		fail('images/icon.png is not a PNG');
	} else {
		const width = bytes.readUInt32BE(16);
		const height = bytes.readUInt32BE(20);
		if (width < MIN_ICON || height < MIN_ICON) {
			fail(`images/icon.png is ${width}×${height}; the Marketplace wants at least ${MIN_ICON}×${MIN_ICON}`);
		} else {
			console.log(`✓ images/icon.png (${width}×${height})`);
		}
	}
} catch (error) {
	fail(`images/icon.png: ${error.message}`);
}

if (failed) { exit(1); }
console.log('\ncheck-contributions: every contributed file parses, and the icon is one the Marketplace takes.');
