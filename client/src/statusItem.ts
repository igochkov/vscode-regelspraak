// C7 — the two status-bar items this extension owns, and the rule they share.
//
// **A visible status-bar item, gated on the language** — which is a revision.
// Both items began as `languages.createLanguageStatusItem`, on the reasoning that
// a plain status-bar entry sits in every window including the ones with no
// RegelSpraak in them, and that the language-status widget is the API VS Code
// added for "how is the language support for *this* document doing".
//
// That reasoning was right about *where* and wrong about *how loudly*. The
// language-status widget collapses into a `{}` icon and shows nothing until it is
// hovered or clicked, so both facts these items carry ended up behind a gesture
// nobody makes: the active testgeval is the input to every **uitvoeren**, and a
// run silently made against a scenario chosen days ago is the one risk §X2's
// design carries — a mitigation you have to go looking for is not one. The server
// state is the same shape of fact (NFR-5): a server that never started is
// otherwise indistinguishable from one with no opinions.
//
// So the item is a `StatusBarItem` and this factory keeps the *where*: shown
// while a RegelSpraak document is in front of the reader and hidden otherwise.
// One place, because two items following the same rule two ways is how they come
// to disagree about which files they belong to.

import { Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';

import { isOurs } from './languages';

/**
 * A status-bar item that appears only beside a RegelSpraak document.
 *
 * Right-aligned, because the left is for what the workbench is doing and the
 * right for what the file in front of you is. A higher `priority` sits further
 * left, so the scenario — which a reader checks before pressing run — comes
 * before the server state, which they read once and then forget.
 */
export function regelSpraakStatusItem(id: string, priority: number): {
	item: StatusBarItem;
	dispose(): void;
} {
	const item = window.createStatusBarItem(id, StatusBarAlignment.Right, priority);
	const follow = (): void => {
		// Both ids since [N-5]: the active testgeval is the input to every run, so
		// the one place a reader most needs to see it is a testset — which used
		// to be `regelspraak` and is `testspraak` now.
		if (isOurs(window.activeTextEditor?.document.languageId ?? '')) {
			item.show();
		} else {
			item.hide();
		}
	};
	const subscription = window.onDidChangeActiveTextEditor(follow);
	follow();
	return {
		item,
		dispose: (): void => {
			subscription.dispose();
			item.dispose();
		}
	};
}

/**
 * A name cut to fit, with the whole of it left to the tooltip.
 *
 * A testgeval's label is free text to the line break ([T-31]), so names like
 * *Een kort lidmaatschap geeft een jeugdlid met korting* are normal and would
 * push every other status-bar entry off the screen. Cut at a word where one is
 * near the limit: a truncation in the middle of a word reads as a different name.
 */
export function fitted(text: string, limit = 28): string {
	if (text.length <= limit) {
		return text;
	}
	const cut = text.slice(0, limit);
	const space = cut.lastIndexOf(' ');
	return `${(space > limit / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Both items are disposed by the extension, never by each other. */
export type StatusItem = ReturnType<typeof regelSpraakStatusItem> & Disposable;
