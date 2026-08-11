# Changelog

All notable changes to the RegelSpraak extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions map to delivered capability phases: each phase of the implementation
plan gets a minor release, through to `1.0.0`.

## [0.2.0] — Navigation and refactoring

### Added

- **RegelSpraak in Markdown.** A fenced code block marked `regelspraak` (or
  `rgs`) is highlighted as RegelSpraak inside any `.md` file — documentation,
  a design note, a pull-request description rendered locally. The fence
  behaves like every built-in language block: `~~~` works, so do longer
  fences, an indented block inside a list item works, and an info string
  (```` ```regelspraak{1,3} ````) is accepted.

  This is the syntax layer only — keywords, literals, comments. The
  meaning-aware colouring, diagnostics, hover and navigation all need a model,
  and a Markdown file is not one, so a block is coloured but not analysed. No
  language server is started for a `.md` file, and none is needed: the
  highlighting is a declarative contribution, so it applies with no `.rgs` file
  in the workspace.

Moving through a multi-file model, and restructuring one safely. Everything here
runs on the same resolved model the colouring and diagnostics already use, so a
name is navigated as the thing it *means* — not as matching text.

### Added (navigation)

- **Go to definition** (<kbd>F12</kbd>) from any name to its declaration, across
  files: attributes and characteristics, object types, roles, parameters,
  variables, domains, dimensions, day kinds, units — including from a plural form
  to its singular declaration, from an `Extensie van objecttype` header to the
  type it re-opens, and from a unit abbreviation such as `pt` to the unit that
  declares it. The cursor may sit anywhere inside a multi-word name.
- **Go to type definition** from an attribute or parameter to its `Domein`, from
  a role to the object type that fills it, from an enumeration value to its
  domain. Where a declaration uses an inline datatype instead of a domain, it
  leads to the declaration itself — that is where the datatype is written.
- **Go to implementation**, read as *"which rule derives this?"* — from an
  attribute or characteristic to every rule whose result part assigns it
  (`moet berekend/gesteld worden`, `moet geïnitialiseerd worden`, a
  characteristic assignment, a distribution). A consistency rule checks rather
  than derives, so it is not listed.
- **Find all references** (<kbd>Shift</kbd>+<kbd>F12</kbd>) across the workspace:
  uses inside rules and conditions, fact-type role lines, and other declarations.
  Singular and plural forms of one name are one list.
- **Highlight occurrences** in the active file, distinguishing **written** from
  **read**: the attribute a rule derives is marked as a write, the values it
  reads on the way are not.
- **Go to Symbol in Workspace** (<kbd>Ctrl</kbd>+<kbd>T</kbd>) over every
  declaration in every `.rgs` file of every workspace folder. Matching is built
  for Dutch multi-word names: a hit in the middle of a name counts
  (`laat` → `de dagen te laat`), so do the words you remember with the ones you
  forgot left out (`dagen laat`), and initials (`dtl`).
- **Rename** (<kbd>F2</kbd>) of any model symbol, updating every reference across
  every file in one edit, with the multi-word name replaced as a whole. Three
  safeguards, because renaming is the one feature that writes:
  - it **refuses a name that already exists in the same scope**, and says which
    declaration and which file it collides with — the scope being the model's
    global namespace, the members of one object type, or the variables of one
    rule;
  - it **refuses where the name under the cursor resolves more than one way**,
    rather than edit some occurrences of the wrong declaration;
  - it **reports what it did not change**: a plural form `(mv: …)` that now needs
    the same treatment, and any remaining text the model does not account for —
    a comment, a unit inside an expression, a decision-table cell.

### Changed

- A characteristic, role or day kind named in a condition or a characteristic
  assignment (`Een Lid is jeugdlid`, `indien alle Leden jeugdlid zijn`) is now
  part of the model, so it is coloured, has hover documentation, and can be
  navigated and renamed like any other name.
- A rule referred to by `Regelversie <naam> is gevuurd` now resolves to that
  rule.
- Names in rules no longer resolve to declarations that cannot occur there — a
  domain, a unit system, a fact type or a rule. RegelSpraak models routinely name
  a rule after the characteristic it assigns ("Regel Jeugdlid" sets `jeugdlid`),
  and the name in the rule body now resolves to the characteristic rather than to
  the rule.

### Notes

- A decision table derives its result column's attribute too, but its tabular
  layout sits outside the language grammar; decision-table cells join the model
  with the validation release, and until then contribute no derivations and are
  reported as text a rename did not cover.
- Enumeration values and units written inside expressions are literals that the
  model does not yet resolve, so a rename of one edits its declaration and tells
  you about the rest.

## [0.1.0] — First public preview

The extension understands your model: it parses every `.rgs` file in the
workspace, resolves references across files, and drives all of the features
below from that shared model rather than from pattern matching.

### Added

- **Semantic highlighting.** Names are coloured by what they mean: object types,
  attributes, characteristics, enumeration values, units, roles, parameters,
  rules and rule variables each get their own token type. Multi-word phrases are
  segmented by meaning, so in `de dagen te laat van de Uitlening` the attribute
  and the object type colour separately. **The colours come from your theme** —
  each token type maps to a standard TextMate scope, so RegelSpraak matches the
  rest of your editor and no theme you chose is overridden. Per-language rules
  under `editor.semanticTokenColorCustomizations` let you pick your own.
- **Diagnostics** as you type, in Dutch, each with a stable code: syntax
  (`RS001`–`RS003`); reference resolution across files — unknown object type or
  role (`RS101`), attribute or characteristic not a member of the resolved type
  (`RS102`), unknown domain (`RS105`), unit (`RS106`) or dimension (`RS107`),
  extension of a non-existent object type (`RS113`); and structure — overlapping
  rule-version validity (`RS601`), forward variable reference (`RS604`),
  duplicate rule name (`RS607`), dimension combined with a timeline (`RS608`),
  missing plural form (`RS613`).
- **Completion**, proposing only what fits the position: declaration keywords at
  top level, datatypes and domains inside an object type, declared units after
  `met eenheid`, dimensions after `gedimensioneerd met`, validity and result
  phrases inside a rule, object types and roles in subject position, and
  parameters, rule variables and members of the subject's type in expression
  position. Multi-word names complete as one item and replace what you have
  already typed.
- **Hover** showing a symbol's kind, datatype or domain, owning object type, and
  the `//` comment block above its declaration — for declarations and for
  references, across files.
- **Outline, breadcrumbs and Go to Symbol**, with object types, fact types,
  domains, unit systems and rules carrying their members as children.
- **Folding**: grammar-aware for declarations and for each `geldig …` version of
  a multi-version rule, plus `//#region` … `//#endregion` markers.
- **Snippets** for every frequent construct, from `objecttype` through
  `startpuntbepaling`. Every snippet body is validated against the language
  grammar in CI.
- **Editing comfort**: bracket and quote matching, auto-closing and
  auto-surrounding including guillemets `«»` and enumeration quotes `'` (guarded
  so apostrophes inside names are untouched), `//` comment toggling, indentation
  rules for declaration bodies and rule versions, and Enter continuing bullet
  lists (`•`, `••`, `..`, `- `) at the same depth.
- **Settings** for enabling validation, choosing whether it runs on type or on
  save, its scope, and the language server path.

### Notes

- Syntax highlighting is generated from the language's ANTLR lexer, so colouring
  cannot drift from the grammar.
- Validation is deliberately conservative: a diagnostic is raised only where the
  model can decide the answer, so a correct file stays clean. The rest of the
  catalogue — type compatibility, unit convertibility, rounding, empty-value
  policy, timelines, distribution and decision tables — arrives with the
  validation release. See the Roadmap in the README.
- The language server runs locally and sends nothing over the network.
