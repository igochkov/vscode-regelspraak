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
import { RunDetail, TestRun } from './testExplorer';

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
	| 'write' | 'operand' | 'fired' | 'note';

export interface RunRow {
	kind: RunRowKind;
	/** The left-hand side: what this row is about. */
	label: string;
	/** What it is, where the row states one — joined with ` = ` in text. */
	value?: string;
	/** The right-hand column: a diff, a count, a message. */
	note?: string;
	/**
	 * The rule behind this row, where there is one.
	 *
	 * A name and not a location, because the trace carries a name: what "writes" a
	 * rule is its own declaration, which the run has no range for. A renderer that
	 * offers a jump resolves it through the workspace symbols — the same index
	 * `workspace/symbol` answers from.
	 */
	rule?: string;
	/** Where this row is written in the testset, for the rows that are. */
	range?: WireRange;
	/** Operands under a write, periods under a timeline value. */
	children?: RunRow[];
}

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
			: run.assertions.map((one): RunRow => ({
				kind: one.passed ? 'pass' : 'fail',
				label: one.label,
				range: one.range,
				rule: one.rule,
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
				note: one.message
			}))
		});
	}

	const detail = run.detail;
	if (!detail) {
		return view;
	}

	if (detail.inconsistencies.length > 0) {
		view.sections.push({
			title: 'Inconsistent bevonden',
			rows: detail.inconsistencies.map((one): RunRow => ({
				kind: 'inconsistency',
				label: withInstance(one.rule, one.instance),
				rule: one.rule
			}))
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
				rows: values.map(one => valueRow(one, derived))
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
				note: one.derived ? 'afgeleid' : 'gegeven'
			}))
		});
	}

	if (detail.trace.length > 0) {
		view.sections.push({
			title: 'Trace, in de volgorde waarin geschreven werd',
			rows: detail.trace.map(one => writeRow(one, true))
		});
	}

	view.sections.push({
		title: 'Gevuurde regels',
		aligned: true,
		rows: detail.firedRules.map((one): RunRow => ({
			kind: 'fired',
			label: one.rule,
			rule: one.rule,
			note: one.count === 1 ? undefined : `${one.count}×`
		}))
	});

	return view;
}

/** The two sections a focused view leads with (X2b). */
function focusSections(focus: string, detail: RunDetail): RunSection[] {
	const wrote = detail.trace.filter(one => one.rule === focus);
	const fired = detail.firedRules.find(one => one.rule === focus);
	return [
		{
			title: `Geschreven door '${focus}'`,
			rows: wrote.length === 0
				// Said rather than left out: a section that is simply absent reads as a
				// run that failed, which is a different and worse thing to be told.
				? [{ kind: 'note', label: '(niets — deze regel vuurde niet in dit testgeval)' }]
				: wrote.map(one => writeRow(one, false))
		},
		{
			title: 'Vuurde',
			rows: [{
				kind: 'fired',
				label: fired
					? `voor ${fired.count} instantie${fired.count === 1 ? '' : 's'}`
					: 'niet in dit testgeval',
				rule: fired ? focus : undefined
			}]
		}
	];
}

/**
 * One write, with the operands it read as its children.
 *
 * `attributed` names the rule in the row itself, which the trace wants and a
 * section already headed by that rule does not.
 */
function writeRow(one: RunDetail['trace'][number], attributed: boolean): RunRow {
	return {
		kind: 'write',
		label: withInstance(target(one.target, one.coordinates), one.instance, true),
		value: one.value,
		rule: one.rule,
		note: attributed ? one.rule : undefined,
		children: one.operands.map((operand): RunRow => ({
			kind: 'operand',
			label: withInstance(operand.label, operand.instance, true),
			value: operand.value
		}))
	};
}

/** One value, or one row per period where the write was time-dependent. */
function valueRow(one: RunDetail['values'][number], derived: boolean): RunRow {
	const kind = derived ? 'derived' : 'given';
	const label = `${one.instance} · ${target(one.attribute, one.coordinates)}`;
	if (!one.segments) {
		return { kind, label, note: one.value ?? 'leeg' };
	}
	return {
		kind,
		label,
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
