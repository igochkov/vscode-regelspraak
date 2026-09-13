import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { altTextOf, drawable, svgOf, tableOf, textOf } from '../notebook/chart';
import { figureOf } from '../notebook/controller';
import { RunChart } from '../testExplorer';

import { activate, getDocUri, waitUntil } from './helper';

/**
 * The `// Visualisatie:` figure ([V-1]…[V-10]) — the client's two halves.
 *
 * **The drawing is pure and is checked by hand**, over charts built here rather
 * than over a run: where a knip falls, which points a line is broken into and
 * what a cell of the table says are the decisions this side makes, and a
 * notebook output cannot be driven from a test. That is `trackOf`'s split and
 * `verdict.ts`'s, one feature over.
 *
 * **And the output is checked end to end**, because what [V-3] claims is about
 * the workbench: that a testgeval cell carrying a directive comes back with an
 * `image/svg+xml` item under it, above the verdict it already had. The
 * measurement behind that claim is recorded in the server repository — VS Code's
 * built-in renderer lists the mime in its manifest *and* handles it in its code,
 * in 1.101, 1.123 and 1.137 — with the one condition the proposal did not
 * predict: it draws nothing at all in an untrusted workspace, which is why the
 * controller decides rather than leaving the choice to the workbench.
 */

/** A fixture of its own, for the reason its own header gives. */
const NOTEBOOK = vscode.Uri.file(path.resolve(
	__dirname, '../../src/test/fixtures/notebook/artikel-9-staffel.rgs.md'));

/** Any `.rgs` in the workspace, to have a server and a finished scan. */
const MODEL = getDocUri('gegevens/lid.rgs');

function chart(over: Partial<RunChart> = {}): RunChart {
	return {
		kind: 'staffel',
		title: 'De staffel',
		subject: 'Lid',
		x: { label: 'leeftijd', unit: 'jaar', scale: 'getal', zero: '0 jaar' },
		value: { label: 'contributie', unit: 'EUR', scale: 'getal', zero: '0 EUR' },
		series: [{
			label: 'contributie',
			points: [
				{ instance: 'A', x: 1, xLabel: '1 jaar', y: 10, yLabel: '10 EUR' },
				{ instance: 'B', x: 2, xLabel: '2 jaar', y: 20, yLabel: '20 EUR' }
			]
		}],
		...over
	};
}

/** The `d` of every path in a drawing, which is where the geometry ends up. */
function paths(svg: string): string[] {
	return [...svg.matchAll(/<path d="([^"]+)"/gu)].map(one => one[1]);
}

/** Every `<text>` of a drawing, in document order. */
function labels(svg: string): string[] {
	return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/gu)].map(one => one[1]);
}

suite('Figuur bij een rekenvoorbeeld ([V-3] rung 2)', () => {

	// -----------------------------------------------------------------------
	// The drawing, which is the half that decides anything.
	// -----------------------------------------------------------------------

	suite('de tekening', () => {

		test('een staffel houdt zijn waarde tot de volgende trede', () => {
			// `H` to the next x, then `V` to the new value: a step and not a ramp,
			// which is the whole difference between a staffel and a lijn.
			const [d] = paths(svgOf(chart()));
			assert.match(d, /^M[\d.]+,[\d.]+ H[\d.]+ V[\d.]+ H[\d.]+$/u, d);
		});

		test('en de laatste trede loopt door tot de rand', () => {
			// `21 jaar en ouder` is a bracket with no upper bound; a line stopping
			// at its first point would draw the opposite.
			const d = paths(svgOf(chart()))[0];
			const last = Number(/H([\d.]+)$/u.exec(d)![1]);
			const previous = Number([...d.matchAll(/H([\d.]+)/gu)].at(-2)![1]);
			assert.ok(last > previous, d);
		});

		test('een lijn verbindt zijn punten', () => {
			const [d] = paths(svgOf(chart({ kind: 'lijn' })));
			assert.match(d, /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/u, d);
		});

		test('een leeg punt breekt de lijn in plaats van er doorheen te trekken', () => {
			// Joining across a gap would draw a value the model does not have.
			const broken = chart({
				kind: 'lijn',
				series: [{
					label: 'contributie',
					points: [
						{ instance: 'A', x: 1, xLabel: '1', y: 10, yLabel: '10 EUR' },
						{ instance: 'B', x: 2, xLabel: '2', yLabel: 'leeg' },
						{ instance: 'C', x: 3, xLabel: '3', y: 30, yLabel: '30 EUR' }
					]
				}]
			});
			assert.equal(paths(svgOf(broken)).length, 2);
		});

		test('elke tik draagt een waarde die de figuur echt haalt', () => {
			// The rule this file is written to: nothing here formats a number, so
			// every label is a literal the server already rendered — the baseline
			// included, which is the one mark that is not a point of the data.
			const drawn = labels(svgOf(chart()));
			assert.ok(drawn.includes('10 EUR'), drawn.join(' | '));
			assert.ok(drawn.includes('20 EUR'), drawn.join(' | '));
			assert.ok(drawn.includes('1 jaar') && drawn.includes('2 jaar'), drawn.join(' | '));
		});

		test('een nulpunt komt erbij waar de waarden er niet aan raken', () => {
			// A bar drawn from a baseline the axis never names is a bar whose
			// length means nothing.
			assert.ok(labels(svgOf(chart())).includes('0 EUR'));
		});

		test('en het is de server die nul spelt, niet deze kant', () => {
			// A bare `0` used to be written here, beside ticks reading `10 EUR` on
			// the same axis — the second spelling of a value §X4 forbids this side
			// to invent. `ChartAxis.zero` is that number out of `showValue`, the
			// one renderer, and the digit is now nowhere in the file.
			const drawn = labels(svgOf(chart()));
			assert.ok(!drawn.includes('0'), drawn.join(' | '));
			assert.ok(drawn.includes('0 EUR'), drawn.join(' | '));
		});

		test('een as zonder nul krijgt geen nullijn', () => {
			// A `datum` axis places by day number, so baselining it at day 0 drew
			// two dates a year apart on top of each other at the very top of the
			// plot, under a gridline labelled `0`. The server sends no `zero` for
			// such an axis, and `scale` says so a second time.
			const dates = chart({
				value: { label: 'inschrijfdatum', scale: 'datum' },
				series: [{
					label: 'inschrijfdatum',
					points: [
						{ instance: 'A', x: 1, xLabel: '1 jaar', y: 2458850, yLabel: '01-01-2020' },
						{ instance: 'B', x: 2, xLabel: '2 jaar', y: 2459216, yLabel: '01-01-2021' }
					]
				}]
			});
			const drawn = labels(svgOf(dates));
			assert.ok(!drawn.includes('0'), drawn.join(' | '));
			// One gridline per tick, so two rather than three — and the two dates
			// are drawn a plot apart rather than on top of one another, which is
			// what the baseline cost them.
			const ys = [...svgOf(dates).matchAll(/<line x1="\d+(?:\.\d+)?" y1="([\d.]+)"[^>]*dasharray/gu)]
				.map(one => Number(one[1]));
			assert.equal(ys.length, 2, 'twee roosterlijnen en geen nullijn');
			assert.ok(Math.abs(ys[0] - ys[1]) > 150, `${ys.join(' en ')} liggen te dicht op elkaar`);
		});

		test('beide assen worden één keer genoemd, met hun eenheid', () => {
			// The x axis used to be named nowhere in the picture, on the reasoning
			// that it labels its own ticks — true of the *values* and not of the
			// *name*: a reader met `1 jaar · 2 jaar` with nothing saying those were
			// leeftijden, and a dimensionless axis was worse still.
			const drawn = labels(svgOf(chart()));
			assert.equal(drawn.filter(one => one === 'contributie (EUR)').length, 1, drawn.join(' | '));
			assert.equal(drawn.filter(one => one === 'leeftijd (jaar)').length, 1, drawn.join(' | '));
		});

		test('en een figuur zonder x-as noemt er geen', () => {
			const drawn = labels(svgOf(chart({
				kind: 'balk',
				x: undefined,
				series: [{
					label: 'contributie',
					points: [{ instance: 'A', xLabel: 'A', y: 10, yLabel: '10 EUR' }]
				}]
			})));
			assert.ok(!drawn.some(one => one.includes('leeftijd')), drawn.join(' | '));
		});

		test('een regime tekent zijn uitkomst dikker en noemt hem', () => {
			const svg = svgOf(chart({
				kind: 'regime',
				series: [
					{ label: 'artikel 15', points: chart().series[0].points },
					{ label: 'wat geldt', outcome: true, points: chart().series[0].points }
				]
			}));
			assert.ok(labels(svg).includes('wat geldt — wat geldt') || labels(svg).some(one => one.endsWith('— wat geldt')),
				labels(svg).join(' | '));
			assert.match(svg, /stroke-width="3"/u);
		});

		test('een balk heeft geen schaal en zet de instantie onder de staaf', () => {
			const svg = svgOf(chart({
				kind: 'balk',
				x: undefined,
				series: [{
					label: 'contributie',
					points: [
						{ instance: 'A', xLabel: 'A', y: 10, yLabel: '10 EUR' },
						{ instance: 'B', xLabel: 'B', y: 20, yLabel: '20 EUR' }
					]
				}]
			}));
			assert.equal(paths(svg).length, 0);
			assert.equal((svg.match(/<rect /gu) ?? []).length, 2);
			assert.ok(labels(svg).includes('A') && labels(svg).includes('B'));
		});

		test('een staaf wordt vanaf nul gemeten en niet vanaf de vloer', () => {
			// With every value above zero the two coincide, because the baseline
			// tick is in — but as soon as one value is negative the baseline moves
			// and drawing to the floor says the opposite of the data: a value of 0
			// came out three-quarters as tall as the largest bar and the most
			// negative value came out as a one-pixel nub at the bottom.
			const svg = svgOf(chart({
				kind: 'balk',
				x: undefined,
				value: { label: 'saldo', unit: 'EUR', scale: 'getal', zero: '0 EUR' },
				series: [{
					label: 'saldo',
					points: [
						{ instance: 'A', xLabel: 'A', y: -50, yLabel: '-50 EUR' },
						{ instance: 'B', xLabel: 'B', y: 20, yLabel: '20 EUR' },
						{ instance: 'C', xLabel: 'C', y: 0, yLabel: '0 EUR' }
					]
				}]
			}));
			const rects = [...svg.matchAll(/<rect [^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/gu)]
				.map(one => ({ top: Number(one[1]), height: Number(one[2]) }));
			assert.equal(rects.length, 3);
			// The zero bar is the short one, and it is the one that used to be tall.
			assert.equal(rects[2].height, 1, JSON.stringify(rects));
			// Negative hangs below the baseline, positive stands on it, and they
			// meet at one line.
			assert.equal(rects[0].top, rects[2].top, 'de negatieve staaf hangt aan de nullijn');
			assert.equal(rects[1].top + rects[1].height, rects[2].top,
				'de positieve staaf staat op de nullijn');
			// And the negative value is the longest bar, which is the whole point.
			assert.ok(rects[0].height > rects[1].height, JSON.stringify(rects));
		});

		test('een balk met een x-as tekent één rij bijschriften, niet twee', () => {
			// Both `bars`' own labels and the numeric x ticks were drawn at the same
			// y for a bar chart that named an x — two sets of labels on one line, on
			// top of each other.
			const svg = svgOf(chart({
				kind: 'balk',
				series: [{
					label: 'contributie',
					points: [
						{ instance: 'A', x: 1, xLabel: '1 jaar', y: 10, yLabel: '10 EUR' },
						{ instance: 'B', x: 2, xLabel: '2 jaar', y: 20, yLabel: '20 EUR' }
					]
				}]
			}));
			const drawn = labels(svg);
			assert.equal(drawn.filter(one => one === '1 jaar').length, 1, drawn.join(' | '));
			assert.equal(drawn.filter(one => one === '2 jaar').length, 1, drawn.join(' | '));
		});

		test('twee punten met hetzelfde bijschrift blijven twee punten', () => {
			// Both the table and the bar chart used to pair a series with a place by
			// `points.find(one => one.xLabel === label)`, which finds the *first* —
			// so two Leden of the same leeftijd were drawn and tabulated once, in
			// silence, under a caption that counted them twice.
			const twins = chart({
				kind: 'balk',
				series: [{
					label: 'contributie',
					points: [
						{ instance: 'A', x: 1, xLabel: '1 jaar', y: 10, yLabel: '10 EUR' },
						{ instance: 'B', x: 1, xLabel: '1 jaar', y: 20, yLabel: '20 EUR' },
						{ instance: 'C', x: 2, xLabel: '2 jaar', y: 30, yLabel: '30 EUR' }
					]
				}]
			});
			assert.equal((svgOf(twins).match(/<rect /gu) ?? []).length, 3);
			const rows = tableOf(twins).split('\n').filter(one => one.startsWith('| '));
			assert.deepEqual(rows.slice(2), [
				'| 1 jaar | 10 EUR |',
				'| 1 jaar | 20 EUR |',
				'| 2 jaar | 30 EUR |'
			]);
		});

		test('de reeks die overblijft krijgt de inkt, geen kleur', () => {
			// `overig` is the group a reeks leaves over: every other series is named
			// by the model and this one is named by us, so the kenmerk being asked
			// about takes the accent and the rest reads as the baseline it is.
			const svg = svgOf(chart({
				series: [
					{ label: 'jeugdlid', points: chart().series[0].points },
					{ label: 'overig', complement: true, points: chart().series[0].points }
				]
			}));
			const strokes = [...svg.matchAll(/<path[^>]*stroke="var\(--vscode-([a-z-]+)/gu)]
				.map(one => one[1]);
			assert.deepStrictEqual(strokes, ['charts-blue', 'charts-foreground']);
			// And the amber the two-series case used to land on is gone from it.
			assert.ok(!svg.includes('charts-orange'), svg);
		});

		test('samenvallende lijnen blijven twee lijnen', () => {
			// Where a staffel's two brackets hold the same value the later path
			// covers the earlier exactly, and the reader sees one line whose colour
			// changes along its length. A dash lets the one underneath through.
			const same = chart().series[0].points;
			const svg = svgOf(chart({
				series: [
					{ label: 'jeugdlid', points: same },
					{ label: 'overig', complement: true, points: same }
				]
			}));
			const dashes = [...svg.matchAll(/<path[^>]*?(stroke-dasharray="[^"]+")?\/>/gu)]
				.map(one => one[1] ?? 'vol');
			assert.deepStrictEqual(dashes, ['vol', 'stroke-dasharray="5 4"']);
		});

		test('de uitkomst van een regime ligt eronder, niet erover', () => {
			// A regime's outcome *is* one of the others over every stretch of the
			// domain, so on top it would cover whichever rule applies there.
			const points = chart().series[0].points;
			const svg = svgOf(chart({
				kind: 'regime',
				series: [
					{ label: 'artikel 15', points },
					{ label: 'wat geldt', outcome: true, points }
				]
			}));
			const widths = [...svg.matchAll(/<path[^>]*stroke-width="(\d)"/gu)].map(one => one[1]);
			assert.deepStrictEqual(widths, ['3', '2'], 'de dikke lijn hoort eerst getekend te worden');
			// The legend keeps the order the directive wrote them in.
			assert.deepStrictEqual(
				labels(svg).filter(one => one.startsWith('artikel') || one.startsWith('wat')),
				['artikel 15', 'wat geldt — wat geldt']);
		});

		test('een roosterlijn is te onderscheiden van een lijn die erop ligt', () => {
			// The ticks are the data's own values, so every gridline has a step of
			// the staffel lying exactly along it.
			const svg = svgOf(chart());
			const grid = [...svg.matchAll(/<line x1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*charts-lines[^>]*>/gu)];
			const across = grid.filter(one => one[1] !== one[2]);
			assert.ok(across.length > 0);
			assert.ok(across.every(one => one[0].includes('stroke-dasharray')), across[0][0]);
			// And the axis itself is **not** dashed: it is the edge of the plot
			// rather than a reading aid, and a dashed edge reads as a value.
			const spine = grid.filter(one => one[1] === one[2]);
			assert.equal(spine.length, 1);
			assert.ok(!spine[0][0].includes('stroke-dasharray'), spine[0][0]);
		});

		test('de kleur komt van het thema en niet van deze kant', () => {
			// BRD A-5's withdrawal binds a webview too. The literal after each
			// `var()` is a fallback, which applies only where the variable is
			// absent — no theme VS Code ships.
			const svg = svgOf(chart());
			assert.match(svg, /var\(--vscode-charts-blue,/u);
			assert.ok(!/stroke="#[0-9a-f]{6}"/iu.test(svg), 'geen vaste kleur buiten een var()');
		});

		test('de linkermarge groeit mee met het langste bijschrift', () => {
			// A tick label is a literal and carries its unit, so a fixed margin
			// clips `14,99 EUR/uur` or wastes half the plot on `20`.
			const wide = svgOf(chart({
				value: { label: 'staffelminimumuurloon', unit: 'EUR/uur', scale: 'getal' },
				series: [{
					label: 'loon',
					points: [{ instance: 'A', x: 1, xLabel: '1', y: 14.99, yLabel: '14,99 EUR/uur' }]
				}]
			}));
			const at = Number(/<text x="([\d.]+)"[^>]*text-anchor="end"[^>]*>14,99 EUR\/uur/u.exec(wide)![1]);
			assert.ok(at - '14,99 EUR/uur'.length * 5.6 > 0,
				`het bijschrift valt buiten de tekening bij x=${at}`);
		});

		test('een naam met Markdown erin blijft de naam die het model schreef', () => {
			// A label is the model's own text, exactly as `verdict.ts` says of an
			// assertion's.
			const table = tableOf(chart({ subject: 'een_naam_met_streepjes' }));
			assert.match(table, /een\\_naam\\_met\\_streepjes/u);
			// And a `|` would end the cell it is in.
			assert.match(tableOf(chart({ title: 'a|b' })), /a\\\|b/u);
		});

		test('de tabel zet elke reeks in een kolom, op plaats', () => {
			const table = tableOf(chart({
				series: [
					{ label: 'jeugdlid', points: [{ instance: 'B', x: 2, xLabel: '2 jaar', y: 5, yLabel: '5 EUR' }] },
					{ label: 'overig', points: chart().series[0].points }
				]
			}));
			const rows = table.split('\n').filter(one => one.startsWith('| '));
			assert.deepStrictEqual(rows.slice(2), [
				'| 2 jaar | 5 EUR | 20 EUR |',
				'| 1 jaar |  | 10 EUR |'
			]);
		});

		test('en de tekstvorm zegt hetzelfde, om in een ticket te plakken', () => {
			assert.match(textOf(chart()), /1 jaar\t10 EUR/u);
		});

		test('een tabel wordt niet getekend, en een figuur zonder waarde ook niet', () => {
			assert.equal(drawable(chart({ kind: 'tabel' })), false);
			assert.equal(drawable(chart({
				series: [{ label: 'x', points: [{ instance: 'A', x: 1, xLabel: '1', yLabel: 'leeg' }] }]
			})), false);
			assert.equal(drawable(chart()), true);
		});

		test('de alternatieve tekst zegt waar je naar kijkt, zonder getallen', () => {
			const alt = altTextOf(chart());
			assert.match(alt, /contributie \(EUR\) naar leeftijd \(jaar\)/u);
			assert.ok(!alt.includes('10 EUR'), alt);
		});

		test('het bijschrift telt de merktekens en noemt wat niet getekend is', () => {
			// A point with no value is not drawn — a line steps over it and no bar
			// is raised for it — so counting it said "2 punten" over one mark. What
			// it is instead is one of the instances `missing` counts.
			const table = tableOf(chart({
				missing: 2,
				series: [{
					label: 'contributie',
					points: [
						{ instance: 'A', x: 1, xLabel: '1 jaar', y: 10, yLabel: '10 EUR' },
						{ instance: 'B', x: 2, xLabel: '2 jaar', yLabel: 'leeg' }
					]
				}]
			}));
			assert.match(table, /Lid · 1 punt · 2 instanties niet getekend/u);
			// One and two are not the same word, in either column.
			assert.match(tableOf(chart({ missing: 1 })), /1 instantie niet getekend/u);
		});

		test('de zin onder een richtlijn die niets tekent is de naam die het model schreef', () => {
			// It quotes the model's own names back — `Objecttype 'het_Lid' heeft
			// geen kenmerk …` — and a `_` or a `*` inside one restyled the line it
			// was being reported in. The plain-text item beside it is not escaped,
			// being what somebody pastes into a ticket.
			const items = figureOf({
				case: 'x', outcome: 'uitgevoerd', assertions: [], faults: [],
				chartProblem: "Objecttype 'het_Lid' heeft geen kenmerk 'jeugd*lid'."
			})[0].items;
			const markdown = new TextDecoder().decode(
				items.find(one => one.mime === 'text/markdown')!.data);
			assert.match(markdown, /het\\_Lid/u);
			assert.match(markdown, /jeugd\\\*lid/u);
			const plain = new TextDecoder().decode(
				items.find(one => one.mime === 'text/plain')!.data);
			assert.ok(!plain.includes('\\'), plain);
		});

		test('en een richtlijn die niets oplevert levert ook geen uitvoer op', () => {
			assert.deepEqual(
				figureOf({ case: 'x', outcome: 'uitgevoerd', assertions: [], faults: [] }), []);
		});
	});

	// -----------------------------------------------------------------------
	// And the output under a real cell, against a real server and worker.
	// -----------------------------------------------------------------------

	suite('de uitvoer onder de cel', () => {

		let notebook: vscode.NotebookDocument;

		suiteSetup(async function () {
			this.timeout(120000);
			await activate(MODEL);
			// The same condition `notebookRun.test.ts` sets, and for its reason: a
			// loose file shares one scope with every other ([N-10]), the sibling
			// fixtures carry an RS101 on purpose, and the run gate looks at every
			// error in the scope.
			await vscode.workspace.getConfiguration('regelspraak.execution')
				.update('blockOnErrors', false, vscode.ConfigurationTarget.Global);
			notebook = await vscode.workspace.openNotebookDocument(NOTEBOOK);
			await vscode.window.showNotebookDocument(notebook);
		});

		suiteTeardown(async () => {
			await vscode.workspace.getConfiguration('regelspraak.execution')
				.update('blockOnErrors', undefined, vscode.ConfigurationTarget.Global);
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		});

		test('een testgeval met een richtlijn levert een tekening boven zijn oordeel', async function () {
			this.timeout(120000);
			const cell = notebook.getCells()
				.find(one => one.document.getText().includes('Testgeval De kortingsstaffel'))!;
			assert.ok(cell, 'de fixture hoort een testgeval met een richtlijn te hebben');
			await vscode.commands.executeCommand('notebook.cell.execute', {
				ranges: [{ start: cell.index, end: cell.index + 1 }],
				document: notebook.uri
			});
			const outputs = await waitUntil('de uitvoer van het testgeval met de figuur',
				() => cell.outputs.length > 0 ? cell.outputs : undefined);

			// Two outputs, and in this order: the figure *projects* what the run
			// derived and the verdict is what says whether the model is right, so
			// the picture is drawn above it and never instead of it ([V-1]).
			assert.equal(outputs.length, 2, outputs.map(one => one.items.map(i => i.mime).join('+')).join(' | '));
			assert.deepStrictEqual(outputs[0].items.map(one => one.mime), ['image/svg+xml']);
			assert.deepStrictEqual(outputs[1].items.map(one => one.mime), ['text/markdown', 'text/plain']);

			const svg = new TextDecoder().decode(outputs[0].items[0].data);
			assert.match(svg, /^<svg /u);
			// The staffel's own two series, out of a model that derives them.
			assert.match(svg, /vaste bezoeker/u);
			assert.match(svg, /9 EUR/u);
			// And the alt text the built-in renderer prepends as the picture's
			// `<title>`, which is where a screen reader reaches it.
			assert.match(String((outputs[0].metadata ?? {}).vscode_altText), /korting \(EUR\) naar aantal bezoeken/u);

			// The verdict is unchanged by any of it — the two expectations the
			// figure is also a test of ([V-5]).
			const verdict = new TextDecoder().decode(outputs[1].items[1].data);
			assert.match(verdict, /✓ B2/u, verdict);
			assert.match(verdict, /✓ V2/u, verdict);
			// And **not** the cell's own mark, which is a fact about the whole
			// scope rather than about this figure: everything outside a workspace
			// folder shares one scope ([N-10]), a sibling fixture in this folder
			// carries a broken rule on purpose, and a modelfout fails the case it
			// was run in whatever the expectations did ([E-29]). That was found
			// by running the suite together rather than alone, which is the only
			// arrangement that has the other fixtures indexed.
		});

		test('een testgeval zonder richtlijn levert alleen zijn oordeel', async function () {
			this.timeout(120000);
			const cell = notebook.getCells()
				.find(one => one.document.getText().includes('Testgeval De korting van één bezoeker'))!;
			await vscode.commands.executeCommand('notebook.cell.execute', {
				ranges: [{ start: cell.index, end: cell.index + 1 }],
				document: notebook.uri
			});
			const outputs = await waitUntil('de uitvoer van het testgeval zonder figuur',
				() => cell.outputs.length > 0 ? cell.outputs : undefined);
			assert.equal(outputs.length, 1);
			assert.ok(!outputs[0].items.some(one => one.mime === 'image/svg+xml'));
		});
	});
});
