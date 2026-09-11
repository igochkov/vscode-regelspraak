// [N-8] — what a testgeval cell shows after it has run, decided once.
//
// Two renderers over this, for `runView.ts`'s reason one surface down: the cell
// gets a `text/markdown` item, which VS Code renders natively, and a
// `text/plain` item beside it for copying into a ticket — as W3's text form
// exists to be. Two views of one run that disagree are worse than either being
// absent, so what a cell says is settled here and neither renderer decides
// anything.
//
// Three content rules, each a decision rather than a mapping:
//
//   - **Every value is already a RegelSpraak literal.** The server rendered it
//     ([T-14], §X4), so nothing here parses, converts or compares a value.
//   - **A cell that ran nothing says so.** A `testspraak` cell holding only the
//     testset header is the ordinary shape of a notebook ([N-2]), and an empty
//     output under it reads as a run that failed — which is a different fact,
//     and the worse one to be told by accident.
//   - **The derivation is not drawn here.** With rule cells not runnable
//     ([N-7]) the trace has no cell to hang from, and printing it under every
//     expectation is the forty lines UX-1 exists to spare the reader. `leg uit`
//     on the failing `Verwacht` line is the way in ([N-9]), and `runView.ts`
//     stays the one place a derivation is drawn.

import { TestRun } from '../testExplorer';

/**
 * What one testgeval came to.
 *
 * The same four states the Test Explorer reports, in the same words: a refusal
 * is not a failure — the model produced no answer rather than a wrong one — and
 * a testgeval with no `Verwacht` lines is a scenario that checked nothing,
 * which that view reports as *skipped* and which earns no verdict mark here
 * either.
 */
export type CaseOutcome = 'geslaagd' | 'mislukt' | 'geweigerd' | 'niets gecontroleerd';

/**
 * One line under a testgeval's name.
 *
 * About the *fact* and not about the mark, exactly as `RunRowKind` is: the
 * renderer chooses the glyph, so the two forms are free to differ in styling
 * while saying the same thing.
 */
export interface VerdictLine {
	kind: 'pass' | 'fail' | 'fault' | 'note';
	label: string;
	/** The right-hand half: a diff, a message, a reason. */
	note?: string;
}

export interface CaseVerdict {
	case: string;
	outcome: CaseOutcome;
	lines: VerdictLine[];
}

export interface CellVerdict {
	cases: CaseVerdict[];
	/**
	 * What the cell's own tick says, and `undefined` is a third answer.
	 *
	 * A cell that checked nothing — no testgeval in it, or only scenarios — is
	 * neither a pass nor a failure, and VS Code draws no mark for `undefined`.
	 * Reporting such a cell green would leave a reader with *the model was
	 * checked here*, which is exactly what did not happen ([T-6]).
	 */
	passed: boolean | undefined;
}

/** What a cell with no testgeval of its own says instead of nothing. */
export const NOTHING_RAN =
	'Deze cel bevat geen testgeval, dus er is niets uitgevoerd. '
	+ 'Een rekenvoorbeeld begint met een regel `Testgeval`.';

/**
 * What a **rule** cell says, since it has a run button after all.
 *
 * [N-7] assumed `supportedLanguages` decided whether the workbench *draws* the
 * button. It does not: VS Code draws one on every code cell of a notebook that
 * has a kernel at all, and `supportedLanguages` decides only what happens when
 * it is pressed — `executeNotebookCells` completes the execution of an
 * unsupported cell immediately, which is a button that flickers and does
 * nothing. So the decision [N-7] took stands and the mechanism does not: the
 * only thing left to choose is what pressing it says, and an answer beats a
 * gesture that appears to be broken. It is the same ruling as the line above,
 * one language over — an empty output reads as a run that failed, which is a
 * different fact and the worse one to be told by accident.
 */
export const RULE_CELL =
	'Je voert het rekenvoorbeeld uit, niet de regel: voer de cel met het '
	+ '`Testgeval` uit. Wat een regel heeft gedaan, laat `Leg uit` op een '
	+ '`Verwacht`-regel zien.';

/**
 * The verdict of one testgeval.
 *
 * The rules are the Test Explorer's `report`, said once more rather than said a
 * second way: a modelfout fails the case whatever the expectations did, since
 * the run derived less than the model asked for and anything green beside it
 * passed by luck ([E-29]).
 */
function caseVerdictOf(run: TestRun): CaseVerdict {
	if (run.outcome === 'geweigerd') {
		return {
			case: run.case,
			outcome: 'geweigerd',
			lines: [
				{
					kind: 'note',
					label: run.reason ?? 'Dit testgeval kon niet worden uitgevoerd.'
				},
				// The refusal's own list, which names a file and a line per
				// finding (`describeErrors`). It is what makes a refusal worth
				// more than a red cell: the blocking-error gate is workspace-wide
				// ([E-7]) while `validation.scope` defaults to `openFiles`, so
				// the error is quite often in a document the reader has not got
				// open and no panel in front of them lists it.
				...(run.details ?? []).map((one): VerdictLine => ({ kind: 'note', label: one }))
			]
		};
	}

	const broken = run.faults.filter(one => one.kind === 'modelfout');
	const failed = run.assertions.filter(one => !one.passed);
	const lines: VerdictLine[] = [
		// Ahead of the expectations, because "the run could not do what the model
		// asked" is the thing to read first — and where an expectation failed as
		// well, a modelfout is very often its cause.
		...run.faults.map((one): VerdictLine => ({
			kind: 'fault',
			label: `${one.kind} in ${one.rule}${one.instance ? ` · ${one.instance}` : ''}`
				+ `${one.pass === undefined ? '' : ` (herhaling ${one.pass})`}`,
			note: one.message
		})),
		...run.assertions.map((one): VerdictLine => ({
			kind: one.passed ? 'pass' : 'fail',
			label: one.rule ? `${one.label} (${one.rule})` : one.label,
			// Only where they differ: a passing expectation states its value in
			// its own label already, and repeating it says one thing twice.
			...(one.passed
				? {}
				: { note: `verwacht ${one.expected ?? 'leeg'}, werd ${one.actual ?? 'leeg'}` })
		}))
	];

	if (run.assertions.length === 0 && broken.length === 0) {
		return {
			case: run.case,
			outcome: 'niets gecontroleerd',
			lines: [...lines, {
				kind: 'note',
				label: 'Dit testgeval stelt geen verwachtingen: het is een scenario, '
					+ 'en er is niets gecontroleerd.'
			}]
		};
	}
	return {
		case: run.case,
		outcome: failed.length === 0 && broken.length === 0 ? 'geslaagd' : 'mislukt',
		lines
	};
}

/**
 * The verdict of a cell, which is every testgeval written in it.
 *
 * A cell may hold several — nothing in the format says one testgeval per cell —
 * so this takes the runs and not one run, and they stay in the order they are
 * written in. Never sorted, for X4's reason: that order is the document's.
 */
export function verdictOf(runs: readonly TestRun[]): CellVerdict {
	const cases = runs.map(caseVerdictOf);
	const decided = cases.filter(one => one.outcome !== 'niets gecontroleerd');
	return {
		cases,
		passed: decided.length === 0
			? undefined
			: decided.every(one => one.outcome === 'geslaagd')
	};
}

/** The glyph a line carries — the marks the text form of a run already uses. */
function glyph(line: VerdictLine): string {
	switch (line.kind) {
		case 'pass': return '✓';
		case 'fail': return '✗';
		case 'fault': return '⚠';
		default: return '·';
	}
}

/**
 * The cell's output as Markdown, which VS Code renders itself.
 *
 * No `notebookRenderer` contribution, no third bundle and no messaging ([N-8]):
 * a verdict is a handful of lines, and every one of them is text the server has
 * already worded.
 */
export function asMarkdown(verdict: CellVerdict): string {
	if (verdict.cases.length === 0) {
		return `*${NOTHING_RAN}*`;
	}
	return verdict.cases.map(one => [
		`**${escape(one.case)}** — ${one.outcome}`,
		'',
		...one.lines.map(line => `- ${glyph(line)} ${escape(line.label)}`
			+ (line.note === undefined ? '' : ` — ${note(line)}`))
	].join('\n')).join('\n\n');
}

/** The same thing as plain text, for pasting into a ticket. */
export function asText(verdict: CellVerdict): string {
	if (verdict.cases.length === 0) {
		return `${NOTHING_RAN}\n`;
	}
	return `${verdict.cases.map(one => [
		`${one.case} — ${one.outcome}`,
		...one.lines.map(line => `\t${glyph(line)} ${line.label}`
			+ (line.note === undefined ? '' : `  ${line.note}`))
	].join('\n')).join('\n\n')}\n`;
}

/**
 * A label is the model's own text and may hold anything a `naamdeel` admits —
 * `*` and `_` among them, which Markdown reads as emphasis. So the characters
 * that open an inline construct are escaped and nothing else is: this is a
 * label, not a document.
 */
function escape(text: string): string {
	return text.replace(/([\\`*_[\]])/gu, '\\$1');
}

/**
 * A diff's two values are literals and read as code; a fault's message and a
 * refusal's detail line are sentences and read as prose. The line's own kind
 * says which, so no note has to be inspected to find out what it is.
 */
function note(line: VerdictLine): string {
	return line.kind === 'fail' ? `\`${line.note}\`` : escape(line.note ?? '');
}
