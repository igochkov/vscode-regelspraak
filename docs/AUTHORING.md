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
gegevens/     GegevensSpraak — what the model is made of
regels/       RegelSpraak — what it derives, checks and creates
tests/        TestSpraak — what it is supposed to produce
```

Three folders, because the language has three jobs and a file only ever does
one of them. In `samples/` that comes to 276 lines of declarations, 616 of
rules and 340 of testsets, over 33 files averaging 40 lines — small enough that
a file is read rather than searched.

## Naming

**Lowercase, hyphenated where a name needs two words, Dutch, and named after the
subject.** `boete.rgs`, not `Boete.rgs`, `boete-regels.rgs` or `BoeteRules.rgs`.
The folder already says what kind of file it is, so the name does not repeat it.

**`.rgs` is a model; `*.test.rgs` is a testset.** The suffix is what the server
reads to choose a grammar, case-insensitively — so never spell it another way,
and never prefix a test file with `test-`: the suffix already says it.

**The basename is the subject, and the same subject keeps the same basename
wherever it appears.** `gegevens/uitlening.rgs` declares the object type;
`regels/uitlening.rgs` holds the rules about it. That the two share a name is
the point: the editor shows the folder when the names collide, and a reader
looking for "everything about an uitlening" has one word to search.

Not every rule file has a declaration counterpart — `punten.rgs`, `inleg.rgs`,
`verdeling.rgs`, `consistentie.rgs` name a topic rather than an object type, and
that is fine. The rule is that names *match where the subject matches*, not that
every file be paired.

### One subject per file

In `gegevens/`, a subject is usually one object type, and the file is named
after it. Declarations that are too small to stand alone group by kind —
`domeinen.rgs`, `eenheden.rgs`, `parameters.rgs`, `feittypen.rgs` — because a
three-line file costs more to open than it saves to read.

Two placements in `samples/` are deliberate rather than incidental:

- `gegevens/voorkeuren.rgs` holds an `Extensie van objecttype het Lid` and
  nothing else. An extension block's whole purpose is to add members to a type
  declared elsewhere, so putting it beside the type it re-opens would hide what
  it is for.
- `gegevens/publicatie.rgs` holds both `Publicatie` and `Bundel`. The Bundel
  exists only as the second collection in a uniqueness check, and a file of its
  own would say it mattered more than it does.

## Testsets

**A testset lives in `tests/` and takes the basename of what it exercises.**
`tests/lidmaatschap.test.rgs` goes with `regels/lidmaatschap.rgs`. One testset
per file — the grammar allows no more — so the file *is* the testset, and the
`Testset` line names it in prose the filename cannot carry:

```
Testset Lidmaatschap en contributie
```

A testset that cuts across the model keeps a name of its own:
`tests/waardevormen.test.rgs` exercises every literal form there is and belongs
to no single rule file.

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
worth avoiding now.

## Where things do *not* go

- **No `index.rgs`, no manifest, no include list.** The model is every `.rgs`
  file under the workspace folder; there is nothing to register a file with, and
  nothing that reads a list.
- **Declaration order does not matter**, within a file or across files. A rule
  may name an attribute declared in a file that sorts after it.
- **Numeric prefixes** (`01-gegevens/`) buy nothing: there is no order to
  encode, and they make every name harder to type and to search.
