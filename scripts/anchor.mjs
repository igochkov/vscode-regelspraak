// A Markdown heading's anchor, the way GitHub and VS Code's preview derive one:
// lowercased, punctuation dropped, spaces to hyphens.
//
// Derived rather than written by the author, which is what makes a retitled
// article a failure in `source-coverage.mjs` instead of a dead link in a hover.
//
// `client/src/sourceLinks.ts` holds the same rule in TypeScript, because the
// extension has to find the heading a citation names and cannot import from
// `scripts/` — that folder is not packaged into the .vsix. The two are held
// together by `client/src/test/sourceLinks.test.ts`, which imports this module
// and asserts both answer the same for every heading in the example document.

/** @param {string} heading the heading text, without its leading `#`s */
export function slug(heading) {
	return heading
		.toLowerCase()
		.replace(/[^\p{L}\p{N} _-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}
