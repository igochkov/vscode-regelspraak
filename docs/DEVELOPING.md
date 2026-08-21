# Developing the RegelSpraak extension

Everything a contributor needs that a user does not. For what the extension
does, see the [README](../README.md); for what each release added, the
[CHANGELOG](../CHANGELOG.md).

## Conventions

Tabs for indentation, matching the existing sources.

**Identifiers, comments and file names are English.** Dutch is reserved for the
RegelSpraak language itself — its keywords and the domain terms with no English
equivalent worth inventing (`kenmerk`, `beslistabel`) — for every string a user
sees, which is Dutch throughout, matching the language, and for the `suite`/`test`
prose of the end-to-end suites, which reads as specification sentences.

What predates that decision has been converted; the mechanical pass is done, so
the tree is no longer mixed and a Dutch identifier in it is a bug. The one thing
to know if you ever repeat the exercise: a name is not a text substitution. In a
test file the sanctioned Dutch is the suite prose, not the helpers and variables
around it — and a helper must not be named after a Mocha global, since it shadows
it for the rest of the scope.

**In doubt, English.** The `.rgs` fixtures under `samples` are the
exception that proves the rule: they are RegelSpraak documents, so both their
contents and their names stay Dutch.

## Architecture

The extension is split in two:

| Part | Where it lives | License |
| --- | --- | --- |
| Extension client — activation, LSP wiring, TextMate grammar, language configuration, snippets | this repository | Apache-2.0 |
| RegelSpraak language server — parser and language analysis | separate, private repository | proprietary |

The language server runs **locally** as a child process of the extension,
communicating over Node IPC. Nothing is sent to a network service, and `.rgs`
files never leave the machine. Released `.vsix` packages bundle a compiled build
of the server; that build is proprietary and licensed for use only as part of
this extension.

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

This repository contains no language server of its own, so **a fresh clone needs
one setup step before <kbd>F5</kbd> works.** Without it the extension reports
that it found no server, which is the expected unconfigured state, not a fault.

The client resolves a server in this order:

1. The `regelspraak.server.path` setting, if set — absolute, or relative to the
   first workspace folder.
2. `server/out/server.js` inside the extension folder, which is where released
   `.vsix` packages carry the bundled server.

**Recommended: set the path.** Slot 1 is the one packaging cannot disturb — see
the warning below — and it points anywhere:

```jsonc
{
	"regelspraak.server.path": "D:\\path\\to\\server\\out\\server.js"
}
```

⚠️ The setting is read by the window **running** the extension. When debugging
that is the Extension Development Host — so it belongs in your User settings, or
in `samples/.vscode/settings.json` (the folder the host opens),
**not** in the settings of the window you press <kbd>F5</kbd> in. Because a
relative path resolves against the first workspace folder, the fixture-folder
form can be written as a path relative to `samples`. That file is
gitignored: it names a path on one machine.

Changing the setting restarts the server; no window reload needed.

**Alternative: link a server build into slot 2.** This needs no setting at all,
and `.gitignore` reserves `server/` for exactly this, so the link can never be
committed:

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

- Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> to start the TypeScript
  compiler in watch mode.
- Switch to the Run and Debug view (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>)
  and pick `Launch Client`.
- Press <kbd>F5</kbd> to open an
  [Extension Development Host](https://code.visualstudio.com/api/get-started/your-first-extension)
  window.

The host opens [samples/](../samples) as its workspace — a small, deliberately
error-free RegelSpraak model in an invented domain (the Boekerij), beside a test
set and a Markdown file for the injection grammar. That gives the extension
something to activate on (`workspaceContains:**/*.rgs`) and something to
exercise cross-file resolution against: hovering `Lid` in `regels.rgs` resolves
to its declaration in `gegevens.rgs`. Delete a declaration there and the
matching `RS1xx` diagnostic should appear in the rules file.

Check the "RegelSpraak Language Server" output channel to confirm the server
started.

## Testing

`npm test` runs the end-to-end suite in a downloaded VS Code, against whichever
server the resolution order above finds — so it needs a server build.
`TEST_FILE=navigation npm test` narrows a run to one suite; end-to-end failures
are otherwise hard to pull apart from the state earlier suites leave behind.

CI runs only what is checkable without a server: compile, lint, the contributed
JSON, and the Marketplace icon.

## Highlighting: two layers

[syntaxes/regelspraak.tmLanguage.json](../syntaxes/regelspraak.tmLanguage.json)
is **generated** from the authoritative ANTLR lexers — do not edit it by hand.
Generation happens in the language server repository so the highlighter stays in
sync with the language definition; the generated file is committed here because
the extension needs it at runtime. It colours what is decidable from the text:
keywords, literals, comments, operators.

Lexer**s**, plural: `.rgs` and `*.test.rgs` are one language id — the filename
suffix decides which grammar the server parses a file with — so one TextMate
grammar highlights both, and the generator reads the test lexer's own keywords
(`Testset`, `Testgeval`, `Testinitialisatie`, `Gegeven`, `Verwacht`,
`Parameters`, `feit`) alongside RegelSpraak's. Everything the test lexer
*imports* was already classified, which is why the second input adds seven names
and no structure.

[syntaxes/regelspraak.markdown-injection.json](../syntaxes/regelspraak.markdown-injection.json)
is the third piece and **is** hand-written: it recognises a ```` ```regelspraak ````
fence in a Markdown file and hands its contents to `source.regelspraak`. Nothing
in it derives from the lexer, which is why it is not generated. Its fence
patterns are character-for-character Markdown's own, with the language names
swapped — deliberately, so a RegelSpraak block behaves exactly like every
built-in language block, including where an unclosed fence stops. The
language-server repository tests it against VS Code's real Markdown grammar,
which is the only way to see whether the injection beats Markdown's catch-all
rule for unknown languages.

On top of it the server emits **semantic tokens**, which colour each name by
what the model says it is. The token types contributed in `package.json` are
`objecttype`, `attribuut`, `kenmerk`, `domein`, `enumwaarde`, `eenheid`,
`dimensie`, `dagsoort`, `tijdlijn`, `parameter`, `feittype`, `rol`, `regel` and
`variabele`; each maps to a standard TextMate scope so the user's own theme
paints it, and no colour customisation ships (see the 0.1.0 and the withdrawn
convention in the [CHANGELOG](../CHANGELOG.md)). Two consequences worth knowing
when a colour looks wrong:

- How many of these a theme tells apart is the theme's choice. A per-language
  rule under `editor.semanticTokenColorCustomizations` — `"objecttype:regelspraak"`
  and friends — overrides one without touching anything outside `.rgs`.
- *Light High Contrast* does not enable semantic highlighting at all, so names
  stay uncoloured there unless `editor.semanticHighlighting.enabled` is set. And
  while the server is still starting, colouring falls back to the TextMate layer:
  keywords coloured, names not yet.
