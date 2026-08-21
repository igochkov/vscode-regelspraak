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

interface TestProblem { code: string; message: string; range: WireRange }

interface TestCaseInfo {
	name: string;
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
	expected?: string;
	actual?: string;
	rule?: string;
}

interface TestFault { rule: string; instance?: string; message: string }

interface TestRun {
	case: string;
	outcome: 'uitgevoerd' | 'geweigerd';
	reason?: string;
	details?: string[];
	assertions: TestAssertion[];
	faults: TestFault[];
}

function rangeOf(wire: WireRange): vscode.Range {
	return new vscode.Range(
		wire.start.line, wire.start.character, wire.end.line, wire.end.character);
}

export class TestExplorer {
	private readonly controller: vscode.TestController;
	private readonly profile: vscode.TestRunProfile;
	private client: LanguageClient | undefined;
	/** Moved by every invalidation, so a reply in flight can be told from a fresh one. */
	private generation = 0;

	constructor() {
		this.controller = vscode.tests.createTestController(
			'regelspraak', 'RegelSpraak');
		// Run only. Debugging a rule is X5, which is out of scope (FR-W7.3), so
		// there is no debug profile to leave unimplemented.
		this.profile = this.controller.createRunProfile('Uitvoeren',
			vscode.TestRunProfileKind.Run, (request, token) => this.run(request, token), true);
		this.controller.resolveHandler = async () => {
			await this.refresh();
		};
	}

	get testController(): vscode.TestController {
		return this.controller;
	}

	/**
	 * The one run profile, exposed for the reason `rangeOfGesture` is (W4): a
	 * `TestController` does not hand its profiles back, and the run is the half of
	 * this that decides anything — so it lives where a test can reach it.
	 */
	get runProfile(): vscode.TestRunProfile {
		return this.profile;
	}

	/** Re-pointed on every (re)start, and cleared when the server stops. */
	setClient(client: LanguageClient | undefined): void {
		this.client = client;
		this.generation++;
		if (!client) {
			this.controller.items.replace([]);
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
		this.controller.items.replace(answer.testsets.map(one => this.itemFor(one)));
	}

	private itemFor(testset: TestSetInfo): vscode.TestItem {
		const uri = vscode.Uri.parse(testset.uri);
		const item = this.controller.createTestItem(testset.uri, testset.name, uri);
		item.range = rangeOf(testset.nameRange);
		item.children.replace(testset.cases.map(one => {
			const child = this.controller.createTestItem(
				`${testset.uri}#${one.name}`, one.name, uri);
			child.range = rangeOf(one.nameRange);
			// What the server said about it, on the item rather than in a run: a
			// case that cannot compose is worth seeing before anybody presses play,
			// and a run-only case is worth telling apart from one that asserts.
			if (one.errors.length > 0) {
				child.error = new vscode.MarkdownString(
					one.errors.map(e => `\`${e.code}\` ${e.message}`).join('\n\n'));
			} else if (!one.testable) {
				child.description = 'alleen uitvoeren';
			}
			return child;
		}));
		return item;
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
						case: name
					}, token);
				} catch (error) {
					run.errored(item, new vscode.TestMessage(String(error)));
					continue;
				}
				this.report(run, item, outcome, Date.now() - started);
			}
		} finally {
			run.end();
		}
	}

	/**
	 * One outcome onto one item.
	 *
	 * A refusal is `errored`, not `failed`: the model did not produce a wrong
	 * answer, it produced none, and the two read differently in the Test Explorer
	 * for good reason. A fault is neither — the run carried on ([E-29]) — so it is
	 * appended to the output rather than turned into a failure the engine did not
	 * report.
	 */
	private report(
		run: vscode.TestRun,
		item: vscode.TestItem,
		outcome: TestRun,
		duration: number
	): void {
		for (const fault of outcome.faults) {
			run.appendOutput(`fout in ${fault.rule}${fault.instance ? ` · ${fault.instance}` : ''}: `
				+ `${fault.message}\r\n`, undefined, item);
		}
		if (outcome.outcome === 'geweigerd') {
			const message = new vscode.TestMessage([
				outcome.reason ?? 'Dit testgeval kon niet worden uitgevoerd.',
				...(outcome.details ?? [])
			].join('\n'));
			run.errored(item, message, duration);
			return;
		}
		const failed = outcome.assertions.filter(one => !one.passed);
		if (failed.length === 0) {
			run.passed(item, duration);
			return;
		}
		run.failed(item, failed.map(one => {
			// A diff, so the editor renders "expected/actual" itself rather than
			// leaving a reader to spot the difference in a sentence.
			const message = vscode.TestMessage.diff(
				one.rule ? `${one.label} (${one.rule})` : one.label,
				one.expected ?? 'leeg',
				one.actual ?? 'leeg');
			message.location = new vscode.Location(
				item.uri ?? vscode.Uri.parse(splitId(item.id)[0]), rangeOf(one.range));
			return message;
		}), duration);
	}

	dispose(): void {
		this.controller.dispose();
	}
}

/** `file:///x.test.rgs#Een geval` → the two halves. */
function splitId(id: string): [string, string] {
	const at = id.lastIndexOf('#');
	return at < 0 ? [id, ''] : [id.slice(0, at), id.slice(at + 1)];
}
