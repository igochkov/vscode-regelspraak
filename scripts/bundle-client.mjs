#!/usr/bin/env node
/**
 * Bundles the extension client into the single file the .vsix ships.
 *
 * This is a packaging step, not a build step. `npm run compile` (tsc) stays
 * the development build: it type-checks and emits `client/out/` with source
 * maps, which is what <kbd>F5</kbd> loads and debugs. This script *overwrites*
 * `client/out/extension.js` with a bundle, so `main` in package.json needs no
 * second path.
 *
 * **The development loop is not untouched by that, and the build info is
 * deleted below to make it so.** This comment used to claim otherwise, and
 * the claim is what made the consequence hard to suspect: `tsc -b` is
 * incremental, so once the bundle sits in the slot it emits to, an unchanged
 * `extension.ts` means the next build reports "up to date" and leaves it
 * there. <kbd>F5</kbd> then runs whatever was last packaged. Every other
 * module is *inlined* in that bundle, so a change to any of them compiles
 * cleanly, updates its own `client/out/*.js` — and is never loaded.
 *
 * Why bundle at all:
 *
 *   - Size. The client's dependency tree is ~6 MB on disk, most of it
 *     declarations and source maps that never run. The bundle is ~100 KB.
 *   - Correctness. Without it, `.vscodeignore` has to name every runtime
 *     dependency by hand to keep the tree down — and that list silently rots.
 *     If vscode-languageclient gains a dependency, the packaged extension
 *     fails at runtime with a module-not-found that nothing in CI would
 *     catch. Bundling removes the class of bug: whatever the code imports is
 *     inlined.
 *
 * `vscode` is provided by the host at runtime and must stay external — it is
 * not an npm package and cannot be bundled.
 *
 * Usage:  npm run bundle
 */
import { build } from 'esbuild';
import { rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(root, 'client', 'out', 'extension.js');

await build({
	entryPoints: [join(root, 'client', 'src', 'extension.ts')],
	outfile,
	bundle: true,
	minify: true,
	platform: 'node',
	format: 'cjs',
	// The extension host of the oldest VS Code we support (engines.vscode):
	// 1.101 was the release that moved it to Node 22.
	target: 'node22',
	// Supplied by the VS Code runtime, never from node_modules.
	external: ['vscode'],
	// No map is shipped: it would only serve to un-minify, and the sources are
	// public in this repository anyway. Omitting it also avoids a dangling
	// sourceMappingURL in the packaged file.
	sourcemap: false,
	legalComments: 'none',
	logLevel: 'warning'
});

// The build info `tsc -b` keeps, dropped: it still describes the output this
// script has just replaced. Deleting it costs a full re-emit of the client on
// the next build — a second or so — and buys back the guarantee that what
// <kbd>F5</kbd> loads is what the sources say. The alternative is bundling to
// a path of its own, which is the better fix and the larger one: `main` would
// then have to differ between the development tree and the package.
rmSync(join(root, 'client', 'tsconfig.tsbuildinfo'), { force: true });

console.log('bundle-client: dropped client/tsconfig.tsbuildinfo, so the next build re-emits over the bundle.');
console.log(`bundle-client: ${(statSync(outfile).size / 1024).toFixed(0)} KB -> ${outfile}`);
