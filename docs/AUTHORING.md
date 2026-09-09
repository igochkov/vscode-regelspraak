# Laying out a RegelSpraak model

How to name and arrange the files of a model, and why. [samples/](../samples) is
written to these conventions and is the worked example — every construct of both
languages appears in it somewhere, so a form can be looked up rather than
reasoned about.

None of this is enforced by the language. **A folder is not a namespace**: the
language server indexes every `.rgs` file under the workspace folders as one
model, global names are one namespace across all of it, and a name resolves the
same wherever it is written. Moving a file never changes what resolves. That is
what makes the layout free to be for people — and it is worth knowing before you
reach for a folder to disambiguate two names, because it will not.

## The tree

```
bron/              the document the model renders
gegevens/          GegevensSpraak — what the model is made of
regels/            RegelSpraak — what it derives, checks and creates
tests/             TestSpraak — what it is supposed to produce, and the
                   parametersets its testsets share
externe-tabellen/  deliveries — the content of a Gegevensbron, and its manifest
```

Three of those are the language's three jobs, and a file only ever does one of
them. In `samples/` that comes to 290 lines of declarations, 751 of rules and
361 of testsets, over 33 files averaging 43 lines — small enough that a file is
read rather than searched.

The fourth is the reason the other three are arranged the way they are.

## A model is derived from a document

Almost every RegelSpraak model is a rendering of something written in prose — a
reglement, a regeling, a beleidsregel, a contract. That document is the model's
reason to say what it says, it is what changes underneath the model, and a
reader checking a surprising number wants to be looking at both. So it comes
into the workspace, under `bron/`, and the tree follows it:

**`regels/` is organized by the document; `gegevens/` is organized by the
model.** They are two different decompositions and forcing them to mirror one
another is what makes a layout awkward.

- A **rule renders a provision**. The mapping is close to one-to-one, and a
  well-drafted document is already grouped by subject, so following it costs
  nothing and buys the thing a subject grouping cannot: when the source is
  amended, the diff lands where the amendment did.
- A **declaration is synthesized across the whole document**. An object type
  comes from the definitions *and* from every article that computes with it.
  There is no one provision it belongs to, so it is grouped by what it is about.

In `samples/`, `regels/` therefore has a folder per chapter and a file per
article:

```
regels/h4-uitlening/art-07-uitleentermijn.rgs
regels/h4-uitlening/art-08-boete.rgs
regels/h7-spaarprogramma/art-11-punten.rgs
```

The explorer is then the table of contents, in the document's own order — and a
gap in the numbering is visible, which is the audit question ("what did we not
implement?") answered by looking rather than by asking.

## Naming

**Lowercase, hyphenated, Dutch, and named after the subject.** `boete.rgs`, not
`Boete.rgs`, `boete-regels.rgs` or `BoeteRules.rgs`. The folder already says what
kind of file it is, so the name does not repeat it.

**`.rgs` is a model; `*.test.rgs` is a testset.** The suffix is what the server
reads to choose a grammar, case-insensitively — so never spell it another way,
and never prefix a test file with `test-`: the suffix already says it.

**A rule file leads with its article number and keeps the subject after it.**
`art-08-boete.rgs`, not `art-08.rgs` and not `boete.rgs`. The number sorts the
file into the document's order; the subject is what anybody actually searches
for, and dropping it would make every filename unreadable without the reglement
open beside it. Chapter folders are `h<n>-<subject>` for the same two reasons.

**In `gegevens/`, the basename is the subject and nothing else.**
`gegevens/uitlening.rgs` declares the object type. It no longer shares a basename
with the rules about it — those are filed under the article that governs them —
but the subject survives in the chapter folder (`h4-uitlening`), so "everything
about an uitlening" is still one word to search for.

### One subject per file

In `gegevens/`, a subject is usually one object type, and the file is named
after it. Declarations that are too small to stand alone group by kind —
`domeinen.rgs`, `eenheden.rgs`, `parameters.rgs`, `feittypen.rgs` — because a
three-line file costs more to open than it saves to read. That is a concession
for the genuinely shared and ownerless, not the default: grouping *every*
declaration by its kind puts an object type, the domain that types one of its
attributes and the fact type that relates it in three different files, and the
Model Explorer already gives you the by-kind view for free.

Two placements in `samples/` are deliberate rather than incidental:

- `gegevens/voorkeuren.rgs` holds an `Extensie van objecttype het Lid` and
  nothing else. An extension block's whole purpose is to add members to a type
  declared elsewhere, so putting it beside the type it re-opens would hide what
  it is for.
- `gegevens/publicatie.rgs` holds both `Publicatie` and `Bundel`. The Bundel
  exists only as the second collection in a uniqueness check, and a file of its
  own would say it mattered more than it does.

## Citing the source

**Every declaration and every rule says which provision it renders**, in a
`// Bron:` line at the end of its doc comment:

```
// Bron: [art. 8 lid 1](bron/reglement.md#artikel-8-boete)
Regel bepaal boete
```

Four things about the form, each doing work:

- **One keyword, always `Bron:`.** Going from the document to the model is then a
  workspace search, whatever else the comment says.
- **The path is relative to the model root**, not to the file it sits in. A rule
  file moves between chapters when the source is renumbered; a citation written
  from the root does not move with it. The language server finds that root by
  walking up from the file to the nearest folder that actually holds the cited
  document — *not* the workspace folder, because a model usually sits in a
  subfolder of a repository and then the two are different folders.
- **The link text names the article and the anchor points at it**, so the two
  state the same thing twice and can be checked against each other. A citation
  copied from the rule above keeps the wrong anchor, and that is the single most
  likely mistake here.
- **Repeat the line rather than listing** where a rule renders more than one lid.

**A citation is clickable in two places**, and both are answered by the same
code on the server, so they cannot land on different provisions:

- **In the hover** over the rule, where it opens the article in the Markdown
  **preview** — a reader following a citation wants to read the provision, not
  its source. There is no URI meaning "the preview of this file", so this one is
  a `command:` link, and the extension trusts exactly that one command.
- **In the comment itself**, where it joins the URLs and `.rgs` names P14 already
  links, and opens the Markdown source at the line. A document link is a location
  in the text and is followed with the same gesture as a go-to-definition, so it
  behaves like one.

That rewriting is not optional. VS Code resolves a *relative* href as a single
path, `#` and all, so an unrewritten citation tries to open a file called
`reglement.md#artikel-8-boete` and offers to create it. So the link is rewritten
to an absolute URI when it is shown, and the heading anchor is looked up in the
document and replaced by the line it is on — a text editor scrolls to `#L120`,
never to a heading name. The lookup happens per request, so a provision that
moves within the document is still found and no line number is ever written into
a citation. An anchor matching no heading is dropped and the document opens at
the top.

### The check

```sh
npm run source:coverage
```

It reads the `// Bron:` lines and the document, and reports three kinds of rot.
CI runs it — unlike the model's other gates it needs no language server, so it
is the one that can. It finds:

1. **A citation that no longer resolves** — a missing file, an anchor that is no
   longer a heading, an article or lid that no longer exists, or a link text and
   an anchor that name two different articles.
2. **A provision nothing renders.** Every article and every lid must be cited by
   some file. This is the coverage question, and it is why the citations are
   structured rather than free prose. A provision that is genuinely not the
   model's to render — a definition whose whole content is the shape of the data
   — is marked `<!-- geen-regels -->` in the document rather than left silent.
3. **A rule version that disagrees with commencement.** Where a lid carries
   `_Inwerkingtreding: DD-MM-YYYY_` and the rule below the citation states a
   `geldig vanaf`, the two must match. It speaks only where both sides state a
   date: a rule that is `geldig altijd` is making no claim.

**Write the source document into the workspace even when the real one lives
elsewhere.** A transcription or a summary with the same article numbering is
enough for all three checks, and a citation that can be checked is worth more
than a faithful PDF that cannot be.

### Citing a provision in Dutch law

**Where the source is legislation there is no file to point at, and something
better than one: the Juriconnect standard.** A tax model, a pension model or any
model derived from a regeling renders provisions that live at
`wetten.overheid.nl`, and every Dutch legal publisher identifies those the same
way. Write the reference instead of a path:

```
// Bron: jci1.3:c:BWBR0035878&hoofdstuk=2&artikel=13
Regel bepaal contributievrijstelling
```

The quickest way to one is the **Permanente link** entry in the menu beside any
article on `wetten.overheid.nl`. Pasting the browser's address bar works too —
`https://wetten.overheid.nl/jci1.3:c:…` is read as the same citation — and so
does putting the reference in a Markdown link where you would rather write the
article's name yourself:

```
// Bron: [art. 13 Wsob](jci1.3:c:BWBR0035878&hoofdstuk=2&artikel=13)
```

Four things this buys, and one it does not:

- **It is clickable in both places a citation is**, exactly as a path is — in the
  hover over the declaration, and in the comment itself — and both go to the
  resolver, which is the authority on what the provision says.
- **The editor reads it back to you.** A reference is ninety characters of
  `&key=value` and nobody parses that, so the hover states the provision in
  words — *Hoofdstuk 2, artikel 13 — BWBR0035878* — and the same words are the
  tooltip of the link in the text. The document keeps its own characters; nothing
  is rewritten.
- **`&g=` and `&z=` are worth writing.** They pin the citation to the
  consolidation of the law you actually read, which is the whole of what makes it
  answerable a year later, when the article has been amended twice. Both dates
  travel into the link, so the reader sees what you saw.
- **A mistyped reference says so** — `RS120`, a warning under the parameter it is
  about, from the standard's own §3: an unknown structure element, a date that is
  not `jjjj-mm-dd`, a `z` without a `g`, a `lid` without an `artikel`. It is a
  warning and not an error, so a mistyped comment never stops a run.
- **`npm run source:coverage` says nothing about it**, which is the one it does
  not buy. That check answers two questions about a document beside the model —
  does the citation still resolve, and is every provision rendered — and neither
  has an answer for a provision at `wetten.overheid.nl`. So a Juriconnect
  citation is passed over there and checked in the editor instead. Coverage of a
  *statute* is not something this tooling can audit for you.

**Which form to use is decided by where the source is, not by preference.** A
regeling gets a Juriconnect reference; a reglement, a contract or a policy
document that lives in the workspace gets a path and an anchor, and keeps the
coverage check. A model may use both, one per provision — `De Boekerij`'s
examples use paths throughout, its reglement being a private document of its own
rather than law.

**What the check cannot decide, it does not.** Two rules of the standard are
deliberately unenforced, and both are stated where they are skipped: whether the
structure elements run from general to specific, because which of `afdeling` and
`hoofdstuk` is the outer one differs per regulation; and whether a zichtdatum is
in the future, because that is a fact about today and not about the citation.
Whether the regulation, the article or the lid exists is the resolver's answer —
the editor never asks the register, so a reference that is well formed and points
at nothing is a click away from telling you so.

## Testsets

**A testset lives in `tests/` and takes the basename of what it exercises.**
One testset per file — the grammar allows no more — so the file *is* the
testset, and the `Testset` line names it in prose the filename cannot carry:

```
Testset Lidmaatschap en contributie
```

Testsets keep subject names rather than article numbers, and that is deliberate:
a testgeval composes a whole situation and routinely exercises several articles
at once, so numbering one after a single article would be a claim that is not
true. `tests/waardevormen.test.rgs` exercises every literal form there is and
belongs to no single rule file at all.

**A Gegevensbron gets its content from the testset, not from the model.** A
`Gegevensbron` in `gegevens/` declares only the *shape* of an externally supplied
table — its keys and its value. What the table holds is bound where a
parameter's value is: either as a miniature inside a testgeval
(`Gegeven de tarieftabel met de rijen …`, see `tests/waardevormen.test.rgs`), or
for the whole testset from a delivery on disk:

```
Gegevensbronnen
	de tarieftabel  uit "externe-tabellen/tarieftabel.json"
```

The path names a **manifest** beside the data file, resolved from the test
file's folder upward exactly as a `// Bron:` citation is. The manifest says how
the file is written — separator, decimal mark, header, the range of each key,
the number of decimals — and nothing about any industry; see
`externe-tabellen/tarieftabel.json`. A miniature in a testgeval replaces the testset's
binding for that case, whole. The run says which delivery it read (name,
manifest, sha256) in its output, and a lookup on a key the content does not
carry is a `modelfout`, never `leeg`.

A delivery is parsed once and kept in **`.regelspraak/cache/`** under the model
root, keyed by the file's hash *and* the manifest's, so editing the manifest
re-reads the delivery rather than answering from the old reading of it. The
folder is rebuilt on demand and holds a `.gitignore` of its own, so it stays out
of your repository without anything having to be added to yours. Nothing in it is
authored, and deleting it costs one parse. A file for a delivery the manifest no
longer names is removed the next time that source is read, and
`regelspraak.execution.cacheExternalData` switches the whole of it off — the run
then answers the same, only slower.

**Parameter values that several testsets share go in a parameterset.** A
testset may write its own `Parameters` block, and should where the values are
about that testset. Where they are about the *model* — a tariff table, the
thresholds of a scheme — five testsets writing the same block is five places for
one table to drift, so declare it once:

```
// tests/parameterwaarden.test.rgs — a library file, and so no testset in it
Parameterset Tarieven 2027
geldig vanaf 2027 t/m 2027

	het boetetarief            0,25 EUR/dag
	het verhoogde boetetarief  0,40 EUR/dag
```

and name it beside the rekendatum of every testset that runs on it:

```
Testset Aflossing van een boete in termijnen
Rekendatum 15-06-2027
Parameterset Tarieven 2027
```

A `*.test.rgs` file is a testset **or** a library of parametersets, never both, so
a library gets a file of its own; one file may hold as many sets as you like.

**The `geldig` line is required, and it is the point.** It is not decoration and
it does not choose the set — the testset names the set it wants — it is the check
that the set you named is the set your rekendatum belongs to. Name
`Tarieven 2027` in a testset that reckons on 2028 and you get **RS965** rather
than a green run over the wrong year's numbers, which is a mistake nothing else
in the editor can see: every value is type-correct and every name resolves. Where
the values genuinely do not depend on a period, say so in the language's own
word — `geldig altijd` — which is what `Parameterset Standaardwaarden` does for
`tests/uitkomsten.test.rgs`, whose testgevallen span three years.

Values layer in three, innermost last: **the parameterset, then the testset's own
`Parameters` block, then a testgeval's.** A layer replaces every line for a name
it states and leaves the rest of the set standing, so overriding one tariff for
one case is one line and costs nothing else.

**Every `Verwacht` value is a value somebody ran.** Write the expectation, run
it, and correct whichever of the two is wrong — usually the expectation, but not
always, and the difference is the point of writing it down. Values that were
never run are not tests; they are guesses that go red at the worst moment.

## Two properties worth keeping

`samples/` holds both, and
[client/src/test/samples.test.ts](../client/src/test/samples.test.ts) asserts
them against a running server. They are worth holding in your own model too:

1. **It reports nothing.** Not "no errors" — no diagnostics at all. A model that
   carries a few known warnings trains you to ignore the Problems panel, and the
   one that matters arrives in that noise.
2. **The formatter leaves it alone.** Run **Format Document** on what you write.
   Then a line can be copied out of the model as it stands, and a later change to
   the layout engine cannot quietly restyle everything.

## Splitting a file

**Split when the rules are about different things — not when the file gets
long.** Length is a symptom; subject is the reason. A 200-line file about one
subject is easier to follow than four 50-line files that each hold a third of an
answer.

This already matters more than style. **One file of rules is one regelgroep**,
and a header line names it:

```
Regelgroep contributie
```

One per file — the file *is* the group, so a second header contradicts the first
and is reported as such. The name is free text, like a rule's, so it may be
prose. It is optional: a file without one is a file of rules belonging to no
group, which is what every model was before the construct existed.

A group that recurses says so, and it is the only thing the header changes about
what is computed:

```
Regelgroep aflossing in termijnen (recursief)
```

§9.10 allows a rule to derive a property of one instance from the same property
of **another** instance of the same object type — a chain of instalments, a
household chain, a schedule where each step starts from the one before — and it
allows it only inside a group marked this way. The mark is required because a
machine cannot reliably tell that from the mistake it resembles: a value defined
in terms of itself. Without it, such a loop is an error (`RS616`), with a
one-keystroke fix that writes the mark where it is the only thing missing.

A recursive group has to contain an **objectcreatie** rule, and that rule's
condition is what stops the repetition — §9.10 asks it to bound both the value
being derived and the number of rounds. `RS617`, `RS618` and `RS619` say so when
one of those is missing, and `RS620` says the reverse: a mark under which nothing
actually recurses, which is a licence left lying about for a loop somebody adds
by accident later.

Every round brings a *new* instance into the world and runs the group's rules
over it; nothing is ever recomputed. So a value still has exactly one derivation,
and **Leg uit** walks back through the previous instance as it walks back through
anything else. The run panel and the debugger say which round a write belongs to
(`herhaling 3`).

**A recursive group is worth giving a file of its own**, even where the article
it renders already has one. The group *is* the file, so the mark covers
everything in it — and it goes on covering whatever is added later, which is
exactly what `RS620` warns about. Keeping the licence as narrow as the chain that
needs it is the reason `regels/h4-uitlening/` holds both
`art-08-boete.rgs` and `art-08-boete-in-termijnen.rgs`: one article, two groups,
because only one of them recurses. That is the one place this layout departs from
one file per article, and it departs for a reason a reader can check.

Beyond that, naming a group is all the header does: it has no bearing on what is
computed or in what order. But it is the boundary a recursive group is drawn on,
which is why a split made to shorten a file rather than to separate subjects is
worth avoiding. **Where the model renders a document, the article is that
boundary already**, and it is a better one than anything you would invent: it is
where the source itself decided one thing ends and the next begins.

## Where things do *not* go

- **No `index.rgs`, no manifest, no include list.** The model is every `.rgs`
  file under the workspace folder; there is nothing to register a file with, and
  nothing that reads a list.
- **Declaration order does not matter**, within a file or across files. A rule
  may name an attribute declared in a file that sorts after it.
- **Numeric prefixes encode the source's order, or nothing at all.** They used to
  be listed here as pure cost, and for a tree organized by subject that was
  right: there is no evaluation order to encode, and a prefix makes every name
  harder to type and to search. They earn their place only where the numbering is
  the *document's* and the model renders it — where the sequence is somebody
  else's, the explorer becomes a table of contents and a gap in it is a finding.
  Do not invent one for `gegevens/` or `tests/`, which render no ordered thing.
