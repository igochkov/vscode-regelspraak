// A Markdown heading's anchor, the way GitHub and VS Code's preview derive one:
// lowercased, punctuation dropped, spaces to hyphens.
//
// Derived rather than written by the author, which is what makes a retitled
// article a failure in `source-coverage.mjs` instead of a dead link in a hover.
//
// The language server holds the same rule in TypeScript, in
// `model/sourceCitations.ts`'s `anchorOf`, because it is what turns a citation's
// anchor into the line a hover and P14 open — and it cannot import from
// `scripts/`, which is not packaged into the .vsix. No test can hold two
// functions across the two repositories together, so the pair is gated end to
// end instead: this check accepts a citation only where its anchor names a
// heading, and the E2E suite requires the same citation to come back carrying a
// line number, which it only can if the server's copy agrees.

/** @param {string} heading the heading text, without its leading `#`s */
export function slug(heading) {
	return heading
		.toLowerCase()
		.replace(/[^\p{L}\p{N} _-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}
