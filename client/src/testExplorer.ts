// W7 — the Test Explorer.
//
// A projection of two custom methods and nothing more: `regelspraak/tests` says
// which testsets and testgevallen exist and which of them can run, and
// `regelspraak/runTest` runs one and answers with what it asserted. Every
// judgement — composing a testgeval, resolving its includes and overrides,
// deciding a value matches — is the server's, because all of it needs a parser
// and a model this side does not have.
//
// The tree is two deep: file → testgeval. Not three: an assertion is not a test
// you can run, so it belongs in the failure message rather than as an item that
// can never be pressed on its own.

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import { WireRange } from './model';

const TESTS_REQUEST = 'regelspraak/tests';
const RUN_TEST_REQUEST = 'regelspraak/runTest';
const EXPAND_REQUEST = 'regelspraak/expandCollection';
const RUN_DETAIL_REQUEST = 'regelspraak/runDetail';
const COVERAGE_REQUEST = 'regelspraak/coverage';

/**
 * What a failing expectation's message is tagged with, so UX-1's **Leg uit** can
 * be contributed to it and to nothing else.
 *
 * The manifest's `when: testMessage == …` reads this exact string, which is the
 * one thing the two halves have to agree on by hand — the same shape as a wire
 * method's name, one level down.
 */
export const EXPLAINABLE_MESSAGE = 'regelspraakVerwachting';

/**
 * How many testgevallen keep a run history (UX-6).
 *
 * Two whole runs each, and a run holds every derived value and every skipped
 * rule x instance — so this is the bound on what a long session remembers. Big
 * enough that going back and forth between the cases of one testset compares
 * every time, small enough that it is a handful of runs and not a session's
 * worth.
 */
const MAX_HISTORY = 12;

/**
 * One expectation that failed in the last run (UX-1's lens).
 *
 * Kept because **the failure has to be visible where the reader is**, and the
 * two places VS Code lets an extension put something on a failure — the peek's
 * button and the results-tree menu — both need a gesture first. The inline
 * decoration, which is what a reader actually sees, takes no contribution at
 * all. So the affordance is a CodeLens, and a lens needs a line and a case.
 *
 * `case` travels with it because the lens has to run *something*, and the case
 * that failed is the one that produced this line — asking the cursor again
 * would be a second reading of a question this already answers.
 */
export interface FailedExpectation {
	uri: string;
	case: string;
	/** The `Verwacht` line the expectation is written on. */
	line: number;
	label: string;
}

interface TestProblem { code: string; message: string; range: WireRange }

interface TestCaseInfo {
	name: string;
	/**
	 * The document this case's own text is in, where it is not the testset's
	 * ([N-3]).
	 *
	 * A notebook is one testset whose header may be in one cell and whose cases
	 * are in others, so a case cannot inherit its testset's URI the way a case
	 * in a `*.test.rgs` file does. The server sends it **only where it would
	 * differ**, so absent means "the same document as the header" — and the
	 * fallback is the ordinary path rather than a notebook special case, which
	 * is what keeps a client that forgot it from looking correct on a file.
	 */
	uri?: string;
	nameRange: WireRange;
	range: WireRange;
	testable: boolean;
	errors: TestProblem[];
}

interface TestSetInfo {
	uri: string;
	name: string;
	nameRange: WireRange;
	range: WireRange;
	cases: TestCaseInfo[];
}

interface Tests { testsets: TestSetInfo[] }

interface TestAssertion {
	label: string;
	passed: boolean;
	range: WireRange;
	/**
	 * The document that line is in, where it is not the one the run was asked
	 * about ([N-3]).
	 *
	 * A testgeval written in a notebook cell has its `Verwacht` lines in that
	 * cell while the run was requested for the notebook — so the range alone
	 * would put the failure's location, and the `leg uit` lens with it, on a
	 * line of a file the reader is looking at as cells. Absent for every
	 * `*.test.rgs` file, and the fallback is the run's own document.
	 */
	uri?: string;
	expected?: string;
	actual?: string;
	rule?: string;
}

interface TestFault {
	rule: string;
	instance?: string;
	message: string;
	/** `modelfout`: the model said something the engine could not resolve. */
	kind: 'fout' | 'modelfout';
	/**
	 * Which pass of a recursive rule group this belongs to, 1-based ([RG-9]).
	 *
	 * Present only inside a §9.10 loop, where one rule is evaluated once per
	 * instance per repetition; absent everywhere else, which is what says there
	 * is no repetition to be in. Drawn beside the rule's name and never inside
	 * its link, `Volgende termijn (herhaling 3)` naming no declaration.
	 */
	pass?: number;
}

/**
 * What a run computed (X4) — see the server's `protocol.ts`, which defines it.
 *
 * Every value is already a RegelSpraak literal: this side has no arithmetic and
 * no unit algebra, so a structured value would be something it could only print,
 * and the notation a trace is read in has to be the one a failing diff is
 * written in.
 */
export interface RunDetail {
	/** What this run is called, so pieces of it can be fetched later (UX-3). */
	runId?: string;
	rekendatum: string;
	/** The same date as a day number, for the cursor a track draws (UX-5). */
	rekendatumDay?: number;
	values: RunValue[];
	kenmerken: RunKenmerk[];
	firedRules: { rule: string; count: number }[];
	inconsistencies: RunInconsistency[];
	trace: RunTraceEntry[];
	/**
	 * Rule x instance considered and not fired, with why (§X7 stage 1).
	 *
	 * On the wire since stage 1 and read by nothing until UX-2 — which is the
	 * gap that made *why is this leeg* a question a reader had to answer by
	 * hand, with the answer already in the reply.
	 */
	skipped?: RunSkipped[];
}

/** A rule that was considered and did not fire (§X7 stage 1) — see `protocol.ts`. */
export interface RunSkipped {
	rule: string;
	instance?: string;
	/** The bullets of a compound condition, in evaluation order; the last decided. */
	criteria?: { text: string; holds: boolean }[];
	operands?: RunOperand[];
	steps?: RunStep[];
	/**
	 * Why it did not fire, where it is not the ordinary reason (UX-2).
	 *
	 * Absent means the condition did not hold. `geldigheid` means no regelversie
	 * covered the rekendatum (§4.2), so the rule reached no instance at all and
	 * carries neither criteria nor operands.
	 */
	reason?: 'geldigheid';
	/**
	 * Which pass of a recursive rule group this belongs to, 1-based ([RG-9]).
	 *
	 * Present only inside a §9.10 loop, where one rule is evaluated once per
	 * instance per repetition; absent everywhere else, which is what says there
	 * is no repetition to be in. Drawn beside the rule's name and never inside
	 * its link, `Volgende termijn (herhaling 3)` naming no declaration.
	 */
	pass?: number;
	/** Its validity periods, in the model's words, where `reason` says so. */
	versions?: string[];
}

/**
 * A consistency rule (§9.5) that found its model inconsistent, and why.
 *
 * `criteria` is the compound check's own criteria in the order it evaluated them
 * and no further: §13.4.8's `alle` stops at the first that fails, so the last
 * entry is the one that decided. A single-criterion rule sends none — it *is* its
 * criterion. `operands` is what the check read, the same record a write carries.
 */
export interface RunInconsistency {
	rule: string;
	instance?: string;
	criteria?: { text: string; holds: boolean }[];
	operands?: RunOperand[];
	/** The sub-expressions the check computed on its way (§X7 stage 3). */
	steps?: RunStep[];
}

export interface RunOperand {
	label: string;
	instance?: string;
	value: string;
	/**
	 * Where the value came from — see the server's `protocol.ts`.
	 *
	 * `regel` names the trace entry to expand under this operand, which is what
	 * makes the derivation walkable; `invoer` and `parameter` are where it ends.
	 */
	source?:
		| { kind: 'regel'; rule: string }
		| { kind: 'invoer' }
		| { kind: 'parameter' };
}

export interface RunValue {
	instance: string;
	attribute: string;
	coordinates?: string[];
	value?: string;
	segments?: RunSegment[];
	derived: boolean;
}

/**
 * One period of a time-dependent value — see the server's `protocol.ts`.
 *
 * The bounds come twice: as the language writes them, which is what a reader
 * sees, and as day numbers, which is what a track lays out by. The second is
 * **sent and never derived from the first**: arithmetic on dates belongs on the
 * side the calendar lives on, and re-deriving a number from a literal that side
 * just rendered is what drifts.
 */
export interface RunSegment {
	from?: string;
	to?: string;
	value: string;
	fromDay?: number;
	toDay?: number;
	/** Whether the period holds no value — a track shades it (UX-5). */
	empty?: boolean;
}

export interface RunKenmerk {
	instance: string;
	kenmerk: string;
	present: boolean;
	derived: boolean;
}

export interface RunTraceEntry {
	instance?: string;
	target: string;
	coordinates?: string[];
	rule: string;
	/** What was written — absent where `segments` is present, as on `RunValue`. */
	value?: string;
	/** The periods written, where the write was time-dependent ([E-33]). */
	segments?: RunSegment[];
	/**
	 * What the rule read — **absent on a lean entry** (UX-3).
	 *
	 * This and `steps` are the bulk of a trace's bytes and matter for the one
	 * write a reader is chasing, so a detailed run names every write and carries
	 * the inside of none of them. Absent with `more` set means one fetch away;
	 * absent without it means the rule genuinely read nothing.
	 */
	operands?: RunOperand[];
	/** The arithmetic between the operands and the value (§X7 stage 3). */
	steps?: RunStep[];
	/**
	 * Which case of a beslistabel decided this write (§12) — `rij 2`.
	 *
	 * A label the server built, not an index: the word is the one the row's own
	 * step carries, so the two cannot say the same row two ways.
	 */
	row?: string;
	/** Whether there is something behind this write that was not sent (UX-3). */
	more?: boolean;
	/**
	 * Which pass of a recursive rule group this write belongs to ([RG-9]).
	 *
	 * Present only inside a §9.10 loop; drawn beside the rule's name, where the
	 * deciding table row is drawn, and never inside its link.
	 */
	pass?: number;
}

/** UX-3 — which write to fetch, in the four fields that identify one. */
export type RunDetailSelector =
	| { kind: 'schrijving'; rule: string; target: string; instance?: string; coordinates?: string[] }
	| { kind: 'waarde'; attribute: string; instance?: string }
	| { kind: 'alles' };

export interface RunDetailAnswer {
	/** The run is no longer retained — one row says so rather than none. */
	gone?: boolean;
	entries: RunTraceEntry[];
}

/**
 * One sub-expression, as the model writes it and as it came out (§X7 stage 3).
 *
 * Where an operand says what a rule *read*, a step says what it *did* — so
 * `X plus Y maal Z` stops being three leaves and a total. Both values are
 * rendered by the server; this side has no arithmetic (see the server's
 * `protocol.ts`).
 *
 * **No `parts` does not mean no parts.** Recording stops at a depth and at a
 * count, and `truncated` is the marker the engine leaves where a subtree was
 * dropped — without it a cut tree would read as a complete one.
 */
export interface RunStep {
	text: string;
	value: string;
	parts?: RunStep[];
	truncated?: boolean;
	/**
	 * This node's own sentence, where its value is a collection (UX-4).
	 *
	 * Present is the whole of "this row can be opened", and what it carries is
	 * the **expression**: an expansion recomputes rather than reading a record,
	 * so the text goes back to the server to be parsed. Whole and unclipped,
	 * unlike `text`.
	 */
	expand?: string;
}

/** The elements behind one collection (UX-4) — see the server's `protocol.ts`. */
export interface CollectionElements {
	expression: string;
	value: string;
	size: number;
	elements: CollectionElement[];
	truncated?: boolean;
	/** Whether `elements` is in value order — the server's, since order is arithmetic. */
	sorted?: boolean;
	refusal?: string;
}

export interface CollectionElement {
	label: string;
	instance?: string;
	value: string;
	/** Its place in the collection's own order, which is not this one. */
	position: number;
}

/** One delivery a run read from a manifest — the audit trail (F-4). */
export interface BoundSource {
	source: string;
	manifest: string;
	sha256: string;
	filled: number;
	size: number;
	metadata?: Record<string, unknown>;
}

export interface TestRun {
	case: string;
	outcome: 'uitgevoerd' | 'geweigerd';
	reason?: string;
	details?: string[];
	assertions: TestAssertion[];
	faults: TestFault[];
	detail?: RunDetail;
	sources?: BoundSource[];
	/**
	 * Which regelversies this run fired — opaque handles, echoed back and never
	 * read (see the server's `protocol.ts`).
	 *
	 * Present only when the run was asked for coverage, and absent on a refusal
	 * rather than empty: nothing ran, which is not the same as nothing firing.
	 */
	coverage?: string[];
}

/** The server's answer about the model's regelversies — see its `protocol.ts`. */
interface CoverageAnswer {
	files: { uri: string; versions: CoverageVersion[] }[];
}

interface CoverageVersion {
	label: string;
	range: WireRange;
	fired: boolean;
}

/**
 * One document's coverage, as VS Code's own model of it.
 *
 * **Two readings of one fact, which is what every coverage reporter emits.** A
 * regelversie is a named, rangeable unit, so it is a *declaration* — that is
 * what puts `bepaal boete · geldig altijd` in the Test Coverage view by name —
 * and its lines are what a reader wants coloured in the gutter, which is
 * *statements*. lcov says the same thing about a function and its body, and the
 * locations mirror that: the declaration sits on the `geldig` line that opens
 * the version, the statement spans the whole of it.
 *
 * There is no branch coverage and there will not be. A rule's condition decides
 * *whether* the version fires, so a version whose condition never held is
 * already reported as uncovered; splitting that into branches would claim this
 * side knows which bullet of a compound condition was reached, and the run
 * records that only under `detail` ([§X7 stage 1]).
 *
 * Pure, and exported, for `rangeOfGesture`'s reason (W4): a coverage gutter
 * cannot be driven from a test, so the half that decides anything lives where a
 * test reaches it.
 */
export interface DrawnCoverage {
	uri: vscode.Uri;
	details: vscode.FileCoverageDetail[];
}

export function coverageOf(answer: CoverageAnswer): DrawnCoverage[] {
	return answer.files.map(file => ({
		uri: vscode.Uri.parse(file.uri),
		details: file.versions.flatMap((version): vscode.FileCoverageDetail[] => {
			const range = rangeOf(version.range);
			return [
				new vscode.DeclarationCoverage(version.label, version.fired, range.start),
				new vscode.StatementCoverage(version.fired, range)
			];
		})
	}));
}

function rangeOf(wire: WireRange): vscode.Range {
	return new vscode.Range(
		wire.start.line, wire.start.character, wire.end.line, wire.end.character);
}

export class TestExplorer {
	private readonly controller: vscode.TestController;
	private readonly profile: vscode.TestRunProfile;
	private readonly coverageProfile: vscode.TestRunProfile;
	/**
	 * What each run's coverage details were, so they can be handed over lazily.
	 *
	 * Keyed by the `TestRun` rather than kept as one map, because VS Code asks
	 * for the details of a run it names and two runs may be alive at once — a
	 * single map would answer the newer run's details for the older one's
	 * question, which is a coverage report about the wrong set of tests. A
	 * `WeakMap` because a run that VS Code has let go is one nothing will ask
	 * about again.
	 */
	private readonly coverageDetails =
		new WeakMap<vscode.TestRun, Map<string, vscode.FileCoverageDetail[]>>();
	private drawn: readonly DrawnCoverage[] = [];
	private client: LanguageClient | undefined;
	/** Moved by every invalidation, so a reply in flight can be told from a fresh one. */
	private generation = 0;
	/**
	 * Each case's own document and whole extent, by item id.
	 *
	 * The document as well as the lines, because a notebook's cases are written
	 * in several cells and a case's extent means nothing without saying which
	 * one it counts against — the same reason W4's `Spot` carries a version
	 * index. The item's own `uri` says the same thing, and this is the reading
	 * `casesOfDocument` takes because it needs the extent beside it.
	 */
	private readonly spans = new Map<string, { uri: string; start: number; end: number }>();
	/**
	 * What failed in the last run, by item id (UX-1's lens).
	 *
	 * **Per item, not per document**, because several testgevallen live in one
	 * testset and a run is of one case: keyed by document, reporting one case
	 * would drop the failures of its siblings, which are still true.
	 */
	private readonly failures = new Map<string, FailedExpectation[]>();
	/**
	 * The last two detailed runs per testgeval (UX-6), for the most recently run
	 * `MAX_HISTORY` of them.
	 *
	 * Held here because this is where every detailed run passes, and a second
	 * place that watched for runs would be free to remember a different pair —
	 * "the previous uitvoering" is a fact with one answer.
	 *
	 * **Bounded, as the server's own `RunHistory` is.** UX-3 made the traces
	 * lean, but `values`, `kenmerken` and `skipped` are not lean and `skipped` is
	 * rules x instances — so two whole runs per testgeval ever run in the session
	 * is a session that grows for as long as it is used. Bounded in testgevallen
	 * rather than in bytes, because that is the unit the answer is about: what a
	 * diff claims is *the previous uitvoering of this testgeval*, and forgetting
	 * one simply means the next run of it has nothing to compare against, which
	 * is the state every first run is in.
	 */
	private readonly history = new Map<string, { latest: TestRun; previous?: TestRun }>();
	private readonly failuresChanged = new vscode.EventEmitter<void>();
	/** Fires whenever `failuresIn` would answer differently. */
	readonly onDidChangeFailures = this.failuresChanged.event;

	constructor() {
		this.controller = vscode.tests.createTestController(
			'regelspraak', 'RegelSpraak');
		// Run only. Debugging a rule is X5, which is out of scope (FR-W7.3), so
		// there is no debug profile to leave unimplemented.
		this.profile = this.controller.createRunProfile('Uitvoeren',
			vscode.TestRunProfileKind.Run, (request, token) => this.run(request, token), true);
		// **The same run, plus one question afterwards.** Coverage is not a
		// different way of running a testgeval — it is the ordinary run with
		// `RunTestParams.coverage` set and one join at the end — so the two profiles
		// share `run` rather than each having a handler. A second implementation of
		// "run these cases and report them" is how the coverage profile would come
		// to report a failure differently from the plain one.
		this.coverageProfile = this.controller.createRunProfile('Dekking',
			vscode.TestRunProfileKind.Coverage, (request, token) => this.run(request, token), true);
		this.coverageProfile.loadDetailedCoverage = (testRun, file) =>
			Promise.resolve(this.coverageDetails.get(testRun)?.get(file.uri.toString()) ?? []);
		this.controller.resolveHandler = async () => {
			await this.refresh();
		};
	}

	get testController(): vscode.TestController {
		return this.controller;
	}

	/** Every expectation of one document that failed when its case last ran. */
	failuresIn(uri: string): readonly FailedExpectation[] {
		const found: FailedExpectation[] = [];
		for (const one of this.failures.values()) {
			found.push(...one.filter(each => each.uri === uri));
		}
		return found;
	}

	/**
	 * Forgets what failed in one document.
	 *
	 * Called when the text changes, because a recorded line number is a fact
	 * about the text that produced it: after an edit the lens would sit on
	 * whatever moved into that line, which is a confident wrong answer rather
	 * than a missing one. Re-run and it comes back.
	 */
	forgetFailures(uri: string): void {
		let changed = false;
		for (const [id, one] of [...this.failures]) {
			if (one.some(each => each.uri === uri)) {
				this.failures.delete(id);
				changed = true;
			}
		}
		if (changed) {
			this.failuresChanged.fire();
		}
	}

	/** Replaces what one case last reported, and says so. */
	private recordFailures(item: vscode.TestItem, found: FailedExpectation[]): void {
		if (found.length > 0) {
			this.failures.set(item.id, found);
		} else if (!this.failures.delete(item.id)) {
			return;
		}
		this.failuresChanged.fire();
	}

	/**
	 * The one run profile, exposed for the reason `rangeOfGesture` is (W4): a
	 * `TestController` does not hand its profiles back, and the run is the half of
	 * this that decides anything — so it lives where a test can reach it.
	 */
	get runProfile(): vscode.TestRunProfile {
		return this.profile;
	}

	/** The coverage profile, exposed for the reason `runProfile` is. */
	get testCoverageProfile(): vscode.TestRunProfile {
		return this.coverageProfile;
	}

	/**
	 * What the last coverage run drew, for the reason `runProfile` is exposed.
	 *
	 * A `TestRun`'s coverage goes into the workbench and does not come back, and
	 * the client's end-to-end suite is the only thing on either side that checks
	 * the `regelspraak/coverage` contract — the server repository holds the other
	 * half and nothing at build time compares the two. So the answer is kept where
	 * a test reaches it, and it is **cleared when a coverage run begins**: a fetch
	 * that failed would otherwise leave the previous run's picture standing, which
	 * is the one way this could pass while the contract was broken.
	 */
	get coverageDrawn(): readonly DrawnCoverage[] {
		return this.drawn;
	}

	/** Re-pointed on every (re)start, and cleared when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
		this.generation++;
		if (!client) {
			this.controller.items.replace([]);
			this.failures.clear();
			this.failuresChanged.fire();
			return;
		}
		void this.refresh();
	}

	/**
	 * Rebuilds the tree from the server's answer.
	 *
	 * Driven by `modelChanged`, which fires on every change to any document —
	 * which is right rather than wasteful: a testgeval composes against the whole
	 * model, so a rule edited in another file can change whether one runs at all.
	 */
	async refresh(): Promise<void> {
		const client = this.client;
		if (!client) {
			return;
		}
		const asked = ++this.generation;
		let answer: Tests;
		try {
			answer = await client.sendRequest<Tests>(TESTS_REQUEST, {});
		} catch {
			// A server that is starting, restarting or gone answers nothing; the
			// next notification asks again.
			return;
		}
		if (asked !== this.generation) {
			return;
		}
		this.spans.clear();
		this.controller.items.replace(answer.testsets.map(one => this.itemFor(one)));
	}

	private itemFor(testset: TestSetInfo): vscode.TestItem {
		const uri = vscode.Uri.parse(testset.uri);
		const item = this.controller.createTestItem(testset.uri, testset.name, uri);
		item.range = rangeOf(testset.nameRange);
		item.children.replace(testset.cases.map(one => {
			// Where its own text is, which for a notebook is not where its header
			// is ([N-3]) — so the item reveals the cell the testgeval is written
			// in and its range counts against that cell.
			const where = one.uri ?? testset.uri;
			const child = this.controller.createTestItem(
				`${testset.uri}#${one.name}`, one.name, vscode.Uri.parse(where));
			child.range = rangeOf(one.nameRange);
			this.spans.set(child.id,
				{ uri: where, start: one.range.start.line, end: one.range.end.line });
			// What the server said about it, on the item rather than in a run: a
			// case that cannot compose is worth seeing before anybody presses play,
			// and a run-only case is worth telling apart from one that asserts.
			if (one.errors.length > 0) {
				child.error = new vscode.MarkdownString(
					one.errors.map(e => `\`${e.code}\` ${e.message}`).join('\n\n'));
			} else if (!one.testable) {
				// **One vocabulary across the two surfaces.** The run lens above the
				// case offers `scenario uitvoeren` against `test uitvoeren` ([T-6]),
				// so the item says `scenario` and not a second phrase for the same
				// fact — a reader meeting one word in the text and another in the
				// Testing view has to work out that they mean the same thing.
				child.description = 'scenario';
			}
			return child;
		}));
		return item;
	}

	/**
	 * Runs one testgeval and answers with everything it computed (X4).
	 *
	 * Apart from `runFromLens`, deliberately: that one drives the `TestController`
	 * so the Testing view owns the outcome, and this one hands the answer back to
	 * a caller that is going to render it. Asking for `detail` here and not there
	 * is the same split — the view wants pass or fail, a reader wants the trace.
	 */
	async runForDetail(uri: string, caseName: string): Promise<TestRun | undefined> {
		const client = this.client;
		if (!client) {
			void vscode.window.showWarningMessage('Er draait geen RegelSpraak-taalserver.');
			return undefined;
		}
		const outcome = await client.sendRequest<TestRun>(RUN_TEST_REQUEST, {
			textDocument: { uri },
			case: caseName,
			detail: true
		});
		this.remember(uri, caseName, outcome);
		return outcome;
	}

	/**
	 * UX-3 — the inside of one write of a run that has already happened.
	 *
	 * **It runs nothing**, which is the whole of what this buys: the alternative
	 * to asking for a piece of a retained run is running the model again, and
	 * that answers about whatever the reader has typed since the panel was drawn.
	 * A run that has been dropped answers `gone` rather than emptily.
	 */
	async runDetail(
		runId: string,
		want: RunDetailSelector
	): Promise<RunDetailAnswer | undefined> {
		const client = this.client;
		if (!client) {
			return undefined;
		}
		try {
			return await client.sendRequest<RunDetailAnswer>(RUN_DETAIL_REQUEST, { runId, want });
		} catch {
			// A server that is starting, restarting or gone answers nothing, and a
			// row that says it could not be fetched is better than an exception in
			// a message handler.
			return undefined;
		}
	}

	/**
	 * UX-4 — the elements behind one collection of a run.
	 *
	 * A request and not a reading of the reply, because a run does not record
	 * the per-element work: §X7 stage 3 declines it on cost, correctly, so the
	 * server recomputes the sentence in the scope of the rule it was written in.
	 * That means a run per gesture, exactly as **Leg uit** does until UX-3.
	 */
	async expandCollection(
		uri: string,
		caseName: string,
		what: { rule: string; instance?: string; expression: string }
	): Promise<CollectionElements | undefined> {
		const client = this.client;
		if (!client) {
			void vscode.window.showWarningMessage('Er draait geen RegelSpraak-taalserver.');
			return undefined;
		}
		return await client.sendRequest<CollectionElements>(EXPAND_REQUEST, {
			textDocument: { uri },
			case: caseName,
			rule: what.rule,
			...(what.instance === undefined ? {} : { instance: what.instance }),
			expression: what.expression
		});
	}

	/**
	 * The run before the one now in hand, where this testgeval has been run twice
	 * (UX-6).
	 *
	 * **Recorded on every detailed run**, not on a gesture of its own: what the
	 * diff claims to show is *the previous uitvoering of this testgeval*, and a
	 * history that only remembered the runs somebody meant to compare would be
	 * making a different claim. A Testing-view run is deliberately not in it —
	 * it asks for no detail, so there is nothing in it to compare.
	 */
	previousRun(uri: string, caseName: string): TestRun | undefined {
		return this.history.get(runKey(uri, caseName))?.previous;
	}

	/** Moves the latest run down and puts this one in its place. */
	private remember(uri: string, caseName: string, run: TestRun): void {
		const key = runKey(uri, caseName);
		const held = this.history.get(key);
		// Deleted before it is set, so a `Map`'s insertion order is the order the
		// testgevallen were last run and the eviction below drops the one nobody
		// has looked at for longest.
		this.history.delete(key);
		this.history.set(key, {
			// A refusal is not a run to compare against: it derived nothing, so a
			// diff over it would report the whole model as having appeared.
			...(held?.latest && held.latest.outcome === 'uitgevoerd'
				? { previous: held.latest }
				: (held?.previous ? { previous: held.previous } : {})),
			latest: run
		});
		for (const oldest of this.history.keys()) {
			if (this.history.size <= MAX_HISTORY) {
				break;
			}
			this.history.delete(oldest);
		}
	}

	/**
	 * Every testgeval in the workspace, for X2b's Quick Pick.
	 *
	 * From the tree rather than by asking again: the tree *is* the answer to
	 * `regelspraak/tests`, and a second request would be a second reading of the
	 * same fact that could disagree with what the Testing view is showing.
	 */
	allCases(): { uri: string; case: string }[] {
		const found: { uri: string; case: string }[] = [];
		this.controller.items.forEach(testset => {
			testset.children.forEach(one => {
				found.push({ uri: testset.id, case: one.label });
			});
		});
		return found;
	}

	/**
	 * Every testgeval written in one document, with the lines it spans (X4's
	 * cursor lookup).
	 *
	 * **By where each case is, not by which testset it belongs to** ([N-9]). A
	 * notebook's testset is one testset whose header is in one cell and whose
	 * cases are in others, so looking the testset up by the asked-about URI
	 * answers nothing for every cell but the header's — which is exactly the
	 * cell **Leg uit** is invoked from. A file is unchanged by the same code:
	 * every case there carries its testset's own URI.
	 */
	casesOfDocument(uri: string): { name: string; startLine: number; endLine: number }[] {
		const found: { name: string; startLine: number; endLine: number }[] = [];
		this.controller.items.forEach(testset => {
			testset.children.forEach(one => {
				// The item's range is its *name*; the case spans further, so the
				// lookup needs the declaration's extent. Kept beside the item when
				// the tree was built rather than re-derived here.
				const span = this.spans.get(one.id);
				if (span?.uri === uri) {
					found.push({ name: one.label, startLine: span.start, endLine: span.end });
				}
			});
		});
		return found;
	}

	/**
	 * Runs what a CodeLens in the text points at (X2a).
	 *
	 * Through the same profile the Testing view uses, so a run started from the
	 * text and one started from the view are one thing: same states on the same
	 * items, one history, and no second path to keep in step. The lens carries a
	 * name because that is what the item's id already is.
	 *
	 * Revealed afterwards, because a lens that reports nowhere reads as a lens
	 * that did nothing: a failure decorates the editor by itself, but a pass is
	 * invisible unless the view is open.
	 */
	async runFromLens(uri: string, caseName?: string): Promise<void> {
		// The lens can be pressed before the view has ever been opened, and the
		// tree is built on demand.
		if (this.controller.items.size === 0) {
			await this.refresh();
		}
		const testset = this.controller.items.get(uri);
		if (!testset) {
			void vscode.window.showWarningMessage(
				'Deze testset staat nog niet in de testverkenner. Draait de taalserver?');
			return;
		}
		const target = caseName === undefined ? testset : testset.children.get(`${uri}#${caseName}`);
		if (!target) {
			void vscode.window.showWarningMessage(`Onbekend testgeval: ${caseName}`);
			return;
		}
		void vscode.commands.executeCommand('vscode.revealTestInExplorer', target);
		const source = new vscode.CancellationTokenSource();
		try {
			await this.run(
				new vscode.TestRunRequest([target], undefined, this.profile), source.token);
		} finally {
			source.dispose();
		}
	}

	/** Every case the request covers, flattened — a testset means all of its cases. */
	private casesOf(request: vscode.TestRunRequest): vscode.TestItem[] {
		const wanted: vscode.TestItem[] = [];
		const collect = (item: vscode.TestItem): void => {
			if (item.children.size === 0) {
				wanted.push(item);
			} else {
				item.children.forEach(collect);
			}
		};
		if (request.include) {
			request.include.forEach(collect);
		} else {
			this.controller.items.forEach(collect);
		}
		return wanted.filter(one => !request.exclude?.includes(one));
	}

	private async run(
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken
	): Promise<void> {
		const client = this.client;
		const run = this.controller.createTestRun(request);
		// **Read from the request, not from a parameter.** VS Code names the profile
		// the user pressed, so the two handlers stay one function and there is no
		// flag for a caller to get wrong. Any profile of the Coverage kind counts —
		// the kind is the question being asked, and matching on the profile object
		// would quietly stop working if a second coverage profile were ever added.
		const wantCoverage = request.profile?.kind === vscode.TestRunProfileKind.Coverage;
		const fired = new Set<string>();
		let ran = false;
		if (wantCoverage) {
			this.drawn = [];
		}
		try {
			for (const item of this.casesOf(request)) {
				if (token.isCancellationRequested) {
					run.skipped(item);
					continue;
				}
				if (!client) {
					run.errored(item, new vscode.TestMessage(
						'Er draait geen RegelSpraak-taalserver.'));
					continue;
				}
				run.started(item);
				const [uri, name] = splitId(item.id);
				const started = Date.now();
				let outcome: TestRun;
				try {
					outcome = await client.sendRequest<TestRun>(RUN_TEST_REQUEST, {
						textDocument: { uri },
						case: name,
						...(wantCoverage ? { coverage: true } : {})
					}, token);
				} catch (error) {
					run.errored(item, new vscode.TestMessage(String(error)));
					continue;
				}
				ran = true;
				for (const one of outcome.coverage ?? []) {
					fired.add(one);
				}
				this.report(run, item, outcome, Date.now() - started);
			}
			if (wantCoverage && ran && client) {
				await this.addCoverage(run, client, fired, token);
			}
		} finally {
			run.end();
		}
	}

	/**
	 * What the model declares, marked with what these runs fired.
	 *
	 * **Asked once, after every case**, because coverage is about the run as a
	 * whole: §W7 runs one testgeval per request, so asking per case would answer
	 * the same question about the model N times and leave this side to merge N
	 * denominators. The handles go back exactly as they came ([T-22] — the join is
	 * the server's, and a client marking versions off itself would be a second
	 * answer to *which version was that*).
	 *
	 * A failure here is **not** a failed test run: the cases have already been
	 * reported, and a coverage report that could not be fetched is a missing
	 * picture rather than a wrong verdict. So it is swallowed to the output
	 * channel's neighbour — the run's own output — where a reader looking for it
	 * will find it, and the run still ends green or red on its own merits.
	 */
	private async addCoverage(
		run: vscode.TestRun,
		client: LanguageClient,
		fired: ReadonlySet<string>,
		token: vscode.CancellationToken
	): Promise<void> {
		let answer: CoverageAnswer;
		try {
			answer = await client.sendRequest<CoverageAnswer>(COVERAGE_REQUEST,
				{ fired: [...fired] }, token);
		} catch (error) {
			run.appendOutput(`de dekking kon niet worden opgehaald: ${String(error)}\r\n`);
			return;
		}
		const files = coverageOf(answer);
		const details = new Map<string, vscode.FileCoverageDetail[]>();
		for (const file of files) {
			details.set(file.uri.toString(), file.details);
			run.addCoverage(vscode.FileCoverage.fromDetails(file.uri, file.details));
		}
		this.coverageDetails.set(run, details);
		this.drawn = files;
	}

	/**
	 * One outcome onto one item.
	 *
	 * A refusal is `errored`, not `failed`: the model did not produce a wrong
	 * answer, it produced none, and the two read differently in the Test Explorer
	 * for good reason.
	 *
	 * **A fault depends on which kind it is** (24 August 2026). Every fault still
	 * reaches the output, since the run carried on ([E-29]). But the two kinds are
	 * not the same news: a `fout` is the specification's own run-time error on a
	 * model that is correct — §6.5's leeg divisor, which the conformance corpus
	 * contains deliberately — and a test asserting around it is right to be green,
	 * while a **`modelfout`** means the model said something the engine could not
	 * make sense of, so the run derived less than the model asked for and a test
	 * that passes anyway passed by luck. That one fails the item, with the fault as
	 * its message. Before this the two were one shape and both were treated as the
	 * first, so a green suite could hide a model that resolved nothing.
	 */
	private report(
		run: vscode.TestRun,
		item: vscode.TestItem,
		outcome: TestRun,
		duration: number
	): void {
		// F-4's audit trail: which delivery each Gegevensbron was read from, so a
		// green run says what it was green against. The manifest's metadata is
		// echoed as written and never interpreted ([R-6]).
		for (const source of outcome.sources ?? []) {
			const metadata = source.metadata
				? ' · ' + Object.entries(source.metadata).map(([key, value]) => `${key}: ${String(value)}`).join(', ')
				: '';
			run.appendOutput(`gegevensbron ${source.source} uit ${source.manifest} `
				+ `(sha256 ${source.sha256.slice(0, 12)}…, ${source.filled} van ${source.size} sleutels${metadata})\r\n`,
				undefined, item);
		}
		for (const fault of outcome.faults) {
			run.appendOutput(`fout in ${fault.rule}${fault.instance ? ` · ${fault.instance}` : ''}: `
				+ `${fault.message}\r\n`, undefined, item);
		}
		if (outcome.outcome === 'geweigerd') {
			const message = new vscode.TestMessage([
				outcome.reason ?? 'Dit testgeval kon niet worden uitgevoerd.',
				...(outcome.details ?? [])
			].join('\n'));
			this.recordFailures(item, []);
			run.errored(item, message, duration);
			return;
		}
		const failed = outcome.assertions.filter(one => !one.passed);
		const broken = outcome.faults.filter(one => one.kind === 'modelfout');
		// **A run-only case is not a passing test** ([T-6]): a testgeval without
		// `Verwacht` lines is a valid situation to run and asserts nothing, so
		// reporting it green puts it in the suite's pass count and says the model
		// was checked when nothing was checked. That is "an expectation nobody runs
		// is not a test" one level up, and the `alleen uitvoeren` description on the
		// item does not offset a green tick in a total. `skipped` is the honest
		// state VS Code has — it is visible, it is not a pass, and it is not a
		// failure either, which is right for a case that did exactly what it said.
		//
		// Decided from the **outcome** rather than from the item's `testable` flag:
		// this is the answer about the run that just happened, so it cannot go stale
		// against a re-discovery, and after the refusal branch above ([T-41] yields
		// no assertions for a refusal) an empty list means run-only and nothing else.
		// A modelfout still fails it — the run deriving less than the model asked for
		// is news whether or not anything was asserted.
		if (outcome.assertions.length === 0 && broken.length === 0) {
			this.recordFailures(item, []);
			run.skipped(item);
			return;
		}
		if (failed.length === 0 && broken.length === 0) {
			// **Cleared on every terminal path, not only on failure.** A lens that
			// outlived the failure it names would send a reader to explain a value
			// that is now right, which is the worst kind of stale: it reads as a
			// feature saying the test still fails.
			this.recordFailures(item, []);
			run.passed(item, duration);
			return;
		}
		// A model error carries **no diff and no location**: there is no expectation
		// to point at, which is exactly the problem it reports.
		const brokenMessages = broken.map(one => new vscode.TestMessage(
			`${one.rule}${one.instance ? ` · ${one.instance}` : ''}: ${one.message}`));
		// **On the item in both cases**, and it was only in the first until 26
		// August 2026: with a failing expectation *as well*, the model errors went to
		// the output channel and no further — and that is the case where a model
		// error is most likely to be the *cause* of the expectation failing, so it is
		// the last place to leave it out. Ahead of the diffs, because "the run could
		// not do what the model asked" is the thing to read first.
		// **Where the expectation is written, which is not always where the case
		// is** ([N-3]): a notebook's `Verwacht` lines sit in the cell the testgeval
		// is in, and the run was asked for the notebook. The item's own URI is the
		// fallback and the answer for every file.
		const source = item.uri ?? vscode.Uri.parse(splitId(item.id)[0]);
		const where = (one: TestAssertion): vscode.Uri =>
			one.uri === undefined ? source : vscode.Uri.parse(one.uri);
		this.recordFailures(item, failed.map((one): FailedExpectation => ({
			uri: where(one).toString(),
			case: item.label,
			line: one.range.start.line,
			label: one.label
		})));
		run.failed(item, [...brokenMessages, ...failed.map(one => {
			// A diff, so the editor renders "expected/actual" itself rather than
			// leaving a reader to spot the difference in a sentence.
			const message = vscode.TestMessage.diff(
				one.rule ? `${one.label} (${one.rule})` : one.label,
				one.expected ?? 'leeg',
				one.actual ?? 'leeg');
			message.location = new vscode.Location(where(one), rangeOf(one.range));
			// UX-1, and what it is *not*: this tag reaches the Test Results tree's
			// context menu and nothing else, because the peek's button — the other
			// contribution point that reads it — needs the peek opened first and was
			// therefore never found. The affordance a reader meets is the lens
			// `recordFailures` above feeds. The tag is on a **failed expectation
			// only**: a modelfout message carries no location, which is exactly the
			// problem it reports, so there is no position for `explainTarget` to read.
			message.contextValue = EXPLAINABLE_MESSAGE;
			return message;
		})], duration);
	}

	dispose(): void {
		this.failuresChanged.dispose();
		this.controller.dispose();
	}
}

/**
 * `file:///x.test.rgs#Een geval` → the two halves.
 *
 * Exported because UX-1 reaches a testgeval from a `TestItem` handed to it by a
 * `testing/message/context` menu, and the item's id is the only thing that names
 * both the file and the case. One reading of the format, so the two cannot
 * disagree about where the `#` is.
 */
/** One key for a testgeval, which is a document and a name (UX-6's history). */
function runKey(uri: string, caseName: string): string {
	return `${uri}\u0000${caseName}`;
}

export function splitId(id: string): [string, string] {
	const at = id.lastIndexOf('#');
	return at < 0 ? [id, ''] : [id.slice(0, at), id.slice(at + 1)];
}
