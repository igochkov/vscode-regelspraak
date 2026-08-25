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

import { LanguageClient } from 'vscode-languageclient/node';
import * as vscode from 'vscode';

import {
	RegelSpraakDebugAdapter, launchConfiguration, statedCase, stopsOnEntry
} from '../debugAdapter';

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

	// Een gegenereerde launch.json draagt `"case": ""` als plaatshouder, en `??`
	// houdt een lege string vast — de start faalde dan met "noemt een testgeval"
	// op een configuratie die VS Code zelf net had geschreven.
	test('een lege of blanke case telt niet als een naam', () => {
		assert.strictEqual(statedCase({}), undefined);
		assert.strictEqual(statedCase({ case: '' }), undefined);
		assert.strictEqual(statedCase({ case: '   ' }), undefined);
		assert.strictEqual(statedCase({ case: '  001  ' }), '001');
	});

	// De twee gevallen willen tegengestelde antwoorden. Zonder breekpunten is de
	// sessie voorbij voordat iemand hem zag; mét breekpunten heeft de lezer al
	// gezegd waar hij wil staan, en stoppen bij de eerste regel leest dan als een
	// breekpunt dat genegeerd werd — precies de melding die dit vond.
	test('stopt bij de eerste regel alleen als er geen breekpunten zijn', () => {
		assert.strictEqual(stopsOnEntry(undefined, 0), true);
		assert.strictEqual(stopsOnEntry(undefined, 1), false);
		// Wat de configuratie zelf zegt, wint van allebei.
		assert.strictEqual(stopsOnEntry(true, 3), true);
		assert.strictEqual(stopsOnEntry(false, 0), false);
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

suite('Debug-adapter: volgorde (X5 deel E)', () => {
	test('behandelt één verzoek tegelijk, in de volgorde van binnenkomst', async () => {
		// **DAP-verzoeken zijn geordend; ze tegelijk afhandelen is een race.** Die
		// die beet: `setBreakpoints` wacht op een rondje naar de server, en
		// `configurationDone` — dat er vlak achteraan komt en beslist of de run
		// vóór de eerste regel blijft staan — las de breekpuntentelling terwijl dat
		// rondje nog onderweg was. F5 stopte dan bij de eerste regel alsof er niets
		// gemarkeerd was, en Continue ging vervolgens meteen naar het breekpunt —
		// wat het laat lezen als "die eerste stop is overbodig" in plaats van als
		// een race. Hij kwam boven toen het antwoord van de server tráger werd, niet
		// toen het fout werd.
		const seen: string[] = [];
		let delay = 30;
		const client = {
			// The adapter subscribes to `regelspraak/debugStopped` on construction.
			onNotification: (): { dispose(): void } => ({ dispose: (): void => undefined }),
			sendRequest: async (): Promise<unknown> => {
				const mine = delay;
				delay = 0;
				await new Promise(resolve => setTimeout(resolve, mine));
				return { session: false, marks: [] };
			}
		} as unknown as LanguageClient;
		const adapter = new RegelSpraakDebugAdapter(client, {} as vscode.DebugSession);
		adapter.onDidSendMessage(message => {
			const reply = message as { command?: string };
			if (reply.command) {
				seen.push(reply.command);
			}
		});

		// Het eerste verzoek is traag, het tweede niet. Zonder ketening antwoordt
		// het tweede eerst.
		adapter.handleMessage({
			seq: 1, type: 'request', command: 'setBreakpoints',
			arguments: { source: { path: 'd:/m/a.test.rgs' }, breakpoints: [{ line: 21 }] }
		} as vscode.DebugProtocolMessage);
		adapter.handleMessage({
			seq: 2, type: 'request', command: 'threads'
		} as vscode.DebugProtocolMessage);

		await new Promise(resolve => setTimeout(resolve, 200));
		assert.deepStrictEqual(seen, ['setBreakpoints', 'threads']);
		adapter.dispose();
	});
});
