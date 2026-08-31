// C7 — server status in the status bar (FSD §C7, the server half).
//
// **Visible, and only beside a `.rgs` file.** See `statusItem.ts` for why this is
// a `StatusBarItem` gated on the language rather than a language status item: the
// language-status widget folds into a `{}` icon, and the state this reports is
// one a reader has to be *told* rather than one they will go looking for.
//
// Which is why the state is worth showing at all: a language server that failed
// to start is otherwise indistinguishable from one that has an opinion of "no
// errors, no symbols, no completions" (NFR-5).

import { Disposable, StatusBarItem, ThemeColor } from 'vscode';
import { State as ClientState } from 'vscode-languageclient/node';

import { regelSpraakStatusItem } from './statusItem';

/** Opens the server's own output channel — the click target §C7 asks for. */
export const SHOW_LOG_COMMAND = 'regelspraak.showServerLog';

export type ServerState = 'starting' | 'ready' | 'error' | 'stopped';

const TEXT: Record<ServerState, string> = {
	starting: 'RegelSpraak: taalserver start…',
	ready: 'RegelSpraak: taalserver actief',
	error: 'RegelSpraak: taalserver niet gestart',
	stopped: 'RegelSpraak: taalserver gestopt'
};

/**
 * The status bar has room for a word and an icon, not for a sentence.
 *
 * The icon carries the state and the label carries which extension is speaking —
 * a bare `$(check)` in a row of other extensions' items says nothing. `TEXT`
 * above stays as the tooltip's first line and as what the E2E suite reads.
 */
const LABEL: Record<ServerState, string> = {
	starting: '$(sync~spin) RegelSpraak',
	ready: '$(check) RegelSpraak',
	error: '$(error) RegelSpraak',
	stopped: '$(debug-disconnect) RegelSpraak'
};

/**
 * `starting` describes the start and not the indexing that follows it.
 *
 * It used to promise "Het model wordt geïndexeerd", which is a fact this side
 * does not track: the transition to `ready` fires when the connection is up,
 * and the workspace scan runs on well past it. Saying so made the item claim
 * knowledge of a moment nothing here observes — and a custom method to observe
 * it would not clear the bar `protocol.ts` sets for one.
 */
const DETAIL: Record<ServerState, string> = {
	starting: 'De taalserver wordt gestart.',
	ready: 'Diagnostiek, navigatie en aanvulling zijn beschikbaar.',
	error: 'Zonder taalserver blijven diagnostiek, navigatie en aanvulling leeg.',
	stopped: 'Er draait geen taalserver voor dit venster.'
};

/**
 * A stopped server is not an error and a starting one is not a problem, but
 * neither is a state anyone wants to be left in silently — so both colour the
 * item rather than only wording it. `ready` and `starting` leave it plain: an
 * item that is always coloured has stopped saying anything.
 */
const BACKGROUND: Record<ServerState, string | undefined> = {
	starting: undefined,
	ready: undefined,
	error: 'statusBarItem.errorBackground',
	stopped: 'statusBarItem.warningBackground'
};

export class ServerStatus implements Disposable {
	private readonly item: StatusBarItem;
	private readonly release: () => void;
	private current: ServerState = 'starting';
	private explanation: string | undefined;

	/**
	 * Told when a **running** server dies (C6).
	 *
	 * A callback rather than a notification raised here: what to say and which
	 * actions to offer is the extension's decision — it owns the restart command
	 * — and this class stays a status-bar item that a test can drive.
	 */
	constructor(private readonly onCrash?: () => void) {
		// Behind the scenario item: which testgeval a run uses is checked before
		// every run, and this is read once and then forgotten.
		const { item, dispose } = regelSpraakStatusItem('regelspraak.serverStatus', 99);
		this.item = item;
		this.release = dispose;
		this.item.name = 'RegelSpraak-taalserver';
		this.item.command = SHOW_LOG_COMMAND;
		this.set('starting');
	}

	/** What the status bar is currently saying, which the E2E suite asserts on. */
	get state(): ServerState {
		return this.current;
	}

	/**
	 * The explanation beside it. Read by the E2E suite when it gives up on a
	 * server, because for the state that matters there — one that was never
	 * found — this is the half that names the path that was tried.
	 */
	get detail(): string | undefined {
		return this.explanation;
	}

	/**
	 * `reason` replaces the standing explanation, for the one state that has
	 * something specific to say — a server that could not be found names the
	 * path it looked at, and that is the whole of the fix.
	 */
	set(state: ServerState, reason?: string): void {
		this.current = state;
		this.explanation = reason ?? DETAIL[state];
		this.item.text = LABEL[state];
		this.item.tooltip = `${TEXT[state]}\n\n${this.explanation}`;
		const background = BACKGROUND[state];
		this.item.backgroundColor = background ? new ThemeColor(background) : undefined;
	}

	/**
	 * Follows the client's own state machine, which is the only thing that knows
	 * a **running** server has died.
	 *
	 * `start()` resolving and `stop()` being called are the two moments the
	 * extension drives, and they were the only two this item was told about. But
	 * `LanguageClient` restarts a crashed server by itself and eventually gives
	 * up, without either call — so a server that fell over after a good start
	 * left the item reading *taalserver actief*, beside the detail promising that
	 * diagnostics, navigation and completion were available, while none of them
	 * were. That is precisely the state §C7 exists to make visible (NFR-5): the
	 * one thing worse than no language support is language support that looks
	 * like an opinion.
	 *
	 * `Starting` is not mapped back onto `starting`: the client passes through it
	 * on every automatic restart, and a `.rgs` file whose server is quietly
	 * cycling should say so once rather than flicker.
	 */
	follow(state: ClientState): void {
		if (state === ClientState.Running) {
			this.set('ready');
		} else if (state === ClientState.Stopped && this.current === 'ready') {
			this.set('error', 'De taalserver is gestopt nadat hij gestart was. Bekijk het logboek voor de oorzaak.');
			// **Once per crash, and the guard above is what makes that true**: the
			// transition only fires from `ready`, so a server that keeps cycling
			// says so on each *good* start it loses and not on each stop. A
			// deliberate stop never reaches here, `stopClient` setting `stopped`
			// before it calls `stop()`.
			this.onCrash?.();
		}
	}

	dispose(): void {
		this.release();
	}
}

/**
 * Which server this window actually started, for whoever has to explain a
 * mismatch.
 *
 * The three facts are written to the output channel on every start and read by
 * nobody: "check there first when a change appears to have no effect" only helps
 * someone who already suspects the server. Kept here as well so a failure can
 * *state* them — a request the server does not know is a version mismatch, and
 * this is the whole of what a reader needs to see.
 *
 * Beside the status item rather than in `extension.ts`, which starts the server:
 * this module is the one that already answers "what is the server doing", and
 * putting it there would make every consumer import the module that imports
 * them.
 */
export interface ServerBuild {
	module: string;
	origin: string;
	/** Absent where the file could not be stat'ed. */
	builtAt?: string;
}

let started: ServerBuild | undefined;

export function recordServerBuild(build: ServerBuild): void {
	started = build;
}

/** The server this window started, or nothing before the first attempt. */
export function startedServer(): ServerBuild | undefined {
	return started;
}
