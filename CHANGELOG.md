# Changelog

All notable changes to the RegelSpraak extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions run through to `1.0.0`, which is bound to the whole plan rather than
to any one milestone. They no longer map *phase N to 0.N.0*: the workbench half
of phase 6 needed nothing from the execution engine, so it shipped as `0.5.0`
ahead of execution, and each version since is named for what it delivers.

## [Unreleased] — A reglement as a notebook, one model per workspace folder, and exact arithmetic without a ceiling

**A model can now be written as the document it renders.** Until now the text
came first and the rules rendered it afterwards, from a folder of `.rgs` files
with a `// Bron:` line back to each provision. That is the right shape for a
converted PTPO and the wrong one for a jurist writing a reglement: the sentence
and the rule that computes it are written together, by the person who means
both, and a folder cannot hold them in one place. So the extension now offers
**two ways to write one model**, and the mode is the kind of document you open
rather than a setting:

- **Technische modus** — everything that was here before: `.rgs` and
  `*.test.rgs` files in `gegevens/`, `regels/` and `tests/`, over a source
  document under `bron/`.
- **Juridische modus** — a **notebook**: an `.rgs.md` document in which the
  reglement's text and its RegelSpraak alternate, in the order the text has,
  with the worked example under the bepaling it checks.

**The file is Markdown.** A fenced block whose language is `regelspraak` or
`testspraak` is a code cell and everything between two of them is prose; no
outputs, no execution counters and no cell metadata are stored, so the document
is readable and diffable as what it is — a reglement in review is a pull request
over prose. *Openen met → Teksteditor* shows the same file as text, and
**Reglement bekijken** renders the whole of it in VS Code's Markdown preview,
fences and all.

**A notebook is one file to the model**, exactly as a `.rgs` file is: its
`regelspraak` cells in order are one rule group and its `testspraak` cells in
order are one testset. Everything the language server does in a file, it does in
a cell — colour, the whole diagnostics catalogue, completion, hover, the
outline, folding, definition, references, rename, formatting, quick fixes,
signature help, the decision-table preview, the Model Explorer, the hierarchies
and **Leg uit** — with a diagnostic landing in the cell it is about.

**One notebook is one artikel**, and the folders above it are the levels the
document itself has. An amendment amends an artikel, so a legal change is then
the diff of one file, and a rule's citation is the lid it stands under rather
than the chapter. Declarations stay in `gegevens/` beside the notebooks.

**A rule's citation is its position.** Hovering a rule in a notebook names the
nearest heading above its cell and lists the source links in the prose between
them, a Juriconnect reference to Dutch law included, read back in words. An
explicit `// Bron:` line in the cell wins where a rule renders something else.

**You run the rekenvoorbeeld, not the regel.** A `testspraak` cell has a run
button and a `regelspraak` cell has none: a run evaluates the whole model
against a situation, so *running a rule* was always *running a testgeval and
looking at one rule*. Under the cell each `Verwacht` line gets its verdict, with
the expected and the actual value where they differ; the same testgevallen are
in the Testing view, under the notebook, and it is one request either way.
Editing any code cell clears every output, the run having been against a model
that no longer exists.

**And a workspace folder is now one model.** The server held one index for the
whole window, so two reglementen open at once shared a namespace: every
`Deelnemer` collided with every other, a duplicated rule name was `RS607` on two
files whose authors each wrote something correct, and a duplicated **object
type** was no report at all — just a reference with two answers, resolved by
whichever file happened to be indexed first. Each workspace folder now has its
own model. Workspace symbol search still spans them and says which folder a hit
is in; the Model Explorer groups by folder where there is more than one; a run
sees its own folder's documents and no others.

**`.test.rgs` files have their own language id**, `testspraak`, which a cell
needs — a cell has no suffix to decide its grammar by — and which would have been
a wrinkle to explain for ever if files and cells had answered to different
names. Nothing changes about what a testset is or how it behaves.

No new setting. VS Code's own `notebook.outline.showCodeCells` puts a cell's
declarations in the outline beside the document's headings, and the extension
points `markdown.copyFiles.destination` at a `media/` folder beside the notebook
so a pasted figure lands there.

[samples-notebook/](samples-notebook) is the worked example: hoofdstuk 10 of the
Boekerij reglement, one notebook per artikel, over the declarations an engineer
wrote beside it.

### Rekenen met de cijfers die een echt model draagt

**Een factor met tien of meer decimalen rekende niet, en nu wel.** Gemeld uit
een productiemodel: `het te gebruiken pensioenvermogen gedeeld door de
contantewaardefactor` met een contantewaardefactor zoals de administratie hem
levert — `1,6802319798572` — leverde géén waarde op en meldde bij uitvoering
*het getal is te groot om exact mee te rekenen*, over een operand kleiner dan
twee en een uitkomst van ongeveer 59.515. De grens lag tussen acht en tien
decimalen en het gedeclareerde domein maakte niets uit, ook `Numeriek (getal)`
niet.

**De grens zat niet in het getal maar in de deling.** RegelSpraak rekent exact
met breuken, en een deling is precies waar zo'n breuk haar noemer verdient:
100.000 gedeeld door die factor is een breuk met een teller van 2,5·10^17, en
de teller mocht niet groter zijn dan wat een gewoon getal exact vasthoudt. Dat
is nu geen grens meer. De uitkomst is `€ 59.515,59`, de factor mag er veertien
decimalen hebben zoals de keten hem aanlevert, en ver daarvoorbij.

**Er is nog steeds een grens, en die staat nu in de foutmelding.** Een waarde is
een breuk van twee gehele getallen van elk ten hoogste **duizend cijfers**;
loopt een berekening daaroverheen, dan zegt de melding hoeveel significante
cijfers zij nodig had in plaats van dat het getal "te groot" is. Duizend is ver
voorbij wat een model schrijft: de factor uit de melding heeft er veertien, en
elke deling op rij telt op. Wat er *niet* gebeurt is stilzwijgend afronden op de
gedeclareerde precisie — liever geen antwoord dan een antwoord dat een cent
mist.

**Een afronding voorbij vijftien decimalen kan nu ook.** `afgerond op 20
decimalen` werd geweigerd omdat het getal niet te vertegenwoordigen was; dat
gold de voorstelling en niet §6.1.3, en het geldt niet meer.

**En een product van twee gebroken machten evenmin.** Apart gemeld, als een
nieuwe grens: één `tot de macht` met een gebroken exponent rekende op tien
decimalen, maar twee van zulke machten vermenigvuldigd weigerden vanaf negen —
en alleen als beide uitkomsten irrationaal waren. Dat is dezelfde grens, één
operator verderop: twee waarden van negen decimalen vragen samen achttien
cijfers in de noemer. Zij is met het bovenstaande verdwenen, en het model uit
die melding rekent nu op elk aantal decimalen dat het schrijft.

**Waarom er geen diagnostic op het literaal kwam.** Het rapport vroeg er als
eerste om, en er valt niets te melden: `1,6802319798572` is een keurige waarde
die optelt, vermenigvuldigt en vergelijkt — wat overliep was het *quotiënt*, en
hoe groot dat is hangt af van de andere operand, die uit een `Gegeven`-regel of
een gegevensbron komt. Een melding op het literaal zou een gok zijn geweest over
een zin die klopt. Dat de grens geen eigenschap was van iets wat de editor kan
zien, is precies waarom je hem pas bij uitvoering tegenkwam — en dat is wat
hier is weggenomen in plaats van gemeld.

**Twee dingen die er stil onder lagen, gingen mee.** Een sleutel van een
gegevensbron en een jaartal als periodegrens vroegen of de *noemer* 1 was, en
een testgeval schrijft `2025,00` — waarmee de waarde geheel is en de
schrijfwijze niet, dus zo'n sleutel adresseerde geen cel. En een geschreven
getal met veertien decimalen werd voor de weergave door een afronding gehaald,
zodat het in een trace anders kon staan dan het was geschreven.

**Twee zinnen die de editor en de engine verschillend lazen.** Beide gemeld door
een team dat er wetsregels mee schrijft, beide gereproduceerd, beide dezelfde
fout in twee gedaanten: één laag las de woorden, de andere las de boom.

**`hij heeft de actieve reservering` viel om bij het uitvoeren en de editor zei
niets.** Het lidwoord hoort bij de *declaratie* van een kenmerk (§13.3.2 schrijft
`de actieve reservering  kenmerk (bezittelijk)`) en niet bij de naam; wie hem
daarna noemt schrijft `een <kenmerknaam>` of niets. Omdat `de` en `het` ook
gewone naamwoorden zijn — `het jaar uit omloop` — slikte de gulzige naam het
lidwoord op, ontleedde de regel gewoon, kleurde de zin, werkte F12 en hernoemen,
en viel alleen de run om met *is geen kenmerk of rol die de engine kent*. De
engine leest het lidwoord nu zoals elke andere laag, en **RS126** zegt dat de zin
niettemin fout is: een model dat zo geschreven is, wordt door ALEF en door elke
andere v2.3.0-implementatie geweigerd. De melding komt alleen waar de naam zónder
lidwoord wél oplost, en de quick fix haalt precies dat woord weg.

**En een zusterbullet ná een geneste groep werd binnen die groep uitgerekend.**
De nesting van bullets zit in het aantal `•` (§8.3.2), en een grammatica kan niet
tellen: zodra een geneste kop was binnengegaan verdween elke volgende bulletregel
daarin, hoe ondiep ook. Zo las

    indien hij aan alle van de volgende voorwaarden voldoet:
        • hij voldoet aan geen van de volgende voorwaarden:
            •• hij is jeugdlid
        • zijn leeftijd is kleiner dan 0.

als `alle( geen(jeugdlid, leeftijd < 0) )` in plaats van `alle( geen(jeugdlid),
leeftijd < 0 )` — waar, waar de zin onwaar zegt, met een schone ontleding, schone
diagnostiek en een regel die vuurde. De diepte wordt nu gelezen. Een model dat
alles op één diepte schrijft betekent wat het altijd betekende: een groep neemt
altijd het item ná haar kop, en pas een bullet die ondieper is dan dat eerste lid
sluit de groep. Er hoort geen melding bij — de zin was gewoon goed.

## [0.9.5] — Recursion, shared parameter values, and what real models asked for

**Parameter values that several testsets share can be declared once, as a
`Parameterset`.** A testset states one rekendatum and one set of parameter
values; where the values are about the *model* rather than about that testset — a
tariff table, the thresholds of a scheme — writing them out per testset is as
many places for one table to drift. Declare it once instead, in a `*.test.rgs`
file that holds no testset:

```
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

The set is the **bottom of three layers**: a testset's own `Parameters` block
overrides it by name, and a testgeval's overrides both, each replacing only the
lines it states. So one case can take another tariff in one line and keep the
rest of the set.

**The `geldig` line is required, and it is what the construct is for.** It does
not choose the set — the testset names the one it wants — it is the check that
the set you named is the set your rekendatum belongs to. Naming the 2027 tariffs
in a testset that reckons on 2028 is the one mistake nothing else here can see:
every value is type-correct, every name resolves, the run is green, and the
numbers are a year out. That is **RS965** now, on the line that states the date —
the testgeval's own where it overrides the testset's, so a testset of forty cases
inheriting one date says it once. Where the values genuinely do not depend on a
period, `geldig altijd` says so in the language's own word.

Everything else follows from it being an ordinary declaration: F12 from the
`Parameterset` line to the set, **rename** across both files, the outline and
folding over a library file, completion offering the sets the workspace declares,
the formatter indenting the values under the header, and — where two files
declare one name — RS607 on each of them with the other named. A name nothing
declares is RS964, and the run refuses on the same finding the editor shows, as
every RS95x already does.

`samples/tests/parameterwaarden.test.rgs` is the example, and it is where five of
the six sample testsets used to repeat the same seven lines.

**A kenmerk check is about the subject the sentence names.** `indien zijn reis
een onbelaste reis is` is about the reis — and RS116 judged it against the rule's
subject, so a kenmerk the model plainly declares was reported as one the subject
had not got. Three declarations are enough to see it and no example model wrote
the sentence, which is why it stood this long; a converted model wrote it twelve
times. The rule reads and runs as it always did — what changes is that the editor
stops objecting to it.

**And the import got five readings right that it had been getting wrong**, each
found by converting a real project and reading the result. A percentage kept its
`%` sign, which it had been losing on every parameter value. A message with a
value in the middle of it — *"Vanaf «de luchthaven van vertrek van de vlucht»
zijn geen klimaatneutrale vluchten mogelijk."* — converts now: it had been
declining as something the language cannot say, and the language says it. An
input ALEF leaves empty is left empty rather than costing the whole testgeval. A
rule outcome beside an expectation the language cannot write survives instead of
going with it. And ALEF's **flow layer is not converted at all**, that
functionality being deprecated: the flows and the flow tests are skipped and the
report says so once, rather than reading as thirty gaps you have to fill in.

**And an imported project keeps its own folders.** The conversion used to write
three — `gegevens/`, `regels/`, `tests/` — which for a real project meant fifteen
rule files in one flat list where ALEF had them in four groups. It now mirrors
what the MPS explorer shows: the solution, the model, and the folders the
modeller made inside it, so the file you are looking for is where you left it.
Where two models would land on the same name the second is numbered and the
report says so, instead of quietly replacing the first.

**And importing from ALEF writes them.** ALEF holds a parameterset as a model of
its own and stores no reference from a testset to one — which set applies is
worked out from the validities — so the import writes each set as its own library
file and names, in every testset, the set whose period covers that testset's
rekendatum. Where two sets cover it the second one's values are written into the
testset, and where none does, no set is named: the conversion report says which
happened, because a set named against the wrong year is exactly the mistake
RS965 exists to catch. It also fixes a period ALEF states as a bare year, which
was being converted to 1 January at both ends — at the `t/m` end that ended the
period eleven months early, in a rule version as much as in a set.

**A rule group can recurse, which is §9.10 and the last thing in the language the
engine refused outright.** Write `(recursief)` after the group's name and a rule
may derive a property of one instance from the same property of **another**
instance of the same object type — the chain of instalments that pays off a debt,
a household chain, a schedule where each step starts from where the last one
ended. Until now every such loop was refused, and rightly: the specification asks
for the mark precisely because a machine cannot tell an intended chain from the
mistake it resembles, a value defined in terms of itself.

```
Regelgroep aflossing in termijnen (recursief)
```

**Nothing is recomputed, and that is the whole design rather than an
optimisation.** §9.10's recursion is iteration by *creating instances*: each
round brings a new one into the world and the group's rules run over it as over
any other, reading from the previous instance a value that was written once and
is final. So a value still has exactly one derivation — **Leg uit** walks back
through the previous instance as it walks back through anything else, the
derivation tree stays a tree, and a breakpoint stops per instance as it always
did. What stops the repetition is the condition the author writes on the creation
rule, which is exactly where §9.10 puts it.

**Five checks say when a group does not carry its own weight.** `RS616` reports a
loop the mark does not permit and now names *why* in the same sentence — the
group is not marked, the rules are in two groups, the loop creates nothing, one
of its rules is about a type the loop does not create, two of them derive one
instance's values from each other — because that is the next thing to do about
it. Where the mark is the only thing missing there is a one-keystroke fix.
`RS617`, `RS618` and `RS619` are §9.10's three conditions on a marked group: it
has to create something, the creation needs a condition, and that condition has
to bound something. `RS620` is the reverse and the one worth knowing about: a
mark under which nothing actually recurses is a licence lying about for a loop
somebody adds by accident later.

**The Boekerij example shows it.** Article 8 of the reglement gained the
instalment scheme, `gegevens/boeteschuld.rgs` the two object types and the
self-relating fact type that is the chain, and
`regels/h4-uitlening/art-08-boete-in-termijnen.rgs` the recursive group — its own
file beside `art-08-boete.rgs`, because the group *is* the file and the mark
covers everything in it, so keeping the licence as narrow as the chain that needs
it is worth one extra file. `tests/boetetermijnen.test.rgs` runs both bounds.

**A run says which round a value came from.** The panel writes `herhaling 3`
beside the rule, on a write, on a skipped rule and on a fault; the debugger's
Variables pane states it beside the rekendatum, which is what tells sixty stops
on one rule apart. And a group whose bound does not work is not a hang: after a
thousand rounds the run reports a *modelfout* naming the group and the creation
rule, and then carries on deriving everything else.

**`tot de macht` computes a fractional exponent.** A rate raised to a part of a
period — the composed year rendement, a steering factor over a fraction of a
year — is ordinary financial arithmetic and was the one sentence the engine
would not answer: it validated clean, ran, and faulted with *een gebroken
exponent wordt nog niet geëvalueerd*. It now produces a number.

**And it produces the right digits.** RegelSpraak computes in exact fractions,
and `1,05 tot de macht 0,832877` is irrational — there is no exact fraction to
want. So the answer is *computed* to the rounding the sentence already states,
the way a square root already was, rather than approximated: the arithmetic
underneath is whole-number arithmetic throughout, every step carries a low and a
high bound, and the digit at the rounding position is only given once both bounds
agree on it. Where the answer *is* exact — `4 tot de macht 0,5` — it is stated
exactly rather than one step beside it. All five rounding modes of §6.1.3 apply,
a negative exponent inverts, and a fractional power of a negative number is
refused for the reason a square root of one is.

**A whole number written with decimals is a whole number.** This is what made
the above visible on a testgeval where the year fraction is exactly one: a
`Gegeven` line writes `1,000000` and the value is stored as it was written, so
the check for a whole exponent — which looked at the written form rather than at
the value — called a plain 1 a fraction. Two more places asked the same question
the same way and are fixed with it: `de eerste paasdag van` refused a year
written `2026,00`, and `de datum met jaar …` refused a whole day or month written
with decimals.

**A number written with a thousands separator now says so.** `RS005` reports
`11.395,00` and offers to write `11395,00`. A RegelSpraak number is digits with an
optional minus and an optional decimal comma and nothing else (§13.2), so the
separator a product specification prints on every page is not something the
language has — and the asymmetry is real rather than a nicety: a **delivery file**
behind a `Gegevensbron` may use one, because its manifest says how *that file* is
written. The separator belongs to somebody else's table and never to a `.rgs`
document.

Until now nothing said that. In a rule, a `Gegeven` line or a `Parameters` block
the figure produced a general parse error naming a place rather than a cause
(*Overbodige invoer: '395,00'*). **In a decision-table cell it produced nothing at
all** — the cell parses as free text and is only read per column afterwards, so
the condition column quietly contributed no condition, every row's conditions
then held for every case, and the top row fired regardless of the value: on a
two-row staffel, no diagnostic, no fault, and 500 where the model says 0. That
is the one this release is really about.

It reports the Dutch grouping and nothing wider — a leading group of one to three
digits, then groups of exactly three, decimals only on the last, all of it written
without spaces — so a sentence that ends in a number (`… op 500.`) and a date
written with dots (`01.01.2027`, which is a different mistake) are left alone, as
are numbers inside comments, text values, enumeration values and file paths. It
is offered in a `*.test.rgs` testset as readily as in a model, since a worked
example is copied into a testgeval as readily as into a rule. A model carrying one
does not run: the run refuses with the file and the line named, which is what
makes the decision-table case safe.

**Hover a long number and it shows its grouping.** Hover `400000,00` and the
popup reads `400.000,00`, and nothing else — no heading and no label, because
the number is the whole answer. The document keeps the digits the language
admits — RegelSpraak has no thousands separator and `RS005` reports one written
into a model — and the grouping is a display, exactly as ALEF shows a grouped
number over a value it stores ungrouped. That is what a projectional editor
does, and there was no reason this one could not answer the same question when
asked. It works in a testset as readily as in a rule, and in a decision table's
cells, where a staffel of amounts actually lives.

Numbers of four digits with no decimals stay silent: that is the shape of a year,
and `2026` grouped as `2.026` is no spelling anybody writes. `1000,00` answers,
which is the currency case this is for.

**A `// Bron:` line can cite a provision in Dutch law, by the Juriconnect
standard.** Until now a citation had to be a Markdown link to a document in the
workspace, which is right for a reglement or a contract and has nothing to offer
a model derived from a *regeling*: the provision lives at `wetten.overheid.nl`
and there is no file to point at. So the other form the Dutch legal world already
uses is read as a citation too —

```
// Bron: jci1.3:c:BWBR0035878&hoofdstuk=2&artikel=13
```

— and it is clickable in both the places a citation is, the hover over the
declaration and the comment itself, both leading to the resolver. The **Permanente
link** entry beside any article on `wetten.overheid.nl` is where one comes from;
pasting the browser's address bar gives the same citation, and so does putting the
reference in a Markdown link where you would rather name the article yourself.

**The editor reads it back to you**, because ninety characters of `&key=value` is
not something anybody parses: the hover states the provision in words —
*Hoofdstuk 2, artikel 13 — BWBR0035878* — and the same words are the tooltip of
the link in the text. A `&g=`/`&z=` date pair comes out as *(geldig op
24-04-2026)*, in the date order a model writes, and the zichtdatum is named only
where it differs from the geldigheidsdatum. Nothing is written back; the document
keeps its own characters, exactly as with the grouped number above.

**And a mistyped reference now says so — `RS120`**, a warning under the parameter
it is about, from the standard's own §3: a version it does not define, a type that
is not `c` or `v`, a BWB number of the wrong shape, an unknown structure element,
a date that is not `jjjj-mm-dd`, a `z` without a `g` or before it, a `lid` without
an `artikel`, `nummer` anywhere but last, `taal` outside a verdrag. A warning and
never an error, so a mistyped comment cannot stop a run. Two rules of the standard
are deliberately not checked and the reasons are written down: whether the
structure elements run general to specific, since which of `afdeling` and
`hoofdstuk` is the outer one differs per regulation, and whether a zichtdatum is
in the future, which is a fact about today rather than about the citation. Whether
the provision exists is the resolver's answer — the editor never asks the
register.

`npm run source:coverage` passes such a citation over: its two questions are about
a document beside the model, and neither has an answer for a provision at
`wetten.overheid.nl`. `docs/AUTHORING.md` has both forms and when each applies.

**A block of `//` comment lines folds.** Every declaration and rule in an
authored model carries a doc comment — a description and its `// Bron:` line —
and a long one was the only block in a `.rgs` file that could not be collapsed.
Two or more `//` lines in a row now fold under the first of them, and
<kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>/</kbd> (**Fold All Block
Comments**) folds every one in the file at once, so a fully documented model
collapses to its declarations in a keystroke.

RegelSpraak has no `/* … */`, and this is why it does not need one: a run of line
comments is already a block, and only the editor had to learn to see it. The
`//` comment is itself an extension this project adds to the file format — the
language definition has no comment at all — so a block form was possible; it was
not worth it. Every part of the tooling that reads a comment takes one to be
bounded by its line: the hover's doc comment, the links inside comments, the
formatter, the region markers. A form that spanned lines would change all four
questions, for a fold that was available without it.

A comment sitting after code on the same line belongs to no block — the code on
that line is not what would be collapsed — and a `//#region` heading a block of
prose stays the region it is, with the prose under it folding separately. A blank
`//` holds a block together, which is what a comment with paragraphs looks like;
a genuinely blank line splits it in two.

## [0.9.0] — Tables from outside the model, and the way into a run

A model can now declare a table it does not contain. **`Gegevensbron`** is a
GegevensSpraak declaration for an externally supplied table — its key columns
marked `(sleutel)`, one value column — and a rule reads from it with
`<waarde> uit <bron> bij <sleutel>, <sleutel> en <sleutel>`. The model states the
*shape* and never the content: what the table holds is bound in a testset,
either as a miniature inside a testgeval (`Gegeven de tarieftabel met de rijen`)
or for the whole testset from a delivery on disk (`Gegevensbronnen` /
`de tarieftabel  uit "externe-tabellen/tarieftabel.json"`), where the path names a
manifest saying how the file is written. A run says which delivery it read. A
lookup on a key the content does not carry is a `modelfout`, never `leeg`.

**This is an extension beyond RegelSpraak v2.3.0**, and it is documented as one.
The specification declares how instances get their values from the input to be
outside its scope (§9.3) and leaves it to the execution environment; this
extension fills exactly that gap, is marked as such in the grammar, is optional,
and changes nothing for a model that does not use it. `docs/FEATURES.md`
describes it in full; the decision record is the server repository's [D-58].

Also new: a **parameter with a timeline** (`Parameter … voor elke maand;`, §3.8)
now takes several period lines in a testset and evaluates as the timeline it
declares; `RS705` reports a time-dependent value written to an attribute the
model keeps once; `RS960` reports overlapping periods while you type; and a
testgeval without `Verwacht` lines — a scenario — is reported as *skipped*
rather than passed, and its run lens says `scenario uitvoeren`.

**Rules that derive their values from each other are now reported while you
type.** `RS616` names a loop that runs through two or more rules — a `korting`
computed from a `grondslag` that is itself computed from that `korting`. Until
now only a rule that read *its own* target was reported (`RS606`); a loop through
two rules was refused when the model was run and mentioned nowhere in the editor.
Every rule of the loop is marked, since each is a place to break it, and the
message names the value that closes the loop, that being the thing to change.
RegelSpraak allows a circular derivation only inside a rule group marked
recursive (§9.10), which this version of the language cannot yet write, so a loop
is an error and a run refuses to start on one.

**The checks that came with it, by code.** `RS121` — a `Gegevensbron` whose shape
is wrong (no key marked, no value line, or more than one); `RS122` — a lookup
naming a value the table does not have; `RS123` — the wrong number of keys;
`RS124` — a table no rule anywhere reads (a warning, as an unused declaration is
elsewhere); `RS125` — a key whose datatype or unit does not fit the axis it
addresses, exact rather than convertible, because a key addresses a cell. In a
testset, `RS961`–`RS963` — a table nothing declares, a row with the wrong number
of keys, a key stated twice. A lookup expression is typed as the table's value
column is declared, so the existing datatype, unit and precision checks reason
about `het tarief uit de tarieftabel bij …` exactly as about the attribute
`het tarief`. Completion offers the declared tables after `uit`.

**Smaller things.** A kenmerk may carry a **timeline**, as §13.3.2 admits
(`is verzekerd voor elke dag;`): the model reads it now, so the Tijdlijn it names
gets colour, navigation and rename, and `RS117` where it names none — the engine
still refuses a time-dependent kenmerk with a fault. Formatting indents a
`Gegevensbron`, a `Gegevensbronnen` block and the rows of a miniature. The sample
workspace gained `externe-tabellen/` with a tariff table, its manifest, the
declaration that describes it and a testset that binds it. A delivery a testset
binds is kept parsed under `.regelspraak/cache/` so a later run need not read it
again; **`regelspraak.execution.cacheExternalData`** switches that off for anyone
who would rather nothing were written into the workspace, and a cache file for a
delivery the manifest no longer names is now removed instead of left behind.

**Two things this release does not contain, deliberately.** Bulk evaluation —
running a model over many thousands of rows and aggregating the results outside
RegelSpraak — was part of the same request and is **parked**: it is a
requirement of a future runner and its compiler, not of the editor. And the
extension owed a comparison against ALEF before shipping; the reviewer found
that ALEF has no concept resembling a declared external table, a key lookup, or a
test-side binding, so the clearance is a vacuous one and is recorded as such.

**Leg uit** — one gesture from a value to the derivation that produced it (UX-1).
The run panel already drew the whole chain: which rule wrote a value, the
arithmetic it did on the way, and where each operand came from, as far back as
the run can say. What was missing was the way in — a rules writer starts from a
red `Verwacht` line or a number they did not expect, not from a wish to step
through rules. Three entry points now open the panel with that value's own
derivation at the top, expanded: a **leg uit** link on the `Verwacht` line that
just failed, beside the run links you already have; the editor's context menu on
a value; and **RegelSpraak: Leg uit** in the palette. The link appears when a run
leaves a failure and is gone again the moment the expectation passes or you edit
the line. In a
testset the explanation is about the instance the `Verwacht`/`Gegeven` block
names; in a rule file it is about every instance the run has. Where no rule wrote
the value, the panel states which of the recorded facts holds instead of guessing
why. The editor entry appears only where there is an answer.

**De trace komt op afroep.** Een uitgebreide uitvoering noemt nu elke schrijving
maar draagt de binnenkant van geen enkele mee — de rekenstappen en de operanden
zijn het grootste deel van een trace en tellen voor de ene schrijving die je aan
het najagen bent. Ze komen op de klik die de rij opent, uit de uitvoering die het
paneel al tekende. Je merkt er weinig van: een rij vouwt open zoals altijd en
zegt heel even *ophalen…*. Wat het wél verandert is dat een klik in het paneel
over **die** uitvoering gaat en niet over een verse — tot nu toe voerde elk
gebaar het model opnieuw uit, dus een klik antwoordde over het model zoals je het
intussen had getypt. Op de modellen die hier draaien scheelt het 33 tot 52% aan
overdracht per uitvoering; op een model met duizenden instanties is het het
verschil tussen megabytes en niet. **Als tekst openen** haalt eerst alles op, want
een tekstdocument kan niet nahalen terwijl je leest — de tekstvorm blijft dus
compleet, en blijft wat je in een ticket plakt. Is een uitvoering niet meer
beschikbaar, dan zegt de rij dat en biedt aan het testgeval opnieuw uit te voeren.

**Een verzameling uitklappen.** `de som van de premies van alle deelnemers`
over vijfhonderd instanties, een klein beetje verkeerd, is de bug waar je een
middag mee kwijt bent: de som staat in de trace en het element dat de
uitschieter is staat nergens. Een aggregatie in de trace draagt nu een
**uitklappen**-knop, en die opent de elementen erachter — één rij per element,
met de instantie waar het bij hoort en zijn waarde, **grootste eerst**, omdat je
op een uitschieter jaagt. De kop *instantie* geeft je de eigen volgorde van het
model terug en *waarde* de gesorteerde; een lange lijst toont er twintig met
**toon alle …** eronder. Waar de waarden niet met elkaar te vergelijken zijn —
tekst, of twee eenheden — blijft de volgorde van het model staan in plaats van
dat er een verzonnen wordt. Er wordt niets extra's vastgelegd tijdens een
uitvoering, dus een gewone run wordt er geen byte zwaarder van: uitklappen voert
het testgeval opnieuw uit en rekent de zin daar uit. Dat is het ene gebaar in het
paneel dat nog over een verse uitvoering gaat en niet over de uitvoering die het
paneel tekende — de elementen komen uit de situatie van een run, en die bestaat
alleen zolang die run loopt. Klap je iets uit nadat je het model hebt getypt, dan
zie je de elementen van het model zoals het er nu staat. In de **debugger** doet
hetzelfde zich voor waar het al hoorde: een Watch-antwoord dat een verzameling is krijgt
het uitklappijltje van de Variabelen-lade, en een verzameling schrijft zich daar
nu als *512 waarden* in plaats van als een regel van vijfhonderd getallen.

**Vergelijk met vorige uitvoering.** De tweede vraag na *waarom* is *wat is er
veranderd*, en tot nu toe moest je daarvoor twee panelen naast elkaar houden.
**RegelSpraak: Vergelijk met vorige uitvoering** — in het palet, in het
Test Results-menu op een mislukte verwachting, en als knop in het uitkomstpaneel
— voert het testgeval uit en zet er een afdeling **Veranderd (n)** boven: één rij
per waarde die verschoven is (`25 euro → 30 euro`), per kenmerk dat erbij kwam of
wegging, per regel die nu wel of niet meer vuurt of vaker vuurde, en per fout die
verscheen of verdween. Klik een verschoven waarde en je krijgt de afleiding
ervan, over dezelfde uitvoering — dus zonder opnieuw te draaien. Is er niets
verschoven, dan zegt het dat ook. En **Als tekst openen** geeft je in een
vergelijking de twee uitvoeringen naast elkaar in VS Code's eigen diff-venster,
compleet, met elk verschil rood en groen gemarkeerd. De vorige uitvoering is de
vorige *volledige* uitvoering van dat testgeval — die uit de Testing-weergave
telt niet mee, want daar wordt geen detail opgehaald.

**Time-dependent values are drawn as a track.** A period list is faithful and
unreadable the moment a knip lands one day off, so the panel now draws them above the
list as a dated timeline: blocks in proportion to their length with their values
on them, **an axis with the date of every knip beneath it**, an empty stretch
shaded as the gap it is, an open period running off the edge, and the
**rekendatum as a labelled cursor** — because *which period is the run actually
standing in* is what most timeline bugs reduce to. Hovering a block gives the
whole period and value; a label that will not fit is left out rather than drawn
over its neighbour, and the list below has all of them. Every colour is a chart variable, so your theme owns it,
and the text form keeps the period list unchanged.

It also fixes something the trace had been getting wrong: **a rule that derived a
timeline read as a rule that derived nothing**, because a time-dependent write
crossed as the single value `leeg` with its periods dropped on the way out.

**Waarom leeg?** — *leeg* is the commonest confusion and has five causes with
five different fixes, and the run recorded all of them separately. Where no rule
wrote the value you asked about, **Leg uit** now answers with a verdict list
instead of a derivation: one row per rule that could have filled it, saying what
that rule did — *overgeslagen*, with the criterion that decided and the values it
read; *geen regelversie geldig op 15-06-2027 (versies: t/m 2025, vanaf 2028)*;
*faalde: deling door leeg*; or *niet op deze instantie toegepast*. Where **no
rule writes the attribute at all** it says so plainly, with the note that a
`Gegeven` is then the only possible source — very often the actual bug, and the
one case a run alone could never diagnose. The fifth cause, an operand that was
leeg, leaves a write behind and is answered by the derivation, which shows that
operand.

A rule that has **no regelversie covering the rekendatum** used to be indis-
tinguishable from a rule that simply fired nowhere; the run records it now, with
the periods the rule does have.

**And a decision table now says what it read.** A conclusion cell is usually a
literal, so a table's write recorded no operands and no arithmetic — the one
write in a model you could not open, and the derivation stopped there. It now
carries the rows it tried, each with the conditions that decided it and their
values, so *why 40 and not 25* reads as `rij 1 = onwaar` over
`indien zijn lidmaatschapsduur kleiner is dan 3 jaar`, with
`lidmaatschapsduur = 8 jaar` beside it and the rule that derived it one click
further. The rows **tried** rather than the row that won, because the winning row
is routinely the `n.v.t.` catch-all, which states no condition and so explains
nothing. The write also names the deciding row beside the
table — `← Contributiestaffel (rij 2)` — so which case answered is readable
without opening anything. It is part of the run detail a trace already asks for,
so an ordinary Test Explorer run does no more work than before.

### Fixed

**The editor keeps up with a half-written line.** Three sentences somebody is in
the middle of typing stopped the language server reading the file at all: a `»`
whose `«` has just been deleted, a date begun as `dd. ` and not finished, and
`de tijdsduur van … tot … in ` waiting for its unit. What each cost was worse
than an error message, because there was none — the file kept the squiggles it
had *before* the edit, describing text no longer in it, said nothing about the
line being typed, and answered nothing for as long as the line stood. Running the
model failed too, with a message naming no file. Found by driving the editor over
thousands of deliberately damaged documents; each is now the ordinary syntax
error it should always have been, and the sentence keeps its place in the file.

**A table read from disk is re-read when its manifest changes.** Editing a
manifest — the value column, an axis, the field separator, `volledig` — left the
previously cached reading in place, so rules went on getting the numbers from the
*old* reading of the same file, on a run that came out green, and the cached file
outlived the editor so restarting did not help. A cached table is now used only
where the delivery and the manifest that read it are both unchanged.

**Running a testgeval while the debugger is paused says so.** The engine runs one
thing at a time, and a debug session holds it for as long as you are stopped at a
breakpoint — so **Testgeval uitvoeren**, **Regel uitvoeren**, **Leg uit** and
opening a collection queued behind it and looked frozen, with the stop button
unable to end the wait either. They report that a session is running, and
cancelling a run that is waiting its turn now takes effect at once.

**And the cache folder keeps itself out of your repository.** `.regelspraak/
cache/` is written under your model root and carries a `.gitignore` of its own,
so a delivery no longer leaves an untracked binary for you to find in
`git status`.

## [0.8.0] — Importing from ALEF, and the arithmetic behind a value

A model that already exists in **ALEF** — the Belastingdienst's MPS-based
modelling environment — no longer has to be re-typed by hand. The extension
reads such a project and writes its declarations, its rules and its testsets as
RegelSpraak text, into the folders a model is laid out in, with a report of
everything it could not translate.

And a run says more about itself. `0.7.0` could name the rule that wrote a value
and the values that rule read; what it could not say is what the arithmetic **in
between** was worth. It can now — every sub-expression with the number it
produced, under the write it belongs to — and `F11` steps through that
calculation one part at a time.

The rest came out of writing and importing real models, and each one is a thing
the language could not say before. A declaration or rule may cite the **provision
it renders**, and the editor follows that citation to the article. A name may
contain an **apostrophe**, so `euro's` and `cd's` are finally spellable, and it
may contain words the editor used to keep to itself, so `de afstand tot
bestemming` parses. A declaration need not spell out its **plural** — the
editor works the form out, and says which one it worked out. And a testgeval
may state a fact from one of its ends, without naming the feittype at all.

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
- **Nothing is written until it has shown you where.** It names the full path it
  is about to write into, how many files that is and how many of them already
  exist and would be overwritten — the conversion report lists them all by name
  afterwards. It is the only thing in the extension that writes files you did not
  name, and the message afterwards names the folder again and offers to open it.
  There is no longer a folder picker: the destination is the project you are
  working in. With no folder open it says so instead of guessing a path on your
  disk, and in a multi-root workspace it asks which of your open folders.
- **And when it cannot run, it says why.** The import needs the language server;
  where it is not running the command says so, with the log and a restart a click
  away. A server that is **older than the extension** is called out by name, with
  the path it was started from and when that file was built — and, in a window
  with no folder open, a note that a workspace setting like
  `regelspraak.server.path` does not apply there.

**There is no export, and that is a decision rather than an omission.** ALEF
stores a model as an MPS project, and an MPS project is not a folder of model
files. The XML holds an abstract node tree — concepts, node ids, references —
which means something only inside a solution that declares the languages it is
written in, at the versions it is written in, and imports the models it points
at. None of that scaffolding is part of the file format; it belongs to an ALEF
release. A tool writing it from outside would be encoding assumptions about
somebody else's environment that it cannot check and that go stale the next time
that environment moves, and the failure would land on the ALEF side, in a project
somebody depends on.

Import is the direction that carries the point of the product anyway: it reads
ALEF, writes text, and hands nothing back, so from the moment the files land the
`.rgs` text is the one place the model is authored.

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

- **`is`, `hele`, `tot` and `decimalen` may be part of a name.** All four are
  words RegelSpraak uses itself — `een Lid is jeugdlid`, `de tijdsduur van … tot
  … in hele dagen`, `Numeriek (getal met 2 decimalen)` — which until now made
  them unwritable anywhere else, so `de datum waarop de pas verlopen is`, `de
  afstand tot bestemming`, `de contributie in hele euro's` and `Domein Bedrag met
  2 decimalen` were all syntax errors. Both readings work now, including the one
  that needs both at once: `indien hij een lid waarvoor korting van toepassing is
  is` reads the name to its end and then finds the verb it needs. The
  same is true of every word the language does not need to keep to itself: the
  specification puts **no word outside a name**, so each one that is reserved
  here is a limitation of this editor rather than of RegelSpraak, and the list is
  shrinking a word at a time.
- **A feittype's relation description is free text, as the language says it is.**
  `één te verdelen ov-tegoed wordt verdeeld over één passagier` used to be
  rejected on `wordt verdeeld over` — a phrase RegelSpraak uses elsewhere, but
  the description between the two `één`/`meerdere` is prose and may say anything.
  It does now.
- **And a word that is still reserved now says so.** Writing `de winst of het
  verlies` used to report *deze regel kan niet ontleed worden bij 'de winst
  of'* — the place, not the cause, and often not even the right place. It now
  reads: **`'of'` is een sleutelwoord van RegelSpraak en kan geen deel van een
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

### A fact stated from one end

- **A testgeval may relate two instances without naming the feittype.** Writing a
  fact used to mean naming four things where two identify it:

  ```
  Gegeven het feit lidmaatschap van de boekerij met Centrum als vestiging en Noor, Sam als ingeschreven lid
  ```

  The same fact now fits on:

  ```
  Gegeven Centrum heeft Noor, Sam als ingeschreven lid
  ```

  A feittype relates exactly two parties, so naming one end and one role names
  the whole fact — the editor works out which feittype it is and which role the
  subject plays. `Gegeven Noor heeft Sam als leespartner` works for a
  `Wederkerig feittype` for the same reason, with no separate form.

  **It is derived only where exactly one feittype fits.** Where none does, or
  where two do, the editor says so (**RS959**) and names the candidates; the long
  form is what to write there, and it is unchanged. That is the same rule the
  derived plurals follow: a form the editor works out never quietly overrides
  what a model actually says.

  Completion follows: after `heeft` it offers the instances of the testgeval, and
  after `als` the roles that instance's object type can actually stand opposite.
  One fact per line — `en` joins two roles of one fact in the long form, so it is
  not accepted in the short one — and lines accumulate rather than replace, so a
  `Testinitialisatie` can seat the regulars and a testgeval add one.

### A name that hides another name

- **RS119 — een losse naam die het objecttype vóór het lid leest.** Heet een
  attribuut net zo als een objecttype, dan las een kale verwijzing in een regel
  altijd het **objecttype**: een losse naam wordt eerst tussen de globale namen
  gezocht, en daar staat een objecttype wel en een attribuut niet. Niets was
  onopgelost en niets was dubbelzinnig, dus de editor zweeg — en de uitvoering
  eindigde met *geen instantie van dit objecttype in bereik* en een lege waarde.

  De editor meldt die zin nu, met beide manieren om hem te schrijven erbij
  (`zijn <naam>`, of `<naam> van <onderwerp>`), en biedt de eerste als snelle
  oplossing aan waar het onderwerp bezield is. Hij spreekt **alleen** waar het
  model het lid werkelijk kent, dus een objecttype als wortel van een keten
  noemen blijft gewoon RegelSpraak — en `zijn <naam>` en `<naam> van <onderwerp>`
  waren en blijven goed.

  RS115 waarschuwde al dát de twee namen bestaan, op de declaraties; dat blijft
  een waarschuwing, want twee legale declaraties zijn geen fout. RS119 gaat over
  de zin die er staat, en is daarom een fout.

- **Een uitvoering start niet meer op een model met een fout.** **Testgeval
  uitvoeren**, **Regel uitvoeren** en <kbd>F5</kbd> weigeren zolang het venster
  **Problemen** een fout toont, en noemen bestand, regel en code van elke fout in
  de weigering. Een model met een fout kan niet betekenen wat er staat, en een
  uitvoering erover leidt dan een verkéérd getal af in plaats van geen enkel.

  De controle geldt voor het hele model, want een uitvoering leest alle regels:
  een fout in een bestand dat u niet open hebt, blokkeert de uitvoering ook.
  Waarschuwingen en hints tellen niet mee, en met `regelspraak.validation.enable`
  uit blokkeert er niets — dan is het venster Problemen leeg op uw eigen verzoek.
  Zet **`regelspraak.execution.blockOnErrors`** uit om toch uit te voeren.

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
