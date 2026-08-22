# Settings

Every setting the extension contributes, and the editor defaults it sets for
`.rgs` files. For what the settings govern, see the [README](../README.md).

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
| `regelspraak.execution.defaultScenario` | *(empty)* | The testgeval a rule is run against, as `pad/naar/bestand.test.rgs#naam van het testgeval`. Meant to be committed; **Actief testgeval kiezen** overrides it per window. |
| `regelspraak.server.path` | *(empty)* | Path to a language server build. Empty uses the bundled server. |
| `regelspraakLanguageServer.trace.server` | `off` | Traces LSP communication into the output channel. |

`strictPrecision` and `emptyValueHazards` quiet whole families rather than filter
their output: a family that is off is never run. They exist because `RS4xx` and
`RS5xx` report a *judgement* — that a precision is unclear, that a value might be
empty — rather than an error of fact.

## Line wrapping

A RegelSpraak sentence cannot be broken across lines. The specification makes the
newline significant (§13.1.8) and gives it a job — it ends a rule's name,
separates versions, bullets and variables — so a result sentence stays on one
line however long it grows. The extension therefore turns **soft** wrapping on
for `.rgs` files, which changes the display and never the file:

| Setting | Default here | What it does |
| --- | --- | --- |
| `editor.wordWrap` | `bounded` | Wraps at the column below, or the width of the editor, whichever is narrower. |
| `editor.wordWrapColumn` | `100` | Around a tenth of the lines in a typical model reach it. |
| `editor.wrappingIndent` | `deepIndent` | Indents a continuation two levels, so it reads as part of the sentence above rather than a new one. |

Override any of them for yourself in user or workspace settings, and they win
over these:

```json
"[regelspraak]": {
	"editor.wordWrap": "off"
}
```

`Alt+Z` toggles wrapping for the current editor without changing any setting. No
ruler ships with this: a ruler marks a width you are meant to keep to by breaking
the line, which is the one thing you cannot do here.
