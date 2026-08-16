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

/** Opens the server's own output channel — the click target §C7 asks for. */
export const SHOW_LOG_COMMAND = 'regelspraak.showServerLog';

export type ServerState = 'starting' | 'ready' | 'error' | 'stopped';

const TEXT: Record<ServerState, string> = {
	starting: 'RegelSpraak: taalserver start…',
	ready: 'RegelSpraak: taalserver actief',
	error: 'RegelSpraak: taalserver niet gestart',
	stopped: 'RegelSpraak: taalserver gestopt'
};

const DETAIL: Record<ServerState, string> = {
	starting: 'Het model wordt geïndexeerd.',
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

	dispose(): void {
		this.item.dispose();
	}
}
