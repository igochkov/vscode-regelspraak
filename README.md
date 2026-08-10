# RegelSpraak for Visual Studio Code

Write, read and review RegelSpraak models with the editor support you expect from a programming language: colour that reflects meaning, errors while you type, model-aware completion, hover documentation and a navigable outline.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

The extension activates on `.rgs` files. (`.rgs` rather than the more obvious `.rs`, which is already established for Rust.)

> **Status: preview.** Everything under [Features](#features) works today. The extension understands your model — declarations and rules, across every `.rgs` file in the workspace — but does not yet execute it. See the [Roadmap](#roadmap).

## Features

### Colour that knows what a name means

Every name in RegelSpraak is an ordinary Dutch phrase — `de contributie`, `het jeugdlid`, `de aanvrager` all look alike to a text-based highlighter. Only a parser plus a model of your declarations can tell an object type from an attribute from a role.

The extension therefore ships **two layers**: a TextMate grammar generated from the language's own lexer (keywords, literals, comments, operators), and **semantic tokens** computed by the language server, which colour each name by what it actually is.

**Your colour theme picks the colours.** The extension says what each name *is* and maps it to a standard scope; the theme you chose paints it. So RegelSpraak looks like the rest of your editor in light, dark and high-contrast themes alike, including themes that did not exist when this extension was built — and nothing overrides a theme you picked on purpose.

| A name that is a… | is coloured the way your theme colours a… |
| --- | --- |
| object type, fact type, domain, dimension, timeline | type or class |
| attribute, parameter, rule variable | variable or member |
| characteristic (kenmerk), role, enumeration value, day kind | constant or enum member |
| rule or decision table | function |
| unit | unit of measure |

Multi-word phrases are segmented by meaning, not by spaces: in `de dagen te laat van de Uitlening`, the attribute and the object type are coloured separately even though the whole phrase is one grammatical unit.

Want different colours? Set them yourself. These rules are per-language, so they change nothing outside `.rgs` files:

```jsonc
"editor.semanticTokenColorCustomizations": {
	"rules": {
		"objecttype:regelspraak": "#C586C0",
		"attribuut:regelspraak": "#6BB86A",
		"kenmerk:regelspraak": "#E8A857"
	}
}
```

The token types are `objecttype`, `attribuut`, `kenmerk`, `domein`, `enumwaarde`, `eenheid`, `dimensie`, `dagsoort`, `tijdlijn`, `parameter`, `feittype`, `rol`, `regel` and `variabele`. How many of them your theme tells apart is up to the theme: a theme with a small palette may paint several alike, and high-contrast themes trade hue variety for contrast by design. Set the rules above if you need a distinction your theme does not make.

Two notes. *Light High Contrast* does not enable semantic highlighting at all, so names stay uncoloured there unless you set `"editor.semanticHighlighting.enabled": true`. And while the server is still starting, colouring falls back to the TextMate layer, so keywords are coloured and names are not yet.

### Errors while you type

Diagnostics appear as you edit, in Dutch, each with a stable code you can look up, suppress or search for. The extension resolves references **across files** — rules in one file are checked against the GegevensSpraak declarations in another.

| Code | What it catches |
| --- | --- |
| `RS001`–`RS003` | Syntax errors, including unterminated text and enumeration literals |
| `RS101` | Unknown object type or role |
| `RS102` | An attribute or characteristic that is not a member of the resolved object type |
| `RS105` · `RS106` · `RS107` | Unknown domain · unknown unit · unknown dimension |
| `RS113` | `Extensie van objecttype` naming a type that does not exist |
| `RS601` | Overlapping validity periods across versions of one rule |
| `RS604` | Reference to a variable defined later in `Daarbij geldt:` |
| `RS607` | Duplicate rule name (warning, with a link to the other declaration) |
| `RS608` | Attribute carrying both a dimension and a timeline |
| `RS613` | Object type missing its plural form `(mv: …)` (warning) |

Validation is deliberately conservative: a diagnostic is only raised where the model can decide the answer, so a clean file stays clean. The remaining codes in the catalogue (type, unit-conversion, rounding, timeline, distribution and decision-table checks) arrive with the deep-validation release.

### Completion that proposes only what fits

Completion reads the model and the position, so what you get depends on where you are:

- **Top level** — declaration keywords (`Objecttype`, `Feittype`, `Regel`, …).
- **Inside an object type** — datatypes, your own domains, `kenmerk` forms, `met eenheid`, `gedimensioneerd met`.
- **After `met eenheid`** — units and abbreviations declared in your `Eenheidsysteem` blocks.
- **After `geldig`** — `altijd`, `vanaf`, `t/m`; after `moet` — the result-part phrases.
- **In subject position** (`van een …`) — object types and roles.
- **In expression position** — parameters, the rule's own `Daarbij geldt:` variables, and the members of the subject's object type.

Multi-word names complete as one item and replace what you have already typed, so accepting `dagen te laat` after typing `dagen te l` leaves correct text rather than a duplicated fragment.

### Hover

Hover any name — declared or referenced, in this file or another — to see its kind, its datatype or domain, its owning object type, and the `//` comment block written above its declaration.

### Outline, breadcrumbs and folding

Object types with their attributes and characteristics, fact types with their roles, domains with their enumeration values, unit systems with their units, rules with their variables — all appear in the Outline view, the breadcrumb bar and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> "Go to Symbol". Folding is grammar-aware (every declaration, and each `geldig …` version of a multi-version rule) and also honours `//#region` … `//#endregion` markers.

### Editing comfort

Snippets for every frequent construct (`objecttype`, `feittype`, `regel`, `regel-indien`, `beslistabel`, `verdeling`, `startpuntbepaling`, and more — type the prefix and press <kbd>Tab</kbd>); each snippet body is validated against the language grammar in CI, so a snippet can never expand into something that will not parse. Bracket and quote matching, auto-closing and auto-surrounding — including the guillemets `«»` used for text interpolation, and `'` for enumeration values, guarded so apostrophes inside names are left alone. `//` comment toggling. Indentation rules for declaration bodies and rule versions, and Enter continues a bullet list (`•`, `••`, `..`, `- `) at the same depth.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `regelspraak.validation.enable` | `true` | Turns semantic validation on or off. |
| `regelspraak.validation.runOn` | `type` | Re-validate while typing, or only on save. |
| `regelspraak.validation.scope` | `openFiles` | Report diagnostics for open files, or the whole workspace. |
| `regelspraak.server.path` | *(empty)* | Path to a language server build. Empty uses the bundled server. |
| `regelspraakLanguageServer.trace.server` | `off` | Traces LSP communication into the output channel. |

## Roadmap

Delivered and planned, in order. Each release builds on the shared model the extension already maintains.

| | Release | What it adds |
| --- | --- | --- |
| ✅ | **Preview** (current) | Semantic colour, live diagnostics, completion, hover, outline, folding, snippets |
| ⬅ | **Navigation** (next) | Go to definition and type definition · Find all references · Highlight occurrences · Workspace symbol search (`#`) · Safe cross-file rename of multi-word names · "Which rule derives this attribute?" |
| | **Validation** | The full diagnostics catalogue — type compatibility, unit convertibility, rounding and precision, empty-value (`leeg`) policy, timeline granularity, distribution and decision-table rules — with quick fixes, plus signature help for date constructors and distribution clauses |
| | **Formatting & ergonomics** | Document, range and on-type formatting that preserves RegelSpraak's significant layout · CodeLens reference counts · Inlay hints for inferred datatypes and units · Smart selection expansion |
| | **Execution** | Run rules and decision tables against scenario data · Results and derivation traces in-editor · Scenarios as tests in the Test Explorer |
| | **Workbench** | A RegelSpraak view container with a Model Explorer tree · Task provider · Rule-dependency hierarchy · A visual Beslistabel editor |

Interface language is Dutch throughout, matching the language itself; there is no English UI mode.

## Architecture

The extension is split in two:

| Part | Where it lives | License |
| --- | --- | --- |
| Extension client — activation, LSP wiring, TextMate grammar, language configuration, snippets | this repository | Apache-2.0 |
| RegelSpraak language server — parser and language analysis | separate, private repository | proprietary |

The language server runs **locally** as a child process of the extension, communicating over Node IPC. Nothing is sent to a network service, and your `.rgs` files never leave your machine. Released `.vsix` packages bundle a compiled build of the server; that build is proprietary and licensed for use only as part of this extension.

## Building the client

```
npm install
npm run compile
```

`npm run watch` recompiles on change. `npm run lint` runs ESLint.

This repository builds the **client** — the half that ships as source. A
publishable `.vsix` also contains the language server, which is built and
released separately; packaging and publishing happen there, so nothing in this
repository needs access to it.

`npm run bundle` is a **packaging** step, not part of the development loop: it
overwrites `client/out/extension.js` with a minified bundle of the client and
its dependencies. `npm run compile` puts the debuggable build back, so run it
before returning to <kbd>F5</kbd>.

## Pointing the extension at a language server

This repository contains no language server of its own, so **a fresh clone needs one setup step before <kbd>F5</kbd> works.** Without it the extension reports that it found no server, which is the expected unconfigured state, not a fault.

The client resolves a server in this order:

1. The `regelspraak.server.path` setting, if set — absolute, or relative to the first workspace folder.
2. `server/out/server.js` inside the extension folder, which is where released `.vsix` packages carry the bundled server.

**Recommended: set the path.** Slot 1 is the one packaging cannot disturb — see the warning below — and it points anywhere:

```jsonc
{
	"regelspraak.server.path": "D:\\path\\to\\server\\out\\server.js"
}
```

⚠️ The setting is read by the window **running** the extension. When debugging that is the Extension Development Host — so it belongs in your User settings, or in `client/testFixture/.vscode/settings.json` (the folder the host opens), **not** in the settings of the window you press <kbd>F5</kbd> in. Because a relative path resolves against the first workspace folder, the fixture-folder form can be written as a path relative to `client/testFixture`. That file is gitignored: it names a path on one machine.

Changing the setting restarts the server; no window reload needed.

**Alternative: link a server build into slot 2.** This needs no setting at all, and `.gitignore` reserves `server/` for exactly this, so the link can never be committed:

```
# Windows (run in the repository root; junction, so no admin rights needed)
mklink /J server <path-to-server-build>\server
# macOS / Linux
ln -s <path-to-server-build>/server server
```

The link picks up every later rebuild of that server, so this is a one-time step.

⚠️ **Packaging overwrites slot 2.** Building a release stages the real bundled
server at `server/out/server.js`, replacing the link. Development then keeps
running — against a frozen copy of the server as it was at packaging time,
which looks like a working setup whose bugs never get fixed. Recreate the link
after packaging, or use slot 1, which packaging never touches.

**Which server am I running?** The `RegelSpraak Language Server` output channel
reports the resolved path, which slot it came from, and when that build was
made, every time the server starts.

If you do not have a server build, the client still compiles, lints and is
developable — you simply cannot exercise the language features.

## Debugging

- Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> to start the TypeScript compiler in watch mode.
- Switch to the Run and Debug view (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>) and pick `Launch Client`.
- Press <kbd>F5</kbd> to open an [Extension Development Host](https://code.visualstudio.com/api/get-started/your-first-extension) window.

The host opens [client/testFixture](client/testFixture) as its workspace — a small, deliberately error-free two-file RegelSpraak model in an invented domain. That gives the extension something to activate on (`workspaceContains:**/*.rgs`) and something to exercise cross-file resolution against: hovering `Bestelling` in `tuincentrum-regels.rgs` resolves to its declaration in `tuincentrum-gegevens.rgs`. Delete a declaration there and the matching `RS1xx` diagnostic should appear in the rules file.

Check the "RegelSpraak Language Server" output channel to confirm the server started.

## Syntax highlighting

[syntaxes/regelspraak.tmLanguage.json](syntaxes/regelspraak.tmLanguage.json) is **generated** from the authoritative ANTLR lexer — do not edit it by hand. Generation happens in the language server repository so the highlighter stays in sync with the language definition; the generated file is committed here because the extension needs it at runtime.

## License and third-party notices

This repository's own source is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for what that does **not** cover:

- The bundled language server in released extensions is proprietary and is licensed for use only as part of this extension.
- The RegelSpraak specification is © 2025 Belastingdienst and is not redistributed here.
