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
bron/         the document the model renders
gegevens/     GegevensSpraak — what the model is made of
regels/       RegelSpraak — what it derives, checks and creates
tests/        TestSpraak — what it is supposed to produce
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

**A citation is clickable in two places**: in the hover over the rule, and in
the comment itself, where it joins the URLs and `.rgs` names P14 already links.
Both open the document at the article, and both are answered by the same code on
the server, so they cannot send you to different places.

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

Naming a group is all it does today. It has no bearing on what is computed or in
what order — but it is the boundary a future recursive group would be drawn on,
which is why a split made to shorten a file rather than to separate subjects is
worth avoiding now. **Where the model renders a document, the article is that
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
