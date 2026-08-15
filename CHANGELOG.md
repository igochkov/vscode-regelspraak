# Changelog

All notable changes to the RegelSpraak extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions map to delivered capability phases: each phase of the implementation
plan gets a minor release, through to `1.0.0`.

## [0.3.0] — Deep validation and quick fixes

The extension now reads your expressions, not just your names. It works out what
every value **is** — its datatype, its precision, its unit, the period its
timeline cuts it into — and checks the arithmetic, the comparisons and the
assignments against it. Where a check finds something, it usually offers to fix
it.

One rule runs through all of it: **where the model cannot be sure, it says
nothing.** An unresolvable name, an ambiguous phrase, a value whose precision a
division leaves open — none of these produce a report. A false warning on a
correct sentence costs more than a missed one, so the checks are measured
against the sample models and the conformance corpus on every build, and none of
them may report anything there.

### Added

- **Type checking of expressions** (`RS201`–`RS210`): arithmetic on something
  that is not a number, `groter`/`kleiner` on something that is not a number,
  `eerder`/`later` on something that is not a date, an equality between two
  different datatypes, an assignment whose expression does not fit its target, a
  characteristic or role applied to a value instead of to an object, the
  `elfproef` and the `numeriek met exact … cijfers` check on the wrong sort of
  operand, a day kind applied to something that is not a date, and
  `moet berekend worden als` used for something that is not a calculation.
- **Unit checking** (`RS301`–`RS307`). Units are compared by *meaning*, not by
  spelling: `€`, `EUR` and `euro` are one unit, and so are `kg` and a kilogram
  written out. Conversions declared with `= 1000 g` are followed, so `kg` beside
  `g` is reported as convertible-but-unequal (a warning about precision) while
  `pt` beside `€` is not convertible at all. Days and months have **no**
  conversion — a month is not a fixed number of days — and mixing them is its own
  code. `tot de macht` wants plain numbers; `het totaal van` and
  `het tijdsevenredig deel per …` want a value *per* time unit, such as
  `€/maand`. A percentage cannot be an operand of `maal` at all (§6.4).
- **Precision and rounding** (`RS401`–`RS403`): a result with more decimals than
  its target allows, the rounding §6.1.3 makes mandatory after `de wortel van`
  and `tot de macht`, and — as a warning — a result whose precision is not
  determined, which is what a division leaves you with unless you round it.
- **Empty values** (`RS501`–`RS505`), as warnings: dividing by a value that may
  be empty, comparing two possibly-empty values of a non-numeric type, a
  `Startpuntbepaling` that may yield nothing, a distribution criterion that may be
  empty, and an `eerder`/`later` date comparison where both sides may be. An
  *inequality* between two empty values is not among them: §8.1.1 makes that
  simply `onwaar`, with no run-time error. "May be empty" is drawn narrowly on purpose — only a value that
  *nothing* fills unconditionally counts, and a rule that checks `gevuld` first is
  left alone — because the alternative is a warning on every division in every
  model.
- **Timelines** (`RS701`–`RS703`): deriving a value cut per month from one cut per
  day (the finer detail is lost), a timeline with `met variabel startpunt` that no
  rule gives a start point to, and `het totaal van` or `het tijdsevenredig deel`
  left without parentheses or a variable to bound it.
- **Distributions** (`RS801`–`RS808`): a maximum or a rounding without an
  `Als onverdeelde rest blijft … over`, a maximum combined with `in gelijke
  delen`, a criterion that is not a number where the distribution computes with
  it, and one without an order where it sorts by it. Plus the three checks about
  *which side* an attribute belongs to: a criterion belongs to the recipient, the
  undistributed remainder to the distributor, and a distribution runs only
  between objects that a fact type relates one-to-many.
- **Decision tables** (`RS901`–`RS903`) now have a model. The table's rows and
  cells are read, its conclusion column is composed into a sentence and checked,
  and a malformed table — a row with a different number of columns, a missing
  title row — is reported. Two consequences beyond the checks: **"which rule
  derives this?" now lists decision tables**, and the phrase in a table's
  conclusion column is coloured, hoverable, navigable and renameable like any
  other. Table rows are also highlighted as tables, with the row-number column
  distinguished from the values.
- **More reference checks**, now that the model can tell what a position expects:
  an unknown day kind after a date (`RS108`), an unknown rule in
  `Regelversie … is gevuurd` (`RS110`), an enumeration value the domain does not
  define — or that belongs to a different domain (`RS111`), and a role of a
  `Wederkerig feittype` used without an ordinal to say which side is meant
  (`RS112`, a warning).
- **More structural checks**: a rule that derives a value from itself (`RS606`),
  `hij` used where the subject's object type is not `(bezield)` (`RS609`), the
  wrong quotation marks for the datatype in that position (`RS610` — reported
  instead of the general type mismatch, so the fix can simply swap them), a rule
  with no result part (`RS602`) or no universal subject (`RS603`), and united
  uniqueness checks whose operands do not line up (`RS612`).
- **Quick fixes** (<kbd>Ctrl</kbd>+<kbd>.</kbd>) for the checks that have an
  obvious repair: declare the missing object type or domain, add the missing
  attribute to the type it was looked for in, add the mandatory or the missing
  rounding, swap the quotation marks, add the plural form, add a
  `Startpuntbepaling`, put the parentheses in, add the `onverdeelde rest`. Each
  action states exactly what it will insert, and a fix that would have to edit
  another file is not offered rather than written into the wrong one.
- **Signature help** while you type the constructs that have named slots: the
  labelled `de datum met jaar: …, maand: … en dag: …` and its datetime
  counterpart, the clauses of a distribution, and the columns of a decision table
  — where it shows the title row, which is the thing a cell three lines below it
  cannot tell you.

### Changed

- **Enumeration values and units inside expressions are part of the model.**
  `5 pt` and `'roman'` are coloured, hoverable and navigable, and renaming a unit
  or an enumeration value now reaches its uses instead of reporting them as text
  it did not cover.
- A characteristic assignment inside a subselection (`… die … : zijn gewicht is
  groter dan 10 kg`) is understood as being about the *selected* object rather
  than about the rule's subject. The same holds for a distribution's criteria,
  which belong to the recipients. Both were previously left unresolved, so they
  had no colour, no hover and no navigation.

### Notes

- **Three unknown-name codes are deliberately not reported.** When a bare phrase
  in a rule resolves to nothing, the sentence does not say whether a role, a
  parameter, a variable or a mistyped attribute was meant — so reporting one of
  them would be wrong most of the time. The positions where the language *does*
  settle the kind are reported (see `RS108`, `RS110`, `RS111` above).
- Enumeration values and units **inside decision-table cells** are still text a
  rename does not cover. The conclusion column is part of the model; the
  condition columns and the value cells are not yet.

## [0.2.0] — Navigation and refactoring

Moving through a multi-file model, and restructuring one safely. Everything here
runs on the same resolved model the colouring and diagnostics already use, so a
name is navigated as the thing it *means* — not as matching text.

### Added

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
- **The Markdown preview shows a `regelspraak` block unhighlighted.** The editor
  and the preview colour code with two different engines: the editor uses the
  TextMate grammar this release injects, while the built-in preview renders with
  markdown-it and highlights fences with highlight.js, which has no RegelSpraak
  language and falls back to plain escaped text. Nothing about the injection can
  change that. Supporting the preview means contributing a markdown-it plugin
  that emits highlight.js's own CSS classes — a separate piece of work, and one
  that has to be careful not to start a language server for every previewed
  `.md` file. Deferred, not forgotten.

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
