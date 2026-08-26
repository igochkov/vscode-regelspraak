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

/** An adapter over a canned server, with every reply it sends collected. */
function drive(reply: (request: { kind: string }) => unknown): {
	adapter: RegelSpraakDebugAdapter;
	sent: Record<string, unknown>[];
} {
	const sent: Record<string, unknown>[] = [];
	const client = {
		onNotification: (): { dispose(): void } => ({ dispose: (): void => undefined }),
		sendRequest: async (_method: string, request: { kind: string }): Promise<unknown> =>
			reply(request)
	} as unknown as LanguageClient;
	const adapter = new RegelSpraakDebugAdapter(client, {} as vscode.DebugSession);
	adapter.onDidSendMessage(message => sent.push(message as Record<string, unknown>));
	return { adapter, sent };
}

function send(adapter: RegelSpraakDebugAdapter, seq: number, command: string, args?: unknown): void {
	adapter.handleMessage(
		{ seq, type: 'request', command, arguments: args } as vscode.DebugProtocolMessage);
}

const settle = async (): Promise<void> =>
	await new Promise(resolve => setTimeout(resolve, 60));

// §X5 deel D — de Variabelen-lade.
//
// Een waarde komt als `value` **of** als `segments`, nooit als allebei. Deze
// kant droeg alleen `value`, dus elk tijdsafhankelijk attribuut stond als *leeg*
// in de lade — de server stuurde de periodes en niemand las ze. `coordinates`
// ontbrak om dezelfde reden en kostte hetzelfde: twee cellen van één
// gedimensioneerd attribuut werden twee regels met dezelfde naam en
// verschillende waarden.
suite('Debug-adapter: de stand in de Variabelen-lade (X5 deel D)', () => {
	const STOP = {
		rule: 'bepaal contributie',
		instance: 'Alice',
		parameters: [{ name: 'basistarief', value: '10 €' }],
		rekendatum: '15-06-2026',
		variables: ['korting'],
		kenmerken: [],
		values: [
			{ instance: 'Alice', attribute: 'contributie', value: '40 €', derived: true },
			{
				instance: 'Alice', attribute: 'tarief', derived: true,
				segments: [
					{ from: '01-01-2026', to: '01-07-2026', value: '10 €' },
					{ from: '01-07-2026', value: '12 €' }
				]
			},
			{
				instance: 'Alice', attribute: 'omzet', coordinates: ['roman'],
				value: '3 €', derived: true
			},
			{
				instance: 'Alice', attribute: 'omzet', coordinates: ['strip'],
				value: '7 €', derived: true
			}
		]
	};

	async function variables(): Promise<{ name: string; value: string }[]> {
		const { adapter, sent } = drive(request =>
			request.kind === 'start' ? { session: true, at: STOP } : { session: true, at: STOP });
		send(adapter, 1, 'launch', { program: 'd:/m/a.test.rgs', case: '001' });
		send(adapter, 2, 'configurationDone');
		send(adapter, 3, 'variables', { variablesReference: 1000 });
		await settle();
		const answer = sent.find(one => one.command === 'variables');
		assert.ok(answer, 'de lade hoort beantwoord te worden');
		adapter.dispose();
		return (answer.body as { variables: { name: string; value: string }[] }).variables;
	}

	test('schrijft een tijdsafhankelijke waarde als haar periodes, niet als leeg', async () => {
		const rows = await variables();
		const tarief = rows.find(one => one.name === 'Alice · tarief');
		assert.ok(tarief, rows.map(one => one.name).join(' | '));
		assert.ok(!tarief.value.includes('leeg'), `stond als: ${tarief.value}`);
		assert.ok(tarief.value.includes('van 01-01-2026 tot 01-07-2026: 10 €'), tarief.value);
		assert.ok(tarief.value.includes('vanaf 01-07-2026: 12 €'), tarief.value);
	});

	test('houdt twee cellen van één gedimensioneerd attribuut uit elkaar', async () => {
		const rows = await variables();
		const named = rows.map(one => one.name);
		assert.ok(named.includes('Alice · omzet [roman]'), named.join(' | '));
		assert.ok(named.includes('Alice · omzet [strip]'), named.join(' | '));
	});

	test('zet de rekendatum, de parameters en de variabelen vooraan', async () => {
		const rows = await variables();
		assert.strictEqual(rows[0].name, 'rekendatum');
		assert.strictEqual(rows[1].name, 'basistarief');
		// §11.1 maakt een variabele lui: bij een stop vóór de regel is er niets te
		// tonen, en dat zeggen is beter dan hem weglaten of leeg noemen.
		const korting = rows.find(one => one.name === 'korting');
		assert.ok(korting);
		assert.strictEqual(korting.value, 'nog niet berekend');
	});
});

// Het vangnet hield de ketting in leven en liet het antwoord vallen: een
// `sendRequest` die verwierp — een herstarte server, een geannuleerd verzoek —
// liet VS Code wachten op een antwoord dat nooit kwam.
suite('Debug-adapter: een mislukt verzoek (X5 deel C)', () => {
	test('beantwoordt een verzoek dat de server niet kon afhandelen', async () => {
		const { adapter, sent } = drive(() => {
			throw new Error('de taalserver is gestopt');
		});
		send(adapter, 1, 'setBreakpoints',
			{ source: { path: 'd:/m/a.test.rgs' }, breakpoints: [{ line: 21 }] });
		await settle();
		const answer = sent.find(one => one.command === 'setBreakpoints');
		assert.ok(answer, 'er hoort een antwoord te komen, ook een mislukt');
		assert.strictEqual(answer.success, false);
		assert.match(String(answer.message), /gestopt/u);
		adapter.dispose();
	});

	test('blijft daarna gewoon verzoeken afhandelen', async () => {
		let fail = true;
		const { adapter, sent } = drive(() => {
			if (fail) {
				fail = false;
				throw new Error('even niet');
			}
			return { session: false };
		});
		send(adapter, 1, 'setBreakpoints',
			{ source: { path: 'd:/m/a.test.rgs' }, breakpoints: [{ line: 21 }] });
		send(adapter, 2, 'threads');
		await settle();
		assert.deepStrictEqual(
			sent.filter(one => one.command).map(one => one.command),
			['setBreakpoints', 'threads']);
		adapter.dispose();
	});
});
