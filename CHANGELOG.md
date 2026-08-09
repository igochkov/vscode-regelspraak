# Changelog

All notable changes to the RegelSpraak extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions map to delivered capability phases: each phase of the implementation
plan gets a minor release, through to `1.0.0`.

## [0.1.0] — First public preview

The extension understands your model: it parses every `.rgs` file in the
workspace, resolves references across files, and drives all of the features
below from that shared model rather than from pattern matching.

### Added

- **Semantic highlighting.** Names are coloured by what they mean, following the
  RegelSpraak convention — purple object types, green attributes and enumeration
  values, orange characteristics and dimensions, blue roles and parameters.
  Multi-word phrases are segmented by meaning, so in `de dagen te laat van de
  Uitlening` the attribute and the object type colour separately. Ships with
  defaults for light and dark themes, overridable through
  `editor.semanticTokenColorCustomizations`.
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
