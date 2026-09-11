# RegelSpraak for Visual Studio Code

Write, read and review RegelSpraak models with the editor support you expect from a programming language: colour that reflects meaning, errors while you type, model-aware completion, hover documentation, an outline, navigation and rename that follow what a name means across every file, formatting that keeps the layout without touching a word of it — and a debugger that steps through a run one rule at a time.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

The extension activates on `.rgs` files — models, the `*.test.rgs` testsets that go with them, and the `.rgs.md` notebooks of the mode below. (`.rgs` rather than the more obvious `.rs`, which is already established for Rust.)

## Two ways to write one model

**The mode is the kind of document you open, not a setting**, and everything below works in both.

- **Technische modus** — `.rgs` and `*.test.rgs` files in `gegevens/`, `regels/` and `tests/`, with the document the model renders under `bron/` and a `// Bron:` line from each rule back to the provision it renders. This is the mode of a model somebody else wrote the text for: a converted PTPO, a regeling, an ALEF project brought across. [samples/](samples) is the worked example.
- **Juridische modus** — a **notebook**: an `.rgs.md` document in which the text of the reglement and the RegelSpraak that computes it alternate, in the order the text has, with the worked example under the bepaling it checks. One notebook is one artikel, and the folders above it are the levels the document itself has. This is the mode of a text and a rule written together, by the person who means both. [samples-notebook/](samples-notebook) is the worked example.

**They are one model.** A notebook and a folder of `.rgs` files under the same workspace folder share one namespace: a rule in a notebook resolves an object type an engineer declared in `gegevens/`, a testset in `tests/` runs the notebook's rules, and a name declared twice is reported once. So a team may split the work by role and the model does not know the split happened. Laying out either, and choosing between them: [docs/AUTHORING.md](docs/AUTHORING.md).

> **Status:** Everything below works today. The extension understands your model — declarations, rules and expressions, across every `.rgs` file and `.rgs.md` notebook under the workspace folder — and the `*.test.rgs` testsets that say what it should produce. It checks all of it, lets you navigate, restructure and format it, and **runs your testsets** — showing the derivation behind every value, why a rule stayed quiet, and, with <kbd>F5</kbd>, the run itself one rule at a time. What is next is in the [roadmap](docs/ROADMAP.md).

## The extension in two minutes

[![Completion proposing "recht op verlenging" with "kenmerk (bezittelijk)" beside it, after four letters were typed](https://raw.githubusercontent.com/igochkov/vscode-regelspraak/main/images/regelspraak-demo.png)](https://github.com/user-attachments/assets/e6379585-41eb-4051-bbb4-fbec90c844f0)

Writing with completion, three kinds of mistake caught, a testset running with the
derivation trace behind every value, navigation and rename that cross between a
model and the testset that tests it, the formatter, the decision-table preview,
and the whole workspace in one tree — over the model in [samples/](samples).
[The film](https://github.com/user-attachments/assets/e6379585-41eb-4051-bbb4-fbec90c844f0) plays in the browser: one minute fifty-five, with Dutch
captions (mp4, 7 MB).

## Features

- **Colour by meaning.** Every name in RegelSpraak is an ordinary Dutch phrase, so only a parser plus a model of your declarations can tell an object type from an attribute from a role. Multi-word names are segmented by what each part means.
- **The whole diagnostics catalogue** (`RS001`–`RS965`), in Dutch, while you type: names, structure, and what your expressions *mean* — datatypes, unit convertibility, precision and rounding, empty-value hazards, timelines, distributions, decision tables. **Where the model cannot be sure, it says nothing.**
- **Help while writing**: completion that proposes only what fits the position, snippets for every frequent construct, signature help for the constructs with named slots, and quick fixes (<kbd>Ctrl</kbd>+<kbd>.</kbd>) for the checks with an obvious repair.
- **Navigation and rename across every file.** Definition and type definition (<kbd>F12</kbd>), *"which rule derives this?"*, references (<kbd>Shift</kbd>+<kbd>F12</kbd>), symbol search built for Dutch multi-word names, call and type hierarchy, and a rename (<kbd>F2</kbd>) that replaces a multi-word name as a whole and reports what it left alone.
- **Formatting that only ever changes whitespace** (<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>): indentation from the structure of the model, aligned columns, aligned decision-table pipes — and never a word, because respacing inside a name would rename it.
- **What the text does not say, shown beside it**: hover with the declaration's `//` comment, inlay hints for the datatype and unit a rule derives, reference and derivation counts above a declaration, a grammar-aware outline and folding, and sentence-wise selection expansion.
- **The model seen whole**: a Model Explorer over every declaration in the workspace, a read-only model view of one file, and a preview for a `Beslistabel` that shows what the source cannot — which column concludes, and what the case your cursor is in concludes as one sentence.
- **Testsets that run.** A `*.test.rgs` testset is part of the language — same colour, checks, formatting and rename, crossing into the model in both directions — and it *runs*: in the Testing view with failures as diffs, or from a link in the text, one testgeval or one rule at a time, with the values, the characteristics, the faults and the derivation trace in a panel beside the model. Parameter values several testsets share are declared once as a `Parameterset`, in a file of its own, with a `geldig` period the rekendatum that names it is checked against.
- **Step through a run** (<kbd>F5</kbd> in a testset): breakpoints on a rule *or* on a `Verwacht` line — where the mark means "stop where this value comes from" and can be held to one instance — the situation in the Variables pane at every stop, and Watch, the Debug Console and hover evaluating any RegelSpraak expression in the scope the run is standing in. <kbd>F11</kbd> steps *inside* a rule, stopping at each part of its arithmetic as that part is worked out, with the editor highlighting the phrase rather than the line.
- **Why a value is what it is.** **Leg uit** (<kbd>Alt</kbd>+<kbd>E</kbd>, or a link on the `Verwacht` line that just failed) goes from a value to the derivation that produced it: the rule that wrote it, the arithmetic it did between its reads and its write, and the rules behind *its* operands, back to the input or parameter where the chain ends. Where **nothing** wrote it, a verdict list says what each rule that could have did instead — skipped, not valid on the rekendatum, faulted — and a rule that did not fire names the criterion that stopped it. An aggregation opens into the elements behind it, largest first; a time-dependent value is drawn as a dated timeline; and **Vergelijk met vorige uitvoering** says what moved between two runs.
- **The provision a rule renders.** A `// Bron:` comment above a declaration or a rule may link the article it comes from; hovering opens that article **rendered**, and the same link in the comment opens the source at the line. The path is written from the model root, so a rule file can be moved without its citations going stale.
- **A model need not spell out its plurals.** `(mv: …)` is optional in the specification's syntax chapter, and the editor works the form out: write `Objecttype de Vestiging` and a rule may still say `alle Vestigingen`, with navigation, colour, references and rename all following. A derived form never overrides one you wrote and never competes with another declaration, so the worst a wrong guess does is what happens today — the phrase does not resolve, and the editor says so.
- **Tables from outside the model.** A `Gegevensbron` declares the *shape* of an externally supplied table — key columns marked `(sleutel)`, one value — and a rule reads one cell with `het tarief uit de tarieftabel bij de zone en de gewichtsklasse`, checked as it is written: the value name, the number of keys, each key's datatype and unit. The content never enters the model: a testgeval states a miniature inline, or the testset binds a delivery on disk through its manifest, and a run says which delivery it read. An extension beyond RegelSpraak v2.3.0, marked as one in the grammar, and optional.
- **A reglement as a notebook.** In juridische modus an `.rgs.md` document opens as cells: the text reads as text, the rules stand between the paragraphs and get everything above — colour, checks, completion, navigation, rename, formatting — and the worked example under a bepaling has a run button that reports each `Verwacht` line under the cell. Press the one on a rule cell and it says so: what you run is the worked example, not the rule. A rule's citation is its position, so hovering one names the heading it stands under and the law that heading cites; **Reglement bekijken** renders the whole artikel as one document, and *Openen met → Teksteditor* shows the Markdown underneath, because that is all it ever was.
- **Bring a model in from ALEF.** **Importeren uit ALEF** reads the models of an ALEF project and writes RegelSpraak text — declarations, rules and testsets — laid out the way **Document opmaken** would. It is a one-shot migration: from that moment the text is the model, and a conversion report beside the files lists everything that was not translated, every reading worth checking, and every word the conversion had to invent.

Each of these in full, with the reasoning behind the shape it takes, is in
[docs/FEATURES.md](docs/FEATURES.md). Per-release detail is in the
[CHANGELOG](CHANGELOG.md).

## Good to know

- **All of it resolves across files** — and a workspace folder is one model. Rules in one file are coloured, checked, navigated and renamed against the GegevensSpraak declarations in another, wherever under the folder either sits. Open two reglementen as two folders and they are two models: each keeps its own `Deelnemer`, and neither reports anything about the other.
- **Nothing leaves your machine.** The language server runs locally as a child process; there is no network service.
- **Two constructs go beyond RegelSpraak v2.3.0**, and both are optional. `Regelgroep <naam>` gives §9.10's rule group the written form the specification withholds — including the `(recursief)` qualifier a recursive group needs — and `Gegevensbron` declares an externally supplied table — which §9.3 puts outside its own scope and hands to the execution environment. A model that uses either is not portable to a strict v2.3.0 tool, which is worth knowing you are opting in to. (`//` comments are the other thing the specification does not define, and have been accepted since the first release.)
- **Interface language is Dutch throughout**, matching the language itself; there is no English UI mode.
- **Settings, and the line wrapping the extension turns on** for `.rgs` files (a RegelSpraak sentence cannot be broken across lines): [docs/SETTINGS.md](docs/SETTINGS.md).
- **Laying out a model** — how to name and arrange its files in either mode, and why: [docs/AUTHORING.md](docs/AUTHORING.md). [samples/](samples) and [samples-notebook/](samples-notebook) are the worked examples.

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
