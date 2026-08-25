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
	values: { instance: string; attribute: string; value?: string; derived: boolean }[];
	kenmerken: { instance: string; kenmerk: string; present: boolean }[];
}

interface DebugState {
	session: boolean;
	at?: DebugStop;
	reason?: string;
	marks?: { line: number; rule: string }[];
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
class RegelSpraakDebugAdapter implements vscode.DebugAdapter {
	private readonly sent = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	readonly onDidSendMessage = this.sent.event;
	private sequence = 1;
	private stopped: DebugStop | undefined;
	private listener: vscode.Disposable | undefined;
	/** Held between `launch` and `configurationDone` — see the launch case. */
	private pending: LaunchArguments | undefined;
	private started = false;
	/** How many breakpoints landed on a rule, which decides the entry stop. */
	private marks = 0;

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

	handleMessage(message: vscode.DebugProtocolMessage): void {
		void this.dispatch(message as { seq: number; type: string; command: string; arguments?: unknown });
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
					supportsConditionalBreakpoints: false,
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
					breakpoints?: { line: number }[];
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
					lines: lines.map(one => one - 1)
				});
				const landed = new Set((state.marks ?? []).map(one => one.line));
				this.marks = landed.size;
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
				name: `${one.instance} · ${one.attribute}`,
				value: `${one.value ?? 'leeg'}${one.derived ? '' : '  (invoer)'}`,
				variablesReference: 0
			})),
			...at.kenmerken.map(one => ({
				name: `${one.instance} · ${one.kenmerk}`,
				value: one.present ? 'waar' : 'onwaar',
				variablesReference: 0
			}))
		];
		return rows.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
	}
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
 * A launch configuration VS Code will actually launch.
 *
 * **Exported because it is the half that decides anything**, and a session
 * cannot be driven from a test — the same reason W4's `rangeOfGesture` and X2's
 * `statusFor` live where a test can import them. It earned that the hard way:
 * the first cut returned `{...config, program}`, which resolved without error
 * and launched nothing at all, because with no `launch.json` VS Code hands the
 * resolver an *empty* object and silently drops anything lacking `type`,
 * `request` and `name`.
 */
export function launchConfiguration(
	config: Record<string, unknown>,
	program: string,
	caseName: string
): vscode.DebugConfiguration {
	// Spread first, then fill: a `launch.json` may say anything else it likes,
	// but the type and the request are what this provider *is*.
	return {
		...config,
		type: 'regelspraak',
		request: 'launch',
		name: (config.name as string | undefined) || `${caseName} stap voor stap`,
		program,
		case: caseName
	} as vscode.DebugConfiguration;
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
		.flatMap(one => one.cases);
	if (cases.length === 0) {
		// The file is named, because the two ways to get here read identically
		// otherwise: a testset with no testgeval, and a path that matched none.
		void vscode.window.showErrorMessage(
			`Geen testgeval gevonden in '${vscode.Uri.file(program).fsPath}'.`);
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
			 * F5 with no `launch.json`.
			 *
			 * **A complete configuration, not a patched one.** With no `launch.json`
			 * VS Code hands the resolver an *empty* object — no `type`, no `request`,
			 * no `name` — and silently does nothing with what comes back unless all
			 * three are there. Returning `{...config, program}` therefore looked
			 * right, resolved without error and launched nothing at all, which is
			 * the worst shape a failure can take.
			 *
			 * The testgeval is **asked for** rather than demanded: it is the one
			 * thing the editor cannot infer — a file holds several — and an error
			 * saying `case` is missing would be true and useless. This is the same
			 * reading §X2 takes of the run commands, where what a person invokes is
			 * the lens above the thing they mean.
			 */
			/**
			 * The half that needs no path.
			 *
			 * **Variables are *not* substituted yet here** — `program` is still the
			 * literal `${file}` a generated `launch.json` writes. Looking a testset
			 * up by that path found nothing and reported "deze testset heeft geen
			 * testgeval", which is a true sentence about a path that does not exist
			 * and tells the reader nothing. So this hook only fills in what is
			 * knowable without one.
			 *
			 * A complete configuration all the same: with no `launch.json` VS Code
			 * hands this an empty object and silently drops anything lacking `type`,
			 * `request` and `name`.
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
				return {
					...config,
					type: 'regelspraak',
					request: 'launch',
					name: config.name || 'Testgeval stap voor stap',
					program
				};
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
