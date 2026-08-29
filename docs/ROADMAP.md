# Roadmap

What each release added, and what is still to come. Per-release detail —
including every diagnostic code as it arrived — is in the
[CHANGELOG](../CHANGELOG.md); what works today is the
[README](../README.md).

| | Release | What it adds |
| --- | --- | --- |
| ✅ | **Preview** | Semantic colour, live diagnostics, completion, hover, outline, folding, snippets |
| ✅ | **Navigation** | Go to definition and type definition · Find all references · Highlight occurrences · Workspace symbol search · Safe cross-file rename of multi-word names · "Which rule derives this attribute?" |
| ✅ | **Validation** | The full diagnostics catalogue — type compatibility, unit convertibility, rounding and precision, empty-value (`leeg`) policy, timeline granularity, distribution and decision-table rules — with quick fixes, plus signature help |
| ✅ | **Formatting & ergonomics** | Formatting that changes whitespace and nothing else · CodeLens reference and derivation counts · Inlay hints for inferred datatypes and units · Smart selection expansion · Links in comments |
| ✅ | **Workbench** | A RegelSpraak view container with a Model Explorer tree · Call hierarchy over rule dependencies · Type hierarchy over object types and their extensions · A read-only model view of a file · A preview for decision tables · Language server status in the status bar |
| ✅ | **Test language and execution** | `*.test.rgs` testsets as part of the language: colour, checks (`RS951`–`RS958`), outline, folding, formatting, completion, hover, and navigation and rename that cross between a testset and the model it tests · Running them in the Test Explorer, with failures as diffs · Running a testset, a testgeval or a single rule from a link in the text · The outcome and the derivation trace as a panel beside the model, with click-through to the rule behind every value · `Regelgroep <naam>` |
| ✅ | **Debugging a run** | Step through a run with <kbd>F5</kbd>, one rule × instance at a time · Breakpoints on a rule or on a `Verwacht` line, optionally held to one instance · The situation, the parameters and the rekendatum at every stop · Watch, the Debug Console and hover evaluating an expression in the paused scope · Why a rule did *not* fire · Every value walkable back to the rules and inputs behind it · Five further checks (`RS114`–`RS116`, `RS615`, and `RS101`/`RS102` inside decision tables) |
| ✅ | **Where a model comes from** (current) | The provision a rule renders, as a `// Bron:` citation a hover follows · Plurals a model need not spell out · **Importeren uit ALEF**: an ALEF project read and written out as RegelSpraak text, with a report of everything it could not translate · An apostrophe in a name, and three more words a name may contain · The arithmetic inside a rule — in the trace, in Watch, and under <kbd>F11</kbd> |
| ⬅ | **Optional extras** | Scenario notebooks · Recursive rule groups (§9.10) · Test coverage over a model — each still to be decided on |

**Export to ALEF was built and withdrawn** before the release that would have carried it. An ALEF project is not its model files — the solution that holds them carries far more than the file format an outside tool can observe — so what a converter produces from outside breaks a real ALEF environment. A converter that damages the tool it targets is worse than none. Import is unaffected and is the direction that keeps the text authoritative.
