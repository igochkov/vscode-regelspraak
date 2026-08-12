#!/usr/bin/env node
/**
 * Installs a nested package's dependencies, honouring its lockfile where that
 * is what the caller asked for.
 *
 * This repository keeps a second `package.json` under `client/`, so a root
 * install has to reach it. `npm install` there is right for a developer: it
 * resolves whatever `client/package.json` now asks for, and updates the
 * lockfile when the two have diverged. It is wrong for CI and for a release,
 * where `npm ci` at the root promises that the tree is exactly what the
 * lockfiles describe — and then the nested `npm install` quietly resolved fresh
 * versions anyway, so what was built was not what was locked.
 *
 * So: `npm ci` when running in CI and a lockfile exists — which also fails
 * loudly if that lockfile and its package.json have drifted, the condition
 * worth hearing about before a release rather than after — and `npm install`
 * otherwise.
 *
 * Usage: node scripts/install-nested.mjs <directory>
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const map = process.argv[2];
if (!map) {
	console.error('install-nested: geef de map van het geneste pakket op');
	process.exit(1);
}

const pad = resolve(map);
if (!existsSync(join(pad, 'package.json'))) {
	console.error(`install-nested: geen package.json in ${pad}`);
	process.exit(1);
}

const heeftLock = existsSync(join(pad, 'package-lock.json'));
const opdracht = process.env.CI && heeftLock ? 'ci' : 'install';

console.log(`install-nested: npm ${opdracht} in ${map}` +
	(opdracht === 'install' && process.env.CI ? ' (geen lockfile)' : ''));

// Through the npm that invoked us, which a lifecycle script always has in
// `npm_execpath`. Spawning `npm.cmd` instead would need `shell: true` on
// Windows, where Node refuses to exec a `.cmd` without one — and a shell
// concatenates its arguments, which Node deprecates for good reason.
const npm = process.env.npm_execpath;
if (npm) {
	execFileSync(process.execPath, [npm, opdracht], { cwd: pad, stdio: 'inherit' });
} else {
	// Run by hand rather than through npm.
	execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', [opdracht], {
		cwd: pad,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
}
