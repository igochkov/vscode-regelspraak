#!/usr/bin/env node
/**
 * Stages the RegelSpraak language server into this repository so that
 * `vsce package` can bundle it.
 *
 * Why this exists: the extension is split across two repositories (this
 * public client, and the private regelspraak-lsp that holds the server and
 * the ANTLR grammar). A .vsix has to contain both, and three details make
 * that more than a single copy:
 *
 *   1. `vsce` does not follow directory junctions, so the symlink used for
 *      local development is invisible to packaging — the server must be
 *      physically copied in.
 *   2. The compiled server does `require('../../../grammar/gen/…')`, which
 *      from `<ext>/server/out/<dir>/` resolves to `<ext>/grammar/gen`. The
 *      generated parser therefore has to ship too, outside `server/`.
 *   3. `antlr4ng` is a root dependency of regelspraak-lsp (the generated
 *      parser and the server deliberately share one copy), so it is absent
 *      from that repo's `server/package.json` and has to be added to the
 *      staged server's production dependencies explicitly.
 *
 * Usage:
 *   node scripts/assemble-server.mjs [path-to-regelspraak-lsp]
 *
 * Defaults to ../regelspraak-lsp. The source repository must already be
 * built (`npm ci && npm run gen:parser && npm run compile` there).
 */
import { execFileSync } from 'node:child_process';
import {
	cpSync, existsSync, lstatSync, mkdirSync, readFileSync,
	readdirSync, rmSync, unlinkSync, writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.argv[2] ?? '../regelspraak-lsp');

const fail = (message) => {
	console.error(`\nassemble-server: ${message}\n`);
	process.exit(1);
};

// --- Preconditions ---------------------------------------------------------

if (!existsSync(source)) {
	fail(`no server repository at ${source}\n` +
		'Pass its path as an argument, or clone igochkov/regelspraak-lsp next to this repo.');
}
const serverEntry = join(source, 'server', 'out', 'server.js');
if (!existsSync(serverEntry)) {
	fail(`${serverEntry} is missing — build the server first:\n` +
		`  cd ${source} && npm ci && npm run gen:parser && npm run compile`);
}
const genDir = join(source, 'grammar', 'gen');
if (!existsSync(join(genDir, 'RegelSpraakParser.js'))) {
	fail(`${genDir} has no compiled parser — run 'npm run gen:parser && npm run compile' in ${source}.`);
}

// --- Clear previous staging ------------------------------------------------

/**
 * Removes a staged directory. If the path is a junction/symlink (the local
 * development link into the server repo), only the link is removed — never
 * the directory it points at.
 */
function clear(path) {
	if (!existsSync(path)) {
		return;
	}
	if (lstatSync(path).isSymbolicLink()) {
		try {
			unlinkSync(path);
		} catch {
			rmSync(path, { recursive: false, force: true });
		}
		console.log(`  removed development link ${path}`);
		console.log('    (restore it later with:  mklink /J server ..\\regelspraak-lsp\\server)');
		return;
	}
	rmSync(path, { recursive: true, force: true });
}

clear(join(root, 'server'));
clear(join(root, 'grammar'));

// --- Copy compiled output --------------------------------------------------

/** Copies a tree, keeping only the given extensions. */
function copyFiltered(from, to, extensions) {
	mkdirSync(to, { recursive: true });
	for (const entry of readdirSync(from, { withFileTypes: true })) {
		const src = join(from, entry.name);
		const dest = join(to, entry.name);
		if (entry.isDirectory()) {
			copyFiltered(src, dest, extensions);
		} else if (extensions.some(ext => entry.name.endsWith(ext))) {
			cpSync(src, dest);
		}
	}
}

// Source maps and .d.ts files are not needed at runtime and would roughly
// double the payload.
copyFiltered(join(source, 'server', 'out'), join(root, 'server', 'out'), ['.js']);
copyFiltered(genDir, join(root, 'grammar', 'gen'), ['.js']);
console.log('  copied server/out and grammar/gen');

// --- Production dependencies for the staged server -------------------------

const serverPkg = JSON.parse(readFileSync(join(source, 'server', 'package.json'), 'utf8'));
const sourceRootPkg = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));

// antlr4ng is loaded both by the staged server and by grammar/gen. Node
// resolves node_modules by walking up from each requiring file, and the only
// directory on both paths is the extension root — so it is declared in this
// repository's package.json and installed there, not under server/.
const sourceAntlr = sourceRootPkg.dependencies?.antlr4ng;
const ourAntlr = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies?.antlr4ng;
if (!sourceAntlr) {
	fail(`antlr4ng is not a dependency of ${join(source, 'package.json')} — the layout changed; update this script.`);
}
if (sourceAntlr !== ourAntlr) {
	fail(`antlr4ng version drift: this repo declares ${ourAntlr ?? '(none)'}, ` +
		`${join(source, 'package.json')} declares ${sourceAntlr}.\n` +
		'Update the "antlr4ng" dependency in package.json to match, then re-run.');
}

writeFileSync(join(root, 'server', 'package.json'), JSON.stringify({
	name: 'regelspraak-language-server-bundle',
	description: 'Staged language server bundled into the .vsix — generated by scripts/assemble-server.mjs.',
	private: true,
	version: serverPkg.version ?? '0.0.0',
	dependencies: serverPkg.dependencies
}, null, '\t') + '\n');

console.log('  installing server production dependencies…');
// Windows needs a shell to run npm.cmd at all (Node refuses to spawn .cmd
// directly since CVE-2024-27980). Node warns that shell arguments are
// concatenated unescaped, DEP0190 — harmless here because every argument
// below is a fixed literal, so there is nothing to inject through.
execFileSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--no-package-lock'], {
	cwd: join(root, 'server'),
	stdio: 'inherit',
	shell: process.platform === 'win32'
});

// --- Verify the staged server actually loads -------------------------------

// Cheapest possible guard against the failure this script exists to prevent:
// a .vsix whose server cannot resolve grammar/gen or its dependencies.
try {
	execFileSync(process.execPath, ['-e', `require(${JSON.stringify(join(root, 'server', 'out', 'server.js'))})`], {
		stdio: 'pipe',
		timeout: 30_000
	});
} catch (error) {
	const stderr = String(error.stderr ?? '');
	// The server starts an LSP connection and waits, so a timeout means it
	// loaded fine; only a module-resolution error is a real failure.
	if (/Cannot find module/.test(stderr)) {
		fail(`the staged server cannot resolve its imports:\n${stderr}`);
	}
}

console.log('\nassemble-server: staged server/ and grammar/ — ready for `vsce package`.\n');
