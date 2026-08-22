# RegelSpraak for Visual Studio Code

Write, read and review RegelSpraak models with the editor support you expect from a programming language: colour that reflects meaning, errors while you type, model-aware completion, hover documentation, an outline, navigation and rename that follow what a name means across every file, and formatting that keeps the layout without touching a word of it.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

The extension activates on `.rgs` files — models, and the `*.test.rgs` testsets that go with them. (`.rgs` rather than the more obvious `.rs`, which is already established for Rust.)

> **Status:** Everything below works today. The extension understands your model — declarations, rules and expressions, across every `.rgs` file in the workspace — and the `*.test.rgs` testsets that say what it should produce. It checks all of it, lets you navigate, restructure and format it, and **runs your testsets**, showing the derivation trace behind every result. What is next is in the [roadmap](docs/ROADMAP.md).

<!-- Demo: upload the recording to a release or an issue comment and paste the URL
     on its own line here, without these comment markers. GitHub renders an mp4
     as a player; the Marketplace page renders images only, so it needs the GIF. -->

## Features

- **Colour by meaning.** Every name in RegelSpraak is an ordinary Dutch phrase, so only a parser plus a model of your declarations can tell an object type from an attribute from a role. Multi-word names are segmented by what each part means.
- **The whole diagnostics catalogue** (`RS001`–`RS958`), in Dutch, while you type: names, structure, and what your expressions *mean* — datatypes, unit convertibility, precision and rounding, empty-value hazards, timelines, distributions, decision tables. **Where the model cannot be sure, it says nothing.**
- **Help while writing**: completion that proposes only what fits the position, snippets for every frequent construct, signature help for the constructs with named slots, and quick fixes (<kbd>Ctrl</kbd>+<kbd>.</kbd>) for the checks with an obvious repair.
- **Navigation and rename across every file.** Definition and type definition (<kbd>F12</kbd>), *"which rule derives this?"*, references (<kbd>Shift</kbd>+<kbd>F12</kbd>), symbol search built for Dutch multi-word names, call and type hierarchy, and a rename (<kbd>F2</kbd>) that replaces a multi-word name as a whole and reports what it left alone.
- **Formatting that only ever changes whitespace** (<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>): indentation from the structure of the model, aligned columns, aligned decision-table pipes — and never a word, because respacing inside a name would rename it.
- **What the text does not say, shown beside it**: hover with the declaration's `//` comment, inlay hints for the datatype and unit a rule derives, reference and derivation counts above a declaration, a grammar-aware outline and folding, and sentence-wise selection expansion.
- **The model seen whole**: a Model Explorer over every declaration in the workspace, a read-only model view of one file, and a preview for a `Beslistabel` that shows what the source cannot — which column concludes, and what the case your cursor is in concludes as one sentence.
- **Testsets that run.** A `*.test.rgs` testset is part of the language — same colour, checks, formatting and rename, crossing into the model in both directions — and it *runs*: in the Testing view with failures as diffs, or from a link in the text, one testgeval or one rule at a time, with the values, the characteristics, the faults and the derivation trace in a panel beside the model.

Each of these in full, with the reasoning behind the shape it takes, is in
[docs/FEATURES.md](docs/FEATURES.md). Per-release detail is in the
[CHANGELOG](CHANGELOG.md).

## Good to know

- **All of it resolves across files.** Rules in one file are coloured, checked, navigated and renamed against the GegevensSpraak declarations in another.
- **Nothing leaves your machine.** The language server runs locally as a child process; there is no network service.
- **`Regelgroep <naam>` is the one construct added beyond RegelSpraak v2.3.0.** §9.10 has the rule group as a concept and gives it no written form, so a model that uses it is not portable to a strict v2.3.0 tool — worth knowing you are opting in. It is optional. (`//` comments are the other thing the specification does not define, and have been accepted since the first release.)
- **Interface language is Dutch throughout**, matching the language itself; there is no English UI mode.
- **Settings, and the line wrapping the extension turns on** for `.rgs` files (a RegelSpraak sentence cannot be broken across lines): [docs/SETTINGS.md](docs/SETTINGS.md).
- **Laying out a model** — how to name and arrange its files, and why: [docs/AUTHORING.md](docs/AUTHORING.md). [samples/](samples) is the worked example.

## Issues

Bug reports and feature requests are welcome; the templates ask the few things
that make one actionable. One thing worth knowing before cloning: this
repository is the extension client, and the language server it drives is
developed and released separately, so a fresh clone compiles and lints but
cannot exercise any language feature until a server build is linked in — see
[NOTICE](NOTICE).

## License and third-party notices

This repository's own source is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for what that does **not** cover:

- The bundled language server in released extensions is proprietary and is licensed for use only as part of this extension.
- The RegelSpraak specification is © 2025 Belastingdienst and is not redistributed here.
