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
import { RunDetail, RunStep, TestRun } from './testExplorer';

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
	| 'write' | 'operand' | 'step' | 'fired' | 'note';

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
	/** Where this row is written in the testset, for the rows that are. */
	range?: WireRange;
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
export type RunLink =
	| { on: 'label' | 'beside'; kind: 'reveal'; range: WireRange }
	| { on: 'label' | 'beside'; kind: 'revealRule'; rule: string };

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

export interface RunView {
	/** The tab's name: the rule where the view is about one, else the testgeval. */
	name: string;
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
export function buildView(fileName: string, run: TestRun, focus?: string): RunView {
	const view: RunView = {
		name: focus ?? run.case,
		heading: focus
			? `Wat '${focus}' deed, in testgeval '${run.case}'`
			: `Uitkomst van '${run.case}'`,
		meta: `${fileName}${run.detail ? ` · rekendatum ${run.detail.rekendatum}` : ''}`,
		sections: []
	};

	if (run.outcome === 'geweigerd') {
		view.refusal = {
			reason: run.reason ?? 'zonder opgegeven reden',
			details: run.details ?? []
		};
		return view;
	}

	if (focus && run.detail) {
		view.sections.push(...focusSections(focus, run.detail));
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
	const link = (row: RunRow): RunLink | undefined => {
		if (row.range) {
			return { on: 'label', kind: 'reveal', range: row.range };
		}
		return row.rule && row.ruleAt
			? { on: row.ruleAt, kind: 'revealRule', rule: row.rule }
			: undefined;
	};
	const walk = (row: RunRow): RunRow => ({
		...row,
		link: link(row),
		children: row.children?.map(walk)
	});
	return {
		...view,
		sections: view.sections.map(section => ({ ...section, rows: section.rows.map(walk) }))
	};
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

/** The two sections a focused view leads with (X2b). */
function focusSections(focus: string, detail: RunDetail): RunSection[] {
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
		value: one.value,
		...(attributed ? { rule: one.rule, ruleAt: 'beside' as const } : {}),
		// **Steps first, then operands, at the same level and behind the one
		// click** (§X7 stage 3). They answer the two halves of "why is this value
		// what it is" and they answer them in this order: what this rule *did*,
		// then where the numbers it did it to came from. A group header of their
		// own was the alternative and puts a second click between a reader and the
		// arithmetic — which is the thing they opened the write for.
		children: [
			...stepRows(one.steps),
			...one.operands.map(operand => operandRow(operand, produced, seen))
		]
	};
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
function stepRows(steps: RunStep[] | undefined): RunRow[] {
	return (steps ?? []).map((one): RunRow => one.truncated && one.value === ''
		? { kind: 'note', label: '… (verder niet vastgelegd)' }
		: {
			kind: 'step',
			label: one.text,
			value: one.value,
			...(one.parts?.length ? { children: stepRows(one.parts) } : {})
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
	operand: RunDetail['trace'][number]['operands'][number],
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
	return {
		kind,
		label,
		...wrote,
		children: one.segments.map((segment): RunRow => ({
			kind: 'segment',
			label: period(segment.from, segment.to),
			value: segment.value
		}))
	};
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
