// Every scope the TextMate grammar emits for colour must be one a theme knows.
//
// **A scope only works if a theme keys on the name.** This has now cost two
// findings — `keyword.operator.word` for the word operators, which no theme has
// a rule for, and `constant.other.date` for date literals, where VS Code's own
// defaults carry no `constant.other` rule at all. In both the pattern matched,
// the token was right, and the text rendered as though nothing had been scoped.
// Neither `npm run build:grammar` nor `tokenize-check` can see it: both are
// about which scope a token *gets*, and this is about what a theme does with it
// afterwards.
//
// The themes ship inside VS Code, so this is the suite that can ask. It reads
// the four default themes off `env.appRoot` and resolves each of our scopes the
// way TextMate does — longest matching prefix on a dot boundary, last rule wins.

import * as assert from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';

import * as vscode from 'vscode';

/**
 * Scopes that are deliberately not for colour, and why.
 *
 * `meta.*` is a structural container by TextMate convention — it exists so that
 * other rules and injections can scope against it, and themes are expected to
 * leave it alone. `punctuation.*` is coloured by no default theme either: a
 * bullet, a table pipe and a dash render at the editor foreground, which is what
 * they should do. Both are judgements about intent, which is why they are listed
 * rather than inferred.
 */
const NOT_FOR_COLOUR = ['meta.', 'punctuation.'];

interface Rule {
	scope?: string | string[];
	settings?: { foreground?: string };
}

function rulesOf(themes: string[]): Rule[] {
	const base = join(vscode.env.appRoot, 'extensions', 'theme-defaults', 'themes');
	const rules: Rule[] = [];
	for (const name of themes) {
		const theme = JSON.parse(readFileSync(join(base, name), 'utf8')) as { tokenColors?: Rule[] };
		rules.push(...(theme.tokenColors ?? []));
	}
	return rules;
}

/** The foreground a theme gives this scope, by TextMate's own prefix matching. */
function foreground(rules: Rule[], scope: string): string | undefined {
	let found: string | undefined;
	for (const rule of rules) {
		const scopes = typeof rule.scope === 'string'
			? rule.scope.split(',').map(one => one.trim())
			: rule.scope ?? [];
		for (const one of scopes) {
			if (scope === one || scope.startsWith(`${one}.`)) {
				found = rule.settings?.foreground ?? found;
			}
		}
	}
	return found;
}

/** Every `name` in the generated grammar that looks like a scope. */
function scopesOf(grammar: unknown): string[] {
	const found = new Set<string>();
	const walk = (node: unknown): void => {
		if (Array.isArray(node)) {
			node.forEach(walk);
			return;
		}
		if (node && typeof node === 'object') {
			const name = (node as { name?: unknown }).name;
			if (typeof name === 'string' && name.includes('.')) {
				found.add(name);
			}
			Object.values(node as Record<string, unknown>).forEach(walk);
		}
	};
	walk(grammar);
	return [...found].sort();
}

suite('TextMate-scopes tegen de standaardthema\'s', () => {
	// From `client/out/test`, three up is the repository root — the grammar the
	// extension ships, read without waiting for activation.
	const grammar = JSON.parse(readFileSync(
		join(__dirname, '..', '..', '..', 'syntaxes', 'regelspraak.tmLanguage.json'), 'utf8'));
	const scopes = scopesOf(grammar);

	const THEMES: Record<string, string[]> = {
		'Dark+': ['dark_vs.json', 'dark_plus.json'],
		'Light+': ['light_vs.json', 'light_plus.json']
	};

	test('de grammatica levert scopes op om te toetsen', () => {
		assert.ok(scopes.length > 10, `verwachtte scopes, kreeg ${scopes.length}`);
	});

	for (const [name, files] of Object.entries(THEMES)) {
		test(`elke kleurdragende scope krijgt een kleur in ${name}`, () => {
			const rules = rulesOf(files);
			const colourless = scopes
				.filter(one => !NOT_FOR_COLOUR.some(prefix => one.startsWith(prefix)))
				.filter(one => foreground(rules, one) === undefined);
			assert.deepStrictEqual(colourless, [],
				`deze scopes vallen terug op de editor-voorgrond in ${name}, `
				+ 'dus het token is er wel en de kleur niet — zie de kop van dit bestand');
		});
	}

	test('een verzonnen scope zou hier wél opvallen', () => {
		// Zonder deze zou de toets hierboven ook slagen als `foreground` altijd
		// iets teruggaf, en dan bewijst hij niets.
		const rules = rulesOf(THEMES['Dark+']);
		assert.equal(foreground(rules, 'constant.other.date.regelspraak'), undefined);
		assert.ok(foreground(rules, 'constant.numeric.date.regelspraak'));
	});
});
