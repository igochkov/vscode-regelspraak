# Een wet als notebooks

De [Wet minimumloon en minimumvakantiebijslag](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&z=2026-07-01&g=2026-07-01)
in **juridische modus**: de tekst van de wet en de RegelSpraak die haar uitrekent
staan in één document, in de volgorde die de wet heeft, en onder elke bepaling
staat het rekenvoorbeeld dat haar narekent.

Dit is het tweede notebookvoorbeeld.
[`samples/workspace/sample-notebook/`](../workspace/sample-notebook) is het
eerste — hoofdstuk 10 van het verzonnen Boekerij-reglement — en dit is een
**echte wet**, geconsolideerd op **1 juli 2026**. Wat dat verschil oplevert is
het punt van dit voorbeeld: een verzonnen reglement heeft alleen bepalingen die
je wilde modelleren, en een wet heeft ook artikelen die een bevoegdheid geven,
een procedure beschrijven of een bewijsvermoeden stellen. Wat een model daarmee
doet, en waarom, staat er per artikel bij.

## Wat er in zit

```
h1-algemene-bepalingen/    één map per hoofdstuk dat de wet heeft
  art-01-…rgs.md           één notebook per artikel
h2-minimumloon/
h3-minimumvakantiebijslag/
h4-toezicht/
  p2-bestuurlijke-boete/   een paragraafniveau, want die heeft dit hoofdstuk
h5-slotbepalingen/
gegevens/                  de declaraties, in technische modus ernaast
tests/                     parametersets en testsets die artikelen overstijgen
externe-tabellen/          de levering achter een Gegevensbron, met haar manifest
```

27 notebooks, 2.137 regels RegelSpraak en TestSpraak in codecellen en 2.612
regels wettekst en verantwoording eromheen; 12 declaratiebestanden en 4 testsets
in `tests/`. Alle 25 artikelen van de wet die vandaag gelden zijn er, plus de
twee delegatiebesluiten die de wet aanwijst.

**De mappen zijn de niveaus die de wet zelf heeft** — hoofdstukken, en onder
hoofdstuk IV een paragraaf omdat dat hoofdstuk er een heeft. Een niveau dat de
wet niet heeft is een map die er niet is. En de nummering is de hare: artikel 12
is vervallen per 1 januari 2024, dus is er geen `art-12-…`, en dat gat is
faithful. Zo is de verkenner de inhoudsopgave, en is de auditvraag — *wat hebben
we niet geïmplementeerd?* — te beantwoorden door de nummering langs te lopen.

## Wat dit voorbeeld laat zien en `sample-notebook` niet

**De 25 artikelen zijn er alle 25, en ongeveer de helft levert geen regel op.**
Bij elk daarvan staat *waarom* — een bevoegdheid voor de regering (artikel 3, 10
lid 1, 14 lid 5), een kwalificatie die de minister bij regeling vaststelt
(artikel 6 lid 3), een verbod op gedrag (artikel 6a), een bewijsvermoeden
(artikel 18b lid 3), een procesrechtelijke bepaling (artikel 18f lid 7), of een
rechtsgevolg over een beding in plaats van een berekening (artikel 19). Dat is de
lastigste helft van het werk bij een echte wet, en de enige helft die je nergens
anders geoefend ziet.

**Twee uitkomsten die elders al zijn vastgesteld.** Het model rekent het
minimumuurloon van € 14,99 (per 1 juli 2026) uít met de formule van artikel 14
lid 10, en de dertien bedragen van de minimumjeugdloonstaffel met de percentages
van het Besluit minimumjeugdloon. Alle veertien komen op de cent uit op wat de
Rijksoverheid publiceert. Dat is het sterkste rekenvoorbeeld dat een model van een
wet kan hebben: de uitkomst is langs een andere weg al eens bepaald.

**Juriconnect-bronverwijzingen, overal.** Waar de bron een wet is, is er geen
bestand om naar te wijzen, en dan is de `// Bron:`-regel een Juriconnect-
verwijzing in plaats van een pad — `jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=1&g=2026-07-01&z=2026-07-01`.
De editor leest die voor je terug (*Hoofdstuk II, artikel 8, lid 1*) en maakt er
een link van naar de resolver. De `&g=` en `&z=` staan er overal bij, zodat een
lezer over een jaar precies de consolidatie ziet die hier is gemodelleerd.
`npm run source:coverage` zegt hier niets over: die controle gaat over een
document náást het model, en een bepaling op `wetten.overheid.nl` is geen bestand
dat zij kan openen.

**Eén parameterset per halfjaar, en waarom.** De bedragen van artikel 8 lid 1
staan in de wet en gelden toch niet: artikel 14 lid 11 zet de herziene bedragen
"in de plaats van" de genoemde, en die staan twee keer per jaar opnieuw in de
Staatscourant. Dus draagt het model de *formule* en
[`tests/parameterwaarden.test.rgs`](tests/parameterwaarden.test.rgs) de bedragen,
in twee sets met een `geldig`-regel die controleert dat een testset het halfjaar
noemt waarop haar rekendatum valt.

**Een tabel van buiten.** Artikel 18f lid 6 zegt zelf dat de boetebedragen in een
*beleidsregel* staan en niet in de wet — dus is dat een `Gegevensbron`, met een
levering in [`externe-tabellen/`](externe-tabellen/) en een manifest ernaast. De
bedragen erin zijn voorbeeldbedragen; dat staat in de metadata.

## Wat het niet is

**Geen volledige rondleiding langs de taal.** Daarvoor is
[`samples/workspace/single-folder/`](../workspace/single-folder), waarin elke
constructie van beide talen één keer voorkomt. Dit model gebruikt wat déze wet
nodig heeft: beslistabellen, initialisatie-met-uitzondering, samengestelde
voorwaarden, consistentieregels, `Daarbij geldt:`, vier afrondingsvormen,
rationale getallen, een dimensie, een Gegevensbron, parametersets en één
regelversie. Wat er *niet* in zit — verdeling, objectcreatie, tijdlijnen,
dagsoorten, recursie — komt in deze wet niet voor, en een voorbeeld dat het erin
zou wringen zou over de taal gaan en niet over de wet.

**Geen advies.** Het is een voorbeeld van hoe je een wet modelleert, geen
gezaghebbende uitvoering van de Wml. Waar de wettekst een keuze open laat maakt
dit model er één en schrijft die op — het duidelijkste geval is
[artikel 16 lid 2](h3-minimumvakantiebijslag/art-16-afwijking-en-aanvulling.rgs.md),
waarvan de laatste bijzin letterlijk gelezen niet sluitend is.

## Openen

Open deze map als werkmap. **De werkmap is de modelgrens**: alles eronder is één
model, en een andere werkmap in hetzelfde venster is een ander model dat hier
niets van weet ([N-10]). Dat is precies wat je wilt naast
`samples/workspace/single-folder`, want dat model heeft óók een `het Lid` en óók
een `Regel Jeugdlid`.

Open een `.rgs.md` en VS Code opent hem als notebook: de tekst leest als tekst,
de cellen zijn RegelSpraak, en op elke codecel staat een knop. **Je voert het
rekenvoorbeeld uit, niet de regel** — druk je op die van een regelcel, dan zegt
hij dat. *Openen met → Teksteditor* laat zien dat er gewoon Markdown onder ligt,
en **Reglement bekijken** geeft het hele artikel als één doorlopend document.

## De twee eigenschappen, en hoe ze zijn gecontroleerd

Dit model houdt de twee eigenschappen die
[docs/AUTHORING.md](../../docs/AUTHORING.md) van elk model vraagt:

1. **Het meldt niets.** Niet "geen fouten" — geen enkele diagnose, over alle 16
   bestanden die de taalserver indexeert.
2. **De opmaak laat het staan.** Elk declaratiebestand, elke testset en elke
   codecel van elk notebook is een vast punt van **Document opmaken**.

Gecontroleerd met de taalserver van deze werkmap:

```sh
# diagnostiek + alle testgevallen, over de notebooks heen
RGS_SERVER=../../regelspraak-lsp/server/out/server.js \
  node ~/.claude/skills/regelspraak-expert/scripts/check-model.mjs .
# => diagnostics: geen, over 16 bestanden — runs: 136, mislukt: 0
```

**Eén ding om te weten over de lichtere weg.** `npm run model -- check|run` in
de server-repository leest notebooks ook, maar **bindt geen leveringen**: dat
doet `bindSources`, en dat zit op het pad van `regelspraak/runTest` — de
Testing-weergave in de editor, de `uitvoeren`-lens boven een testgeval, en
`check-model.mjs`. Draai je de CLI, dan meldt
[`tests/boetebedragen.test.rgs`](tests/boetebedragen.test.rgs) per testgeval dat
er geen levering is gekoppeld. Dat is het verschil tussen de twee manieren van
uitvoeren en geen fout in het model; de rekenvoorbeelden van artikel 18f zelf
gebruiken daarom een **miniatuur**, en die werkt in beide.

Elke `Verwacht`-waarde hier is een waarde die is uitgevoerd en nagelopen. Eén van
hen was fout en de correctie staat erbij, in
[`tests/onderbetaling.test.rgs`](tests/onderbetaling.test.rgs) — het aardigste
bewijs dat het loont om ze te draaien in plaats van uit te rekenen.

## Hoe je zelf zo'n model opzet

[docs/AUTHORING.md](../../docs/AUTHORING.md) — de mappen, de namen, de
`// Bron:`-vormen, de parametersets, en waarom `regels/` het document volgt waar
`gegevens/` het model volgt.
