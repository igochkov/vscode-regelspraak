// §X5 part C — the half of the launch path that decides anything.
//
// A debug session cannot be driven from a test, so what is testable is the
// configuration the resolver hands back. That is exactly where the first cut
// went wrong: it returned `{...config, program}`, which resolved without error
// and launched nothing, because with no `launch.json` VS Code hands the
// resolver an empty object and silently drops anything lacking `type`,
// `request` and `name`. A failure that looks like success is the shape worth a
// test.

import * as assert from 'assert';

import { launchConfiguration } from '../debugAdapter';

suite('Debug-launchconfiguratie (X5 deel C)', () => {
	test('vult aan wat F5 zonder launch.json niet meestuurt', () => {
		// What VS Code actually passes when there is no launch.json: nothing.
		const config = launchConfiguration({}, 'd:/model/boekerij.test.rgs', '001');
		assert.strictEqual(config.type, 'regelspraak');
		assert.strictEqual(config.request, 'launch');
		assert.ok(config.name, 'zonder naam start VS Code niets');
		assert.strictEqual(config.program, 'd:/model/boekerij.test.rgs');
		assert.strictEqual((config as { case?: string }).case, '001');
	});

	test('laat een naam uit launch.json staan', () => {
		const config = launchConfiguration(
			{ name: 'Mijn sessie' }, 'd:/model/boekerij.test.rgs', '001');
		assert.strictEqual(config.name, 'Mijn sessie');
	});

	test('houdt type en request van zichzelf, wat er ook binnenkomt', () => {
		// The provider only ever answers for its own type; a configuration that
		// said otherwise would be launched by something else, or by nothing.
		const config = launchConfiguration(
			{ type: 'node', request: 'attach' }, 'd:/model/boekerij.test.rgs', '001');
		assert.strictEqual(config.type, 'regelspraak');
		assert.strictEqual(config.request, 'launch');
	});
});
