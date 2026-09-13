# Artikel 7. Recht op minimumloon

*Het artikel waar de wet om is gemaakt.*

## Lid 1

De werknemer die de leeftijd van 21 jaar heeft bereikt heeft voor de arbeid door
hem in dienstbetrekking verricht, jegens de werkgever recht op een loon ten
minste tot het bedrag, bij of krachtens de volgende artikelen onder de benaming
minimumloon vastgesteld.

De leeftijd waar dit lid over gaat is de leeftijd **op de rekendatum**, en dat
is geen detail: wie op 20 juni 21 wordt heeft over juni een ander minimumuurloon
dan over mei.

```regelspraak
Regelgroep recht op minimumloon

// Bron: [art. 7 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=1&g=2026-07-01&z=2026-07-01)
Regel Leeftijd op de rekendatum
	geldig altijd
		De leeftijd van een Natuurlijke persoon moet berekend worden als de tijdsduur van zijn geboortedatum tot de Rekendatum in hele jaren.
```

## Lid 2

Indien daartoe naar Ons oordeel aanleiding bestaat op grond van de ontwikkeling
in collectieve arbeidsovereenkomsten ter zake van de leeftijd waarop recht op
een loon tenminste tot de in
[artikel 8, eerste lid](art-08-hoogte-van-het-minimumloon.rgs.md),
genoemde bedragen ontstaat, kan bij algemene maatregel van bestuur worden
bepaald, dat werknemers beneden de leeftijd van 21 jaar, die de leeftijd van 20
jaar dan wel die de leeftijd van 19 jaar hebben bereikt, eveneens het in het
eerste lid bedoelde recht hebben.

## Lid 3

Bij algemene maatregel van bestuur kan worden bepaald, dat werknemers — dan wel
dat werknemers, behorende tot een bij de maatregel aangewezen categorie —
beneden de leeftijd van 21 jaar of, zo toepassing is gegeven aan het tweede lid,
beneden de krachtens dat lid bepaalde leeftijd, die een bij de maatregel
aangewezen lagere leeftijd hebben bereikt, eveneens het in het eerste lid
bedoelde recht hebben.

**Van lid 3 is gebruikgemaakt, en daarom staat de hoofdregel van dit artikel
hier en niet bij lid 1.** Artikel 1 van het
[Besluit minimumjeugdloon](https://wetten.overheid.nl/jci1.3:c:BWBR0003599&artikel=1&z=2026-07-01&g=2026-07-01)
zegt:

> Werknemers die de leeftijd van 15 jaar doch niet die van 21 jaar hebben
> bereikt, hebben het recht, bedoeld in artikel 7, eerste lid, van de Wet
> minimumloon en minimumvakantiebijslag.

Dus is de ondergrens niet 21 maar **15**, en is het bij 15 tot en met 20 een
lager *bedrag* en niet een afwezig recht. Dat is een onderscheid dat je in de
uitkomst terugziet: onder de 15 heeft iemand geen minimumuurloon (`leeg`), bij
15 heeft hij er een van 30% (zie
[artikel 8](art-08-hoogte-van-het-minimumloon.rgs.md)).

De `// Bron:`-regel verwijst hier daarom naar het Besluit en niet naar dit
artikel: waar een regel een andere bepaling uitrekent dan die waar zij onder
staat, schrijf je de verwijzing er expliciet bij, en die wint van de plaats in
het document.

```regelspraak
// Bron: [art. 1 Besluit minimumjeugdloon](jci1.3:c:BWBR0003599&artikel=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 7 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 7 lid 3](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=3&g=2026-07-01&z=2026-07-01)
Regel Recht op minimumloon
	geldig altijd
		Een Natuurlijke persoon heeft een recht op minimumloon
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is werknemer
			• zijn leeftijd is groter of gelijk aan 15 jaar.
```

## Lid 4

Beloningen, die de werknemer voor arbeid, door hem in de dienstbetrekking
verricht, van derden ontvangt, worden, voor zover zij deel uitmaken van de
arbeidsvoorwaarden, voor de toepassing van het bij of krachtens het eerste,
tweede of derde lid bepaalde geacht van de werkgever te zijn ontvangen.

*Een toerekeningsregel: hij verandert niet wat er moet worden betaald maar wie
geacht wordt het te hebben betaald. In dit model komt hij uit op dezelfde
`geldelijke inkomsten` van [artikel 6](../h1-algemene-bepalingen/art-06-loon.rgs.md),
met als enige verschil dat er ook in staat wat van een derde kwam.*

## Lid 5

Loon waarop de werknemer op grond van enige wettelijke bepaling recht heeft over
een periode, waarin hij geen arbeid verricht, wordt voor de toepassing van het
bij of krachtens het eerste, tweede of derde lid bepaalde aangemerkt als loon
voor de arbeid door hem in die dienstbetrekking verricht. Bedragen, waarmee het
loon overeenkomstig die bepaling wordt verminderd, worden voor de toepassing van
het bij of krachtens het eerste, tweede of derde lid bepaalde geacht van de
werkgever te zijn ontvangen.

*Dit lid is de tweede helft van
[artikel 5a lid 1](../h1-algemene-bepalingen/art-05a-arbeidsduur.rgs.md) en
staat daar uitgerekend: `de tijd met recht op loon` telt mee in de arbeidsduur,
en daarmee in wat verschuldigd is.*

## Lid 6

De werkgever is met toepassing van
[artikel 623 van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=623&z=2026-07-01&g=2026-07-01)
verplicht het minimumloon tijdig te voldoen.

*Een verplichting met een termijn die in een andere wet staat. Of er tijdig is
betaald is een feit over een datum die dit model niet kent — de betaaldatum
staat nergens in de administratie die deze wet beschrijft.*

## Rekenvoorbeelden

```testspraak
Testset Recht op minimumloon
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
	Gegeven Bakkerij heeft Contract als aanstelling
```

### De volwassen werknemer

```testspraak
Testgeval Een werknemer van 27 heeft recht op minimumloon
	Gegeven testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking

	Verwacht Noor met
		leeftijd  27 jaar
		is werknemer
		heeft een recht op minimumloon
```

### De ondergrens van het Besluit minimumjeugdloon: precies 15

```testspraak
Testgeval Wie net 15 is geworden heeft recht op minimumloon
	Gegeven testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Natuurlijke persoon (Bram) met
		geboortedatum  31-07-2011
		heeft een woonplaats binnen het Rijk
	Gegeven Bram heeft Contract als betrekking

	Verwacht Bram met
		leeftijd  15 jaar
		heeft een recht op minimumloon
```

### Eén dag te jong

Dezelfde persoon, één dag later geboren. Dit is het randgeval dat zegt of
`de tijdsduur van … tot … in hele jaren` naar beneden afkapt, en dat doet hij.

```testspraak
Testgeval Wie één dag te jong is heeft geen recht op minimumloon
	Gegeven testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Natuurlijke persoon (Fenna) met
		geboortedatum  02-08-2011
		heeft een woonplaats binnen het Rijk
	Gegeven Fenna heeft Contract als betrekking

	Verwacht Fenna met
		leeftijd        14 jaar
		heeft geen recht op minimumloon
		minimumuurloon  leeg
```

### Oud genoeg maar geen werknemer

De zelfstandige van
[artikel 2 lid 2 onder b](../h1-algemene-bepalingen/art-02-dienstbetrekking.rgs.md):
het recht hangt aan werknemer-zijn en niet aan leeftijd alleen.

```testspraak
Testgeval Een zelfstandige van 40 heeft geen recht op minimumloon
	Gegeven een Werkgever (Uitgeverij) met
		handelsnaam  "Uitgeverij Wolkenveld"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Opdracht) met
		aanvangsdatum  01-01-2026
		is overeenkomst van opdracht
		heeft een arbeid tegen beloning
		heeft een zelfstandige beroepsuitoefening
		heeft een vervulling binnen het Rijk
	Gegeven een Natuurlijke persoon (Joris) met
		geboortedatum  20-07-1986
		heeft een woonplaats binnen het Rijk
	Gegeven Joris heeft Opdracht als betrekking
	Gegeven Uitgeverij heeft Opdracht als aanstelling

	Verwacht Joris met
		leeftijd  40 jaar
		is geen werknemer
		heeft geen recht op minimumloon
	Verwacht regelversie Recht op minimumloon is niet gevuurd
```

### De rekendatum beslist

Twee keer dezelfde persoon, twee rekendata: op 1 augustus is hij 20, op
1 september 21. Dat is waar een `Rekendatum` in een testgeval voor is — en de
twee data blijven binnen het halfjaar van de parameterset, want een testgeval
mag de rekendatum overschrijven en de parameterset niet (dat zou RS965 zijn, en
terecht: dan zouden de bedragen van het verkeerde halfjaar gelden).

```testspraak
Testgeval Op 1 augustus is hij nog 20
	Gegeven testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Natuurlijke persoon (Sanne) met
		geboortedatum  20-08-2005
		heeft een woonplaats binnen het Rijk
	Gegeven Sanne heeft Contract als betrekking

	Verwacht Sanne met
		leeftijd        20 jaar
		minimumuurloon  11,99 EUR/uur
```

```testspraak
Testgeval Op 1 september is hij 21
	Rekendatum 01-09-2026
	Gegeven testinitialisatie een binnenlandse werkgever en een binnenlandse betrekking
	Gegeven een Natuurlijke persoon (Sanne) met
		geboortedatum  20-08-2005
		heeft een woonplaats binnen het Rijk
	Gegeven Sanne heeft Contract als betrekking

	Verwacht Sanne met
		leeftijd        21 jaar
		minimumuurloon  14,99 EUR/uur
```
