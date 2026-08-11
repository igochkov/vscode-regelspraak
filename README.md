# RegelSpraak for Visual Studio Code

Write, read and review RegelSpraak models with the editor support you expect from a programming language: colour that reflects meaning, errors while you type, model-aware completion, hover documentation, an outline, and navigation and rename that follow what a name means across every file.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

The extension activates on `.rgs` files. (`.rgs` rather than the more obvious `.rs`, which is already established for Rust.)

> **Status: preview.** Everything under [Features](#features) works today. The extension understands your model — declarations and rules, across every `.rgs` file in the workspace — and lets you navigate and restructure it, but does not yet execute it. Validation is still deliberately partial; see the [Roadmap](#roadmap).

## Features

- **Semantic highlighting.** Every name in RegelSpraak is an ordinary Dutch phrase, so only a parser plus a model of your declarations can tell an object type from an attribute from a role. Each name is coloured by what it *is*, and multi-word phrases are segmented by meaning: in `de dagen te laat van de Uitlening` the attribute and the object type colour separately.
- **Diagnostics while you type**, in Dutch, each with a stable code (`RS001`–`RS613`). Validation is deliberately conservative — a diagnostic is raised only where the model can decide the answer, so a correct file stays clean.
- **Completion** proposing only what fits the position: declaration keywords at top level, datatypes and domains inside an object type, your declared units after `met eenheid`, result phrases after `moet`, object types and roles in subject position, parameters and members of the subject's type in expressions. Multi-word names complete as one item.
- **Hover** showing a name's kind, its datatype or domain, its owning object type, and the `//` comment block above its declaration.
- **Navigation**: go to definition (<kbd>F12</kbd>) and type definition, *"which rule derives this?"*, find all references (<kbd>Shift</kbd>+<kbd>F12</kbd>), occurrence highlighting that separates writes from reads, and workspace symbol search (<kbd>Ctrl</kbd>+<kbd>T</kbd>) built for Dutch multi-word names — `laat`, `dagen laat` and `dtl` all find `de dagen te laat`.
- **Rename** (<kbd>F2</kbd>) across every file, replacing a multi-word name as a whole. It refuses a name already taken in the same scope, refuses a position that resolves more than one way, and reports what it deliberately left alone.
- **Outline, breadcrumbs and folding**, with object types, fact types, domains, unit systems and rules carrying their members as children; folding is grammar-aware and honours `//#region` markers.
- **Snippets** for every frequent construct, each body validated against the language grammar in CI, plus bracket, quote and guillemet (`«»`) matching, `//` comment toggling, indentation rules and bullet-list continuation.
- **RegelSpraak in Markdown**: a fenced code block marked `regelspraak` (or `rgs`) is highlighted inside any `.md` file, so a model reads properly in documentation and design notes. Syntax only — a Markdown file is not a model, so a block is coloured but not analysed.

All of it resolves **across files**: rules in one file are coloured, checked, navigated and renamed against the GegevensSpraak declarations in another. Per-release detail — including the full list of diagnostic codes — is in the [CHANGELOG](CHANGELOG.md).

The language server runs locally as a child process. Nothing is sent to a network service, and your `.rgs` files never leave your machine.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `regelspraak.validation.enable` | `true` | Turns semantic validation on or off. |
| `regelspraak.validation.runOn` | `type` | Re-validate while typing, or only on save. |
| `regelspraak.validation.scope` | `openFiles` | Report diagnostics for open files, or the whole workspace. |
| `regelspraak.server.path` | *(empty)* | Path to a language server build. Empty uses the bundled server. |
| `regelspraakLanguageServer.trace.server` | `off` | Traces LSP communication into the output channel. |

## Roadmap

| | Release | What it adds |
| --- | --- | --- |
| ✅ | **Preview** | Semantic colour, live diagnostics, completion, hover, outline, folding, snippets |
| ✅ | **Navigation** (current) | Go to definition and type definition · Find all references · Highlight occurrences · Workspace symbol search · Safe cross-file rename of multi-word names · "Which rule derives this attribute?" |
| ⬅ | **Validation** (next) | The full diagnostics catalogue — type compatibility, unit convertibility, rounding and precision, empty-value (`leeg`) policy, timeline granularity, distribution and decision-table rules — with quick fixes, plus signature help |
| | **Formatting & ergonomics** | Formatting that preserves RegelSpraak's significant layout · CodeLens reference counts · Inlay hints for inferred datatypes and units · Smart selection expansion |
| | **Execution** | Run rules and decision tables against scenario data · Results and derivation traces in-editor · Scenarios as tests in the Test Explorer |
| | **Workbench** | A RegelSpraak view container with a Model Explorer tree · Task provider · Rule-dependency hierarchy · A visual Beslistabel editor |

Interface language is Dutch throughout, matching the language itself; there is no English UI mode.

## Contributing

Architecture, building, pointing the extension at a language server, debugging
and testing: [docs/DEVELOPING.md](docs/DEVELOPING.md).

## License and third-party notices

This repository's own source is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for what that does **not** cover:

- The bundled language server in released extensions is proprietary and is licensed for use only as part of this extension.
- The RegelSpraak specification is © 2025 Belastingdienst and is not redistributed here.
