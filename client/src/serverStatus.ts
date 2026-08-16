// C7 — server status in the status bar (FSD §C7, the server half).
//
// The other half of §C7 is the active scenario, which arrives with execution
// (Phase 6b); nothing here is shaped around it beyond leaving room.
//
// **A language status item rather than a plain status-bar item**, which is a
// deliberate reading of "status bar item". `window.createStatusBarItem` puts a
// permanent entry in every window, including the ones with no RegelSpraak in
// them, and the one thing it would say most of the time is that everything is
// fine. `languages.createLanguageStatusItem` is the API VS Code added for
// exactly this fact — how the language support for *this* document is doing —
// and it appears only while a `.rgs` file is in front of the user, folds into
// the language-status widget when there is nothing wrong, and pushes itself
// forward when there is.
//
// Which is also why the state is worth showing at all: a language server that
// failed to start is otherwise indistinguishable from one that has an opinion
// of "no errors, no symbols, no completions" (NFR-5).

import {
	Disposable, LanguageStatusItem, LanguageStatusSeverity, languages
} from 'vscode';
import { State as ClientState } from 'vscode-languageclient/node';

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
 * `starting` describes the start and not the indexing that follows it.
 *
 * It used to promise "Het model wordt geïndexeerd", which is a fact this side
 * does not track: the transition to `ready` fires when the connection is up,
 * and the workspace scan runs on well past it. Saying so made the item claim
 * knowledge of a moment nothing here observes — and a fifth custom method to
 * observe it would not clear the bar `protocol.ts` sets for one.
 */
const DETAIL: Record<ServerState, string> = {
	starting: 'De taalserver wordt gestart.',
	ready: 'Diagnostiek, navigatie en aanvulling zijn beschikbaar.',
	error: 'Zonder taalserver blijven diagnostiek, navigatie en aanvulling leeg.',
	stopped: 'Er draait geen taalserver voor dit venster.'
};

/**
 * A stopped server is not an error and a starting one is not a problem, but
 * neither is the state anyone wants to be left in silently — so both sit above
 * `Information`, which folds the item away.
 */
const SEVERITY: Record<ServerState, LanguageStatusSeverity> = {
	starting: LanguageStatusSeverity.Information,
	ready: LanguageStatusSeverity.Information,
	error: LanguageStatusSeverity.Error,
	stopped: LanguageStatusSeverity.Warning
};

export class ServerStatus implements Disposable {
	private readonly item: LanguageStatusItem;
	private current: ServerState = 'starting';

	constructor() {
		this.item = languages.createLanguageStatusItem(
			'regelspraak.serverStatus',
			{ language: 'regelspraak' });
		this.item.name = 'RegelSpraak-taalserver';
		this.item.command = { command: SHOW_LOG_COMMAND, title: 'Logboek tonen' };
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
		return this.item.detail;
	}

	/**
	 * `reason` replaces the standing explanation, for the one state that has
	 * something specific to say — a server that could not be found names the
	 * path it looked at, and that is the whole of the fix.
	 */
	set(state: ServerState, reason?: string): void {
		this.current = state;
		this.item.text = TEXT[state];
		this.item.detail = reason ?? DETAIL[state];
		this.item.severity = SEVERITY[state];
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
		}
	}

	dispose(): void {
		this.item.dispose();
	}
}
