# Changelog

All notable changes to the RegelSpraak extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions run through to `1.0.0`, which is bound to the whole plan rather than
to any one milestone. They no longer map *phase N to 0.N.0*: the workbench half
of phase 6 needed nothing from the execution engine, so it shipped as `0.5.0`
ahead of execution, and each version since is named for what it delivers.

## [0.8.0] — Where a model comes from

Three things, and the first two are about the same one: a RegelSpraak model does
not begin in the editor. It **renders** something written in prose — a reglement, a
regeling, a beleidsregel — and it may already **exist in ALEF**, the
Belastingdienst's MPS-based modelling environment.

Neither connection was something the tooling could see. The question a reviewer
actually asks — *which provision says this?* — had no answer, and a model that
existed in ALEF had to be re-typed by hand.

The third is a different question about the same model, and it comes from the
other end: **where did this number come from?** A run could name the rule; it
can now show the calculation inside it, and step through it.

### Importeren uit ALEF

Point it at an ALEF project folder and it reads the models, then writes
RegelSpraak text: the GegevensSpraak declarations, the rules, and the testsets,
laid out the way **Document opmaken** would lay them out.

**It is a one-shot migration, on purpose.** From the moment the files land the
text is the model — there is no link back to the ALEF project, no re-import
gesture, and nothing watching it. The `.rgs` files are the one place a model is
authored, and an import that kept a second source of truth alive would undo that.

- **An imported rule reads the way ALEF draws it.** Where a chain runs over a
  collection the attribute is written in the plural — `de som van de toegekende
  premies van zijn aangesloten deelnemers` — with `de` in front of it whatever
  the singular took. Where no plural can be spelled properly (`aantal boeken` is
  a count of books) the singular is written instead, which reads correctly and
  means the same.
- **It says what it could not do.** A conversion report is written beside the
  files, listing three things separately: constructs that were **not translated**
  (the text is a model short of a line, and it says which), readings **worth
  checking**, and every word the conversion had to invent. Nothing is dropped in
  silence, and an ALEF construct with no RegelSpraak equivalent stops its own rule
  rather than producing a sentence that means something else.
- **It writes the layout `docs/AUTHORING.md` describes**, into the folder you
  have open: declarations in `gegevens/`, rules in `regels/`, the testsets in
  `tests/`, each created if it is not there yet, with the conversion report at
  the root. So an import lands as a model somebody can read rather than a heap
  somebody has to sort, and a model that already has those folders simply gains
  files in them.
- **Nothing is written until it has shown you where.** It names the full path and
  every file about to land under it — folders and all — before writing anything,
  and says which of them would be overwritten. It is the only thing in the
  extension that writes files you did not name, and the message afterwards names
  the folder again and offers to open it. There is no longer a folder picker: the
  destination is the project you are working in. With no folder open it says so
  instead of guessing a path on your disk, and in a multi-root workspace it asks
  which of your open folders.
- **And when it cannot run, it says why.** The import needs the language server;
  where it is not running the command says so, with the log and a restart a click
  away. A server that is **older than the extension** is called out by name, with
  the path it was started from and when that file was built — and, in a window
  with no folder open, a note that a workspace setting like
  `regelspraak.server.path` does not apply there.

**There is no export.** One was built and withdrawn before release: the files it
produced break a real ALEF environment, because an ALEF project is not its model
files — the solution that holds them carries far more than the file format an
outside tool can observe. A converter that damages the tool it targets is worse
than none, so the finding is kept and the code is not. Import is unaffected: it
reads ALEF and writes text, and hands nothing back.

### The document a model renders

- **Cite the provision a declaration or rule renders.** A `//` comment above it
  may say where it comes from, written as a Markdown link:
  `// Bron: [art. 8 lid 1](bron/reglement.md#artikel-8-boete)`. Nothing about the
  language changes — it is a comment, and a model that ignores this reads exactly
  as it did — but the editor now follows it.
- **Two ways to follow it, each doing what its gesture means.** Hovering the rule
  shows the citation as a link that opens **the article, rendered**, in the
  Markdown preview: following a citation is a reading gesture, and what a reader
  wants is the provision rather than its source. The same citation in the comment
  itself is a link too — beside the URLs and `.rgs` names that were already linked
  there — and that one opens the Markdown **source at the line**, because a link
  in the text is a location and is followed like a go-to-definition. Both are
  resolved by the same code, so they cannot reach different provisions.
- **It lands on the article, not at the top of the file.** The heading anchor is
  looked up in the document each time it is asked for and turned into the line it
  is on, so a provision that moves within the document is still found and no line
  number is ever written into a model. An anchor that names no heading is dropped
  and the document opens at the top.
- **The path is written from the model root**, not from the file the comment sits
  in, so a rule file can be moved or renumbered without its citations going
  stale. That root is found by looking for the cited document rather than assumed
  to be the workspace folder — a model usually lives in a subfolder of a
  repository, and then the two are not the same place.

### A name may contain an apostrophe

- **`euro's`, `auto's`, `cd's`.** These are ordinary Dutch plurals and the
  language could not spell any of them: the apostrophe opened an enumeration
  value, so a declaration containing one was reported as an unterminated literal
  and took the rest of the file with it. An apostrophe **between two letters** is
  now part of the word — `Domein Hele euro's`, `(mv: euro's)`, `de meegeleverde
  cd's` — and `'roman'` still reads as a value, the two being told apart by
  position alone. Nothing that was valid changes meaning.
- **A name may not begin or end with one**, so `'s-Gravenhage` still has no
  spelling here. That is a decision rather than an omission: an apostrophe at the
  start of a word is exactly the one that opens a value, and separating them
  would mean reading to the end of the line and guessing.
- **The plural the editor suggests is now the Dutch one.** With the apostrophe
  unwritable it offered `Autos` and `euros`; it writes `Auto's` and `euro's`, and
  it has learned the rest of the rule it could not apply — `cd's` and `HTS'en`
  for abbreviations, `gepensioneerden` and `nabestaanden` for the participles a
  pension model is written in, `cadeaus` and `cafés` where the apostrophe would
  be wrong. Where Dutch itself has two forms (`periodes` and `perioden`,
  `eigenaren` and `eigenaars`) **both are accepted** and the commoner one is
  written — and a model that already says `euros` goes on resolving exactly as
  it did.

### Words a name could not contain

- **`hele`, `tot` and `decimalen` may be part of a name.** All three are words
  RegelSpraak uses itself — `de tijdsduur van … tot … in hele dagen`, `Numeriek
  (getal met 2 decimalen)` — which until now made them unwritable anywhere else,
  so `de afstand tot bestemming`, `de contributie in hele euro's` and `Domein
  Bedrag met 2 decimalen` were all syntax errors. Both readings work now. The
  same is true of every word the language does not need to keep to itself: the
  specification puts **no word outside a name**, so each one that is reserved
  here is a limitation of this editor rather than of RegelSpraak, and the list is
  shrinking a word at a time.
- **A feittype's relation description is free text, as the language says it is.**
  `één te verdelen ov-tegoed wordt verdeeld over één passagier` used to be
  rejected on `wordt verdeeld over` — a phrase RegelSpraak uses elsewhere, but
  the description between the two `één`/`meerdere` is prose and may say anything.
  It does now.
- **And a word that is still reserved now says so.** Writing `de looptijd tot
  einde` used to report *deze regel kan niet ontleed worden bij 'de looptijd
  tot'* — the place, not the cause, and often not even the right place. It now
  reads: **`'tot'` is een sleutelwoord van RegelSpraak en kan geen deel van een
  naam zijn**, on the word itself. It is checked before it is said: the line has
  to come right without that word, so an ordinary mistake near a keyword keeps
  the message it deserves.

### Plurals a model need not spell out

- **A model no longer has to spell out its plurals.** `(mv: …)` is optional in
  the specification's syntax chapter, and the editor now works the form out:
  write `Objecttype de Vestiging` and a rule may still say `alle Vestigingen`.
  Navigation, colouring, references and rename all follow, and renaming
  `Vestiging` to `Filiaal` rewrites `alle Vestigingen` to `alle Filialen` with
  it.

  A derived form **never** overrides one that is written, and never competes with
  another declaration: where two names would derive the same plural, neither is
  chosen. So the worst a wrong guess can do is what happens today — the phrase
  does not resolve, and the editor says so. Irregular plurals (`Lid` is `Leden`)
  are exactly that case: declare the form and everything works as before.

  **RS613 is a hint rather than a warning** now, and it names the plural that
  will be derived so you can see the word and correct it in one place. Because of
  this, an imported ALEF model states no plurals in its declarations at all.

### Waar een getal vandaan komt

`0.7.0` made a run say which rule wrote a value and out of which other values.
What it still could not say is what the arithmetic **in between** was worth: a
rule that reads three numbers and writes one told you four numbers and nothing
about the sum in the middle, which is usually the one you are looking for.

- **The trace carries every sub-expression.** Open a write in the run panel and
  the calculation is under it, one row per step, with the numbers it read below
  that: `de dagen te laat maal het boetetarief = 1 euro` under the boete, before
  `dagen te laat = 4 dag` and `boetetarief = 0,25 euro/dag`. What the rule *did*,
  then where its numbers came from.

  A `Daarbij geldt` variable appears under **its own name** rather than under the
  sentence that defines it, which is what you were looking for it by. And a
  sub-expression whose value could not be worked out is simply not there — the
  fault beside it already names the operation.

- **The outcome panel has a keystroke.** `Alt+R` in a `.rgs` or `.test.rgs`
  file opens the outcome of the testgeval the cursor is in, beside `Alt+B`
  and `Alt+Q` for the two characters the language needs. On Windows `Alt+R`
  is also the menu bar’s mnemonic for the Run menu; the binding is scoped to
  a focused RegelSpraak editor so it claims the key there and nowhere else.

- **A Watch entry can be opened.** Type a calculation into Watch while a session
  is paused and it now has a disclosure triangle: the answer is on the row, and
  under it is every step that produced it.

- **Step Into steps the arithmetic.** At a stop, `F11` no longer means the same
  as `F10`: it goes **inside** the rule, stopping at each part of its expression
  as that part is worked out, innermost first. The Call Stack shows what encloses
  the phrase you are standing on and the editor highlights the phrase itself, not
  the line. `F10` finishes the next part without going inside it, and
  `Shift+F11` runs back out of the one you are in.

  It lasts for the rule and instance you asked about, and then hands back — the
  next stop is the next rule, as before. There is no mode to switch off, which
  matters because a rule fires once per instance and stepping every calculation
  of every one of them is not something anybody wants twice.

  Two places deliberately do not step: a **beslistabel**, whose cells are
  sentences composed from a header and a value and so cannot be pointed at
  precisely, and a Watch expression, which must not be able to stop the run it is
  asking about. In a decision table `F11` behaves as `F10`.

### Notes

- **One command is trusted, and no others.** The hover's link has to invoke a
  command, there being no URI that means "the preview of this file", so the
  extension declares exactly `regelspraak.openBron` as trusted. A hover
  ultimately renders comments written by whoever wrote the model, and a blanket
  trust would let any of them run anything.
- **The example model shows the whole convention.** `samples/` is laid out by the
  document it renders now — a folder per chapter and a file per article under
  `regels/`, with the (invented) reglement itself under `samples/bron/` — and
  every declaration and rule in it carries a citation. `docs/AUTHORING.md`
  explains the layout, and why `gegevens/` is deliberately *not* organized that
  way.
- **Citations can be checked.** `npm run source:coverage` reports a citation that
  no longer resolves, a provision that nothing in the model renders, and a rule
  version whose `geldig vanaf` contradicts a stated commencement date. It reads
  text and needs no language server, so it runs in CI.

## [0.7.0] — Stepping through a run, and why a rule did not fire

A run stops being a black box. `0.6.0` could tell you *what* a model produced;
this release tells you **how it got there, and what it decided along the way** —
forwards, by stepping through the run with a debugger, and backwards, by
following a value to the rules that made it.

The two are deliberately different tools. A failing test hands you a *value*,
which is a backward question, and the derivation chain answers it without a
session at all. Stepping is for the forward one: understanding an unfamiliar
model, teaching one, asking what happens if.

### Added

- **Step through a run.** Press <kbd>F5</kbd> in a testset and the model runs one
  rule at a time. It stops **before** each rule fires, so what you see is the
  situation the rule is about to act on; **Continue** and **Step Over** move to
  the next rule × instance.

  The Call Stack holds **one frame**, named `<regel> · <instantie>`. RegelSpraak
  has no calls, and firing order follows the dependencies between rules rather
  than nesting, so there is no stack to draw — and filling that pane with the
  derivation chain would show something that runs backwards in time as though it
  nested. That view is the run panel's and stays there.

  **Variables** shows the rekendatum, the parameters, the rule's `Daarbij geldt`
  variables and then the situation itself: every instance's attributes and
  characteristics, with `(invoer)` marking what you gave rather than what the
  model derived. The variables read *nog niet berekend* — the stop is before the
  rule and a variable is computed only when something asks for it, so showing a
  value would mean inventing one.

- **Breakpoints, including on a `Verwacht` line.** In a rule file a breakpoint
  marks that rule. In a **testset** it marks *the rules that derive whatever the
  line names*, because an expectation has no moment during a run: the useful
  reading of a mark there is not "stop at this assertion" but **"stop where this
  value comes from"**. A value line marks every rule that writes it; a block
  header marks every rule behind any line beneath it; `Verwacht regelversie
  <naam> is gevuurd` marks that rule outright.

  A mark taken from a `Verwacht <instantie> met` block **stops only for that
  instance**, the expectation having named the one it is about. For a breakpoint
  on a rule, the condition field takes an instance name and does the same. A line
  nothing derives stays grey and says why — a `Gegeven` is input, and an
  expectation on an attribute *no rule writes at all* is very often the reason it
  was failing.

- **Watch, the Debug Console and hover.** While stopped, any RegelSpraak
  expression evaluates in the paused instance's scope: `zijn pensioengrondslag`,
  `de som van de premies van zijn deelnemers`, a parameter, a rule variable.
  **Hovering** a phrase in the rule you are standing in shows its value — over the
  whole reference rather than the word under the pointer, a RegelSpraak name being
  several words. Only inside that rule: `zijn X` means the subject of the sentence
  it is written in, so the same words one rule down denote something else, and
  everywhere else you keep the ordinary hover.

- **Why a rule did *not* fire.** A run now records the rules that were considered
  and stayed quiet, with the criteria of a compound condition in the order they
  were evaluated and the values the condition read. Until now a run said what had
  fired and nothing about the rest — and "absent from that list" cannot tell a
  rule that did not fire from one that fired nowhere.

- **The derivation drawn as a chain.** Every derived value names the rule that
  wrote it, and each of that rule's operands names *its* source: another rule to
  follow, or `invoer` or `parameter` where the derivation ends. The run panel
  nests them, so a value unfolds back through the rules that made it as far as the
  run can say. A distribution (§9.7) is walkable now too — it records what the
  ceiling read, plus each recipient's own criterion and maximum.

- **A fault says what sort it is.** A **fout** is the specification's own run-time
  error on a model that is correct — dividing by an empty value, say. A
  **modelfout** is the model saying something the engine cannot make sense of, and
  a test whose run hit one now **fails**, rather than passing on a run that derived
  less than the model asked for.

- **Six checks for mistakes that used to cost a run-time fault and nothing in
  the editor.**
  - `RS114` — the possessive `haar`, which RegelSpraak does not have: `zijn` is
    the one spelling whatever the referent. Raised only where dropping the pronoun
    leaves a phrase the model resolves, and it comes with a quick fix.
  - `RS115` — one name declared as two things a rule can name, typically a role
    named after the object type that fills it. Every use of it then failed at run
    time as *dubbelzinnig* while nothing at all was said in the editor. Reported
    on both declarations, since which one to rename is yours to choose.
  - `RS116` — `<onderwerp> een X is` where X names no characteristic, role or day
    type of the subject.
  - `RS117` — `voor elke <naam>` naming a timeline nothing declares. The name was
    not collected at all, so it had no colour, no hover and no <kbd>F12</kbd> —
    and renaming the `Tijdlijn` left every attribute naming the old one and
    silently without the timeline it says it has.
  - `RS615` — a `Feittype` whose cardinality line names a role that does not
    exist, so the cardinality was silently not recorded at all.
  - `RS101` and `RS102` now reach a **decision table's columns**. The identical
    typo was reported in a rule and completely silent in a table.

- **Progress while the workspace is indexed**, in the status bar. Indexing costs
  about 6 ms a file, and until it finishes the unknown-name checks are held back
  on purpose — a correct reference to a file not yet read looks exactly like a
  broken one. On a large workspace that window was live, silent and reporting less
  than it would; now it says so.

- **A language server that dies says so**, offering **Toon log** and **Opnieuw
  starten**. The status bar already turned red, but nothing recovers on its own
  and a reader not watching it found out when features stopped answering.

### Changed

- **Word operators are coloured as keywords.** `maal`, `gedeeld door`, `met een
  maximum van` and the rest rendered as plain text beside the keywords around
  them. They were emitted under a scope name themes do not know, and now use the
  one themes list beside `instanceof` and `typeof`. No colour is imposed — which
  colour it is remains your theme's business.
- **Names the editor knew and never showed.** Seven positions, each recorded by
  the model and read by nobody — so none had colour, hover, **Go to Definition**
  or, the part that cost, **rename**: renaming what they name left them behind,
  pointing at something that no longer exists.

  The unit a conversion converts to (`= 1000 g`); the timeline in `voor elke
  <naam>`; the object type a decision table's conclusion is about (`een Lid is
  jeugdlid` coloured `jeugdlid` and not `Lid`); a unit inside an expression (`… in
  millisecondes`, and a literal's suffix); the attributes a uniqueness rule ranges
  over (`de pasnummers van alle Leden`); the values in a dimension selection; and
  the attributes an object creation assigns (`met het deelnemersaantal gelijk aan
  1`).

  The last three share a shape worth naming: they belong to *another name in the
  same sentence* — `Leden`, the dimension, the type being created — rather than to
  the rule's own subject, so resolving them the ordinary way gave a confidently
  wrong answer instead of no answer. Found by a sweep over every name in every
  model this project ships; what remains uncovered is deliberate.
- **A decision table's rows are highlighted.** Everything inside one rendered as
  plain text — `indien`, `moet gesteld worden op`, `kleiner is dan`, `n.v.t.`,
  the amounts, even the pipes. Only names showed, which made it look like a few
  missing keywords rather than a table with no highlighting at all.
- **A testset's and testgeval's name reads as one name.** The label had no colour
  of its own, so whichever words inside it happened to be keywords lit up on
  their own — `Testgeval Een pasnummer **dat** de elfproef **niet** haalt`. It now
  gets the same treatment a rule name has always had.
- **Date literals are coloured.** `01-01-2027` rendered as plain text beside the
  numbers in the same sentence. Same cause as the operators above: the scope name
  was one no theme has a rule for. A date now takes the colour your theme gives a
  literal value — which colour that is remains your theme's business.
- **Every unit is coloured, not only the ones your model declares.** A unit was
  coloured if and only if an `Eenheidsysteem` in the workspace declared it — so
  `kg` and `pt` were, while `jaar`, `uur`, `dag` and `%` were not, and a compound
  like `€/dag` or `kg/uur` coloured its left half and left the right half plain.
  The built-in units come with §3.7 and are never declared by anyone; so does a
  standard currency code the model has not declared. An unknown unit still gets
  no colour, which is what `RS106` is for.
- **Unknown-name diagnostics wait for the first workspace scan to finish.** A file
  opened during it was told its references were unknown and told otherwise a
  second later.
- **A `zijn` on a subject that is not `(bezield)` is reported again** (`RS609`),
  and asked per reference rather than per rule: a pronoun inside a subselection is
  about what the subselection filters, not about the rule's subject.

### Fixed

- Renaming a role left a `Feittype`'s cardinality line stale, and the feittype
  then recorded no cardinality at all — so the check that reads it went quiet.
  Rename covers that line now.
- A run-time ambiguity message repeated everything the two readings agreed about
  instead of stating the choice between them.
- `regelversie <naam> (<geldigheid>) gevuurd is` ignored the version qualifier and
  answered about whichever version the rekendatum had selected.

## [0.6.0] — The test language, and running it

A second kind of file: `*.test.rgs`, where you write what a model is supposed to
produce. A **testset** states the instances, the parameters and the rekendatum a
run starts from; a **testgeval** says what it expects to come out of them. The
editor treats it as part of the language rather than as a data file lying beside
it, because every name in it is a name your GegevensSpraak declarations have
already given a meaning — and the Test Explorer runs them.

### Added

- **Testsets run, from the Test Explorer.** Every `*.test.rgs` file in the
  workspace appears in VS Code's Testing view as a testset with its testgevallen
  under it; running one evaluates the whole model against the situation it
  describes and checks its `Verwacht` lines. A failure is shown as a diff —
  expected against actual, in RegelSpraak's own notation, with the rule that
  derived the value named and the message placed on the line that expected it.
  Values are compared by *value*, so `1,00 EUR`, `1 EUR` and `1,000 euro` all
  match one amount.

  Three states rather than two, because they mean different things. A testgeval
  that **cannot be composed** — an id nothing declares, no rekendatum — carries
  that finding on the item before you press anything, with the same code the
  editor underlines it with. A run that **could not proceed** is reported as an
  error rather than a failure: the model produced no answer, which is not the
  same as producing a wrong one. And a testgeval with no `Verwacht` lines is
  labelled *alleen uitvoeren*: it is a legitimate thing to write and running it
  proves the model does not fault on that situation, but a pass means less.
- **`Regelgroep <naam>`** gives the rules of a file a name, which the outline and
  the Model Explorer then show. One per file — the file *is* the group, so a
  second header contradicts the first and says so (`RS614`) — and optional: a
  file without one is a file of rules belonging to no group, which is what every
  model was until now.

  **This is an extension beyond RegelSpraak v2.3.0** — the one *construct* this
  extension adds to the language. §9.10 of the specification has the rule group
  as a concept and gives it no way to write one down; naming one is useful now,
  and the qualifier that would mark a group *recursive* is deferred until
  recursion itself is built. A model that uses it is not portable to a tool that
  implements v2.3.0 strictly, so it is worth knowing you are opting in. (`//`
  comments are the other thing the specification does not define, and have been
  accepted since the first release — a file convention rather than a construct.)
- **Testsets are written in the model's own vocabulary, and checked against it.**
  A `Gegeven` line names an object type and gives its attributes values; a
  `Verwacht` line names those same attributes, or a kenmerk, or a rule whose
  firing it expects. All of it resolves against the declarations in your `.rgs`
  files, so a name you get wrong is reported where you wrote it rather than when
  something eventually runs.
- **Colour, outline, breadcrumbs and folding**, as for a model. Every name is
  coloured by what your declarations say it is; an instance id and a
  testinitialisatie name are local to their file and coloured as such. The
  outline gives you the testset with each testgeval and each block beneath it,
  and folding follows the same shape.
- **Formatting** (<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>) that lines up the
  value column of every `Gegeven`, `Verwacht` and `Parameters` block — on the
  same terms as everywhere else, which is that only whitespace ever changes.
- **Completion that knows which position you are in**: attribute names and
  kenmerk forms inside a `met` block, instance ids after `Verwacht` and in the
  role list of a `Gegeven het feit` line, parameter names in a `Parameters`
  block, and testinitialisatie names after `Gegeven testinitialisatie`. A kenmerk
  completes in the form its own declaration prescribes — `is jeugdlid` where it
  is bijvoeglijk, `heeft het recht op verlenging` where it is bezittelijk.
- **Hover**: an instance id hovers as the object type it stands for, and a name
  from the model hovers in a test file exactly as it does in the model.
- **Navigation and rename cross between a testset and the model it tests.**
  <kbd>F12</kbd> on a name in a testset goes to its declaration. Renaming an
  attribute (<kbd>F2</kbd>) in the model rewrites the `Verwacht` lines that name
  it, in every testset — a rename that stopped at the model's own files would
  leave a testgeval expecting something nobody declares any more. An instance id
  renames within its own file, which is the only place it means anything.

  A testset **reads** the model and never derives anything in it. So a testgeval
  is never an answer to *"which rule derives this?"*, and expecting a value does
  not make a testset the thing that produces it.
- **Eight checks of its own**, in Dutch and with stable codes, beside the
  reference codes `RS101`, `RS102`, `RS106` and `RS107`, which keep their
  meanings here:

  | Code | | What it reports |
  | --- | --- | --- |
  | `RS951` | Error | The same instance id twice in one testgeval. |
  | `RS952` | Error | An id nothing declares — in a role, a `Verwacht` block or an include. |
  | `RS953` | Error | A value the attribute's declaration cannot hold: another datatype, another unit, or a period on an attribute that has no timeline. |
  | `RS954` | Warning | A `Verwacht` on something no rule derives — the expectation is testing your input against itself. |
  | `RS955` | Error | A `Gegeven` value on something a rule derives, which a run would overwrite. |
  | `RS956` | Error | An unknown or duplicated testinitialisatie, two testgevallen with one name, or an include cycle. |
  | `RS957` | Error | No rekendatum, in neither the testset nor the testgeval — and no run is defined without one. |
  | `RS958` | Error | `leeg` or an `is geen …` under `Gegeven` instead of under `Verwacht`. Both are assertions; there is no such thing as handing an attribute the value “empty”. |

  Units are compared by meaning rather than by spelling here too, so `1,00 EUR`,
  `1 EUR` and `1,000 euro` are one value and none of them is an `RS953`. And the
  same restraint holds as everywhere else: where the model cannot work out what
  something is, nothing is reported.
- **Five snippets** — `testset`, `testgeval`, `testinitialisatie`,
  `gegeven-feit` and `verwacht-regelversie` — each body validated against the
  test grammar on every build, as the model snippets are against the model
  grammar.
- **Run from the text.** Above every testset there is an **alle testgevallen
  uitvoeren** link and above every testgeval an **uitvoeren** link. They hand the
  work to the same Test Explorer the Testing view drives, so a run started in the
  text and a run started in the view are one run with one result — the item turns
  green or red either way. A testgeval that cannot be composed keeps its link:
  pressing it reports the finding with the code that caused it, which is worth
  more than a missing link.
- **What a run computed, as a panel.** **Uitkomst van dit testgeval tonen**
  opens a read-only view beside the testset for the testgeval your cursor is in:
  every expectation with what it actually got, the rekendatum, the values you
  gave and the values the model derived, the characteristics it concluded, the
  faults and the inconsistencies, and the **derivation trace** — one line per
  write, in the order the writes happened, naming the rule that made it and the
  operands it read. A value that varies over time is listed per period rather
  than as one number.

  Everything in it is written in RegelSpraak's own notation, because it is
  computed on the server: amounts carry their unit, a fraction is a fraction and
  a date is a date. Nothing in this view calculates anything — it is the state of
  one run, and re-running is how it changes.

  Three things make it a panel rather than a page of text. A passing and a
  failing expectation are **coloured** apart rather than marked apart, in your
  theme's own colours — this extension ships none of its own. Every derived value,
  every characteristic and every trace line **names the rule that wrote it and
  clicks through to it**, wherever that rule lives; an expectation clicks through
  to its own `Verwacht` line. And a write's operands — what it was computed out of
  — sit in a **chain you can fold**, so the one value you are chasing opens and
  the other forty stay out of the way. **Als tekst openen** at the top gives you
  the same thing as text, for the times you want to paste a trace into a ticket.

  Where a value was written more than once in a run — an initialisation and then
  the rule that supersedes it — the rule you are offered is the **last** one,
  because that is the write the value in front of you came from.

  **A consistency rule that was not satisfied says why.** *Inconsistent bevonden*
  lists each criterion the check evaluated with a tick or a cross, so you can see
  which one failed rather than only that one did, and beneath them the values the
  check read. Shown without being asked, because a finding that hides its reason
  is a report you have to interrogate. The list stops where the check stopped: an
  `alle van de volgende criteria` gives up at the first criterion that fails, so
  that criterion is the last one listed — and the ones after it are genuinely not
  evaluated, which is why they are not shown. A rule with a single criterion lists
  none: it *is* its criterion, and the rule already says it.
- **Run a rule against a testgeval.** Above every `Regel` and every
  `Beslistabel` there is now an **uitvoeren** link, which runs the *active
  testgeval* and opens the same view focused on that rule: what it wrote, for
  which instances, out of which operands — and, when it did not fire, that it did
  not fire, which is an answer rather than an empty screen.

  It runs the whole model, deliberately. Firing order follows the dependencies
  between rules, and a rule's inputs are whatever the rules before it derived, so
  a rule evaluated in isolation is not a defined thing. "Run this rule" therefore
  means run the model and show what this rule did.

  Which testgeval is *active* has two layers.
  `regelspraak.execution.defaultScenario` is the shared default — written as
  `tests/lidmaatschap.test.rgs#Een kort lidmaatschap`, meant to be committed, so
  a team shares the scenario its model is usually demonstrated against — and
  **Actief testgeval kiezen** overrides it for your window without touching the
  setting, so a local choice is not a diff. The same picker clears a choice
  again, which puts you back to being asked on the next run. Pressing
  **uitvoeren** with nothing chosen asks rather than refusing.
- **Both status items are in the status bar**, beside a `.rgs` file and nowhere
  else: which testgeval a run will use, and whether the language server is up.
  They were language status items — folded behind the `{}` icon, invisible until
  hovered — which for the active testgeval defeated the point of showing it at
  all: a run made against a scenario you chose days ago is the mistake it exists
  to prevent. Click the first to choose or clear a testgeval, the second to open
  the server's log. Both are coloured when they need you: no testgeval chosen,
  or a server that is not running.

### Fixed

- **A decision table may have more than one `geldig` period.** §12 gives a
  `Beslistabel` the same version pattern as a `Regel` — one *or more* versions,
  each with its own validity period, the periods not overlapping, the rekendatum
  choosing which applies — and only one was accepted. A table with two of them was
  reported as a syntax error, and a file with a syntax error in it gets no colour,
  outline, folding, checks or formatting at all, so the workaround was to write two
  tables under different names.

  Now each `geldig` line carries its own grid, and the two need not look alike: a
  new version may weigh a condition the old one never mentioned, or state a
  different conclusion. Everything that was true of a rule's versions is true of a
  table's — overlapping periods are reported (`RS601`), `regelversie <naam>
  (<geldigheid>) gevuurd is` can ask about a particular one, and running against a
  rekendatum evaluates the version that covers it. The Beslistabel preview draws
  every version as its own grid under its own `geldig …`, and each version folds on
  its own where a table has more than one.

  **Two formatting changes come with it**, because a table's rows now belong to
  their version the way a rule's sentence belongs to its `geldig` line: the rows are
  indented one level further, and each version's pipes are aligned within that
  version instead of across the whole table. Running **Document opmaken** over an
  existing file will make both changes at once.
- **The plural form the `RS613` quick fix offers.** It guessed with “ends in a
  vowel takes `'s`, anything else takes `en`”, which is wrong for most of the
  Dutch nouns a model actually declares: it proposed *Werkgeveren*, *Bonuspoten*
  and *Kluisen* where the forms are *Werkgevers*, *Bonuspotten* and *Kluizen*. It
  now applies the regularities that cover them — `-heid` becoming `-heden`, an
  unstressed `-el`/`-em`/`-en`/`-er` taking `s`, and a stem that changes as the
  syllable opens, so *Kluis* gives *Kluizen* and *Bonuspot* gives *Bonuspotten*.

### Notes

- **What running does not yet include.** Every run starts from a testgeval —
  there is no way to run a model against a situation you have not written down,
  because the situation *is* the testset and writing it is the point. And a run
  is a run of the whole model: firing order follows the dependencies between
  rules, so a rule evaluated on its own is not a defined thing and no gesture
  offers it.
- **Evaluation runs in a worker thread**, one run at a time, with a timeout it
  cannot outlive. A rule set that loops does not take the editor with it: the run
  is terminated and reported as an error naming the reason. A dependency cycle
  among rules is refused before anything is evaluated, and names the rules in
  it — recursion (§9.10) is not supported.
- **A test file gets what is about names, not what is about rules.** Quick fixes,
  signature help, the CodeLens counts, links in comments, inlay hints and the
  decision-table preview each answer a question about declarations and rules, and
  a testset has neither — so in a test file they are absent rather than empty.
- **`*.test.rgs` is the same language as `.rgs`**, and is recognised as such
  because it ends in it.
  Your `[regelspraak]` editor settings, the soft wrapping, `//` comment toggling
  and bracket matching all apply unchanged, and so does every
  `regelspraak.validation.*` setting.

## [0.5.0] — The workbench

A place of its own in the activity bar with the model in it, and three more ways
to see what the language server knows about the model in front of you.

### Added

- **Model Explorer** (the RegelSpraak icon in the activity bar, or
  **Modelverkenner tonen** in the palette). Every declaration in the workspace in
  one tree, grouped by kind: object types with their attributes and
  characteristics, fact types with their roles, domains with their enumeration
  values, and then unit systems, dimensions, day kinds, timelines, parameters,
  rules and decision tables. Click a row and the declaration opens. Members that
  an `Extensie van objecttype` block adds appear under the object type itself,
  including when that block lives in another file. The tree follows what you
  type.
- **Call hierarchy over the dependencies between rules** (**Show Call
  Hierarchy**, `Shift+Alt+H`). Incoming: the rules that read what this rule
  derives. Outgoing: the rules that derive what this rule reads. A rule that
  names another one — `regelversie <naam> gevuurd is` — counts in both
  directions. A derivation chain is something you can now follow rather than
  reconstruct from memory.
- **Type hierarchy over object types** (**Show Type Hierarchy**): an object type
  together with the `Extensie van objecttype` blocks that re-open it, wherever
  those are written.
- **A model view of a file** (**Modelweergave van dit bestand tonen**, or the
  icon in the editor title bar). A read-only view of what the language server
  sees in *this* file: its declarations in the order the file writes them, with
  their members and their declared datatype. It follows the file.
- **A preview for decision tables.** Above every `Beslistabel` there is now a
  **voorbeeld tonen** link; it opens the table beside the text as a grid, one row
  per case and one column per condition or conclusion. It shows the three things
  the source cannot: which columns conclude and which condition — a fact
  RegelSpraak leaves to what the title *says*, so the text never states it — the
  server's own errors on the cell each one is about, and, for the case your
  cursor is in, what that case concludes written out as one sentence, since a
  conclusion is split between a column title and a cell. It navigates in both
  directions: click a cell, a column title or the table's name to go there in the
  text, and moving the cursor through the table highlights the case you are in.

  The preview is **read-only**, and deliberately so: a model is written as text
  here, and every view this extension adds shows you the text rather than
  competing with it. Adding or deleting a case is a job for the editor.
- **Decision-table condition columns now count as uses.** A column such as
  `indien zijn orderbedrag kleiner is dan` names an attribute exactly as a rule
  does, and until now only the conclusion column did: the condition was coloured
  as nothing, found by nothing, and left behind by a rename. It now colours,
  hovers, answers **Find All References** and **Show Call Hierarchy**, and is
  renamed with the attribute — which also means a table shows what it *reads*
  and not only what it derives. A table that concludes a characteristic
  (`een Lid is jeugdlid`) likewise now answers "which rule derives this?".
- **The language server's status in the status bar**, beside the language mode
  of a `.rgs` file: starting, running, stopped, or failed to start — with the
  path it tried when it could not be found. Click it for the log, also reachable
  as **Logboek van de taalserver tonen**. Without this, a server that never
  started is indistinguishable from one whose opinion is that there is nothing
  to report.
- **Soft wrapping for `.rgs` files, on by default.** A RegelSpraak sentence
  cannot be broken across lines: the newline is significant (§13.1.8) and carries
  work — it ends a rule's name, and separates versions, bullets and variables —
  so a long result sentence ran off the edge of the editor with no legal way to
  shorten it. `.rgs` files now wrap at 100 columns or the width of the editor,
  whichever is narrower, and a continuation is indented two levels so it reads as
  part of the sentence above rather than a new one. Display only: the file on
  disk is untouched and stays portable to any other RegelSpraak tool. Your own
  `[regelspraak]` settings win over these.

## [0.4.0] — Formatting and editor ergonomics

Layout you no longer have to keep by hand, and four small features that show you
what the model already knows about the file in front of you.

### Added

- **Format document** (`Shift+Alt+F`, the editor context menu, or the
  **Document opmaken** command in the palette). Indentation follows the structure
  of the model rather than a guess at the line: an object type's members, a
  rule's versions and their sentences, the bullets of a compound condition, the
  criteria of a distribution. Columns line up
  per block — attribute name against datatype, unit against abbreviation against
  conversion, role against object type — and a decision table's pipes line up too.
  Bullets get one space, trailing whitespace goes, and the end of the file follows
  your own `files.trimFinalNewlines` and `files.insertFinalNewline`.
- **Only whitespace ever changes.** A name in RegelSpraak is a run of ordinary
  words, and a rule's name is free text, so respacing inside one would rename it.
  The formatter edits the gaps between words and never a word, never joins or
  splits a line, and never shortens a column separator to a single space, which
  would erase the boundary the language reads. A file that does not parse is left
  exactly as it is — and the command tells you so, where the editor's own would
  quietly do nothing.
- **Format selection**, with the same rules over the selected lines, and
  aligned against the whole block so the selected half does not drift out of line.
- **Format as you type** (when `editor.formatOnType` is on): a `;` settles
  the member you just finished into its columns, and Enter settles the line above.
  Never more than that one line.
- **Counts above a declaration** (CodeLens): how often an object type, a rule
  or a decision table is named elsewhere, and — above an object type — how many
  rules derive something it declares. Clicking one opens the list.
- **Derived types in view** (inlay hints, `regelspraak.inlayHints.enable`):
  the datatype and unit a rule derives, and the same for every `Daarbij geldt:`
  variable, which has no written type at all. At `all`, also the object type a
  `zijn` or `hij` refers to. All three read as `: <type>` against the word they
  belong to. Where the model is not sure, nothing is shown.
- **Expand selection** along the structure of the sentence: word, then the
  whole name, then the subject chain, the expression, the sentence, the version,
  the rule. Names are several words, so the editor's word-by-word expansion had
  little to offer here.
- **Links in comments**: a URL, and the name of another `.rgs` file of the
  model — `// zie boekerij-gegevens.rgs` becomes a way to get there.

### Settings

- `regelspraak.format.enable` — turn the formatter off.
- `regelspraak.inlayHints.enable` — `off`, `types` (the default) or `all`.

### Fixed

- **`//#region` … `//#endregion` folding, which never actually worked.** It has
  been listed as a feature since 0.1.0 and was not one: as soon as an extension
  provides folding ranges of its own, VS Code stops building the provider that
  reads those markers out of a language configuration — and that is where they
  were declared. They are folded by the language server now, alongside
  everything else it folds.

### Changed

- **A `--- koptekst` now reads as the annotation it is.** It used to be given a
  scope no standard theme styles, so it came out in the ordinary text colour and
  sat among an object type's members looking like one of them. It is grouped
  with comments instead — which also stops word suggestions and the `'`
  auto-closing pair from interrupting you inside the header's prose.
- **Two more things fold**: a `Daarbij geldt:` block, and the bullets of a
  compound condition, which collapse under the `… voldoet:` line that
  introduces them and nest the way they are written.
- **Inlay hints are written in the language's own words.** `Numeriek (€)` where
  a model writes `€`, rather than the internal spelling the diagnostics compare
  units by. Where an `Eenheidsysteem` declares the unit, its own name is used.

### Notes

- **References to the specification are not linked.** `§13.4.2` in a comment stays
  text: the RegelSpraak specification is the Belastingdienst's, is not
  redistributable, and where you have a copy this extension does not know where.
- A rule that is missing its closing `.` is *not* repaired by the formatter. That
  would change the words, not the layout — and it is a syntax error, which the
  file already reports.

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
  validation release. See the [roadmap](docs/ROADMAP.md).
- The language server runs locally and sends nothing over the network.
