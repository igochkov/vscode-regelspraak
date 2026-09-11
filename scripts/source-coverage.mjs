#!/usr/bin/env node
// Checks the citations that tie a RegelSpraak model to the document it renders.
//
// A model is derived from a source text — a reglement, a regeling, a contract —
// and `docs/AUTHORING.md` asks every declaration and rule group to say which
// provision it renders, in a `// Bron:` doc comment. A citation nobody checks
// decays in both directions: the model is renumbered, or the source is, and
// nothing says so. This is what says so.
//
// It reads text and knows nothing of the grammar. That is deliberate — it has to
// run in this repository's CI, which has no language server (see ci.yml), and
// everything it checks is visible in the characters. Where a check would need a
// parse it is narrowed to the case a regex can be trusted with, and the limit is
// stated at the check.
//
//   node scripts/bron-coverage.mjs [--model samples/workspace/single-folder] [--quiet]

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { argv, exit, stdout } from 'node:process';

// One rule for what a heading's anchor is; the language server holds the other
// copy (`model/sourceCitations.ts`) and the two are gated end to end — see the
// comment in `anchor.mjs`.
import { slug } from './anchor.mjs';

const options = parse(argv.slice(2));
const root = options.model ?? 'samples/workspace/single-folder';

/** `--flag value` and `--flag`, which is the whole of the command line. */
function parse(args) {
	const out = {};
	for (let i = 0; i < args.length; i++) {
		if (!args[i].startsWith('--')) {continue;}
		const name = args[i].slice(2);
		const next = args[i + 1];
		if (next !== undefined && !next.startsWith('--')) {
			out[name] = next;
			i++;
		} else {
			out[name] = true;
		}
	}
	return out;
}

function walk(dir, found = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, found);
		} else if (entry.endsWith('.rgs')) {
			found.push(full);
		}
	}
	return found;
}

// ---------------------------------------------------------------- the source

/**
 * The articles of one source document: number, title, anchor, the leden under
 * it, and any commencement date either states.
 *
 * A lid is a top-level ordered item. `_Inwerkingtreding: DD-MM-YYYY_` beside one
 * is what the geldigheid check below compares a rule version against, and a
 * section marked `<!-- geen-regels -->` is one the model is not expected to
 * render — a definition whose whole content is the shape of the data.
 */
function readSource(path) {
	const lines = readFileSync(path, 'utf8').split(/\r?\n/);
	const articles = [];
	let current;
	let lid;
	for (const [index, line] of lines.entries()) {
		const heading = /^#{1,6}\s+Artikel\s+(\d+)\.\s*(.*)$/.exec(line);
		if (heading) {
			current = {
				number: Number(heading[1]),
				title: heading[2].trim(),
				anchor: slug(line.replace(/^#+\s+/, '')),
				line: index + 1,
				leden: [],
				exempt: false,
				commencement: undefined
			};
			articles.push(current);
			lid = undefined;
			continue;
		}
		if (/^#{1,6}\s/.test(line)) {
			current = undefined;
			lid = undefined;
			continue;
		}
		if (!current) {continue;}

		const item = /^(\d+)\.\s+\S/.exec(line);
		if (item) {
			lid = {
				number: Number(item[1]), line: index + 1,
				commencement: undefined, exempt: false
			};
			current.leden.push(lid);
		}
		if (line.includes('<!-- geen-regels -->')) {
			(lid ?? current).exempt = true;
		}
		const from = /_Inwerkingtreding:\s*(\d{2}-\d{2}-\d{4})_/.exec(line);
		if (from) {
			(lid ?? current).commencement = from[1];
		}
	}
	return articles;
}

// ----------------------------------------------------------------- the model

const CITATION = /^\s*\/\/\s*Bron:\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
/**
 * A citation of a provision in Dutch law, by the Juriconnect standard — bare or
 * behind its resolver, and as a bare reference or as the href of a link.
 *
 * **Recognised so that it is not reported, and checked by nothing here.** This
 * script's two questions are both about a document beside the model: does the
 * citation still resolve, and is every provision rendered by something. Neither
 * has an answer for a provision that lives at `wetten.overheid.nl` — it is not a
 * file to open and not an article this script can enumerate — so such a citation
 * contributes no coverage and is passed over.
 *
 * What *can* be said about one is said by **RS120** in the editor, off the same
 * reading the hover and P14 use (`model/juriconnect.ts` in the language-server
 * repository). Restating any of that here would be a second implementation of a
 * question that already has one, which is the failure this pair of repositories
 * keeps having to unpick — and it would drift, since only one of the two copies
 * is ever in front of whoever changes the rule.
 */
const JURICONNECT = /^\s*\/\/\s*Bron:\s*(\[[^\]]*\]\()?(https?:\/\/(www\.)?wetten\.overheid\.nl\/)?jci\d/;
const REFERENCE = /^art\.\s*(\d+)(?:\s+lid\s+(\d+))?/;
/** `geldig vanaf <datum>`, the only half of a validity this check compares. */
const VALID_FROM = /\bgeldig\s+vanaf\s+(\d{2}-\d{2}-\d{4})/g;
/** A declaration opens in the first column; a rule's body is indented. */
const DECLARATION = /^\S/;

/**
 * Every citation in one model file, with the validity of the declaration each
 * one annotates.
 *
 * "The declaration it annotates" is the run of lines from the citation to the
 * end of the first unindented block below it — the shape of the language rather
 * than a parse of it, which is why the geldigheid check speaks only where a
 * `geldig vanaf` is actually written under the citation.
 */
function readCitations(file) {
	const lines = readFileSync(file, 'utf8').split(/\r?\n/);
	const found = [];
	for (const [index, line] of lines.entries()) {
		const cited = CITATION.exec(line);
		if (!cited) {
			// A Juriconnect citation is well formed and simply not this script's
			// business; anything else that opens with `Bron` is a citation somebody
			// meant to write and did not.
			if (/^\s*\/\/\s*Bron\b/.test(line) && !JURICONNECT.test(line)) {
				found.push({ file, line: index + 1, malformed: line.trim() });
			}
			continue;
		}
		if (JURICONNECT.test(line)) {
			continue; // a link whose href is a reference, not a path beside the model
		}
		found.push({
			file,
			line: index + 1,
			text: cited[1].trim(),
			target: cited[2].trim(),
			validFrom: validityBelow(lines, index)
		});
	}
	return found;
}

function validityBelow(lines, from) {
	const dates = [];
	let started = false;
	for (let i = from + 1; i < lines.length; i++) {
		const line = lines[i];
		if (/^\s*\/\//.test(line)) {continue;}
		if (DECLARATION.test(line)) {
			if (started) {break;}
			started = true;
		}
		if (!started) {continue;}
		for (const match of line.matchAll(VALID_FROM)) {
			dates.push(match[1]);
		}
	}
	return dates;
}

// ------------------------------------------------------------------- the run

const errors = [];
const note = (where, message) => errors.push(`${where}: ${message}`);

if (!existsSync(root)) {
	console.error(`No model folder at ${root}.`);
	exit(2);
}

const files = walk(root).sort();
const citations = files.flatMap(readCitations);
const sources = new Map();
const cited = new Map();

for (const citation of citations) {
	const where = `${relative('.', citation.file).split(sep).join(posix.sep)}:${citation.line}`;
	if (citation.malformed) {
		note(where, 'unreadable citation — expected "// Bron: [art. N lid M](path#anchor)", '
			+ `not ${JSON.stringify(citation.malformed)}`);
		continue;
	}

	const [targetPath, anchor] = citation.target.split('#');
	const resolved = join(root, targetPath);
	if (!existsSync(resolved)) {
		note(where, `points at ${targetPath}, which does not exist`);
		continue;
	}
	if (!sources.has(resolved)) {
		sources.set(resolved, readSource(resolved));
	}
	const articles = sources.get(resolved);

	const reference = REFERENCE.exec(citation.text);
	if (!reference) {
		note(where, `the link text ${JSON.stringify(citation.text)} names no article `
			+ '— expected "art. N" or "art. N lid M"');
		continue;
	}
	const number = Number(reference[1]);
	const lidNumber = reference[2] === undefined ? undefined : Number(reference[2]);

	const article = articles.find(one => one.number === number);
	if (!article) {
		note(where, `names article ${number}, which ${targetPath} does not have`);
		continue;
	}
	// The anchor and the link text state the same thing twice, so they are
	// checked against each other: a citation copied from the rule beside it keeps
	// the wrong anchor, and would otherwise open the wrong provision in silence.
	if (!anchor) {
		note(where, `has no anchor — expected ${targetPath}#${article.anchor}`);
	} else if (anchor !== article.anchor) {
		const owner = articles.find(one => one.anchor === anchor);
		note(where, owner
			? `names article ${number} but links to article ${owner.number} (#${anchor})`
			: `links to #${anchor}, which is no heading in ${targetPath}`);
	}

	let lid;
	if (lidNumber !== undefined) {
		lid = article.leden.find(one => one.number === lidNumber);
		if (!lid) {
			note(where, `names article ${number} lid ${lidNumber}, which does not exist`);
			continue;
		}
	}

	const key = `${resolved}|${number}|${lidNumber ?? ''}`;
	cited.set(key, (cited.get(key) ?? 0) + 1);
	if (lidNumber !== undefined) {
		const article = `${resolved}|${number}|`;
		cited.set(article, (cited.get(article) ?? 0) + 1);
	}

	// Only where both sides state a date. A rule that is `geldig altijd` makes no
	// claim about commencement, and a provision whose date the source does not
	// record is not a disagreement either.
	const commencement = lid?.commencement ?? article.commencement;
	if (commencement && citation.validFrom.length > 0
		&& !citation.validFrom.includes(commencement)) {
		note(where, `is valid from ${citation.validFrom.join(', ')}, but ${citation.text} `
			+ `commences on ${commencement}`);
	}
}

// Coverage the other way: a provision that nothing renders. This is the audit
// question, and the reason the citations are structured at all.
for (const [path, articles] of sources) {
	const shown = relative('.', path).split(sep).join(posix.sep);
	for (const article of articles) {
		if (article.exempt) {continue;}
		if (!cited.has(`${path}|${article.number}|`)) {
			note(`${shown}:${article.line}`,
				`article ${article.number} (${article.title}) is cited by no file`);
			continue;
		}
		for (const lid of article.leden) {
			if (lid.exempt) {continue;}
			if (!cited.has(`${path}|${article.number}|${lid.number}`)) {
				note(`${shown}:${lid.line}`,
					`article ${article.number} lid ${lid.number} is cited by no file`);
			}
		}
	}
}

if (sources.size === 0) {
	console.error(`No citation found anywhere under ${root}.`);
	exit(2);
}

if (!options.quiet) {
	for (const [path, articles] of sources) {
		const leden = articles.reduce((n, one) => n + one.leden.length, 0);
		stdout.write(`${relative('.', path)}: ${articles.length} articles, ${leden} leden\n`);
	}
	stdout.write(`${citations.length} citations across ${files.length} model files\n`);
}

if (errors.length > 0) {
	stdout.write(`\n${errors.length} finding${errors.length === 1 ? '' : 's'}:\n`);
	for (const line of errors) {stdout.write(`  ${line}\n`);}
	exit(1);
}
stdout.write('Every citation resolves and every lid is rendered.\n');
