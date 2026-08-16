# RegelSpraak for Visual Studio Code

Write, read and review RegelSpraak models with the editor support you expect from a programming language: colour that reflects meaning, errors while you type, model-aware completion, hover documentation, an outline, navigation and rename that follow what a name means across every file, and formatting that keeps the layout without touching a word of it.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

The extension activates on `.rgs` files. (`.rgs` rather than the more obvious `.rs`, which is already established for Rust.)

> **Status: preview.** Everything under [Features](#features) works today. The extension understands your model — declarations, rules and expressions, across every `.rgs` file in the workspace — checks it, and lets you navigate, restructure and format it, but does not yet execute it. See the [Roadmap](#roadmap).

## Features

- **Semantic highlighting.** Every name in RegelSpraak is an ordinary Dutch phrase, so only a parser plus a model of your declarations can tell an object type from an attribute from a role. Each name is coloured by what it *is*, and multi-word phrases are segmented by meaning: in `de dagen te laat van de Uitlening` the attribute and the object type colour separately.
- **Diagnostics while you type**, in Dutch, each with a stable code (`RS001`–`RS903`) — the full catalogue. Names and structure, and, since the validation release, what your expressions *mean*: datatype compatibility, unit convertibility, precision and rounding, empty-value hazards, timeline granularity, distributions and decision tables.
- **A type model behind those checks.** Every value has a datatype, a sign and precision, a unit and a timeline period, and the checks read all four. Units compare by meaning rather than spelling — `€`, `EUR` and `euro` are one unit — and conversions you declare with `= 1000 g` are followed, so `kg` beside `g` is convertible while `pt` beside `€` is not.
- **Quick fixes** (<kbd>Ctrl</kbd>+<kbd>.</kbd>) for the checks with an obvious repair: declare a missing object type or domain, add a missing attribute or plural form, insert a mandatory rounding, swap the wrong quotation marks, add a `Startpuntbepaling` or an `onverdeelde rest`. Each action states exactly what it will insert, and one that would have to edit another file is not offered rather than written into the wrong one.
- **Signature help** for the constructs with named slots: the labelled `de datum met jaar: …, maand: … en dag: …`, the clauses of a distribution, and the columns of a decision table — where it shows the title row, which is the thing a cell three lines below it cannot tell you.
- **Completion** proposing only what fits the position: declaration keywords at top level, datatypes and domains inside an object type, your declared units after `met eenheid`, result phrases after `moet`, object types and roles in subject position, parameters and members of the subject's type in expressions. Multi-word names complete as one item.
- **Hover** showing a name's kind, its datatype or domain, its owning object type, and the `//` comment block above its declaration.
- **Navigation**: go to definition (<kbd>F12</kbd>) and type definition, *"which rule derives this?"* (decision tables included), find all references (<kbd>Shift</kbd>+<kbd>F12</kbd>), occurrence highlighting that separates writes from reads, and workspace symbol search (<kbd>Ctrl</kbd>+<kbd>T</kbd>) built for Dutch multi-word names — `laat`, `dagen laat` and `dtl` all find `de dagen te laat`.
- **Rename** (<kbd>F2</kbd>) across every file, replacing a multi-word name as a whole. It refuses a name already taken in the same scope, refuses a position that resolves more than one way, and reports what it deliberately left alone.
- **Formatting** (<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>, a selection, or while you type) that indents by the structure of the model rather than by a guess at the line, lines up the columns of every object type, unit system and fact type, and lines up a decision table's pipes. **Only whitespace ever changes**: a name in RegelSpraak is a run of ordinary words and a rule's name is free text, so respacing inside one would rename it — the formatter edits the gaps between words and never a word, and never joins or splits a line. A file that does not parse is left exactly as it is, and *"RegelSpraak: Document opmaken"* tells you so rather than doing nothing.
- **Counts above a declaration** (CodeLens): how often an object type, a rule or a decision table is named elsewhere, and — above an object type — how many rules derive something it declares. Clicking one opens the list.
- **Inlay hints** for what the model works out and the text does not say: the datatype and unit a rule derives, the same for each `Daarbij geldt:` variable, and — set to `all` — the object type a `zijn` or `hij` refers to. Where the model is not sure, nothing is shown.
- **Smart selection expansion** (<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>→</kbd>) along the sentence: word, whole name, subject chain, expression, sentence, rule version, rule. Names are several words, so the editor's word-by-word expansion had little to offer here.
- **Links in comments**: a URL, and the name of another `.rgs` file of the model — `// zie boekerij-gegevens.rgs` becomes a way to get there.
- **A Model Explorer** in its own activity-bar container: every declaration in the workspace in one tree, grouped by kind, with members underneath — including the ones an `Extensie van objecttype` block in another file adds. Click a row and the declaration opens; the tree follows what you type.
- **Call hierarchy over rule dependencies** (**Show Call Hierarchy**): incoming is the rules that read what this rule derives, outgoing is the rules that derive what it reads, and a rule named directly with `regelversie <naam> gevuurd is` counts in both. **Type hierarchy** shows an object type with the `Extensie van objecttype` blocks that re-open it.
- **A model view of a file** (read-only): the declarations the language server sees in it, in the order the file writes them, with their members and declared datatypes.
- **A visual editor for decision tables**, opt-in per file: every `Beslistabel` as a grid of cases and columns, with the conclusion column marked and diagnostics shown on the cell they are about. Edits are ordinary text edits, so undo, save and a text editor open beside it keep working; column titles stay read-only, and a value containing a `|` is refused, because both change the shape of the table rather than a case.
- **The language server's status** beside the language mode of a `.rgs` file, so a server that failed to start is not mistaken for one with nothing to report; clicking it opens the log.
- **Outline, breadcrumbs and folding**, with object types, fact types, domains, unit systems and rules carrying their members as children; folding is grammar-aware — declarations, rule versions, koptekst sections, `Daarbij geldt:` blocks and compound-condition bullets — and honours `//#region` markers.
- **Snippets** for every frequent construct, each body validated against the language grammar in CI, plus bracket, quote and guillemet (`«»`) matching, `//` comment toggling, indentation rules and bullet-list continuation.
- **RegelSpraak in Markdown**: a fenced code block marked `regelspraak` (or `rgs`) is highlighted inside any `.md` file, so a model reads properly in documentation and design notes. Syntax only — a Markdown file is not a model, so a block is coloured but not analysed.

Validation is deliberately conservative, and one rule runs through all of it: **where the model cannot be sure, it says nothing.** An unresolvable name, an ambiguous phrase, a precision a division leaves open — none of these produce a report, because a false warning on a correct sentence costs more than a missed one. The checks are measured against the sample models and the language's conformance corpus on every build, and none of them may report anything there.

All of it resolves **across files**: rules in one file are coloured, checked, navigated and renamed against the GegevensSpraak declarations in another. Per-release detail — including the full list of diagnostic codes — is in the [CHANGELOG](CHANGELOG.md).

The language server runs locally as a child process. Nothing is sent to a network service, and your `.rgs` files never leave your machine.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `regelspraak.validation.enable` | `true` | Turns semantic validation on or off. |
| `regelspraak.validation.runOn` | `type` | Re-validate while typing, or only on save. |
| `regelspraak.validation.scope` | `openFiles` | Report diagnostics for open files, or the whole workspace. |
| `regelspraak.validation.strictPrecision` | `true` | Reports rounding and precision judgements (`RS401`–`RS403`, and the rate-conversion warning `RS306`). |
| `regelspraak.validation.emptyValueHazards` | `true` | Reports places where an empty value causes a run-time error (`RS501`–`RS505`). |
| `regelspraak.semanticHighlighting.enable` | `true` | Colours names by what the model knows about them. Off leaves the keyword-level TextMate colouring. |
| `regelspraak.format.enable` | `true` | Formats `.rgs` files. Off leaves the layout entirely to you. |
| `regelspraak.inlayHints.enable` | `types` | `off`, `types` (inferred datatypes and units) or `all` (also the object type behind a `zijn`/`hij`). |
| `regelspraak.server.path` | *(empty)* | Path to a language server build. Empty uses the bundled server. |
| `regelspraakLanguageServer.trace.server` | `off` | Traces LSP communication into the output channel. |

`strictPrecision` and `emptyValueHazards` quiet whole families rather than filter their output: a family that is off is never run. They exist because `RS4xx` and `RS5xx` report a *judgement* — that a precision is unclear, that a value might be empty — rather than an error of fact.

### Line wrapping

A RegelSpraak sentence cannot be broken across lines. The specification makes the newline significant (§13.1.8) and gives it a job — it ends a rule's name, separates versions, bullets and variables — so a result sentence stays on one line however long it grows. The extension therefore turns **soft** wrapping on for `.rgs` files, which changes the display and never the file:

| Setting | Default here | What it does |
| --- | --- | --- |
| `editor.wordWrap` | `bounded` | Wraps at the column below, or the width of the editor, whichever is narrower. |
| `editor.wordWrapColumn` | `100` | Around a tenth of the lines in a typical model reach it. |
| `editor.wrappingIndent` | `deepIndent` | Indents a continuation two levels, so it reads as part of the sentence above rather than a new one. |

Override any of them for yourself in user or workspace settings, and they win over these:

```json
"[regelspraak]": {
	"editor.wordWrap": "off"
}
```

`Alt+Z` toggles wrapping for the current editor without changing any setting. No ruler ships with this: a ruler marks a width you are meant to keep to by breaking the line, which is the one thing you cannot do here.

## Roadmap

| | Release | What it adds |
| --- | --- | --- |
| ✅ | **Preview** | Semantic colour, live diagnostics, completion, hover, outline, folding, snippets |
| ✅ | **Navigation** | Go to definition and type definition · Find all references · Highlight occurrences · Workspace symbol search · Safe cross-file rename of multi-word names · "Which rule derives this attribute?" |
| ✅ | **Validation** | The full diagnostics catalogue — type compatibility, unit convertibility, rounding and precision, empty-value (`leeg`) policy, timeline granularity, distribution and decision-table rules — with quick fixes, plus signature help |
| ✅ | **Formatting & ergonomics** | Formatting that changes whitespace and nothing else · CodeLens reference and derivation counts · Inlay hints for inferred datatypes and units · Smart selection expansion · Links in comments |
| ✅ | **Workbench** (current) | A RegelSpraak view container with a Model Explorer tree · Call hierarchy over rule dependencies · Type hierarchy over object types and their extensions · A read-only model view of a file · A visual editor for decision tables · Language server status in the status bar |
| ⬅ | **Execution** (next) | Run rules and decision tables against scenario data · Results and derivation traces in-editor · Scenarios as tests in the Test Explorer |
| | **Optional extras** | Scenario notebooks · Task provider, file decorations, index caching — each still to be decided on |

Interface language is Dutch throughout, matching the language itself; there is no English UI mode.

## Contributing

Architecture, building, pointing the extension at a language server, debugging
and testing: [docs/DEVELOPING.md](docs/DEVELOPING.md).

## License and third-party notices

This repository's own source is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for what that does **not** cover:

- The bundled language server in released extensions is proprietary and is licensed for use only as part of this extension.
- The RegelSpraak specification is © 2025 Belastingdienst and is not redistributed here.
