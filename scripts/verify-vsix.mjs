#!/usr/bin/env node
/**
 * Unpacks a built .vsix and proves the language server inside it actually
 * works — it starts, completes an LSP initialize, and answers with a
 * diagnostic for a document with a seeded error.
 *
 * This checks the artifact rather than the working tree on purpose. The
 * failure it exists to catch is a packaging one: `vsce` does not follow the
 * development junction, and the server's `require('../../../grammar/gen/…')`
 * reaches outside `server/`, so a .vsix can be built successfully and still
 * contain a language server that cannot load. Only the packed file tells you.
 *
 * Usage:  node scripts/verify-vsix.mjs <path-to-vsix>
 */
import { execFileSync } from 'node:child_process';
import { fork } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const vsix = resolve(process.argv[2] ?? 'vscode-regelspraak.vsix');
if (!existsSync(vsix)) {
	console.error(`verify-vsix: no such file: ${vsix}`);
	process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'rgs-vsix-'));
const cleanup = () => rmSync(work, { recursive: true, force: true });

function unzip(archive, into) {
	if (process.platform === 'win32') {
		// A .vsix is a zip; Expand-Archive insists on the extension.
		const copy = join(into, 'package.zip');
		execFileSync('powershell.exe', [
			'-NoProfile', '-NonInteractive', '-Command',
			`Copy-Item -LiteralPath '${archive}' -Destination '${copy}'; ` +
			`Expand-Archive -LiteralPath '${copy}' -DestinationPath '${into}' -Force`
		], { stdio: 'pipe' });
		return;
	}
	execFileSync('unzip', ['-q', archive, '-d', into], { stdio: 'pipe' });
}

/** Resolves with the server's diagnostics for a document with a known error. */
function exercise(serverEntry) {
	return new Promise((ok, bad) => {
		const server = fork(serverEntry, ['--node-ipc'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
		const stop = (fn, arg) => { server.kill(); fn(arg); };
		const timer = setTimeout(() => stop(bad, new Error('server did not answer within 30s')), 30_000);
		let stderr = '';

		server.stderr.on('data', chunk => { stderr += chunk; });
		server.on('exit', code => {
			if (code) {
				clearTimeout(timer);
				bad(new Error(`server exited with code ${code}\n${stderr}`));
			}
		});

		server.on('message', message => {
			if (message.id === 1) {
				const types = message.result?.capabilities?.semanticTokensProvider?.legend?.tokenTypes ?? [];
				console.log(`  initialize ok — ${types.length} semantic token types advertised`);
				server.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
				server.send({
					jsonrpc: '2.0',
					method: 'textDocument/didOpen',
					params: {
						textDocument: {
							uri: 'file:///verify.rgs',
							languageId: 'regelspraak',
							version: 1,
							// References a domain that is not declared anywhere: RS105.
							text: 'Objecttype de Kluis (mv: Kluizen)\n\tde huurprijs   Onbekenddomein;\n'
						}
					}
				});
			}
			if (message.method === 'textDocument/publishDiagnostics') {
				clearTimeout(timer);
				stop(ok, message.params.diagnostics ?? []);
			}
		});

		server.send({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: { processId: process.pid, rootUri: null, capabilities: {}, workspaceFolders: null }
		});
	});
}

try {
	unzip(vsix, work);
	const ext = join(work, 'extension');

	for (const required of [
		join(ext, 'server', 'out', 'server.js'),
		join(ext, 'grammar', 'gen', 'RegelSpraakParser.js'),
		join(ext, 'client', 'out', 'extension.js'),
		join(ext, 'syntaxes', 'regelspraak.tmLanguage.json'),
		join(ext, 'snippets', 'regelspraak.code-snippets'),
		join(ext, 'images', 'icon.png')
	]) {
		if (!existsSync(required)) {
			throw new Error(`the .vsix is missing ${required.slice(ext.length + 1)}`);
		}
	}
	console.log('  all required files present');

	const diagnostics = await exercise(join(ext, 'server', 'out', 'server.js'));
	const codes = diagnostics.map(d => String(d.code));
	console.log(`  diagnostics returned: ${codes.join(', ') || '(none)'}`);
	if (!codes.includes('RS105')) {
		throw new Error(`expected RS105 for the seeded unknown domain, got: ${codes.join(', ') || '(none)'}`);
	}

	console.log('\nverify-vsix: the packaged language server loads and validates correctly.\n');
} catch (error) {
	console.error(`\nverify-vsix: ${error.message}\n`);
	process.exitCode = 1;
} finally {
	cleanup();
}
