// The figure a testgeval cell draws ([V-3] rung 2) — the drawing half, and only
// the drawing half.
//
// **The server decides what the chart is about; this decides where the ink
// goes** ([V-10]). Every number here is a coordinate and every label is a string
// the server already rendered: nothing in this file parses a literal, converts a
// unit, compares two values or formats a number. That is §X4's rule about the
// run surface, and it binds a picture exactly as it binds a table — `12,5` and
// `12.5` are the same value and two spellings, and the second one is not this
// side's to invent.
//
// **Which is why the ticks come from the data.** An axis could be marked at
// round numbers, and doing that would mean choosing them, formatting them, and
// writing Dutch decimals here. The values the run actually produced are already
// on hand, already spelled by the one renderer, and for the shape this exists to
// draw — a staffel — they are exactly the right marks: the ticks *are* the
// staffel's steps. Where there are too many they are thinned; every label that
// survives names a value the chart reaches.
//
// **Colour is the theme's** — BRD A-5's withdrawal binds a webview, and VS Code
// ships a palette meant for this: `charts.red`, `charts.blue` and the rest are
// theme colours with a documented id, so a chart drawn in them is legible in a
// theme nobody here has seen. The literal after each `var()` is a fallback and
// not an override: it applies only where the variable is absent, which is no
// theme VS Code ships.
//
// **Pure, and exported, for `trackOf`'s reason**: a notebook output cannot be
// driven from a test, so the half that decides anything — where a knip falls,
// which points a series holds, what a cell of the table says — lives where a
// test reaches it.

import { ChartAxis, RunChart, ChartPoint, ChartSeries } from '../testExplorer';
import { escapeMarkdown } from './verdict';

/** The plot, in the units an SVG is written in. */
const WIDTH = 680;
const PLOT_TOP = 34;
const PLOT_HEIGHT = 210;
const RIGHT = 18;
/** The narrowest left margin; a longer tick label widens it. */
const LEFT_MIN = 44;
/** What one character of a 10px label costs, measured against the faces VS Code ships. */
const CHAR = 5.6;
/** The band under the plot: one row of tick labels, and the axis' name under them. */
const X_LABELS = 22;
const X_AXIS_NAME = 12;
const LEGEND_ROW = 17;
const CAPTION = 18;

/** At most this many ticks per axis; beyond it every other one is dropped. */
const MAX_TICKS = 9;

/**
 * The theme's own chart palette, in the order a reader meets it.
 *
 * Six and then it wraps: a figure with seven series has stopped being one
 * picture about one bepaling ([V-7]), and wrapping says so more honestly than
 * inventing a seventh colour would.
 */
const PALETTE = [
	'var(--vscode-charts-blue, #3794ff)',
	'var(--vscode-charts-orange, #d18616)',
	'var(--vscode-charts-green, #89d185)',
	'var(--vscode-charts-purple, #b180d7)',
	'var(--vscode-charts-red, #f14c4c)',
	'var(--vscode-charts-yellow, #cca700)'
];

const INK = 'var(--vscode-charts-foreground, var(--vscode-editor-foreground, #cccccc))';
const MUTED = 'var(--vscode-descriptionForeground, #9d9d9d)';
const GRID = 'var(--vscode-charts-lines, var(--vscode-panel-border, #3c3c3c))';

/**
 * How a series is stroked, beside its colour.
 *
 * **Two lines that coincide have to stay two lines**, and colour alone cannot
 * say so: where a staffel's two brackets hold the same value the later-drawn
 * path covers the earlier exactly, so the reader sees one line whose colour
 * changes along its length — reported from the artikel 8 figure, where the two
 * staffels are identical below 18 and again from 21. A dash lets the line
 * underneath show through, which is the picture saying *both are here*. It is
 * also the encoding that does not depend on being able to tell two hues apart.
 *
 * The first series is solid, and so is a `regime`'s outcome, which is drawn
 * underneath everything and thicker.
 */
const DASHES = ['', '5 4', '2 3', '9 3 2 3', '1 3'];

/** What one series is drawn with. */
interface Pen {
	colour: string;
	width: number;
	dash: string;
}

/**
 * A pen per series, in the order the directive lists them.
 *
 * **The complement gets the ink rather than a hue**, which is the one place a
 * series' *colour* carries a meaning. `overig` is the group a reeks leaves over:
 * every other series is named by the model and this one is named by us, so the
 * kenmerk being asked about takes the accent and the rest reads as the baseline
 * it is. It also removes the two-hue problem from the commonest figure there is
 * — one attribuut split by one kenmerk — where the pair used to be blue against
 * the theme's amber, which more than one theme renders as a muddy brown.
 */
function pens(series: readonly ChartSeries[]): Pen[] {
	let hue = 0;
	return series.map((one, at) => ({
		colour: one.complement ? INK : colourOf(hue++),
		width: one.outcome ? 3 : 2,
		dash: one.outcome ? '' : DASHES[at % DASHES.length]
	}));
}

/** `stroke-dasharray="…"`, or nothing at all for a solid line. */
function dashed(pen: Pen): string {
	return pen.dash.length > 0 ? ` stroke-dasharray="${pen.dash}"` : '';
}

/** One axis tick: where it sits, and the label the model already wrote for it. */
interface Tick {
	at: number;
	label: string;
}

/**
 * Whether this chart can be drawn at all.
 *
 * A `tabel` is rung 1 by request, and a chart with no placeable point is a
 * picture of nothing — in both cases the table is the answer, which is what
 * `tableOf` is for. Exported because the controller decides between the two and
 * that decision belongs to one predicate.
 */
export function drawable(chart: RunChart): boolean {
	return chart.kind !== 'tabel'
		&& chart.series.some(one => one.points.some(point => point.y !== undefined));
}

/**
 * The figure as one SVG document.
 *
 * Self-contained on purpose: it is what a notebook exports, prints and pastes,
 * so its title, its legend and its note travel inside the picture rather than
 * beside it.
 */
export function svgOf(chart: RunChart): string {
	const categorical = chart.x === undefined;
	// **A `balk` writes its own labels under its bars, so it draws no x ticks.**
	// Both were drawn at `bottom + 15` for a bar chart that named an x, which is
	// two sets of labels on one line, on top of each other.
	const placed = chart.kind !== 'balk' && !categorical;
	const series = chart.series;
	const legendRows = series.length;
	const xBand = X_LABELS + (chart.x ? X_AXIS_NAME : 0);
	const height = PLOT_TOP + PLOT_HEIGHT + xBand + legendRows * LEGEND_ROW + CAPTION;
	const bottom = PLOT_TOP + PLOT_HEIGHT;

	const yTicks = valueTicks(series, chart.value);
	// The left margin is measured rather than fixed, because a tick label is a
	// RegelSpraak literal and carries its unit: `14,99 EUR/uur` is twice as wide
	// as `20`, and a fixed margin clips one or wastes half the plot on the other.
	// An estimate from the character count, as UX-5's `fitLabels` measures — this
	// side has no font metrics and does not need them, since being a few pixels
	// generous costs nothing and being short clips a number.
	const LEFT = Math.max(LEFT_MIN,
		12 + Math.max(0, ...yTicks.map(one => one.label.length)) * CHAR);
	const xTicks = placed ? placeTicks(series) : [];
	const domainY = extent(yTicks.map(one => one.at));
	const domainX = categorical ? { min: 0, max: 1 } : xExtent(chart, series);

	const y = (value: number): number =>
		bottom - (domainY.max === domainY.min
			? PLOT_HEIGHT / 2
			: ((value - domainY.min) / (domainY.max - domainY.min)) * PLOT_HEIGHT);
	const x = (value: number): number =>
		LEFT + (domainX.max === domainX.min
			? (WIDTH - LEFT - RIGHT) / 2
			: ((value - domainX.min) / (domainX.max - domainX.min)) * (WIDTH - LEFT - RIGHT));

	const parts: string[] = [];
	parts.push(`<text x="${LEFT}" y="18" fill="${INK}" font-size="13" font-weight="600">${escape(chart.title)}</text>`);
	// The value axis is named here rather than rotated up the side of the plot:
	// its ticks are the run's own literals and carry the unit already, so what is
	// missing is the *name*, and a horizontal subtitle says it without the
	// typographic fuss of vertical text.
	parts.push(`<text x="${WIDTH - RIGHT}" y="18" fill="${MUTED}" font-size="10.5" text-anchor="end">${escape(axisName(chart.value))}</text>`);

	// The grid first, so every mark sits on top of it — and **dashed**, because
	// the ticks are the data's own values, so every gridline has a step of the
	// staffel lying exactly along it. A solid one is then indistinguishable from
	// the line it is meant to help read.
	for (const tick of yTicks) {
		parts.push(`<line x1="${LEFT}" y1="${round(y(tick.at))}" x2="${WIDTH - RIGHT}" y2="${round(y(tick.at))}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 3"/>`);
		parts.push(`<text x="${LEFT - 8}" y="${round(y(tick.at) + 3.5)}" fill="${MUTED}" font-size="10" text-anchor="end">${escape(tick.label)}</text>`);
	}
	parts.push(`<line x1="${LEFT}" y1="${PLOT_TOP}" x2="${LEFT}" y2="${bottom}" stroke="${GRID}" stroke-width="1"/>`);

	const ink = pens(series);
	if (chart.kind === 'balk') {
		// **A bar is measured from zero, not from the floor of the plot.** With
		// every value above zero the two coincide, because `valueTicks` puts a
		// baseline tick in — but as soon as one value is negative the baseline
		// moves and drawing to the floor says the opposite of the data: a value
		// of 0 came out three-quarters as tall as the largest bar, and the most
		// negative value came out as a one-pixel nub at the bottom.
		parts.push(...bars(chart, ink, LEFT, y, clamp(y(0), PLOT_TOP, bottom), bottom));
	} else {
		// A `regime`'s outcome is drawn **first**, so it lies underneath: it *is*
		// one of the others over every stretch of the domain, by definition, and
		// on top it would cover whichever rule applies there. Underneath and
		// thicker, the competing line runs along a band, which reads as *here this
		// one is what holds*.
		const order = [...series.keys()].sort(
			(a, b) => Number(series[b].outcome ?? false) - Number(series[a].outcome ?? false));
		for (const at of order) {
			parts.push(...line(chart, series[at], ink[at], x, y, domainX));
		}
	}

	// The x labels last among the marks: a bar chart writes its own.
	if (placed) {
		xTicks.forEach((tick, at) => {
			// The outermost labels are anchored inwards, which is UX-5's own ruling
			// about a track's dates: a centred label on the plot's own edge is half
			// outside the picture.
			const anchor = at === 0 && x(tick.at) <= LEFT + 1
				? 'start'
				: at === xTicks.length - 1 && x(tick.at) >= WIDTH - RIGHT - 1 ? 'end' : 'middle';
			parts.push(`<text x="${round(x(tick.at))}" y="${bottom + 15}" fill="${MUTED}" font-size="10" text-anchor="${anchor}">${escape(tick.label)}</text>`);
		});
	}

	// **The x axis is named, and used not to be.** Only the value axis carried a
	// name, on the reasoning that the x axis labels its own ticks — true of the
	// *values* and not of the *name*: a reader met `18 jaar · 20 jaar · 21 jaar`
	// with nothing anywhere saying those were leeftijden, and a dimensionless
	// axis was worse still, `1 · 2 · 3` with nothing saying what was counted.
	// Under the tick labels rather than beside them, mirroring the value axis at
	// the top and out of the way of the outermost tick, which is anchored to the
	// same edge.
	if (chart.x) {
		parts.push(`<text x="${WIDTH - RIGHT}" y="${bottom + X_LABELS + 5}" fill="${MUTED}" font-size="10.5" text-anchor="end">${escape(axisName(chart.x))}</text>`);
	}

	const legendTop = bottom + xBand + 10;
	for (const [at, one] of series.entries()) {
		const row = legendTop + at * LEGEND_ROW;
		// The legend's own stroke is the series' pen and not an approximation of
		// it: a key that showed a solid line for a dashed series would be the one
		// place in the picture that lies about which line is which.
		parts.push(`<line x1="${LEFT}" y1="${row}" x2="${LEFT + 22}" y2="${row}" stroke="${ink[at].colour}" stroke-width="${ink[at].width}"${dashed(ink[at])}/>`);
		parts.push(`<text x="${LEFT + 30}" y="${row + 3.5}" fill="${MUTED}" font-size="10.5">${escape(one.label)}${one.outcome ? ' — wat geldt' : ''}</text>`);
	}

	parts.push(`<text x="${LEFT}" y="${height - 5}" fill="${MUTED}" font-size="10">${escape(caption(chart))}</text>`);

	const label = altTextOf(chart);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}"`
		+ ` style="max-width:100%;height:auto" role="img" aria-label="${escape(label)}"`
		+ ` font-family="var(--vscode-font-family, sans-serif)">${parts.join('')}</svg>`;
}

/** A `lijn`/`staffel`/`regime` series as one or more paths, broken where a value is leeg. */
function line(
	chart: RunChart,
	series: ChartSeries,
	pen: Pen,
	x: (value: number) => number,
	y: (value: number) => number,
	domainX: { min: number; max: number }
): string[] {
	const { colour, width } = pen;
	const parts: string[] = [];
	// A gap is a gap: a leeg value breaks the line rather than being joined
	// across, which would draw a value the model does not have.
	for (const run of runsOf(series.points)) {
		const steps = run.map(point => ({ x: x(point.x ?? domainX.min), y: y(point.y!) }));
		const d = chart.kind === 'staffel'
			? stepPath(steps, x(domainX.max))
			: steps.map((one, index) => `${index === 0 ? 'M' : 'L'}${round(one.x)},${round(one.y)}`).join(' ');
		parts.push(`<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linejoin="round"${dashed(pen)}/>`);
		if (run.length === 1) {
			parts.push(`<circle cx="${round(steps[0].x)}" cy="${round(steps[0].y)}" r="${width}" fill="${colour}"/>`);
		}
	}
	return parts;
}

/**
 * A step path: the value holds from its own x until the next one.
 *
 * The last step runs to the right edge, which is what makes a staffel readable —
 * `21 jaar en ouder` is a bracket with no upper bound, and a line stopping at
 * its first point would draw the opposite.
 */
function stepPath(steps: readonly { x: number; y: number }[], edge: number): string {
	const parts = [`M${round(steps[0].x)},${round(steps[0].y)}`];
	for (const step of steps.slice(1)) {
		parts.push(`H${round(step.x)}`, `V${round(step.y)}`);
	}
	parts.push(`H${round(edge)}`);
	return parts.join(' ');
}

/** A `balk` chart: one group per place, one bar per series, measured from zero. */
function bars(
	chart: RunChart,
	ink: readonly Pen[],
	left: number,
	y: (value: number) => number,
	zero: number,
	foot: number
): string[] {
	const series = chart.series;
	const places = placesOf(chart);
	const slot = (WIDTH - left - RIGHT) / Math.max(places.length, 1);
	const width = Math.max(2, (slot * 0.7) / Math.max(series.length, 1));
	const parts: string[] = [];
	places.forEach((place, group) => {
		const centre = left + slot * (group + 0.5);
		place.points.forEach((point, index) => {
			if (!point || point.y === undefined) {
				return;
			}
			const at = y(point.y);
			const bar = centre - (width * series.length) / 2 + width * index;
			parts.push(`<rect x="${round(bar)}" y="${round(Math.min(at, zero))}" width="${round(width)}" height="${round(Math.max(Math.abs(at - zero), 1))}" fill="${ink[index].colour}"/>`);
		});
		parts.push(`<text x="${round(centre)}" y="${foot + 15}" fill="${MUTED}" font-size="10" text-anchor="middle">${escape(place.label)}</text>`);
	});
	return parts;
}

/** One place on the x axis: its label, and the point each series has there. */
interface Place {
	label: string;
	/** Aligned with `chart.series`; `undefined` where that series has no point here. */
	points: (ChartPoint | undefined)[];
}

/**
 * The places a chart has, in the order they are first met.
 *
 * **Two points that print the same label are two places, not one**, and that is
 * the whole of why this exists. Both the table and the bar chart used to pair a
 * series with a place by `points.find(one => one.xLabel === label)`, which finds
 * the *first* — so two Leden of the same leeftijd in one series were drawn and
 * tabulated once, in silence, under a caption that counted them twice. Slots are
 * keyed by the label **and the ordinal of that label inside its own series**, so
 * the k-th point at one label lines up across series and nothing is dropped.
 *
 * One implementation for the two readers, for the reason this codebase keeps
 * relearning: a picture and a table that disagree about what the run produced
 * are worse than either being absent.
 */
function placesOf(chart: RunChart): Place[] {
	const order: string[] = [];
	const byKey = new Map<string, Place>();
	chart.series.forEach((series, column) => {
		const seen = new Map<string, number>();
		for (const point of series.points) {
			const ordinal = seen.get(point.xLabel) ?? 0;
			seen.set(point.xLabel, ordinal + 1);
			const key = `${point.xLabel} ${ordinal}`;
			let place = byKey.get(key);
			if (!place) {
				place = { label: point.xLabel, points: chart.series.map(() => undefined) };
				byKey.set(key, place);
				order.push(key);
			}
			place.points[column] = point;
		}
	});
	return order.map(key => byKey.get(key)!);
}

/** Into the plot, for a baseline the domain does not reach. */
function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

/** Contiguous runs of points that have a value — the pieces a broken line is drawn in. */
function runsOf(points: readonly ChartPoint[]): ChartPoint[][] {
	const runs: ChartPoint[][] = [];
	let current: ChartPoint[] = [];
	for (const point of points) {
		if (point.y === undefined) {
			if (current.length > 0) {
				runs.push(current);
				current = [];
			}
			continue;
		}
		current.push(point);
	}
	if (current.length > 0) {
		runs.push(current);
	}
	return runs;
}

/**
 * The value-axis ticks: the values the run produced, thinned to fit.
 *
 * **Zero is added where the values do not reach it**, because a bar drawn from a
 * baseline the axis never names is a bar whose length means nothing — and for a
 * line it is the difference between "this grew by a tenth" and "this tripled".
 *
 * Two things decide whether there *is* such a tick, and both come from the
 * server. **`scale`** says whether this axis has a zero worth reaching for: a
 * `datum` axis places by day number, so baselining it at day 0 drew two dates a
 * year apart on top of each other at the very top of the plot, under a gridline
 * labelled `0`. And **`zero`** says how the axis spells it — `0 EUR/uur`, out of
 * `showValue`, the one renderer — because writing the digit here put a bare `0`
 * on an axis whose every other tick carried a unit, which is the second spelling
 * of a value this side is not allowed to invent (§X4).
 *
 * It is added **below** the values as readily as above them: a bar chart of
 * negative amounts hangs its bars from a zero line just as one of positive
 * amounts stands them on it.
 */
function valueTicks(series: readonly ChartSeries[], axis: ChartAxis): Tick[] {
	const seen = new Map<number, string>();
	for (const one of series) {
		for (const point of one.points) {
			if (point.y !== undefined && !seen.has(point.y)) {
				seen.set(point.y, point.yLabel);
			}
		}
	}
	const values = [...seen.entries()].sort((a, b) => a[0] - b[0]);
	if (values.length === 0) {
		return [];
	}
	const zero = axis.scale === 'getal' ? axis.zero : undefined;
	if (zero !== undefined && values[0][0] > 0) {
		values.unshift([0, zero]);
	} else if (zero !== undefined && values[values.length - 1][0] < 0) {
		values.push([0, zero]);
	}
	return thin(values.map(([at, label]) => ({ at, label })));
}

/** The place-axis ticks: every distinct x the data has, thinned to fit. */
function placeTicks(series: readonly ChartSeries[]): Tick[] {
	const seen = new Map<number, string>();
	for (const one of series) {
		for (const point of one.points) {
			if (point.x !== undefined && !seen.has(point.x)) {
				seen.set(point.x, point.xLabel);
			}
		}
	}
	return thin([...seen.entries()].sort((a, b) => a[0] - b[0]).map(([at, label]) => ({ at, label })));
}

/**
 * Every other tick, until they fit.
 *
 * Dropped rather than shrunk or rotated, which is UX-5's own ruling about a
 * track's labels: the first and the last are kept, so the axis always states
 * where it begins and ends.
 */
function thin(ticks: Tick[]): Tick[] {
	let kept = ticks;
	while (kept.length > MAX_TICKS) {
		const last = kept[kept.length - 1];
		kept = kept.filter((_, at) => at % 2 === 0);
		if (kept[kept.length - 1] !== last) {
			kept.push(last);
		}
	}
	return kept;
}

function extent(values: readonly number[]): { min: number; max: number } {
	if (values.length === 0) {
		return { min: 0, max: 1 };
	}
	return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * The x domain, with a staffel's last bracket given room to be seen.
 *
 * One step wide, taken from the gaps the data has — the bracket is genuinely
 * open at that end, and drawing it as wide as its neighbours says so without
 * claiming a bound the model does not state.
 */
function xExtent(chart: RunChart, series: readonly ChartSeries[]): { min: number; max: number } {
	const values = series.flatMap(one => one.points.flatMap(point => point.x === undefined ? [] : [point.x]));
	const found = extent(values);
	if (chart.kind !== 'staffel') {
		return found;
	}
	const sorted = [...new Set(values)].sort((a, b) => a - b);
	const step = sorted.length > 1
		? (sorted[sorted.length - 1] - sorted[0]) / (sorted.length - 1)
		: Math.max(found.max - found.min, 1);
	return { min: found.min, max: found.max + step };
}

function colourOf(at: number): string {
	return PALETTE[at % PALETTE.length];
}

function axisName(axis: { label: string; unit?: string }): string {
	return axis.unit ? `${axis.label} (${axis.unit})` : axis.label;
}

/** The line under the picture: what it is about, and what it could not draw. */
function caption(chart: RunChart): string {
	// **Marks, not points the run happens to hold.** A point with no value is not
	// drawn — a line steps over it and no bar is raised for it — so counting it
	// here said "8 punten" over seven marks. What it is instead is one of the
	// instances `missing` counts.
	const points = chart.series.reduce(
		(total, one) => total + one.points.filter(point => point.y !== undefined).length, 0);
	// Not the axis names: the value axis is the subtitle and the x axis is named
	// under its own ticks, so repeating them here would be the third time a
	// reader met the same two words.
	const parts = [`${chart.subject} · ${points} ${points === 1 ? 'punt' : 'punten'}`];
	if (chart.missing) {
		// "niet getekend" and no longer "zonder plaats op de x-as": the server
		// counts an instance with no *value* here too, and naming one of the two
		// causes for both would be wrong about half of them.
		parts.push(`${chart.missing} ${chart.missing === 1 ? 'instantie' : 'instanties'} niet getekend`);
	}
	return parts.join(' · ');
}

/**
 * What a screen reader is told, and what the built-in renderer puts in the
 * picture's own `<title>` when it is passed as `vscode_altText`.
 *
 * Names the axes and the series and no numbers: the table beside it is where the
 * numbers are read, and this is the sentence that says what is being looked at.
 */
export function altTextOf(chart: RunChart): string {
	const over = chart.x ? ` naar ${axisName(chart.x)}` : ' per instantie';
	return `${chart.title}: ${axisName(chart.value)}${over}, `
		+ `${chart.series.length === 1 ? 'één reeks' : `${chart.series.length} reeksen`} `
		+ `(${chart.series.map(one => one.label).join(', ')}).`;
}

/**
 * The same figure as a Markdown table — rung 1 ([V-3]).
 *
 * Three jobs at once, and that is why it is worth having rather than being the
 * fallback nobody sees: it is the `tabel` kind, it is what an untrusted
 * workspace gets (where the built-in renderer draws SVG as nothing at all), and
 * it is what a reader copies into a ticket.
 */
export function tableOf(chart: RunChart): string {
	const rows = rowsOf(chart);
	const header = [chart.x ? axisName(chart.x) : chart.subject, ...chart.series.map(one => one.label)];
	return [
		`**${escapeMarkdown(chart.title)}** — ${escapeMarkdown(caption(chart))}`,
		'',
		`| ${header.map(escapeMarkdown).join(' | ')} |`,
		`| ${header.map(() => '---').join(' | ')} |`,
		...rows.map(row => `| ${row.map(escapeMarkdown).join(' | ')} |`)
	].join('\n');
}

/** The same table as plain text, for pasting into a ticket — W3's text form. */
export function textOf(chart: RunChart): string {
	const header = [chart.x ? axisName(chart.x) : chart.subject, ...chart.series.map(one => one.label)];
	return [
		`${chart.title} — ${caption(chart)}`,
		header.join('\t'),
		...rowsOf(chart).map(row => row.join('\t'))
	].join('\n') + '\n';
}

/**
 * The points as rows: one per place, one column per series.
 *
 * Through `placesOf`, which is also what the bar chart groups by — so the table
 * and the picture hold the same number of things. Two points that print the same
 * label are two rows with that label repeated, which reads oddly and is true;
 * folding them into one dropped a value the run produced without saying so.
 */
function rowsOf(chart: RunChart): string[][] {
	return placesOf(chart).map(place => [
		place.label,
		...place.points.map(point => point?.yLabel ?? '')
	]);
}

/** Coordinates are written to one decimal: an SVG this size needs no more. */
function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function escape(text: string): string {
	return text
		.replace(/&/gu, '&amp;')
		.replace(/</gu, '&lt;')
		.replace(/>/gu, '&gt;')
		.replace(/"/gu, '&quot;');
}

// A cell of the table is the model's own text and may hold a `|` or a `*`, so
// it goes through the one escaper — `verdict.ts`'s, which every Markdown a cell
// prints already uses. Two copies of that rule differ exactly where it is hard.
