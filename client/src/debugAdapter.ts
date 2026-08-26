// §X5 part C/D — the Debug Adapter, inline and hand-rolled.
//
// **Inline, not a separate process.** `DebugAdapterInlineImplementation` runs
// the adapter in the extension host, so there is no second process to supervise
// and no `@vscode/debugadapter` dependency: the `.vsix` stays the size it is,
// which is a standing constraint here rather than a preference. What that costs
// is writing the protocol by hand, and it is about two hundred lines because a
// RegelSpraak session answers a small part of DAP.
//
// **This is the only module on either side that knows about DAP.** The server
// exposes five operations behind one `regelspraak/debug` method, and everything
// below the mapping in `handleMessage` is about a run, not about a debugger.
// That is deliberate: DAP's vocabulary is a poor fit in places (there is no call
// stack, and no `stepIn`), and letting it leak inwards would have made those
// mismatches the engine's problem.

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

/** Server-side shapes — see the server's `protocol.ts`, which defines them. */
interface DebugStop {
	rule: string;
	instance?: string;
	table?: boolean;
	location?: { uri: string; range: { start: { line: number; character: number } } };
	/**
	 * One value each, and a value is **either** `value` **or** `segments` — never
	 * both, and never neither.
	 *
	 * This copy carried only `value` until 26 August 2026, so a time-dependent
	 * attribute — which the server sends as its periods and with no `value` at all
	 * — showed as *leeg* in the Variables pane for every instance that had one.
	 * `coordinates` was missing for the same reason and cost the same way: two
	 * dimension cells of one attribute became two rows with the same name and
	 * different values, and nothing to tell them apart.
	 *
	 * Kept in step with `RunValue` in the server's `protocol.ts`, which is the
	 * definition; nothing checks that automatically, so widen both together.
	 */
	values: {
		instance: string;
		attribute: string;
		coordinates?: string[];
		value?: string;
		segments?: { from?: string; to?: string; value: string }[];
		derived: boolean;
	}[];
	kenmerken: { instance: string; kenmerk: string; present: boolean }[];
	parameters: { name: string; value: string }[];
	rekendatum: string;
	variables: string[];
}

interface DebugState {
	session: boolean;
	at?: DebugStop;
	reason?: string;
	marks?: { line: number; rule: string; instance?: string }[];
	answer?: string;
	expression?: {
		text: string;
		range: {
			start: { line: number; character: number };
			end: { line: number; character: number };
		};
	};
}

const DEBUG = 'regelspraak/debug';
const DEBUG_STOPPED = 'regelspraak/debugStopped';

/** The one thread a session has: a run, which is not concurrent ([E-4]). */
const THREAD = 1;
const FRAME = 1;
const SCOPE_SITUATION = 1000;

interface LaunchArguments {
	/** The `*.test.rgs` file. */
	program?: string;
	/** The testgeval to run. */
	case?: string;
	/** Stand before the first rule, rather than running to the first breakpoint. */
	stopOnEntry?: boolean;
}

/** Just enough of `regelspraak/tests` to offer a choice — see W7's own copy. */
const TESTS = 'regelspraak/tests';
interface TestCases {
	testsets: { uri: string; name: string; cases: { name: string; testable: boolean }[] }[];
}

/**
 * One session's worth of DAP, over the server's five operations.
 *
 * VS Code hands us raw protocol messages and takes raw protocol messages back;
 * `send` is the only place a message is shaped, so a reply and an event cannot
 * disagree about the envelope.
 */
/** Exported for the ordering test below `handleMessage`; nothing else builds one. */
export class RegelSpraakDebugAdapter implements vscode.DebugAdapter {
	private readonly sent = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	readonly onDidSendMessage = this.sent.event;
	private sequence = 1;
	private stopped: DebugStop | undefined;
	private listener: vscode.Disposable | undefined;
	/** Held between `launch` and `configurationDone` — see the launch case. */
	private pending: LaunchArguments | undefined;
	private started = false;
	/**
	 * How many breakpoints landed on a rule, per source — which decides the entry
	 * stop.
	 *
	 * Per source and summed, because VS Code sends one `setBreakpoints` per file:
	 * a single counter is overwritten by whichever file is sent last, so marks in
	 * the testset were forgotten the moment a rule file was sent after it.
	 */
	private readonly marksBySource = new Map<string, number>();

	private get marks(): number {
		let total = 0;
		for (const count of this.marksBySource.values()) {
			total += count;
		}
		return total;
	}

	constructor(
		private readonly client: LanguageClient,
		private readonly session: vscode.DebugSession
	) {
		// The server pushes; nothing here polls. The worker decides when it
		// arrives at a boundary, and asking repeatedly would be asking the thread
		// that answers completion and hover.
		this.listener = client.onNotification(DEBUG_STOPPED, () => {
			void this.refresh();
		});
	}

	dispose(): void {
		this.listener?.dispose();
		this.listener = undefined;
		this.sent.dispose();
	}

	/**
	 * One request at a time, in the order they arrived.
	 *
	 * **DAP requests are ordered and handling them concurrently is a race.** The
	 * one that bit: `setBreakpoints` awaits a round trip to the server, and
	 * `configurationDone` — which arrives right behind it and decides whether to
	 * stand before the first rule — read the breakpoint count while that trip was
	 * still out. So F5 stopped on entry as though nothing were marked, and
	 * pressing Continue then went straight to the breakpoint, which is what makes
	 * it read as "the first stop is spurious" rather than as a race.
	 *
	 * It surfaced when the server's answer got slower, not when it became wrong;
	 * chaining is the fix, because every other pair has the same hazard latent.
	 */
	private tail: Promise<void> = Promise.resolve();

	handleMessage(message: vscode.DebugProtocolMessage): void {
		const request = message as { seq: number; type: string; command: string; arguments?: unknown };
		this.tail = this.tail
			.then(() => this.dispatch(request))
			// **Answer the request, then keep the chain.** Swallowing to `undefined`
			// kept the chain alive — which is why the catch is here — and dropped the
			// reply with it, so a `sendRequest` that rejected (a restarted server, a
			// cancelled request) left VS Code waiting for a response that was never
			// coming. A failure it can show beats a session that hangs.
			.catch(error => {
				this.fail(request, error instanceof Error
					? error.message
					: 'De taalserver beantwoordde het verzoek niet.');
			});
	}

	// -----------------------------------------------------------------------

	private send(message: Record<string, unknown>): void {
		this.sent.fire({ seq: this.sequence++, ...message } as vscode.DebugProtocolMessage);
	}

	private reply(request: { seq: number; command: string }, body?: unknown): void {
		this.send({
			type: 'response',
			request_seq: request.seq,
			success: true,
			command: request.command,
			...(body === undefined ? {} : { body })
		});
	}

	private fail(request: { seq: number; command: string }, message: string): void {
		this.send({
			type: 'response', request_seq: request.seq, success: false,
			command: request.command, message
		});
	}

	private event(event: string, body?: unknown): void {
		this.send({ type: 'event', event, ...(body === undefined ? {} : { body }) });
	}

	private async ask(request: unknown): Promise<DebugState> {
		return await this.client.sendRequest<DebugState>(DEBUG, request);
	}

	/** Re-read where the run stands, and tell the UI what changed. */
	private async refresh(): Promise<void> {
		const state = await this.ask({ kind: 'state' });
		this.stopped = state.at;
		if (!state.session) {
			this.event('terminated');
			return;
		}
		if (state.at) {
			this.event('stopped', {
				reason: 'breakpoint', threadId: THREAD, allThreadsStopped: true
			});
		}
	}

	private async dispatch(
		request: { seq: number; type: string; command: string; arguments?: unknown }
	): Promise<void> {
		switch (request.command) {
			case 'initialize':
				// What is *not* claimed is the interesting half: no `stepIn`, no
				// `stepBack`, no `setVariable`. §X5 states why for each — there are
				// no calls, the trace already answers backwards, and editing state
				// while paused would be a second place a situation is authored.
				this.reply(request, {
					supportsConfigurationDoneRequest: true,
					// **A condition is an instance name, not an expression.** A rule
					// fires per instance, so a breakpoint over ten thousand of them
					// stops ten thousand times, and "only for Alice" is the question
					// that raises. RegelSpraak has no expression that answers "which
					// instance am I", so a general condition would have nothing to
					// say here — and the narrow reading is stated in the manifest's
					// `conditionDescription`, which VS Code shows in the edit box.
					supportsConditionalBreakpoints: true,
					// Watch, the Debug Console **and** a hover. The ranges this needs are
					// the server's — `EvaluatableExpressionProvider` below fetches them —
					// because the word under the cursor is half a RegelSpraak name.
					supportsEvaluateForHovers: true,
					supportsStepBack: false,
					supportsSetVariable: false,
					supportsRestartRequest: false,
					supportsTerminateRequest: true
				});
				this.event('initialized');
				return;

			case 'launch': {
				const args = (request.arguments ?? {}) as LaunchArguments;
				if (!args.program || !args.case) {
					this.fail(request, 'Een launch-configuratie noemt een testset en een testgeval.');
					return;
				}
				// **Held, not started.** DAP sends `setBreakpoints` between `launch`
				// and `configurationDone`, so a session started here would already be
				// standing before the first rule with no breakpoints set — and since
				// the run is synchronous, ones arriving later cannot reach it before
				// it has passed them. Starting at `configurationDone` is what makes a
				// breakpoint on the first rule work at all.
				this.pending = args;
				this.reply(request);
				return;
			}

			case 'setBreakpoints': {
				const args = (request.arguments ?? {}) as {
					source?: { path?: string };
					breakpoints?: { line: number; condition?: string }[];
				};
				const lines = (args.breakpoints ?? []).map(one => one.line);
				if (!args.source?.path) {
					this.reply(request, { breakpoints: lines.map(() => ({ verified: false })) });
					return;
				}
				// Lines in, rules out: which rule a line is inside is a question
				// about the model, so the server answers it and this side never
				// parses anything to place a breakpoint. DAP counts in 1-based lines
				// and everything below the wire is 0-based.
				const state = await this.ask({
					kind: 'breakpoints',
					textDocument: { uri: vscode.Uri.file(args.source.path).toString() },
					points: (args.breakpoints ?? []).map(one => ({
						line: one.line - 1,
						...(one.condition ? { condition: one.condition } : {})
					}))
				});
				const landed = new Set((state.marks ?? []).map(one => one.line));
				this.marksBySource.set(args.source.path, landed.size);
				this.reply(request, {
					// **A grey dot says why.** DAP's `message` is what VS Code shows when
					// a breakpoint could not be verified, and without it the only signal
					// is the hollow circle — which reads as "nothing happened" rather
					// than "nothing here to stop at". One sentence for both file kinds,
					// because which kind this is belongs to the server (`isTestUri` is
					// asked exactly once, by the index) and a tooltip is no reason for
					// this side to learn it.
					breakpoints: lines.map(line => landed.has(line - 1)
						? { verified: true, line }
						: {
							verified: false,
							line,
							message: 'Hier is geen regel om bij stil te staan. Zet een breekpunt'
								+ ' op een Regel of Beslistabel, of op een Verwacht-regel waarvan'
								+ ' het model de waarde afleidt.'
						})
				});
				return;
			}

			case 'configurationDone': {
				this.reply(request);
				const args = this.pending;
				this.pending = undefined;
				if (!args?.program || !args.case || this.started) {
					return;
				}
				this.started = true;
				const state = await this.ask({
					kind: 'start',
					textDocument: { uri: vscode.Uri.file(args.program).toString() },
					case: args.case
				});
				if (!state.session) {
					void vscode.window.showErrorMessage(
						state.reason ?? 'De sessie kon niet worden gestart.');
					this.event('terminated');
					return;
				}
				this.stopped = state.at;
				if (!stopsOnEntry(args.stopOnEntry, this.marks)) {
					await this.ask({ kind: 'resume' });
					return;
				}
				this.event('stopped', { reason: 'entry', threadId: THREAD, allThreadsStopped: true });
				return;
			}

			case 'threads':
				this.reply(request, {
					threads: [{ id: THREAD, name: this.session.name || 'RegelSpraak' }]
				});
				return;

			case 'stackTrace': {
				// **One frame, and no pretending.** RegelSpraak has no calls and
				// firing order is dependency-driven over the whole model ([E-7]), so
				// there is no stack. Filling this with the derivation chain would
				// draw something that runs backwards in time as though it nested —
				// see §X5. The backward view is §W3's, and it is a click away.
				const at = this.stopped;
				this.reply(request, {
					totalFrames: at ? 1 : 0,
					stackFrames: at ? [{
						id: FRAME,
						name: at.instance ? `${at.rule} · ${at.instance}` : at.rule,
						line: (at.location?.range.start.line ?? 0) + 1,
						column: (at.location?.range.start.character ?? 0) + 1,
						...(at.location
							? { source: { path: vscode.Uri.parse(at.location.uri).fsPath } }
							: {})
					}] : []
				});
				return;
			}

			case 'scopes':
				this.reply(request, {
					scopes: [{
						name: 'Situatie',
						variablesReference: SCOPE_SITUATION,
						expensive: false
					}]
				});
				return;

			case 'variables':
				this.reply(request, { variables: this.situation() });
				return;

			case 'evaluate': {
				// Watch, the Debug Console and a hover all arrive here. The
				// expression is evaluated **where the run stands**, in that
				// instance's scope, and comes back already rendered — this side has
				// no arithmetic and no unit algebra, and a Watch box showing a second
				// notation is the divergence §X4's one-renderer rule exists to
				// prevent.
				const args = (request.arguments ?? {}) as { expression?: string };
				if (!args.expression) {
					this.reply(request, { result: '', variablesReference: 0 });
					return;
				}
				const state = await this.ask({ kind: 'evaluate', expression: args.expression });
				this.reply(request, {
					result: state.answer ?? '',
					variablesReference: 0
				});
				return;
			}

			case 'continue':
				await this.ask({ kind: 'resume' });
				this.reply(request, { allThreadsContinued: true });
				return;

			case 'next':
			case 'stepIn':
			case 'stepOut':
				// `next` is the honest one; the other two arrive anyway because VS
				// Code's toolbar sends them, and stepping one rule is a better
				// answer than an error the user cannot act on.
				await this.ask({ kind: 'step' });
				this.reply(request);
				return;

			case 'pause':
				// Nothing to do: a run either stands at a boundary or is between
				// two, and the server has no half-way state to report.
				this.reply(request);
				return;

			case 'terminate':
			case 'disconnect':
				await this.ask({ kind: 'stop' });
				this.reply(request);
				this.event('terminated');
				return;

			default:
				this.reply(request);
		}
	}

	/**
	 * The situation as the run stands in it, grouped nowhere and sorted by
	 * instance.
	 *
	 * Values arrive already rendered as RegelSpraak literals — this side has no
	 * arithmetic and no unit algebra, and inventing a second notation here is
	 * what §X4's rule exists to prevent.
	 */
	private situation(): { name: string; value: string; variablesReference: number }[] {
		const at = this.stopped;
		if (!at) {
			return [];
		}
		const rows = [
			...at.values.map(one => ({
				// The coordinates belong in the name: without them two cells of one
				// dimensioned attribute are two rows called the same thing holding
				// different numbers, which reads as the pane contradicting itself.
				name: `${one.instance} · ${stateName(one.attribute, one.coordinates)}`,
				value: `${showState(one)}${one.derived ? '' : '  (invoer)'}`,
				variablesReference: 0
			})),
			...at.kenmerken.map(one => ({
				name: `${one.instance} · ${one.kenmerk}`,
				value: one.present ? 'waar' : 'onwaar',
				variablesReference: 0
			}))
		].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
		// **Unsorted and in front**, because these are not more of the same list.
		// The rekendatum decides which rule version fired (§4.2) and a parameter is
		// global input neither the rule text nor the instance shows — a reader
		// standing in a rule needs both to read what is in front of them, and
		// sorting them into a wall of instance rows is where they would be lost.
		const context = [
			{ name: 'rekendatum', value: at.rekendatum, variablesReference: 0 },
			...at.parameters
				.slice()
				.sort((a, b) => a.name.localeCompare(b.name, 'nl'))
				.map(one => ({
					name: one.name,
					value: `${one.value}  (parameter)`,
					variablesReference: 0
				}))
		];
		// **Named, never valued.** The stop is before the rule and §11.1 makes a
		// variable lazy, so there is nothing to show; leaving them out entirely
		// hid that the rule has them at all. Watch computes one on request, which
		// is the laziness kept rather than worked around.
		const variables = at.variables.map(name => ({
			name,
			value: 'nog niet berekend',
			variablesReference: 0
		}));
		return [...context, ...variables, ...rows];
	}
}

/** `<attribuut> [<coördinaten>]`, the way §W3's panel names the same cell. */
function stateName(attribute: string, coordinates?: string[]): string {
	return coordinates?.length ? `${attribute} [${coordinates.join(', ')}]` : attribute;
}

/**
 * One value in the pane — a plain one, or a time-dependent one as its periods.
 *
 * A value is **either** `value` **or** `segments`, never both, so reading only
 * the first showed every time-dependent attribute as *leeg*. The periods are
 * written the way `runView`'s `period` writes them, because a reader comparing
 * the pane with the run panel is comparing the same fact and a second phrasing
 * would read as a second answer.
 *
 * Flattened onto one line rather than nested under a `variablesReference`: a
 * child list would need a reference of its own per row and a `variables` request
 * to answer it, and a timeline of two or three periods reads fine inline.
 */
function showState(one: DebugStop['values'][number]): string {
	if (!one.segments) {
		return one.value ?? 'leeg';
	}
	if (one.segments.length === 0) {
		return 'leeg';
	}
	return one.segments
		.map(segment => `${period(segment.from, segment.to)}: ${segment.value}`)
		.join('; ');
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

/** One comparable form of a file path, case-folded where the platform is. */
function pathKey(uri: vscode.Uri): string {
	return process.platform === 'win32' ? uri.fsPath.toLowerCase() : uri.fsPath;
}

/**
 * The testgeval a configuration names, if it names one.
 *
 * **A blank is not a name.** A generated `launch.json` carries `"case": ""` as
 * a placeholder, and `??` keeps an empty string — so the launch failed with
 * "noemt een testgeval" on a configuration VS Code had just written itself, and
 * the fix looked like editing a file that appeared correct. Trimmed for the same
 * reason: a name typed with a stray space is a blank a reader cannot see.
 */
export function statedCase(config: Record<string, unknown>): string | undefined {
	const stated = config.case;
	if (typeof stated !== 'string') {
		return undefined;
	}
	const trimmed = stated.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Whether to stand before the first rule, or run on to the first breakpoint.
 *
 * **The two cases want opposite answers, so the default follows the
 * breakpoints.** With none set, running on means the session is over before
 * anyone saw it — useless for a tool whose job is exploring. With some set, the
 * reader has already said where they want to be, and stopping at the first rule
 * instead reads as the breakpoint having been ignored. An explicit
 * `stopOnEntry` still wins over both.
 */
export function stopsOnEntry(stated: boolean | undefined, marks: number): boolean {
	return stated ?? marks === 0;
}

/**
 * A configuration VS Code will actually launch — the invariant, in one place.
 *
 * **What it is here for**: with no `launch.json` VS Code hands a resolver an
 * *empty* object and silently drops whatever comes back unless `type`, `request`
 * and `name` are all present. The first cut returned `{...config, program}`,
 * which resolved without error and launched nothing at all, which is the worst
 * shape a failure can take. Both resolver hooks now go through here, so the
 * lesson is stated once rather than restated in each and forgotten in a third.
 *
 * Spread first, then fill: a `launch.json` may say anything else it likes, but
 * the type and the request are what this provider *is*.
 */
function completeConfiguration(
	config: Record<string, unknown>,
	program: string,
	name: string
): vscode.DebugConfiguration {
	return {
		...config,
		type: 'regelspraak',
		request: 'launch',
		name: (config.name as string | undefined) || name,
		program
	} as vscode.DebugConfiguration;
}

/**
 * The same, once the testgeval is known.
 *
 * **Exported because it is the half that decides anything**, and a session
 * cannot be driven from a test — the same reason W4's `rangeOfGesture` and X2's
 * `statusFor` live where a test can import them.
 */
export function launchConfiguration(
	config: Record<string, unknown>,
	program: string,
	caseName: string
): vscode.DebugConfiguration {
	return {
		...completeConfiguration(config, program, `${caseName} stap voor stap`),
		case: caseName
	};
}

/**
 * Which testgeval to step through — the one the cursor is in, or a choice.
 *
 * Asked of the server rather than parsed here: `regelspraak/tests` is already
 * the one answer to "what testgevallen are there", and a second reading of the
 * same file on this side would be a second answer that could disagree with the
 * Testing view about what exists.
 */
async function pickCase(
	client: LanguageClient | undefined,
	program: string
): Promise<string | undefined> {
	if (!client) {
		void vscode.window.showErrorMessage('De taalserver draait niet.');
		return undefined;
	}
	// Compared as file paths and not as URI strings: the two sides percent-encode
	// a space differently, and a drive letter's case is not a difference on the
	// platform that has drive letters.
	const wanted = pathKey(vscode.Uri.file(program));
	let answer: TestCases;
	try {
		answer = await client.sendRequest<TestCases>(TESTS, {});
	} catch {
		return undefined;
	}
	const cases = answer.testsets
		.filter(one => pathKey(vscode.Uri.parse(one.uri)) === wanted)
		.flatMap(one => one.cases)
		// `testable` was declared and never read, so a case the composer had
		// already refused was offered like any other and failed at `start` with a
		// message from a layer down. The Testing view greys the same cases out;
		// offering one here and refusing it there is the two surfaces disagreeing
		// about what the file holds.
		.filter(one => one.testable);
	if (cases.length === 0) {
		// The file is named, because the ways to get here read identically
		// otherwise: a testset with no testgeval, one whose cases cannot be
		// composed, and a path that matched none.
		void vscode.window.showErrorMessage(
			`Geen uitvoerbaar testgeval gevonden in '${vscode.Uri.file(program).fsPath}'.`);
		return undefined;
	}
	// One case needs no question: asking would be ceremony over the only answer.
	if (cases.length === 1) {
		return cases[0].name;
	}
	// The cursor's own testgeval first, since that is usually the one meant.
	return await vscode.window.showQuickPick(cases.map(one => one.name), {
		title: 'Welk testgeval wil je stap voor stap uitvoeren?'
	});
}

/**
 * Registers the adapter and the one launch configuration it understands.
 *
 * The client is passed as a **getter**, not a value: the extension registers
 * this while the server may still be starting, and a session opened against a
 * captured `undefined` would fail with a type error rather than saying that the
 * language server is not running.
 */
export function registerDebugging(clientOf: () => LanguageClient | undefined): vscode.Disposable[] {
	return [
		/**
		 * What a hover while stopped is *about* (§X5 part F).
		 *
		 * Without this VS Code guesses, and its guess is the word under the
		 * cursor: `pensioengrondslag` out of `zijn pensioengrondslag`, which is a
		 * different phrase and — a name being greedy and multi-word ([D-12]) —
		 * frequently not one the model knows at all. The server answers with the
		 * range the builder stamped on the reference, so the thing that lights up
		 * under the pointer is the thing the model believes is one reference.
		 *
		 * Registered for the language rather than inside the adapter because VS
		 * Code asks *before* a session has anything to say, and it asks the editor,
		 * not the debuggee. Returning nothing lets the ordinary hover through,
		 * which is what happens everywhere except the rule the run stands at.
		 */
		vscode.languages.registerEvaluatableExpressionProvider('regelspraak', {
			async provideEvaluatableExpression(document, position) {
				const client = clientOf();
				if (!client || vscode.debug.activeDebugSession?.type !== 'regelspraak') {
					return undefined;
				}
				const state = await client.sendRequest<DebugState>(DEBUG, {
					kind: 'expressionAt',
					textDocument: { uri: document.uri.toString() },
					position: { line: position.line, character: position.character }
				});
				const found = state.expression;
				if (!found) {
					return undefined;
				}
				// The text travels as well as the range: the range is what VS Code
				// underlines, and the text is what it sends back as `evaluate` — and
				// re-reading the range here would be a second reader of the same
				// phrase, free to disagree with the one that chose it.
				return new vscode.EvaluatableExpression(
					new vscode.Range(
						found.range.start.line, found.range.start.character,
						found.range.end.line, found.range.end.character),
					found.text);
			}
		}),
		vscode.debug.registerDebugAdapterDescriptorFactory('regelspraak', {
			createDebugAdapterDescriptor(session) {
				const client = clientOf();
				if (!client) {
					void vscode.window.showErrorMessage(
						'De taalserver draait niet; start hem opnieuw en probeer het nog eens.');
					return undefined;
				}
				return new vscode.DebugAdapterInlineImplementation(
					new RegelSpraakDebugAdapter(client, session));
			}
		}),
		vscode.debug.registerDebugConfigurationProvider('regelspraak', {
			/**
			 * What **Run and Debug** offers, and what a generated `launch.json`
			 * starts from.
			 *
			 * Registered beside the resolver because the two cover different ways in:
			 * the resolver completes a configuration VS Code already decided to
			 * launch, and this one is what it shows when there is nothing to decide
			 * from. Without it the panel has nothing to offer for a `.test.rgs` file.
			 *
			 * **The only source of defaults.** `initialConfigurations` in the manifest
			 * does the same job, and VS Code uses *both* — which wrote the same entry
			 * into `launch.json` twice. That one is gone; this one is kept because it
			 * can grow (one entry per testgeval in the file, say) where a manifest
			 * literal cannot.
			 *
			 * It deliberately omits `case`, so a generated configuration asks which
			 * testgeval at launch rather than shipping a placeholder that has to be
			 * filled in before F5 does anything.
			 */
			provideDebugConfigurations() {
				return [{
					type: 'regelspraak',
					request: 'launch',
					name: 'Testgeval stap voor stap',
					program: '${file}'
				}];
			},
			/**
			 * F5 with no `launch.json` — the half that needs no path.
			 *
			 * **Variables are *not* substituted yet here** — `program` is still the
			 * literal `${file}` a generated `launch.json` writes. Looking a testset
			 * up by that path found nothing and reported "deze testset heeft geen
			 * testgeval", which is a true sentence about a path that does not exist
			 * and tells the reader nothing. So this hook only fills in what is
			 * knowable without one, and the testgeval is asked for in the hook below.
			 *
			 * **A complete configuration all the same, not a patched one.** With no
			 * `launch.json` VS Code hands this an *empty* object — no `type`, no
			 * `request`, no `name` — and silently does nothing with what comes back
			 * unless all three are there. Returning `{...config, program}` therefore
			 * looked right, resolved without error and launched nothing at all,
			 * which is the worst shape a failure can take. `completeConfiguration`
			 * is that invariant in one place.
			 */
			resolveDebugConfiguration(_folder, config) {
				const editor = vscode.window.activeTextEditor;
				const program = (config as LaunchArguments).program
					?? (editor?.document.fileName.endsWith('.test.rgs')
						? editor.document.fileName
						: undefined);
				if (!program) {
					void vscode.window.showErrorMessage(
						'Open een testset (*.test.rgs) om een testgeval stap voor stap uit te voeren.');
					return undefined;
				}
				return completeConfiguration(
					config as unknown as Record<string, unknown>, program,
					'Testgeval stap voor stap');
			},

			/**
			 * The half that needs the path, which by now is a real one.
			 *
			 * Called directly after the hook above with every variable substituted,
			 * so this is the first point at which the testset can be looked up and
			 * the testgeval asked for.
			 */
			async resolveDebugConfigurationWithSubstitutedVariables(_folder, config) {
				const program = (config as LaunchArguments).program;
				if (!program?.endsWith('.test.rgs')) {
					void vscode.window.showErrorMessage(
						`'${program ?? ''}' is geen testset (*.test.rgs).`);
					return undefined;
				}
				const chosen = statedCase(config as unknown as Record<string, unknown>)
					?? await pickCase(clientOf(), program);
				if (!chosen) {
					// Cancelled, or the file has no runnable case. `undefined` ends the
					// launch quietly, which is right for a Quick Pick someone dismissed.
					return undefined;
				}
				return launchConfiguration(
					config as unknown as Record<string, unknown>, program, chosen);
			}
		})
	];
}
