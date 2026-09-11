// [N-7]/[N-8] — the run button, what it runs, and what it says where it runs
// nothing.
//
// **The thing you run is the worked example.** There is no isolated evaluation
// of a rule ([E-7]), so *running a rule* was always *running a testgeval and
// looking at one rule* — and in a notebook the testgeval is two cells away,
// written by the same hand under the rule it exercises (§0.1). That decision
// stands.
//
// **Its stated mechanism was wrong, and the workbench says so** (11 September
// 2026, reported by a reader who pressed the button). [N-7] read
// `supportedLanguages: ['testspraak']` as *VS Code draws no run button on a
// cell of any other language*. It draws one on **every code cell** of a
// notebook that has a kernel at all: the execute action's precondition is
// `NOTEBOOK_CELL_TYPE == 'code' && (kernelCount > 0 || kernelSourceCount > 0)`,
// with nothing about a language in it, and no context key exists that could
// carry one — `notebookCellType` says code or markup and there is no
// `notebookCellLanguage`. `supportedLanguages` decides what happens when the
// button is *pressed*: `executeNotebookCells` opens an execution for every code
// cell and then `complete({})`s the ones the kernel does not support, which is
// a button that flickers and does nothing. Verified in the workbench bundle
// before concluding it, as §UX-1's lens finding was.
//
// **So the button cannot be hidden, and what is left to decide is what it
// says.** The controller supports both languages and answers a rule cell with
// one line naming the cell to run instead (`RULE_CELL`, and no verdict mark,
// since nothing ran). That is the ruling the testset-header cell already
// carries — *a cell that ran nothing says so* — one language over, and it is
// what [N-7]'s own words ask for: the reader is told *you run the worked
// example, not the rule* at the moment they try the other thing.
//
// It buys one more thing, which is why the widening is not a workaround.
// Inserting a code cell copies the language of the cell it is inserted under
// and then drops back to `supportedLanguages[0]` where that language is not in
// the list — so with the narrow list every cell added below a rule cell came
// out as **testspraak**, silently. Read off the same bundle and then confirmed
// by driving `notebook.cell.insertCodeCellBelow` in the test host (11 September
// 2026); the assertion is **not** kept, because closing the editor it needs
// disturbs four cases in the suite around it and a flaky end-to-end gate is
// worse than none. What is gated is the line itself, by the rule cell's own
// case: without `regelspraak` in this list that cell writes nothing at all.
//
// **No new custom method** ([N-7]). A cell asks `regelspraak/tests` which
// testgevallen are written in it and `regelspraak/runTest` to run one — the two
// the Test Explorer already asks, with the cell's URI, which the server reads
// as its notebook ([N-3]). A notebook is a *place* and not a capability, so it
// clears none of the bar the nine custom methods each had to.
//
// **One request per testgeval** is W7's shape kept rather than re-decided: the
// engine serialises behind one worker ([E-4]) either way, and a cell that asked
// for all of its cases at once could not report them one at a time.

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import { MODEL_LANGUAGE, TEST_LANGUAGE } from '../languages';
import { TestRun } from '../testExplorer';

import { NOTEBOOK_TYPE } from './serializer';
import { RULE_CELL, asMarkdown, asText, verdictOf } from './verdict';

const TESTS_REQUEST = 'regelspraak/tests';
const RUN_TEST_REQUEST = 'regelspraak/runTest';

const CONTROLLER_ID = 'regelspraak-testgevallen';

interface TestCaseInfo {
	name: string;
	/**
	 * The cell this case's own text is in, where it is not the testset's ([N-3]).
	 *
	 * Absent for a file and for a case sharing its testset's cell — the two are
	 * the same statement, which is why the server sends it neither way and why
	 * the fallback below is the testset's URI rather than a special case.
	 */
	uri?: string;
}

interface TestSetInfo {
	uri: string;
	cases: TestCaseInfo[];
}

interface Tests { testsets: TestSetInfo[] }

/**
 * The testgevallen written in one cell, in document order.
 *
 * Exported and pure for `rangeOfGesture`'s reason: a notebook controller cannot
 * be driven from a unit test, and *which cases belong to this cell* is the half
 * of it that decides anything. A case falls back to its testset's URI, which is
 * what a `*.test.rgs` file and a single-cell notebook both look like.
 */
export function casesInCell(answer: Tests, cellUri: string): string[] {
	return answer.testsets.flatMap(testset => testset.cases
		.filter(one => (one.uri ?? testset.uri) === cellUri)
		.map(one => one.name));
}

/**
 * The run gesture of a notebook.
 *
 * Holds the client the way `TestExplorer` does — re-pointed on every restart,
 * cleared when the server stops — because a cell run is two requests and there
 * is nothing to run them against in between.
 */
export class TestgevalController {
	private readonly controller: vscode.NotebookController;
	private client: LanguageClient | undefined;
	/**
	 * The cells with an execution open on them.
	 *
	 * `createNotebookCellExecution` throws where one is already active, and the
	 * clearing below creates one per cell with an output — so a cell that is
	 * mid-run must be left alone rather than cleared out from under itself.
	 */
	private readonly running = new Set<string>();
	private readonly subscriptions: vscode.Disposable[] = [];

	constructor() {
		this.controller = vscode.notebooks.createNotebookController(
			CONTROLLER_ID, NOTEBOOK_TYPE, 'RegelSpraak');
		// Both code languages, and the header above says why: this list does not
		// decide which cells get a button, only which ones reach `execute`. A
		// rule cell reaching it is what lets `runCell` answer instead of leaving
		// the workbench to complete the execution behind our back.
		//
		// `testspraak` leads because it is the one that runs; the order is read
		// only by the Interactive Window and by the language of a code cell
		// inserted into an *empty* notebook, and ours is never empty
		// (`commands.ts` seeds both).
		this.controller.supportedLanguages = [TEST_LANGUAGE, MODEL_LANGUAGE];
		this.controller.supportsExecutionOrder = false;
		this.controller.description = 'Voert de rekenvoorbeelden uit';
		this.controller.executeHandler = (cells) => this.execute(cells);

		this.subscriptions.push(
			// **Outputs are ephemeral, and a stale one is cleared** ([N-8]). An
			// edit to a code cell means the run under it was against a model that
			// no longer exists, which is UX-3's *gone* state one surface over —
			// and a verdict that outlives the text it judged is the same kind of
			// stale as a failure lens on an edited line.
			vscode.workspace.onDidChangeNotebookDocument(event => {
				if (event.notebook.notebookType === NOTEBOOK_TYPE && changesTheModel(event)) {
					this.clearOutputs(event.notebook);
				}
			}));
	}

	/**
	 * Exposed for the reason `runProfile` is: a notebook controller is drawn by
	 * the workbench and hands nothing back, so a suite that wants to know what
	 * it declares reads it off the controller itself.
	 *
	 * It is **not** a proxy for *which cells have a run button*, which is what
	 * the suite used to read it as — see the header. What a rule cell does when
	 * it is pressed is asserted by pressing it.
	 */
	get notebookController(): vscode.NotebookController {
		return this.controller;
	}

	/** Re-pointed on every (re)start, and cleared when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
	}

	private async execute(cells: readonly vscode.NotebookCell[]): Promise<void> {
		for (const cell of cells) {
			await this.runCell(cell);
		}
	}

	/**
	 * One cell: its testgevallen, run and reported under it.
	 *
	 * The execution is started before anything is asked, so a slow first run
	 * shows a spinner rather than a cell that looks inert; and `end` is in a
	 * `finally`, because a cell left executing has no way back short of
	 * reloading the window.
	 */
	private async runCell(cell: vscode.NotebookCell): Promise<void> {
		const execution = this.controller.createNotebookCellExecution(cell);
		this.running.add(keyOf(cell));
		execution.start(Date.now());
		execution.clearOutput();
		try {
			// A rule cell, which has a button because every code cell does. It
			// runs nothing and says which cell to press instead ([N-7]); no
			// verdict mark, because neither green nor red is honest about a run
			// that did not happen.
			if (cell.document.languageId !== TEST_LANGUAGE) {
				await replaceWith(execution, RULE_CELL);
				execution.end(undefined, Date.now());
				return;
			}
			const client = this.client;
			if (!client) {
				await replaceWith(execution, 'Er draait geen RegelSpraak-taalserver.');
				execution.end(false, Date.now());
				return;
			}
			const uri = cell.document.uri.toString();
			let runs: TestRun[];
			try {
				const answer = await client.sendRequest<Tests>(TESTS_REQUEST,
					{ textDocument: { uri } }, execution.token);
				runs = await this.runCases(client, uri, casesInCell(answer, uri), execution.token);
			} catch (error) {
				// A cancelled request lands here too, and it is not a failure:
				// the reader stopped it. `end(undefined)` leaves no verdict mark,
				// which is what "no answer" looks like.
				if (execution.token.isCancellationRequested) {
					await replaceWith(execution, 'De uitvoering is afgebroken.');
					execution.end(undefined, Date.now());
					return;
				}
				await replaceWith(execution, String(error));
				execution.end(false, Date.now());
				return;
			}
			const verdict = verdictOf(runs);
			await execution.replaceOutput(new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(asMarkdown(verdict), 'text/markdown'),
				// The same content for copying into a ticket, as W3's text form
				// exists to be — a rendered output cannot be selected out of.
				vscode.NotebookCellOutputItem.text(asText(verdict), 'text/plain')
			]));
			execution.end(verdict.passed, Date.now());
		} finally {
			this.running.delete(keyOf(cell));
		}
	}

	/**
	 * The cases, one request each and in order.
	 *
	 * Sequential rather than in parallel, and that is not a throttle: the engine
	 * runs one at a time behind one worker ([E-4]), so concurrent requests would
	 * queue there instead and a cancellation would have to unwind a queue this
	 * side cannot see.
	 */
	private async runCases(
		client: LanguageClient,
		uri: string,
		cases: readonly string[],
		token: vscode.CancellationToken
	): Promise<TestRun[]> {
		const runs: TestRun[] = [];
		for (const name of cases) {
			if (token.isCancellationRequested) {
				break;
			}
			// The token is the whole of the cancel story ([N-8]): the workbench's
			// stop button cancels it, `vscode-languageclient` sends
			// `$/cancelRequest`, the server aborts and `EngineHost.terminate()`
			// kills the worker mid-evaluation. The same chain W7's stop button
			// already uses, reached by handing over a token nobody had to invent.
			runs.push(await client.sendRequest<TestRun>(RUN_TEST_REQUEST, {
				textDocument: { uri },
				case: name
			}, token));
		}
		return runs;
	}

	/**
	 * Every output in one notebook, gone.
	 *
	 * The whole notebook and not the edited cell, because a run is about the
	 * *model*: a rule cell edited three cells up is why the verdict under a
	 * worked example is no longer true, and clearing only where the keystroke
	 * landed would leave exactly the stale outputs that matter.
	 *
	 * There is no `NotebookEdit` that clears an output, so this is what the API
	 * has: an execution that starts, clears and ends. It is skipped for a cell
	 * with nothing under it, so an edit costs nothing on a notebook nobody has
	 * run.
	 */
	private clearOutputs(notebook: vscode.NotebookDocument): void {
		for (const cell of notebook.getCells()) {
			if (cell.outputs.length === 0 || this.running.has(keyOf(cell))) {
				continue;
			}
			const execution = this.controller.createNotebookCellExecution(cell);
			execution.start();
			execution.clearOutput();
			// `undefined`, because nothing ran: a `false` here would leave the
			// cell marked as having failed, which is a verdict about a run that
			// was just withdrawn.
			execution.end(undefined);
		}
	}

	dispose(): void {
		for (const one of this.subscriptions) {
			one.dispose();
		}
		this.controller.dispose();
	}
}

/**
 * Whether a change to a notebook changes the model its code cells make up.
 *
 * A Markdown cell is prose and no part of the model ([N-2]), so retyping a
 * heading may not throw away a verdict; a code cell's text and the arrangement
 * of the cells both do — a cell added, removed or moved changes what the model
 * is and where it is.
 */
function changesTheModel(event: vscode.NotebookDocumentChangeEvent): boolean {
	return event.contentChanges.length > 0
		|| event.cellChanges.some(one =>
			one.document !== undefined && one.cell.kind === vscode.NotebookCellKind.Code);
}

/** A cell is identified by its own document, which is what an execution is per. */
function keyOf(cell: vscode.NotebookCell): string {
	return cell.document.uri.toString();
}

/** A single sentence under the cell, in both forms, so the two cannot differ. */
async function replaceWith(
	execution: vscode.NotebookCellExecution,
	message: string
): Promise<void> {
	await execution.replaceOutput(new vscode.NotebookCellOutput([
		vscode.NotebookCellOutputItem.text(`*${message}*`, 'text/markdown'),
		vscode.NotebookCellOutputItem.text(`${message}\n`, 'text/plain')
	]));
}
