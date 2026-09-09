// X4/W3 — what a run shows, decided once.
//
// There are two renderers over this: `runDocument.ts` writes it as text and
// `runPanel.ts` draws it as a panel. Neither decides anything. Which sections
// exist, in what order, what goes in them and what each row can be clicked
// through to is settled here, because the alternative is two views of one run
// that disagree — and a reader has no way to tell which of them is the answer.
//
// Three content rules survive from X4 and are the reason this is not a free
// mapping of the wire types:
//
//   - **Sections are never sorted.** Input before derived, because a reader
//     checking a surprising number starts from what was given; the trace in the
//     order the writes happened, because that order *is* the derivation.
//   - **Every value is already a RegelSpraak literal.** The server rendered it
//     ([E-18] exact rationals, units by canonical key), so nothing here parses,
//     converts or compares a value. A renderer that did would be a second
//     arithmetic.
//   - **A rule that did not fire says so.** An empty view reads as a failed run,
//     which is a different fact and a worse one to be told by accident.

import { WireRange } from './model';
import { RunDetail, RunSegment, RunStep, TestRun } from './testExplorer';

/**
 * What a row is, which is the whole of how a renderer styles it.
 *
 * Deliberately about the *fact*, not about the colour: `pass`/`fail` rather than
 * green/red, so a theme decides and the text renderer can ignore it. Adding a
 * kind means answering "what is this a statement about?" — which is also why
 * `given` and `derived` are two kinds for one shape of row.
 */
export type RunRowKind =
	| 'pass' | 'fail' | 'fault' | 'inconsistency'
	| 'given' | 'derived' | 'segment'
	| 'write' | 'operand' | 'step' | 'fired' | 'skipped' | 'note'
	// UX-6. Three, because they are three statements: a value that moved, a fact
	// that appeared, and one that is gone. A renderer marks them differently and
	// a reader reads them differently, which is what makes them kinds.
	| 'changed' | 'appeared' | 'vanished';

/**
 * One end of a period: the day a track lays it out by, and the date a reader
 * sees under the tick.
 *
 * Both, because they answer different questions and neither is derivable from
 * the other on this side — the day is arithmetic the server did, and the text is
 * the language's own spelling of it (§13.2 #19).
 */
export interface RunBound {
	day: number;
	text: string;
}

export interface RunRow {
	kind: RunRowKind;
	/** The left-hand side: what this row is about. */
	label: string;
	/** What it is, where the row states one — joined with ` = ` in text. */
	value?: string;
	/** The right-hand column: a diff, a count, a message, a value. Never a link. */
	note?: string;
	/**
	 * The rule behind this row, where there is one.
	 *
	 * A name and not a location, because that is all the run has: what "writes" a
	 * rule is its own declaration, which sits in no rule body. A renderer that
	 * offers a jump resolves it through the workspace symbols.
	 */
	rule?: string;
	/**
	 * Where that rule is *shown*, which differs by section and is known here.
	 *
	 * `label` — the label already names it (a fault, an inconsistency, a fired
	 * rule), so drawing it again would repeat the row's own text back at itself.
	 * `beside` — it is attribution after the value, drawn as `← <rule>`.
	 * Absent — the rule is not shown, and so is not a way to anywhere.
	 */
	ruleAt?: 'label' | 'beside';
	/**
	 * A qualifier drawn after the rule's name, where the run knows which part of
	 * it acted — a beslistabel's deciding row (§12) and, inside a recursive rule
	 * group, which repetition wrote this ([RG-9]).
	 *
	 * Beside `rule` rather than folded into it, because `rule` is a **name**: it
	 * is what `revealRule` matches exactly against the workspace symbols, and
	 * `Contributiestaffel (rij 2)` declares nothing. So the qualifier is drawn
	 * and never clicked.
	 *
	 * Here rather than in `note`, which is where §9.10's repetition would
	 * otherwise sit: UX-1's derivation section **replaces** a write row's note to
	 * mark it `eindwaarde` or `overschreven`, and a pass number that vanished in
	 * exactly the section a reader opens to compare four writes of one slot would
	 * be missing where it is wanted most.
	 */
	ruleDetail?: string;
	/** Where this row is written in the testset, for the rows that are. */
	range?: WireRange;
	/**
	 * The period this row states, where it states one (UX-5).
	 *
	 * Day numbers, so a renderer that draws a track lays it out without doing
	 * arithmetic on the label beside it — the label is for reading and this is
	 * for drawing, and neither is derived from the other. An absent bound is an
	 * open period, which a track runs off its own edge for.
	 *
	 * Content, not presentation: it is the period the run recorded. The text
	 * renderer ignores it, which is what "the two renderers may draw differently
	 * and may not decide differently" permits.
	 */
	span?: { from?: RunBound; to?: RunBound };
	/**
	 * Whether this row states a period that holds no value (UX-5).
	 *
	 * The fact and not the word: a track shades an empty stretch, and reading
	 * that off the rendered `value` would be this side parsing a literal the
	 * server spelled.
	 */
	empty?: boolean;
	/**
	 * The write behind this row, where it has not been fetched yet (UX-3).
	 *
	 * A detailed run names every write and carries the inside of none of them —
	 * the arithmetic and the operands are 82% of a trace's bytes and matter for
	 * the one write a reader is chasing. So a row that has something behind it
	 * says which write that is, in the four fields that identify one, and the
	 * renderer fetches it on the click that opens the row.
	 *
	 * **Set only where the data is genuinely absent.** Where the entry arrived
	 * complete — a caller that asked for everything, or a server retaining
	 * nothing — the children are already there and this is unset, so `buildView`
	 * has one code path and the two shapes are told apart by the data rather than
	 * by a mode nobody can see in a test.
	 */
	needs?: RunNeeds;
	/**
	 * The collection this row's value is, where it is one (UX-4).
	 *
	 * **Everything needed to ask again, and nothing that is an answer.** An
	 * expansion is recomputed rather than read back, so what a row carries is the
	 * question — the sentence, the rule whose scope it is read in, and the
	 * instance the write was about. The elements arrive later and are the
	 * renderer's to hold, because they are a fact about a click and not about the
	 * run: two readers of one view may have opened different rows.
	 */
	expand?: { expression: string; rule: string; instance?: string };
	/** Operands under a write, periods under a timeline value. */
	children?: RunRow[];
	/**
	 * Whether those children are shown without asking.
	 *
	 * A *finding* shows its reason — an inconsistency whose failing criterion is
	 * behind a click is a report the reader has to interrogate. A trace hides its
	 * operands, because there the reason matters for one line out of forty.
	 */
	open?: boolean;
	/** Set by `withLinks` — one per row at most, and never by hand. */
	link?: RunLink;
}

/**
 * Where a row's one click-through hangs, and what it opens.
 *
 * **One per row.** Not a style rule: the first version of this worked it out in
 * the renderer from whichever piece happened to be present, which left a fired
 * rule with a count unclickable and one without a count printing its own name
 * behind itself as the link. A row states what it has; `withLinks` decides.
 */
/**
 * Which write to fetch, and what to do with it when it arrives (UX-3).
 *
 * `kind` is not about the fetch — one write is one write — but about the row
 * asking: a **write** row shows what the rule did and out of what, and an
 * **operand** row shows only the operands of the rule behind it, which is what
 * the eager chain already did. Two readings of one entry, decided here rather
 * than by whoever draws it.
 */
export interface RunNeeds {
	kind: 'schrijving' | 'operand';
	rule: string;
	target: string;
	instance?: string;
	coordinates?: string[];
}

export type RunLink =
	| { on: 'label' | 'beside'; kind: 'reveal'; range: WireRange }
	| { on: 'label' | 'beside'; kind: 'revealRule'; rule: string }
	/**
	 * UX-6 → UX-1: this run, read as an answer about this slot.
	 *
	 * The one link that opens a *view* rather than a place, and it is here rather
	 * than in the renderer because it is the same decision every other link is:
	 * what a row states is what it can be followed to. A changed value states a
	 * slot, and the next question about a value that moved is always how it came
	 * about — which is the section **Leg uit** already draws, over a run this
	 * side is already holding.
	 */
	| { on: 'label' | 'beside'; kind: 'explain'; attribute: string; instance?: string }
	/**
	 * UX-3: run this testgeval again, because the run this panel is drawing is
	 * no longer one the server can be asked about.
	 *
	 * The one link that is not about a place *or* a view but about doing
	 * something, and it exists because a reader who has hit that state has no
	 * obvious way back — the panel is a projection of a run and the lens that
	 * made it is in a file they may not have open. It appears only on the row
	 * that says the run is gone, so it is never an invitation to re-run a run
	 * that is perfectly good.
	 */
	| { on: 'label' | 'beside'; kind: 'opnieuw' };

export interface RunSection {
	title: string;
	rows: RunRow[];
	/**
	 * Whether the rows read as two columns.
	 *
	 * A presentation hint and not content: the text renderer pads `note` into a
	 * column, the panel puts it in a cell, and a section of writes wants neither.
	 */
	aligned?: boolean;
}

/**
 * What a view is *about*, where it is about less than the whole run.
 *
 * Two kinds, and they are two questions rather than two shapes of one:
 *
 *   - `regel` is X2b — the run read as an answer about one rule. It leads with
 *     what that rule wrote and whether it fired at all.
 *   - `waarde` is UX-1 — the run read as an answer about one value, which is the
 *     question a rules writer actually starts from. It leads with the derivation
 *     of that slot, opened, so the tree is already standing where they clicked
 *     instead of forty rows down a trace.
 *
 * Both leave everything below them untouched, because the whole run *is* the
 * context: a rule's inputs are whatever the rules before it derived ([E-7]).
 */
export type RunFocus =
	| { kind: 'regel'; rule: string }
	| {
		kind: 'waarde';
		attribute: string;
		instance?: string;
		/**
		 * Every rule that writes this slot, from `regelspraak/explainTarget`
		 * (UX-2) — the one half of the emptiness diagnosis a run cannot supply.
		 *
		 * On the *focus* rather than as a fourth argument, because it is part of
		 * what the question is about: the view is about a slot, and which rules
		 * were entitled to fill it is a fact about that slot and not about the
		 * run. Absent where nothing asked — an older caller, or a server that did
		 * not answer — and then the diagnosis names no candidates rather than
		 * concluding there are none.
		 */
		writers?: string[];
	};

export interface RunView {
	/** The tab's name: what the view is about, else the testgeval. */
	name: string;
	/**
	 * The rekendatum as a day number, where the run states one (UX-5).
	 *
	 * A track draws it as a cursor, because *which segment is the run actually
	 * standing in* is what most timeline bugs reduce to. On the view rather than
	 * on each row: it is one fact about the run and every track on the page
	 * answers to it.
	 */
	rekendatumDay?: number;
	/** The same date as the language writes it, for the cursor's own label. */
	rekendatum?: string;
	/** One line saying what this is, and one saying which run it was. */
	heading: string;
	meta: string;
	/** Set where the run never happened; every section is then empty. */
	refusal?: { reason: string; details: string[] };
	sections: RunSection[];
}

/**
 * The view of a finished run, optionally focused on one rule.
 *
 * `focus` is X2b: the same run read as an answer about one rule rather than about
 * a testgeval's expectations. It adds two sections at the top and changes nothing
 * below them, because the whole run *is* the context — a rule's inputs are
 * whatever the rules before it derived ([E-7]), so the numbers under it are how
 * the number above it came about.
 */
export function buildView(
	fileName: string,
	run: TestRun,
	focus?: RunFocus,
	/**
	 * The previous run of this testgeval, where the view is a comparison (UX-6).
	 *
	 * A fourth argument rather than a kind of focus, because it is not what the
	 * view is *about*: a comparison is still a view of this run, with one section
	 * in front saying what moved. Absent is the ordinary case and draws nothing —
	 * a first run has nothing to be compared with, and a section saying so would
	 * be furniture on every panel.
	 */
	previous?: TestRun
): RunView {
	const view: RunView = {
		name: focus ? focusName(focus) : run.case,
		heading: headingFor(run, focus),
		meta: `${fileName}${run.detail ? ` · rekendatum ${run.detail.rekendatum}` : ''}`
			+ (previous ? ' · vergeleken met de vorige uitvoering' : ''),
		...(run.detail?.rekendatumDay === undefined
			? {}
			: { rekendatumDay: run.detail.rekendatumDay, rekendatum: run.detail.rekendatum }),
		sections: []
	};

	if (run.outcome === 'geweigerd') {
		view.refusal = {
			reason: run.reason ?? 'zonder opgegeven reden',
			details: run.details ?? []
		};
		return view;
	}

	// **Ahead of the focus**, which is the only place it can be: a reader who
	// asked what changed asked about the whole run, and a section under a
	// derivation would be an answer to a narrower question than the one put.
	if (previous) {
		view.sections.push(changes(run, previous));
	}

	if (focus && run.detail) {
		view.sections.push(...(focus.kind === 'regel'
			? ruleSections(focus.rule, run.detail)
			: valueSections(focus, run)));
	}

	view.sections.push({
		title: 'Verwachtingen',
		aligned: true,
		rows: run.assertions.length === 0
			? [{ kind: 'note', label: '(geen — dit testgeval voert alleen uit)' }]
			// The rule that produced the value is deliberately not offered here: the
			// expectation's own line is what a reader changes, and the rule is one
			// click away in Afgeleid and in the trace, on the value itself.
			: run.assertions.map((one): RunRow => ({
				kind: one.passed ? 'pass' : 'fail',
				label: one.label,
				range: one.range,
				note: one.passed
					? one.actual
					: `verwacht ${one.expected ?? 'leeg'}, werkelijk ${one.actual ?? 'leeg'}`
			}))
	});

	if (run.faults.length > 0) {
		view.sections.push({
			title: 'Fouten tijdens de uitvoering',
			aligned: true,
			rows: run.faults.map((one): RunRow => ({
				kind: 'fault',
				label: withInstance(one.rule, one.instance),
				rule: one.rule,
				ruleAt: 'label',
				note: one.message
			}))
		});
	}

	const detail = run.detail;
	if (!detail) {
		return withLinks(view);
	}

	// Which rule last wrote each derived value — see `writers`.
	const wroteIt = writers(detail);

	if (detail.inconsistencies.length > 0) {
		view.sections.push({
			title: 'Inconsistent bevonden',
			rows: detail.inconsistencies.map((one): RunRow => {
				const why = reasons(one);
				return {
					kind: 'inconsistency',
					label: withInstance(one.rule, one.instance),
					rule: one.rule,
					ruleAt: 'label',
					...(why.length > 0 ? { children: why, open: true } : {})
				};
			})
		});
	}

	// Input before derived. The order is the point, not the grouping: a reader
	// checking a number they did not expect starts from what was handed in.
	for (const [title, derived] of [['Gegeven', false], ['Afgeleid', true]] as const) {
		const values = detail.values.filter(one => one.derived === derived);
		if (values.length > 0) {
			view.sections.push({
				title,
				aligned: true,
				rows: values.map(one => valueRow(one, derived, wroteIt))
			});
		}
	}

	const kenmerken = detail.kenmerken.filter(one => one.present);
	if (kenmerken.length > 0) {
		view.sections.push({
			title: 'Kenmerken',
			aligned: true,
			rows: kenmerken.map((one): RunRow => ({
				kind: one.derived ? 'derived' : 'given',
				label: `${one.instance} · ${one.kenmerk}`,
				note: one.derived ? 'afgeleid' : 'gegeven',
				// A kenmerktoekenning (§13.4.5) is a write like any other, so a derived
				// kenmerk is in the trace and has a rule that put it there.
				...attribution(wroteIt.get(stateKey(one.instance, one.kenmerk)), one.derived)
			}))
		});
	}

	if (detail.trace.length > 0) {
		// Built once, not once per row: `producedBy` walks the whole trace, and
		// calling it inside the `map` made drawing a trace quadratic in the largest
		// thing a run produces.
		const wrote = producedBy(detail);
		view.sections.push({
			title: 'Trace, in de volgorde waarin geschreven werd',
			rows: detail.trace.map(one => writeRow(one, true, wrote))
		});
	}

	view.sections.push({
		title: 'Gevuurde regels',
		aligned: true,
		rows: detail.firedRules.map((one): RunRow => ({
			kind: 'fired',
			label: one.rule,
			rule: one.rule,
			ruleAt: 'label',
			note: one.count === 1 ? undefined : `${one.count}×`
		}))
	});

	return withLinks(view);
}

/**
 * UX-6 — *wat is er veranderd?*, between this run and the one before it.
 *
 * **A list of differences and nothing else.** Everything it compares is already
 * on the wire, so this composes rather than computes: two runs of one testgeval
 * are two situations, and what a reader wants after an edit is the handful of
 * places they differ rather than two panels to hold side by side.
 *
 * **Comparison is by rendered literal, and that is exact rather than lax.**
 * Every value on this wire came from `showValue` on the server, so one value
 * spells one way — `1,00 EUR` and `1 EUR` cannot both arrive for one slot,
 * because the same renderer wrote both runs. That is what lets this side compare
 * without arithmetic it does not have, and it is the same guarantee `assert.ts`
 * relies on one level down.
 *
 * **Four kinds of change, in the order a reader asks about them**: the values,
 * then the kenmerken, then which rules fired, then the faults. A rule that
 * stopped firing usually explains the value above it, and a fault that appeared
 * usually explains both — but saying so would be an inference, and this states
 * what it recorded (IR-4).
 *
 * A run that was refused compares against nothing: `TestExplorer` keeps only a
 * run that proceeded as the previous one, so a diff never reports a whole model
 * as having appeared because the last attempt would not compose.
 */
function changes(run: TestRun, previous: TestRun): RunSection {
	const rows = [
		...valueChanges(run.detail, previous.detail),
		...kenmerkChanges(run.detail, previous.detail),
		...ruleChanges(run.detail, previous.detail),
		...faultChanges(run, previous)
	];
	return {
		title: rows.length === 0
			? 'Veranderd — niets'
			: `Veranderd (${rows.length})`,
		aligned: true,
		rows: rows.length > 0
			? rows
			// Said rather than left out, for the reason a rule that did not fire
			// says so: an absent section reads as a comparison that failed, and
			// "nothing moved" is the answer somebody pressed for.
			: [{ kind: 'note', label: '(deze uitvoering leverde precies hetzelfde op als de vorige)' }]
	};
}

/** One derived or given value as one comparable string — periods included. */
function stateOf(one: RunDetail['values'][number]): string {
	return one.segments
		? one.segments.map(each => `${period(each.from, each.to)}: ${each.value}`).join('; ')
		: (one.value ?? 'leeg');
}

function valueChanges(now?: RunDetail, before?: RunDetail): RunRow[] {
	if (!now || !before) {
		return [];
	}
	const was = new Map(before.values.map(one =>
		[stateKey(one.instance, target(one.attribute, one.coordinates)), one]));
	const rows: RunRow[] = [];
	for (const one of now.values) {
		const named = target(one.attribute, one.coordinates);
		const key = stateKey(one.instance, named);
		const then = was.get(key);
		was.delete(key);
		const link = {
			on: 'label' as const,
			kind: 'explain' as const,
			attribute: one.attribute,
			instance: one.instance
		};
		if (!then) {
			rows.push({
				kind: 'appeared',
				label: `${one.instance} · ${named}`,
				note: `nieuw: ${stateOf(one)}`,
				link
			});
			continue;
		}
		if (stateOf(then) !== stateOf(one)) {
			rows.push({
				kind: 'changed',
				label: `${one.instance} · ${named}`,
				note: `${stateOf(then)} → ${stateOf(one)}`,
				link
			});
		}
	}
	for (const [, gone] of was) {
		rows.push({
			kind: 'vanished',
			label: `${gone.instance} · ${target(gone.attribute, gone.coordinates)}`,
			note: `weg (was ${stateOf(gone)})`
		});
	}
	return rows;
}

function kenmerkChanges(now?: RunDetail, before?: RunDetail): RunRow[] {
	if (!now || !before) {
		return [];
	}
	const held = (detail: RunDetail): Set<string> => new Set(detail.kenmerken
		.filter(one => one.present)
		.map(one => stateKey(one.instance, one.kenmerk)));
	const was = held(before);
	const is = held(now);
	return [
		...[...is].filter(one => !was.has(one)).map((one): RunRow =>
			({ kind: 'appeared', label: one, note: 'heeft dit kenmerk nu wel' })),
		...[...was].filter(one => !is.has(one)).map((one): RunRow =>
			({ kind: 'vanished', label: one, note: 'heeft dit kenmerk niet meer' }))
	];
}

function ruleChanges(now?: RunDetail, before?: RunDetail): RunRow[] {
	if (!now || !before) {
		return [];
	}
	const counts = (detail: RunDetail): Map<string, number> =>
		new Map(detail.firedRules.map(one => [one.rule, one.count]));
	const was = counts(before);
	const is = counts(now);
	const rows: RunRow[] = [];
	for (const [rule, count] of is) {
		const then = was.get(rule);
		if (then === undefined) {
			rows.push({ kind: 'appeared', label: rule, rule, ruleAt: 'label', note: 'vuurt nu wel' });
		} else if (then !== count) {
			rows.push({
				kind: 'changed',
				label: rule,
				rule,
				ruleAt: 'label',
				note: `${then}× → ${count}×`
			});
		}
	}
	for (const [rule] of was) {
		if (!is.has(rule)) {
			rows.push({ kind: 'vanished', label: rule, rule, ruleAt: 'label', note: 'vuurt niet meer' });
		}
	}
	return rows;
}

function faultChanges(run: TestRun, previous: TestRun): RunRow[] {
	const key = (one: TestRun['faults'][number]): string =>
		`${one.rule} · ${one.instance ?? ''} · ${one.message}`;
	const was = new Map(previous.faults.map(one => [key(one), one]));
	const is = new Map(run.faults.map(one => [key(one), one]));
	return [
		...[...is].filter(([at]) => !was.has(at)).map(([, one]): RunRow => ({
			kind: 'fault',
			label: withInstance(one.rule, one.instance),
			rule: one.rule,
			ruleAt: 'label',
			note: `nieuwe fout: ${one.message}`
		})),
		...[...was].filter(([at]) => !is.has(at)).map(([, one]): RunRow => ({
			kind: 'vanished',
			label: withInstance(one.rule, one.instance),
			rule: one.rule,
			ruleAt: 'label',
			note: `fout verdwenen: ${one.message}`
		}))
	];
}

/**
 * Gives every row its one click-through, which follows from what the row states.
 *
 * A pass rather than a field set at each site, so the rule is in one place and a
 * test can read it — and so a new section cannot quietly have none.
 *
 *   - **Written in the testset** — an expectation goes to its own `Verwacht`
 *     line, which is where a reader changes it.
 *   - **Otherwise the rule**, at whichever position the row says it is shown.
 *
 * Note what is *not* in it: whether the row folds. A write's having operands is
 * nothing to a reader, and an earlier version tested that first — which put the
 * link on the attribute for the writes that had no operands and on the rule for
 * the writes that did, in one column of one section. It is safe to leave out
 * because a foldable row's label is never the link: the rows that fold are
 * writes and timeline values, and their rule is shown `beside`.
 */
export function withLinks(view: RunView): RunView {
	return {
		...view,
		sections: view.sections.map(section =>
			({ ...section, rows: section.rows.map(linked) }))
	};
}

/**
 * One row and everything under it, each given its one click-through.
 *
 * Separate from `withLinks` because UX-3 fetches rows *after* the view was
 * built: a row that arrives on a click has to be given its link by the same
 * rule as one that was there from the start, and a second reading of that rule
 * beside this one is exactly the divergence `withLinks` exists to prevent. So
 * `childrenOf` calls this and the section pass calls it too.
 */
export function linked(row: RunRow): RunRow {
	return {
		...row,
		link: linkOf(row),
		children: row.children?.map(linked)
	};
}

function linkOf(row: RunRow): RunLink | undefined {
	// Set outright by the section that knows what it is about (UX-6), and then
	// it wins: a changed value has no range and no rule of its own, and its
	// answer is a view rather than a place.
	if (row.link) {
		return row.link;
	}
	if (row.range) {
		return { on: 'label', kind: 'reveal', range: row.range };
	}
	return row.rule && row.ruleAt
		? { on: row.ruleAt, kind: 'revealRule', rule: row.rule }
		: undefined;
}

/**
 * Why a consistency rule found its model inconsistent.
 *
 * The criteria first, because that is the answer — the last one is the criterion
 * that decided, since §13.4.8's `alle` stops there — then what the check computed
 * on its way (§X7 stage 3) and then the values it read, because the next question
 * after "which criterion" is "out of what", and a threshold worked out on the
 * spot is in the first list rather than the second.
 *
 * Both are absent for a uniqueness check (§8.1.6), which compares instances rather
 * than reading a value, and for a single-criterion rule, which *is* its criterion:
 * quoting the rule's own sentence back under its own name says nothing.
 */
function reasons(one: RunDetail['inconsistencies'][number]): RunRow[] {
	return [
		...(one.criteria ?? []).map((each): RunRow => ({
			kind: each.holds ? 'pass' : 'fail',
			label: each.text
		})),
		...stepRows(one.steps),
		...(one.operands ?? []).map((each): RunRow => ({
			kind: 'operand',
			label: withInstance(each.label, each.instance, true),
			value: each.value
		}))
	];
}

/** What the tab is called, and what the heading says it answers. */
function focusName(focus: RunFocus): string {
	return focus.kind === 'regel' ? focus.rule : slotLabel(focus);
}

function headingFor(run: TestRun, focus?: RunFocus): string {
	if (!focus) {
		return `Uitkomst van '${run.case}'`;
	}
	return focus.kind === 'regel'
		? `Wat '${focus.rule}' deed, in testgeval '${run.case}'`
		: `Hoe '${slotLabel(focus)}' tot stand kwam, in testgeval '${run.case}'`;
}

/** `<instantie> · <naam>`, or the name alone where the focus names no instance. */
function slotLabel(focus: { attribute: string; instance?: string }): string {
	return focus.instance ? `${focus.instance} · ${focus.attribute}` : focus.attribute;
}

/**
 * The section a value-focused view leads with (UX-1) — the derivation of one
 * slot, already open.
 *
 * **It is `writeRow` and nothing else.** The tree a reader wants was built by
 * §X7 stages 2 and 3 and is drawn forty rows down the trace; the whole of UX-1
 * is putting it at the top, opened, for the value they pointed at. Composing a
 * second rendering of the same fact here is the thing `runView.ts` exists to
 * prevent — so this selects rows, it does not draw them.
 *
 * **A slot written more than once yields a row each**, in write order, because
 * that is ordinary (an initialisation and then the rule that supersedes it) and
 * the value a reader is looking at is the last one's. Hiding the earlier writes
 * would hide exactly the case where a surprising number is a rule overwriting
 * another.
 *
 * **And it says which of them still stands**, which is the whole question the
 * section is opened to answer and was missing from the first cut: four rules
 * writing `contributie` came out as four equal rows, all expanded, with nothing
 * saying that only the last one accounts for the number in the failing
 * expectation. So the standing write is marked `eindwaarde` and **is the only
 * one opened**; the rest are marked `overschreven` and stay folded. Both facts
 * are read the way `Afgeleid` already reads them — the last write in the trace,
 * per instance — so the section cannot disagree with the attribution on the
 * value below it. Nothing is reordered: write order *is* the derivation, and a
 * reader who is told which row won can still see what ran before it.
 *
 * **Where nothing wrote it, the recorded fact is stated and no more.** That is
 * IR-4 at this surface: the run knows whether the value was given, whether it is
 * in the situation at all, and nothing else without asking further questions —
 * which is UX-2's verdict list and is not built here. A section that was simply
 * absent would read as a run that failed.
 */
function valueSections(
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	run: TestRun
): RunSection[] {
	const detail = run.detail!;
	const mine = <T extends { instance?: string }>(one: T): boolean =>
		focus.instance === undefined || one.instance === focus.instance;
	const writes = detail.trace.filter(one => one.target === focus.attribute && mine(one));
	const producers = producedBy(detail);
	// Per instance, because a focus with no instance covers all of them and each
	// keeps its own last write — one `standing` set for the lot would mark every
	// instance's history as superseded by whichever wrote last overall.
	const lastPerInstance = new Map<string, RunDetail['trace'][number]>();
	for (const one of writes) {
		lastPerInstance.set(one.instance ?? '', one);
	}
	const standing = new Set(lastPerInstance.values());
	// Only where something actually was superseded: on the ordinary slot written
	// once, `eindwaarde` states the obvious and reads as a distinction being drawn.
	const contested = writes.length > lastPerInstance.size;
	return [{
		title: writes.length > 0
			? `Afleiding van '${slotLabel(focus)}'`
			: diagnosisTitle(focus, detail),
		rows: writes.length > 0
			? writes.map(one => {
				const row = writeRow(one, true, producers);
				if (!standing.has(one)) {
					return contested ? { ...row, note: 'overschreven' } : row;
				}
				// Two levels: the write and what it was computed out of. Deeper would
				// unfold a whole chain the reader has not asked to follow yet, and the
				// point of opening at all is that the first answer is on screen.
				// A row still to be fetched (UX-3) is opened all the same — a renderer
				// that can fetch does so on the way in, which is why the section is
				// drawn open in the first place.
				return opened(contested ? { ...row, note: 'eindwaarde' } : row, 2);
			})
			// **Where no rule wrote it, the question changes** and so does the
			// section: UX-2's verdict list, which is what "the view hands over to
			// UX-2 when the value is leeg" means here. The hand-over point is
			// exactly *there is no write to show* — and that is not a narrower
			// reading of leeg but a sharper one, since the four causes a run can
			// distinguish (no writer, skipped, no valid version, faulted) all leave
			// no write, while the fifth (an operand was leeg and the operator
			// propagated it) leaves one and is answered by the derivation above.
			: emptiness(focus, run)
	}];
}

/**
 * UX-2 — *Waarom is deze waarde leeg?*, as a verdict list.
 *
 * **Not a tree, because the answer is an enumeration**: leeg has five distinct
 * causes with five distinct fixes, and what a reader needs is one row per rule
 * that *could* have filled the slot, each saying what that rule actually did.
 * Every row renders a fact the run or the model recorded; none is an inference
 * (IR-4), and a rule the run says nothing about says exactly that rather than
 * being given a likely reason.
 *
 * The four causes that leave no write are all here — no rule writes it at all,
 * the rule was skipped, no regelversie covered the rekendatum, the rule
 * faulted. The fifth, an operand that was leeg and an operator that propagated
 * it, leaves a write behind and is answered by the derivation section instead,
 * which shows that operand with its value.
 *
 * **The candidates come from the model and the verdicts from the run**, and
 * that split is the whole reason this needed a server change: a run records
 * what each rule *did*, so it cannot distinguish "no rule writes this
 * attribute" — very often the actual bug — from "the rule that writes it was
 * never reached".
 */
function emptiness(
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	run: TestRun
): RunRow[] {
	const detail = run.detail!;
	const known = stated(focus, detail);
	const writers = focus.writers;
	if (writers === undefined) {
		// Nothing asked, so nothing is concluded: an empty list here would read as
		// "no rule writes this", which is a finding and not a missing answer.
		return known;
	}
	if (writers.length === 0) {
		return [...known, {
			kind: 'note',
			label: 'Geen enkele regel schrijft dit attribuut — alleen een Gegeven kan het vullen.'
		}];
	}
	return [...known, ...writers.map(rule => verdict(rule, focus, run))];
}

/** What the run holds about the slot itself, where it holds anything. */
function stated(
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	detail: RunDetail
): RunRow[] {
	const value = detail.values.find(one =>
		one.attribute === focus.attribute
		&& (focus.instance === undefined || one.instance === focus.instance));
	if (value && !value.derived) {
		// A given value is not leeg, and a heading that called it leeg would be
		// false — `diagnosisTitle` asks the same question one level up.
		return [valueRow(value, false, new Map())];
	}
	const kenmerk = detail.kenmerken.find(one =>
		one.kenmerk === focus.attribute
		&& (focus.instance === undefined || one.instance === focus.instance));
	return kenmerk && !kenmerk.derived
		? [{ kind: 'given', label: slotLabel(focus), note: 'gegeven in dit testgeval' }]
		: [];
}

/** Whether the run holds a value for the slot that nothing derived. */
function isGiven(
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	detail: RunDetail
): boolean {
	return stated(focus, detail).length > 0;
}

function diagnosisTitle(
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	detail: RunDetail
): string {
	return isGiven(focus, detail)
		? `Waarom '${slotLabel(focus)}' niet is afgeleid`
		: `Waarom is '${slotLabel(focus)}' leeg?`;
}

/**
 * What one candidate writer did, in the order the run can answer it.
 *
 * **A fault first**, because a rule that failed did not merely stay quiet; then
 * the version, which is a fact about the rule and not about this instance; then
 * the skip, which is. What is left is a rule the run says nothing about, and it
 * says so — a reader who is told "not applied to this instance" knows to look at
 * the rule's subject, where a reader given a guess would look at the wrong
 * thing.
 *
 * The link is the **rule**, which is all the run has: what "writes" a rule is
 * its declaration, and the finer targets §UX-2 sketches — the criterion's own
 * line, the version headers — are ranges no run carries.
 */
function verdict(
	rule: string,
	focus: Extract<RunFocus, { kind: 'waarde' }>,
	run: TestRun
): RunRow {
	const detail = run.detail!;
	const mine = (one: { instance?: string }): boolean =>
		focus.instance === undefined || one.instance === undefined
		|| one.instance === focus.instance;
	const row = { label: rule, rule, ruleAt: 'label' as const };

	const fault = run.faults.find(one => one.rule === rule && mine(one));
	if (fault) {
		return {
			...row, kind: 'fault', note: `faalde: ${fault.message}`,
			...(fault.pass ? { ruleDetail: `herhaling ${fault.pass}` } : {})
		};
	}
	const skips = (detail.skipped ?? []).filter(one => one.rule === rule && mine(one));
	const version = skips.find(one => one.reason === 'geldigheid');
	if (version) {
		const have = (version.versions ?? []).join(', ');
		return {
			...row,
			kind: 'skipped',
			note: `geen regelversie geldig op ${detail.rekendatum}`
				+ (have ? ` (versies: ${have})` : '')
		};
	}
	const skipped = skips.find(one => one.reason === undefined);
	if (skipped) {
		return {
			...row,
			kind: 'skipped',
			...(skipped.pass ? { ruleDetail: `herhaling ${skipped.pass}` } : {}),
			note: `overgeslagen: ${why(skipped)}`,
			// What it read, so the threshold and the value are both on screen —
			// which is the next question after *which criterion*.
			...(skipped.operands?.length
				? { children: skipped.operands.map(one => operandRow(one, undefined, [])) }
				: {})
		};
	}
	return {
		...row,
		kind: 'skipped',
		note: 'niet op deze instantie toegepast'
	};
}

/**
 * Which criterion decided a skip.
 *
 * **The last one**, because §13.4.8's quantifiers short-circuit and the run
 * records what it evaluated and no further — so the criterion it stopped at is
 * the one that decided. A single condition carries none: the rule's own sentence
 * *is* its criterion, and quoting it back under its own name says nothing, which
 * is where `Inconsistency.criteria` already draws the line.
 */
function why(skipped: NonNullable<RunDetail['skipped']>[number]): string {
	const criteria = skipped.criteria ?? [];
	const decided = [...criteria].reverse().find(one => !one.holds);
	return decided ? `'${decided.text}' was onwaar` : 'de voorwaarde hield niet';
}

/**
 * The row and its children opened, `levels` deep.
 *
 * Set here rather than by `writeRow`, because whether a derivation stands open
 * is a property of *this* view and not of a write: the same row in the trace
 * below is collapsed, which is right there and would be forty open chains here.
 */
function opened(row: RunRow, levels: number): RunRow {
	if (levels <= 0 || !row.children || row.children.length === 0) {
		return row;
	}
	return {
		...row,
		open: true,
		children: row.children.map(one => opened(one, levels - 1))
	};
}

/** The two sections a rule-focused view leads with (X2b). */
function ruleSections(focus: string, detail: RunDetail): RunSection[] {
	const wrote = detail.trace.filter(one => one.rule === focus);
	const fired = detail.firedRules.find(one => one.rule === focus);
	// Once, for the same reason the trace section builds it once: it is a walk of
	// the whole trace, and inside the `map` below it was one walk per row.
	const producers = producedBy(detail);
	return [
		{
			title: `Geschreven door '${focus}'`,
			rows: wrote.length === 0
				// Said rather than left out: a section that is simply absent reads as a
				// run that failed, which is a different and worse thing to be told.
				? [{ kind: 'note', label: '(niets — deze regel vuurde niet in dit testgeval)' }]
				// Unattributed: the heading already names the rule, so putting it on
				// every row would be the section title once per line.
				: wrote.map(one => writeRow(one, false, producers))
		},
		{
			title: 'Vuurde',
			// And no rule here either, for the same reason.
			rows: [{
				kind: 'fired',
				label: fired
					? `voor ${fired.count} instantie${fired.count === 1 ? '' : 's'}`
					: 'niet in dit testgeval'
			}]
		}
	];
}

/**
 * One write, with the operands it read as its children — **and their operands**,
 * as far back as the run can say (§X7 stage 2).
 *
 * `attributed` names the rule beside the value, which the trace wants and a
 * section already headed by that rule does not.
 *
 * The recursion is what the whole stage was for: `Verwacht 5000 €` tells you a
 * number is wrong and nothing about how it came to be, and the answer is a chain
 * — this rule read that value, which that rule wrote out of these. Before the
 * operands carried a `source` the only way to follow it was to scan the trace
 * for an entry whose target *text* matched an operand's label, which is a string
 * match on display names; now the operand names the rule and the walk is a
 * lookup.
 *
 * **It fails closed.** An operand nests only where the trace holds an entry for
 * exactly this instance, rule and label; anything else stays the leaf it is
 * today, so a chain that cannot be followed is short rather than wrong.
 */
function writeRow(
	one: RunDetail['trace'][number],
	attributed: boolean,
	produced?: Map<string, RunDetail['trace'][number]>,
	seen: readonly string[] = []
): RunRow {
	return {
		kind: 'write',
		label: withInstance(target(one.target, one.coordinates), one.instance, true),
		...(one.value === undefined ? {} : { value: one.value }),
		...(attributed ? { rule: one.rule, ruleAt: 'beside' as const } : {}),
		// **Even where the rule is not attributed.** A rule-focused view already
		// names the rule in its heading and so draws no `← <regel>`, but *which
		// case of it* fired is not in the heading and is the whole question a
		// table raises — so it is shown either way.
		...(ruleDetailOf(one) ? { ruleDetail: ruleDetailOf(one) } : {}),
		// **Steps first, then operands, at the same level and behind the one
		// click** (§X7 stage 3). They answer the two halves of "why is this value
		// what it is" and they answer them in this order: what this rule *did*,
		// then where the numbers it did it to came from. A group header of their
		// own was the alternative and puts a second click between a reader and the
		// arithmetic — which is the thing they opened the write for.
		// **The periods first, where the write was time-dependent**: they are what
		// the rule wrote, and the steps and operands below them are how it got
		// there. A scalar write states its value on the row itself and has none.
		// **Not fetched yet, so it says which write it is** (UX-3). `more` is the
		// server's word for "there was something here"; without it a write that
		// genuinely read nothing would grow a chevron that opens onto nothing.
		...(one.operands === undefined && one.more
			? { needs: needsOf('schrijving', one) }
			: {}),
		children: [
			...segmentRows(one.segments ?? []),
			// The rule and the instance travel down with the steps (UX-4): an
			// expansion is evaluated in the scope of the rule the sentence was
			// written in and about the instance the write was about, and a step
			// knows neither — it is one node of an expression.
			...stepRows(one.steps, { rule: one.rule, instance: one.instance }),
			...(one.operands ?? []).map(operand => operandRow(operand, produced, seen))
		]
	};
}

/**
 * What the run knows about *which part* of the rule acted — the table row it
 * decided on (§12) and the repetition it was in ([RG-9]).
 *
 * Joined rather than chosen between: a beslistabel standing inside a recursive
 * rule group is an ordinary thing to write, and a reader wants both facts.
 */
function ruleDetailOf(one: { row?: string; pass?: number }): string | undefined {
	const parts = [
		...(one.row ? [one.row] : []),
		...(one.pass ? [`herhaling ${one.pass}`] : [])
	];
	return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** The four fields that identify one write in a trace. */
function needsOf(
	kind: RunNeeds['kind'],
	one: { rule: string; target: string; instance?: string; coordinates?: string[] }
): RunNeeds {
	return {
		kind,
		rule: one.rule,
		target: one.target,
		...(one.instance === undefined ? {} : { instance: one.instance }),
		...(one.coordinates?.length ? { coordinates: [...one.coordinates] } : {})
	};
}

/**
 * The children of a row whose write has just been fetched (UX-3).
 *
 * Exported so the renderer can fill a row in place instead of rebuilding the
 * view around it — a redraw would fold away everything the reader had opened on
 * the way down, which for a feature whose whole point is following a chain is
 * the one thing it must not do. What it does *not* do is decide anything new:
 * it is `writeRow`'s own children and `operandRow`'s own children, reached from
 * outside.
 *
 * A run that has been dropped since it was drawn answers with one row saying so
 * rather than with none, which is the same rule the rest of this module follows:
 * an empty answer reads as a write that computed nothing.
 */
export function childrenOf(
	needs: RunNeeds,
	trace: readonly RunDetail['trace'][number][],
	gone = false
): RunRow[] {
	if (gone) {
		return [linked({
			kind: 'note',
			label: 'Deze uitvoering is niet meer beschikbaar — voer opnieuw uit.',
			link: { on: 'label', kind: 'opnieuw' }
		})];
	}
	const found = trace.find(one =>
		one.rule === needs.rule
		&& target(one.target, one.coordinates) === target(needs.target, needs.coordinates)
		&& (one.instance ?? '') === (needs.instance ?? ''));
	if (!found || found.operands === undefined) {
		return [{ kind: 'note', label: '(deze schrijving is niet meer op te halen)' }];
	}

	const produced = producedBy({ trace: [...trace] } as RunDetail);
	const rows = needs.kind === 'operand'
		// The eager chain nested an operand under the operands of the rule behind
		// it, and no further — so this is the same reading, one fetch later.
		? found.operands.map(each => operandRow(each, produced, []))
		: writeRow(found, false, produced).children ?? [];
	// **Through the same link pass a section's rows go through.** A row that
	// arrives on a click is a row like any other, and one whose rule does not
	// open is the kind of difference nobody notices until they need it.
	return rows.map(linked);
}

/**
 * The sub-expressions of one evaluation, as rows (§X7 stage 3).
 *
 * A step is `text = value` and nothing else — no rule, no range, so `withLinks`
 * gives it no click-through, which is right: a sub-expression is not a place,
 * and the rule it sits in is already named on the row above.
 *
 * A node the engine cut short comes across as a marker with no text of its own;
 * it is drawn as a plain note, because "and more below here" is a statement
 * about the *view* and not about the model.
 */
function stepRows(
	steps: RunStep[] | undefined,
	/** Whose arithmetic this is, so a collection among it can be opened (UX-4). */
	within?: { rule: string; instance?: string }
): RunRow[] {
	return (steps ?? []).map((one): RunRow => one.truncated && one.value === ''
		? { kind: 'note', label: '… (verder niet vastgelegd)' }
		: {
			kind: 'step',
			label: one.text,
			value: one.value,
			// **Only where both halves are present.** The server offers the sentence
			// where the node's value is a collection; without a rule to read it in
			// there is nowhere to evaluate it, so the row simply does not offer the
			// gesture — which is the rule an inconsistency's steps fall under, they
			// being about a check rather than about a write.
			...(one.expand && within
				? {
					expand: {
						expression: one.expand,
						rule: within.rule,
						...(within.instance === undefined ? {} : { instance: within.instance })
					}
				}
				: {}),
			...(one.parts?.length ? { children: stepRows(one.parts, within) } : {})
		});
}

/**
 * One operand, carrying where its value came from — and the derivation behind it.
 *
 * The source is *shown* as well as followed: `← <regel>` beside a derived value
 * is the same attribution a written value carries in Afgeleid, and `invoer` or
 * `parameter` in the note column says the chain ends here rather than leaving a
 * reader to wonder whether it was cut short.
 */
function operandRow(
	operand: NonNullable<RunDetail['trace'][number]['operands']>[number],
	produced: Map<string, RunDetail['trace'][number]> | undefined,
	seen: readonly string[]
): RunRow {
	const row: RunRow = {
		kind: 'operand',
		label: withInstance(operand.label, operand.instance, true),
		value: operand.value
	};
	const source = operand.source;
	if (!source) {
		return row;
	}
	if (source.kind !== 'regel') {
		return { ...row, note: source.kind };
	}
	const attributed = { ...row, rule: source.rule, ruleAt: 'beside' as const };
	const key = traceKey(operand.instance, source.rule, operand.label);
	const behind = produced?.get(key);
	// A cycle cannot arise from a run — the engine refuses one before it starts
	// ([E-3]) — but the guard costs a line and a renderer that hangs on data it
	// was handed is worse than one that stops early.
	if (!behind || seen.includes(key)) {
		return attributed;
	}
	// **Lean, so it says which write is behind it** (UX-3): the entry is in the
	// trace, its operands are not, and following the chain one step further is a
	// fetch rather than a lookup. The eager reading below is what a complete
	// trace still gets, unchanged.
	if (behind.operands === undefined) {
		// `children: []` beside `needs`, exactly as `writeRow` has it: a row the
		// renderer folds must carry a children list even when everything in it is
		// still to be fetched. Returning `needs` alone made this the one foldable
		// row without one, and the panel's draw loop — which iterates `children`
		// for anything it folds — threw on it and rendered nothing at all.
		return behind.more
			? { ...attributed, needs: needsOf('operand', behind), children: [] }
			: attributed;
	}
	return {
		...attributed,
		children: behind.operands.map(each => operandRow(each, produced, [...seen, key]))
	};
}

/**
 * Every write, by the place it wrote — so an operand can find the one behind it.
 *
 * Keyed on instance, rule *and* target together: one rule routinely writes
 * several attributes for one instance, so a coarser key would attach the wrong
 * derivation under an operand and read as fact.
 */
function producedBy(detail: RunDetail): Map<string, RunDetail['trace'][number]> {
	const found = new Map<string, RunDetail['trace'][number]>();
	for (const one of detail.trace) {
		found.set(traceKey(one.instance, one.rule, target(one.target, one.coordinates)), one);
	}
	return found;
}

function traceKey(instance: string | undefined, rule: string, what: string): string {
	return `${instance ?? ''} · ${rule} · ${what}`;
}

/**
 * Which rule last wrote each derived value or kenmerk, from the trace.
 *
 * A join over two lists the server already sent, not a second reading of
 * anything: the trace *is* the record of writes, and the state list is the
 * situation those writes left. **Last, deliberately** — an attribute is routinely
 * written more than once in one run (an initialisation, then the rule that
 * supersedes it), and the value standing in the final state is the one the last
 * write put there. So the rule a reader is offered accounts for the number in
 * front of them, which is not always the first rule to have had an opinion.
 */
function writers(detail: RunDetail): Map<string, string> {
	const found = new Map<string, string>();
	for (const one of detail.trace) {
		found.set(stateKey(one.instance ?? '', target(one.target, one.coordinates)), one.rule);
	}
	return found;
}

/** One key for a written place, used by both sides of that join. */
function stateKey(instance: string, what: string): string {
	return `${instance} · ${what}`;
}

/** A derived value's rule, where the trace knows one — and nothing where not. */
function attribution(rule: string | undefined, derived: boolean):
	{ rule?: string; ruleAt?: 'beside' } {
	return derived && rule ? { rule, ruleAt: 'beside' } : {};
}

/** One value, or one row per period where the write was time-dependent. */
function valueRow(
	one: RunDetail['values'][number],
	derived: boolean,
	wroteIt: Map<string, string>
): RunRow {
	const kind = derived ? 'derived' : 'given';
	const named = target(one.attribute, one.coordinates);
	const label = `${one.instance} · ${named}`;
	const wrote = attribution(wroteIt.get(stateKey(one.instance, named)), derived);
	if (!one.segments) {
		return { kind, label, note: one.value ?? 'leeg', ...wrote };
	}
	return { kind, label, ...wrote, children: segmentRows(one.segments) };
}

/**
 * A time-dependent value's periods, as rows — the one implementation.
 *
 * Both a stored value and a trace write carry periods, and until UX-5 only the
 * first had rows for them: a timeline write crossed the wire as the scalar
 * `leeg` the engine leaves beside its segments, so the trace read as a rule that
 * derived nothing. With both shapes drawn from here they cannot come to say the
 * same timeline two ways.
 */
function segmentRows(segments: RunSegment[]): RunRow[] {
	return segments.map((segment): RunRow => ({
		kind: 'segment',
		label: period(segment.from, segment.to),
		value: segment.value,
		...(segment.empty ? { empty: true } : {}),
		...(segment.fromDay === undefined && segment.toDay === undefined
			? {}
			: {
				span: {
					...(segment.fromDay === undefined || segment.from === undefined
						? {}
						: { from: { day: segment.fromDay, text: segment.from } }),
					...(segment.toDay === undefined || segment.to === undefined
						? {}
						: { to: { day: segment.toDay, text: segment.to } })
				}
			})
	}));
}

function target(name: string, coordinates?: string[]): string {
	return coordinates?.length ? `${name} [${coordinates.join(', ')}]` : name;
}

/** `<instance> · <what>`, where there is an instance; `leading` puts it first. */
function withInstance(what: string, instance?: string, leading = false): string {
	if (!instance) {
		return what;
	}
	return leading ? `${instance} · ${what}` : `${what} · ${instance}`;
}

function period(from?: string, to?: string): string {
	if (from && to) {
		return `van ${from} tot ${to}`;
	}
	if (from) {
		return `vanaf ${from}`;
	}
	return to ? `tot ${to}` : 'altijd';
}
