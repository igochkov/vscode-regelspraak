# Artikel 15. Recht op minimumvakantiebijslag

*Het eerste artikel van hoofdstuk III, en het enige percentage dat de wet zelf
noemt in plaats van aan een besluit te laten.*

## Lid 1

De werknemer heeft jegens de werkgever recht op een vakantiebijslag ten minste
tot een bedrag van **8%** van zijn ten laste van de werkgever komende loon,
alsmede van de uitkeringen waarop hij tijdens de dienstbetrekking krachtens de
[Ziektewet](https://wetten.overheid.nl/jci1.3:c:BWBR0001888&z=2026-07-01&g=2026-07-01),
hoofdstuk 3, afdeling 2, paragraaf 1 of de
[artikelen 4:2b](https://wetten.overheid.nl/jci1.3:c:BWBR0013008&artikel=4:2b&z=2026-07-01&g=2026-07-01)
of [6:3 van de Wet arbeid en zorg](https://wetten.overheid.nl/jci1.3:c:BWBR0013008&artikel=6:3&z=2026-07-01&g=2026-07-01)
en de [Werkloosheidswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004045&z=2026-07-01&g=2026-07-01)
aanspraak heeft, met dien verstande, dat **het bedrag waarmede de som van dit
loon en deze uitkeringen het drievoud van het minimumloon overschrijdt buiten
beschouwing blijft**.

Drie dingen in één volzin: het percentage, de grondslag (loon plus uitkeringen),
en een plafond op die grondslag.

### De grondslag

Wat het loon is staat in
[artikel 6](../h1-algemene-bepalingen/art-06-loon.rgs.md) en het wordt per
uitbetalingstijdvak berekend. Over welke tijdvakken het gaat is de administratie
van de werkgever en geen rekensom — dus is dat een **feittype** en niet een
regel: `Feittype opbouw in het vakantiejaar` relateert een vakantiejaar aan de
tijdvakken die erin vallen, en de relatie *is* de selectie.

```regelspraak
Regelgroep recht op vakantiebijslag

// Bron: [art. 15 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=15&lid=1&g=2026-07-01&z=2026-07-01)
Regel Opgebouwd loon over het bijslagtijdvak
	geldig altijd
		Het opgebouwde loon van een Vakantiejaar moet berekend worden als de som van de lonen van zijn meetellende tijdvakken.

// Bron: [art. 16 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=16&lid=2&g=2026-07-01&z=2026-07-01)
Regel Verworven minimumloon over het bijslagtijdvak
	geldig altijd
		Het verworven minimumloon van een Vakantiejaar moet berekend worden als de som van de verschuldigde minimumlonen van zijn meetellende tijdvakken.
```

## Lid 2

De in het eerste lid bedoelde som wordt geacht het drievoud van het minimumloon
te overschrijden indien deze over de uitbetalingstermijn van een maand, liggende
in het tijdvak waarover recht op vakantiebijslag bestaat, gemiddeld meer bedraagt
dan **het drievoud van het in artikel 8, eerste lid, onder b, genoemde bedrag**
van het minimumloon. Indien de uitbetalingstermijn betrekking heeft op een andere
periode dan een maand, wordt het minimumloon naar evenredigheid berekend.
Hierbij wordt voor een uitbetalingstermijn van een week uitgegaan van **4 1/3
weken in een maand**. Indien de uitbetalingstermijn betrekking heeft op een
andere arbeidsduur dan een maand of week wordt die andere arbeidsduur
vermenigvuldigd met het aantal van de in die termijn begrepen werkdagen, waarbij
een maand wordt gesteld op **21,67 werkdagen**. Onder werkdag wordt verstaan een
dag die behoort tot de arbeidsduur.

Lid 2 zegt hoe je het plafond van lid 1 uitrekent: het drievoud van het
*referentiemaandloon*, per maand van het bijslagtijdvak. De rest van het lid
rekent uitbetalingstermijnen om die geen maand zijn — een week via 4⅓, iets
anders via 21,67 werkdagen — en die twee getallen staan als parameter in
[`tests/parameterwaarden.test.rgs`](../tests/parameterwaarden.test.rgs). Dit
model rekent per maand, dus wordt het plafond hier het eenvoudigste van de drie
gevallen.

```regelspraak
// Bron: [art. 15 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=15&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 15 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=15&lid=2&g=2026-07-01&z=2026-07-01)
Regel Drievoud van het maandminimum over het bijslagtijdvak
	geldig altijd
		Het drievoud van het maandminimum van een Vakantiejaar moet berekend worden als 3 maal het referentiemaandloon maal zijn maandental van het bijslagtijdvak.

// Bron: [art. 15 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=15&lid=1&g=2026-07-01&z=2026-07-01)
Regel Grondslag voor de vakantiebijslag
	geldig altijd
		De grondslag voor de vakantiebijslag van een Vakantiejaar moet berekend worden als zijn opgebouwde loon plus zijn opgebouwde uitkeringen, met een maximum van zijn drievoud van het maandminimum.
```

Dat het plafond een `met een maximum van` is en geen `indien` is precies wat lid
1 zegt: niet "dan geen vakantiebijslag" maar "het bedrag **waarmede** de som het
drievoud overschrijdt blijft buiten beschouwing". Alleen het meerdere valt weg.

### En dan de 8%

```regelspraak
// Bron: [art. 15 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=15&lid=1&g=2026-07-01&z=2026-07-01)
Regel Minimumvakantiebijslag
	geldig altijd
		De minimumvakantiebijslag van een Vakantiejaar moet berekend worden als (8% van zijn grondslag voor de vakantiebijslag) rekenkundig afgerond op 2 decimalen
		indien hij aan alle volgende voorwaarden voldoet:
			• zijn bijslaggerechtigde is werknemer.
```

**De 8% staat als literal in de regel en niet als parameter, en dat is een
keuze.** §13.4.17 #12 schrijft een percentage als literal en §6.4 laat een
percentage geen operand van `maal` zijn, dus een percentage dat van buiten komt
zou een getal moeten zijn en niet een percentage. Maar de belangrijkere reden is
dat dit percentage **in de wet staat**: artikel 8's bedragen staan er niet — die
worden krachtens artikel 14 vervangen — en dit percentage wel. Lid 4 hieronder
laat toe het te verhogen bij algemene maatregel van bestuur, en dat is nooit
gebeurd; gebeurt het wel, dan is de vorm daarvoor een tweede *regelversie* met
een `geldig vanaf`, want dan is er een datum waarop de wet iets anders zegt.

De voorwaarde is een samengestelde voorwaarde met één criterium, en dat is geen
overdaad: `indien zijn bijslaggerechtigde werknemer is` zou de gulzige
naamlezing de hele staart laten opslokken — `is` is sinds [D-55] een naamwoord —
terwijl de verklarende vorm in een bullet het werkwoord vooropzet en de naam
daarmee afbreekt.

## Lid 3

Beloningen die de werknemer voor arbeid, door hem in de dienstbetrekking
verricht, van derden ontvangt, worden, voor zover zij deel uitmaken van de
arbeidsvoorwaarden, voor de toepassing van de voorgaande leden geacht ten laste
van de werkgever komend loon te zijn.

*Dezelfde toerekeningsregel als
[artikel 7 lid 4](../h2-minimumloon/art-07-recht-op-minimumloon.rgs.md), en met
hetzelfde gevolg voor het model: het komt uit op dezelfde `geldelijke inkomsten`
van artikel 6.*

## Lid 4

Gelijktijdig met de toepassing van
[artikel 14, dertiende lid](../h2-minimumloon/art-14-herziening.rgs.md), gaat
Onze Minister na of de ontwikkeling van het niveau van de in collectieve
arbeidsovereenkomsten overeengekomen vakantiebijslag een **verhoging van de
minimumvakantiebijslag** wenselijk maakt. Bij algemene maatregel van bestuur kan
vervolgens het percentage, genoemd in het eerste lid, en dienovereenkomstig het
percentage, genoemd in
[artikel 16, tweede en derde lid](art-16-afwijking-en-aanvulling.rgs.md), worden
verhoogd; daarbij kan tevens een minimumbedrag worden vastgesteld voor het recht
van de werknemer jegens zijn werkgever ingevolge het eerste lid.

*Een bevoegdheid waarvan nooit gebruik is gemaakt — de 8% van lid 1 en de 108%
van artikel 16 staan er sinds 1969. Zou er ooit een verhoging komen, dan is de
vorm een tweede regelversie met een `geldig vanaf` op de
inwerkingtredingsdatum, en blijft de versie hierboven staan voor de tijdvakken
waarover zij ging.*

## Rekenvoorbeelden

Het bijslagtijdvak van
[artikel 17](art-17-tijdstip-van-uitbetaling.rgs.md) loopt tot en met 31 mei, dus
rekent deze testset op 1 juni 2026 en met de bedragen die dan gelden — die van
1 januari 2026.

```testspraak
Testset Recht op minimumvakantiebijslag
Rekendatum 01-06-2026
Parameterset Minimumloonbedragen per 1 januari 2026

Testinitialisatie een werknemer van 27
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Bakkerij heeft Contract als aanstelling
	Gegeven Noor heeft Contract als betrekking

Testinitialisatie een bijslagtijdvak van drie maanden
	Gegeven testinitialisatie een werknemer van 27
	Gegeven een Vakantiejaar (Bijslag 2026) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
	Gegeven Noor heeft Bijslag 2026 als bijslagjaar
```

### Drie maanden van € 2.400,00

Drie tijdvakken van 152 uur en € 2.400,00 loon: een grondslag van € 7.200,00 en
8% daarvan is € 576,00.

Het plafond speelt hier niet: drie maal € 2.294,40 maal drie maanden is
€ 20.649,60, en daar zit € 7.200,00 ruim onder.

```testspraak
Testgeval Acht procent van drie maanden loon
	Gegeven testinitialisatie een bijslagtijdvak van drie maanden
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven een Uitbetalingstijdvak (April) met
		begindatum             01-04-2026
		einddatum              30-04-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven een Uitbetalingstijdvak (Mei) met
		begindatum             01-05-2026
		einddatum              31-05-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven Noor heeft Maart, April, Mei als tijdvak
	Gegeven Bijslag 2026 heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht Bijslag 2026 met
		opgebouwde loon                    7200,00 EUR
		verworven minimumloon              6707,76 EUR
		drievoud van het maandminimum      20649,60 EUR
		grondslag voor de vakantiebijslag  7200,00 EUR
		minimumvakantiebijslag             576,00 EUR
```

### Met uitkeringen erbij

Lid 1 rekent de uitkeringen krachtens de Ziektewet, de Wet arbeid en zorg en de
Werkloosheidswet mee in de grondslag. € 1.200,00 erbij maakt de grondslag
€ 8.400,00 en de bijslag € 672,00.

```testspraak
Testgeval Uitkeringen tellen mee in de grondslag
	Gegeven testinitialisatie een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven een Uitbetalingstijdvak (April) met
		begindatum             01-04-2026
		einddatum              30-04-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven een Uitbetalingstijdvak (Mei) met
		begindatum             01-05-2026
		einddatum              31-05-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven een Vakantiejaar (Bijslag met uitkeringen) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
		opgebouwde uitkeringen             1200,00 EUR
	Gegeven Noor heeft Bijslag met uitkeringen als bijslagjaar
	Gegeven Noor heeft Maart, April, Mei als tijdvak
	Gegeven Bijslag met uitkeringen heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht Bijslag met uitkeringen met
		grondslag voor de vakantiebijslag  8400,00 EUR
		minimumvakantiebijslag             672,00 EUR
```

### Het plafond van lid 1 en 2: driemaal het minimumloon

Drie maanden van € 8.000,00 is € 24.000,00, en dat gaat boven het drievoud van
€ 20.649,60. Alleen het meerdere valt weg, dus is de bijslag 8% van
€ 20.649,60 — € 1.651,97 en niet € 1.920,00.

Dit is het randgeval waar het onderscheid tussen `met een maximum van` en een
`indien` zichtbaar wordt: wie het als voorwaarde leest laat de hele bijslag
vervallen.

```testspraak
Testgeval Boven het drievoud blijft alleen het meerdere buiten beschouwing
	Gegeven testinitialisatie een bijslagtijdvak van drie maanden
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   8000,00 EUR
	Gegeven een Uitbetalingstijdvak (April) met
		begindatum             01-04-2026
		einddatum              30-04-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   8000,00 EUR
	Gegeven een Uitbetalingstijdvak (Mei) met
		begindatum             01-05-2026
		einddatum              31-05-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   8000,00 EUR
	Gegeven Noor heeft Maart, April, Mei als tijdvak
	Gegeven Bijslag 2026 heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht Bijslag 2026 met
		opgebouwde loon                    24000,00 EUR
		grondslag voor de vakantiebijslag  20649,60 EUR
		minimumvakantiebijslag             1651,97 EUR
```

### Precies op het plafond

Het randgeval van `met een maximum van`: een grondslag van precies € 20.649,60
wordt niet begrensd.

```testspraak
Testgeval Precies op het drievoud wordt niets afgetopt
	Gegeven testinitialisatie een bijslagtijdvak van drie maanden
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   6883,20 EUR
	Gegeven een Uitbetalingstijdvak (April) met
		begindatum             01-04-2026
		einddatum              30-04-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   6883,20 EUR
	Gegeven een Uitbetalingstijdvak (Mei) met
		begindatum             01-05-2026
		einddatum              31-05-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   6883,20 EUR
	Gegeven Noor heeft Maart, April, Mei als tijdvak
	Gegeven Bijslag 2026 heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht Bijslag 2026 met
		grondslag voor de vakantiebijslag  20649,60 EUR
		minimumvakantiebijslag             1651,97 EUR
```

### De vakantiebijslag zelf is geen loon

Eén tijdvak — juni, de maand van de uitbetaling — waarin naast het loon ook de
bijslag over het vorige jaar is betaald. Dat de bijslag geen loon is (artikel 6
lid 1 onder a) betekent dat zij niet meetelt in de grondslag van het *volgende*
jaar; anders zou er bijslag over bijslag worden opgebouwd.

```testspraak
Testgeval De uitbetaalde bijslag bouwt geen nieuwe bijslag op
	Gegeven testinitialisatie een bijslagtijdvak van drie maanden
	Gegeven een Uitbetalingstijdvak (Juni) met
		begindatum                                   01-06-2026
		einddatum                                    30-06-2026
		verrichte arbeidstijd                        152 uur
		geldelijke inkomsten                         2976,00 EUR
		uitgezonderde inkomsten uit vakantiebijslag  576,00 EUR
	Gegeven Noor heeft Juni als tijdvak
	Gegeven Bijslag 2026 heeft Juni als meetellende tijdvakken

	Verwacht Juni met
		loon  2400,00 EUR
	Verwacht Bijslag 2026 met
		opgebouwde loon         2400,00 EUR
		minimumvakantiebijslag  192,00 EUR
```

### Geen werknemer, geen vakantiebijslag

Lid 1 geeft het recht aan "de werknemer". De zelfstandige van
[artikel 2 lid 2 onder b](../h1-algemene-bepalingen/art-02-dienstbetrekking.rgs.md)
bouwt loon op en toch geen bijslag — het randgeval dat de voorwaarde ontmaskert.

```testspraak
Testgeval Een zelfstandige bouwt geen vakantiebijslag op
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
	Gegeven Uitgeverij heeft Opdracht als aanstelling
	Gegeven Joris heeft Opdracht als betrekking
	Gegeven een Vakantiejaar (Bijslag Joris) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
	Gegeven Joris heeft Bijslag Joris als bijslagjaar
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2400,00 EUR
	Gegeven Joris heeft Maart als tijdvak
	Gegeven Bijslag Joris heeft Maart als meetellende tijdvakken

	Verwacht Bijslag Joris met
		opgebouwde loon         2400,00 EUR
		minimumvakantiebijslag  leeg
	Verwacht regelversie Minimumvakantiebijslag is niet gevuurd
```
