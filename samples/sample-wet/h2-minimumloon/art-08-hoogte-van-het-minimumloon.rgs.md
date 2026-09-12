# Artikel 8. De hoogte van het minimumloon

*Het hart van de wet, en van dit model.*

## Lid 1

Het minimumloon bedraagt:

- a. voor de toepassing van deze wet: **per uur € 10,60** *[per 1 juli 2026:
  € 14,99]*;
- b. voor de toepassing van wetten die ten aanzien van de berekening van
  uitkeringen of tegemoetkomingen naar deze wet verwijzen: over elke
  uitbetalingstermijn van een maand **€ 1.653,60** *[per 1 juli 2026:
  € 2.337,00]*;
- c. voor de toepassing van de
  [artikelen 7](art-07-recht-op-minimumloon.rgs.md),
  [7a](art-07a-girale-betaling.rgs.md),
  [11](art-11-vaste-arbeidsduur.rgs.md),
  [13](art-13-inhouding-en-verrekening.rgs.md),
  [13a](art-13a-langere-arbeidsduur.rgs.md),
  [15](../h3-minimumvakantiebijslag/art-15-recht-op-vakantiebijslag.rgs.md) en
  [16](../h3-minimumvakantiebijslag/art-16-afwijking-en-aanvulling.rgs.md) wordt
  naar evenredigheid met een werkweek van 36 uren gerekend met inachtneming van
  een uitbetalingstermijn van een dag, een week of een maand.

**De bedragen in de wettekst zijn die van 2024, en dat is geen fout in de
bronvermelding.** Artikel 14 lid 11 zegt dat de krachtens artikel 14 herziene
bedragen "in de plaats treden van" de hier genoemde bedragen, dus verandert de
wettekst niet mee en staat wat vandaag geldt in een ministeriële regeling.
`wetten.overheid.nl` zet het actuele bedrag als redactionele noot naast de
wettekst, en dat is precies wat hierboven tussen blokhaken staat.

Daarom zijn deze twee bedragen in het model een **parameter** en geen getal in
een regel — zie
[`gegevens/parameters.rgs`](../gegevens/parameters.rgs) voor de volledige
overweging. De waarden per halfjaar staan in
[`tests/parameterwaarden.test.rgs`](../tests/parameterwaarden.test.rgs).

### Onderdeel c: naar evenredigheid met een werkweek van 36 uren

Sinds het uurloon van onderdeel a de norm is, doet dit onderdeel nog één ding:
het maakt het maandbedrag van onderdeel b naar evenredigheid herleidbaar voor
wie geen 36 uur werkt. De verhouding tussen de eigen arbeidsduur per week en de
normale werkweek is een getal zonder eenheid — uur gedeeld door uur — en dat
getal maal een bedrag is weer een bedrag.

```regelspraak
Regelgroep hoogte van het minimumloon

// Bron: [art. 8 lid 1 onder c](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=1&g=2026-07-01&z=2026-07-01)
Regel Maandloon naar evenredigheid van de werkweek
	geldig vanaf 01-01-2024
		Het maandloon naar evenredigheid van een Arbeidsverhouding moet berekend worden als (het referentiemaandloon maal de deeltijdfactor) rekenkundig afgerond op 2 decimalen.
		Daarbij geldt:
			de deeltijdfactor is zijn arbeidsduur per week gedeeld door de normale werkweek.
```

`geldig vanaf 01-01-2024` is de datum waarop de
[Wet invoering minimumuurloon](https://wetten.overheid.nl/jci1.3:c:BWBR0048404&z=2026-07-01&g=2026-07-01)
in werking trad en onderdeel a een uurloon werd. Het is de enige echte
regelversie in dit model: alle andere dateringen in deze wet zitten in de
bedragen en niet in de regels, en horen dus in een parameterset.

## Lid 2

Waar in deze wet wordt verwezen naar de in het vorige lid genoemde bedragen,
worden als zodanig, indien toepassing is gegeven aan
[artikel 14](art-14-herziening.rgs.md), de daarbij laatstelijk in hun plaats
gestelde bedragen aangemerkt.

*Dit lid is de rechtvaardiging van de parameter, in de wet zelf. Het levert geen
regel op omdat het de regel is die het model al volgt: er staat één bedrag in
het model, en dat is het laatstelijk vastgestelde.*

## Lid 3

In afwijking van het eerste lid bedraagt het minimumloon voor werknemers aan wie
het in artikel 7, eerste lid, bedoelde recht is toegekend bij een algemene
maatregel van bestuur als bedoeld in het derde lid van dat artikel, **een bij
die maatregel vast te stellen percentage** van de in het eerste lid van het
onderhavige artikel genoemde bedragen. Dit percentage kan voor naar leeftijd en
tak van bedrijf of beroep te onderscheiden categorieën van deze werknemers
verschillend zijn.

De maatregel is het
[Besluit minimumjeugdloon](https://wetten.overheid.nl/jci1.3:c:BWBR0003599&z=2026-07-01&g=2026-07-01),
en artikel 2 daarvan geeft de percentages:

> de 20-jarigen: 80 · de 19-jarigen: 60 · de 18-jarigen: 50 ·
> de 17-jarigen: 39½ · de 16-jarigen: 34½ · de 15-jarigen: 30.

En lid 2 van datzelfde artikel de afronding:

> Het uit de toepassing van het eerste lid voortvloeiende uurloon wordt afgerond
> op een veelvoud van € 0,01. Indien het restbedrag € 0,005 of meer bedraagt,
> geschiedt de afronding naar boven.

Zes percentages en een staffel op leeftijd: dat is een **beslistabel**. De rijen
lopen op, de eerste rij waarvan de voorwaarde klopt beslist, en de laatste rij
vangt met `n.v.t.` alles op wat 21 of ouder is — dat zijn de 100% van onderdeel
a, die het Besluit niet noemt omdat de wet hem zelf geeft.

```regelspraak
// Bron: [art. 2 Besluit minimumjeugdloon](jci1.3:c:BWBR0003599&artikel=2&g=2026-07-01&z=2026-07-01)
// Bron: [art. 8 lid 1 onder a](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 8 lid 3](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=3&g=2026-07-01&z=2026-07-01)
Beslistabel Minimumjeugdloonstaffel
	geldig vanaf 01-01-2024
		|   | het reguliere minimumuurloon van een Natuurlijke persoon moet gesteld worden op | indien zijn leeftijd kleiner is dan |
		| 1 | (30% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen      | 16 jaar                             |
		| 2 | (34,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen    | 17 jaar                             |
		| 3 | (39,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen    | 18 jaar                             |
		| 4 | (50% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen      | 19 jaar                             |
		| 5 | (60% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen      | 20 jaar                             |
		| 6 | (80% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen      | 21 jaar                             |
		| 7 | het wettelijk minimumuurloon                                                    | n.v.t.                              |
```

Drie dingen over deze tabel die het waard zijn te weten voordat je haar
aanpast.

De **haakjes zijn niet versiering**. `30% van X rekenkundig afgerond op 2
decimalen` leest de afronding *binnen* het argument van `30% van`, want een
prefixfunctie reikt zo ver als hij kan — dat is de duurste vergissing van deze
taal, omdat zij een plausibel getal oplevert en geen enkele melding.

De **cellen lezen alleen een parameter** en nooit een afgeleide waarde. Een
beslistabel splitst haar zin over de kopcel en de datacel, en het model houdt
alleen de verwijzingen van de *kop* vast — dus een tabel die in haar cel een
afgeleid attribuut leest vuurt vóórdat dat attribuut bestaat, schrijft `leeg`,
en meldt niets. `het wettelijk minimumuurloon` is invoer en dus veilig.

En de tabel rekent **ook voor wie nog geen recht heeft**: rij 1 geldt voor elke
leeftijd onder 16, dus ook voor een kind van 12. Dat is met opzet — `het
reguliere minimumuurloon` is de staffelwaarde en niet het minimumuurloon van de
persoon. Wie het recht heeft staat in
[artikel 7](art-07-recht-op-minimumloon.rgs.md), en de regel onderaan dit
notebook brengt de twee samen.

## Lid 4

Bij algemene maatregel van bestuur kan ten aanzien van de werknemer die werkzaam
is op basis van een arbeidsovereenkomst die is aangegaan in verband met een
beroepsbegeleidende leerweg als bedoeld in
[artikel 7.2.2 van de Wet educatie en beroepsonderwijs](https://wetten.overheid.nl/jci1.3:c:BWBR0007625&artikel=7.2.2&z=2026-07-01&g=2026-07-01)
een percentage van de in het eerste lid genoemde bedragen worden vastgesteld.
Dit percentage kan voor naar leeftijd te onderscheiden categorieën van deze
werknemers verschillend zijn.

Artikel 3 van het Besluit minimumjeugdloon, "in afwijking van artikel 2":

> de 20-jarigen: 61½ · de 19-jarigen: 52½ · de 18-jarigen: 45½ ·
> de 17-jarigen: 39½ · de 16-jarigen: 34½ · de 15-jarigen: 30.

Vanaf 18 lager dan de reguliere staffel, daaronder gelijk. Een tweede tabel dus,
en niet een kolom in de eerste: een beslistabel kan geen `indien` buiten haar
kolommen hebben, en een conditiekolom op een kenmerk heeft geen operator waar de
datacel een waarde bij kan leveren. Twee tabellen naar twee verschillende
attributen, en één regel die kiest — dat is dezelfde oplossing die de Besluit
zelf kiest met zijn "in afwijking van artikel 2".

```regelspraak
// Bron: [art. 3 Besluit minimumjeugdloon](jci1.3:c:BWBR0003599&artikel=3&g=2026-07-01&z=2026-07-01)
// Bron: [art. 8 lid 4](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=4&g=2026-07-01&z=2026-07-01)
Beslistabel Minimumjeugdloonstaffel voor de beroepsbegeleidende leerweg
	geldig vanaf 01-01-2024
		|   | het leerwegminimumuurloon van een Natuurlijke persoon moet gesteld worden op | indien zijn leeftijd kleiner is dan |
		| 1 | (30% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen   | 16 jaar                             |
		| 2 | (34,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen | 17 jaar                             |
		| 3 | (39,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen | 18 jaar                             |
		| 4 | (45,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen | 19 jaar                             |
		| 5 | (52,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen | 20 jaar                             |
		| 6 | (61,5% van het wettelijk minimumuurloon) rekenkundig afgerond op 2 decimalen | 21 jaar                             |
		| 7 | het wettelijk minimumuurloon                                                 | n.v.t.                              |
```

## De hoofdregel van dit artikel

Welke staffel geldt, en voor wie hij geldt. Twee regels, en de vorm is met opzet
*initialisatie plus uitzondering*: de eerste schrijft onvoorwaardelijk, de
tweede overschrijft alleen waar zij van toepassing is. Twee voorwaardelijke
gelijkstellingen naar hetzelfde attribuut zouden om dezelfde waarde vechten, en
welke wint hangt dan af van de afleidingsorde en niet van de wet.

```regelspraak
// Bron: [art. 8 lid 3](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=3&g=2026-07-01&z=2026-07-01)
Regel Staffel van de reguliere werknemer
	geldig vanaf 01-01-2024
		Het staffelminimumuurloon van een Natuurlijke persoon moet geïnitialiseerd worden op zijn reguliere minimumuurloon.

// Bron: [art. 8 lid 4](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=4&g=2026-07-01&z=2026-07-01)
Regel Staffel van de leerling in de beroepsbegeleidende leerweg
	geldig vanaf 01-01-2024
		Het staffelminimumuurloon van een Natuurlijke persoon moet gesteld worden op zijn leerwegminimumuurloon
		indien hij leerling in de beroepsbegeleidende leerweg is.
```

En dan het minimumuurloon zelf, dat alleen bestaat waar
[artikel 7](art-07-recht-op-minimumloon.rgs.md) een recht geeft:

```regelspraak
// Bron: [art. 7 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 8 lid 1 onder a](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=1&g=2026-07-01&z=2026-07-01)
Regel Minimumuurloon van de werknemer
	geldig vanaf 01-01-2024
		Het minimumuurloon van een Natuurlijke persoon moet geïnitialiseerd worden op zijn staffelminimumuurloon
		indien hij een recht op minimumloon heeft.
```

Wat een werkgever over een uitbetalingstermijn verschuldigd is, is dan
[artikel 5a](../h1-algemene-bepalingen/art-05a-arbeidsduur.rgs.md)'s arbeidsduur
maal dit uurloon:

```regelspraak
// Bron: [art. 7 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 8 lid 1 onder a](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=8&lid=1&g=2026-07-01&z=2026-07-01)
Regel Verschuldigd minimumloon over het uitbetalingstijdvak
	geldig vanaf 01-01-2024
		Het verschuldigde minimumloon van een Uitbetalingstijdvak moet berekend worden als (zijn arbeidsduur maal het minimumuurloon van zijn beloonde werknemer) rekenkundig afgerond op 2 decimalen
		indien het minimumuurloon van zijn beloonde werknemer gevuld is.
```

De eenheden lopen door de hele zin: `uur` maal `€/uur` is `€`, en een
uitbetalingstijdvak zonder minimumuurloon levert geen bedrag op in plaats van
een nul die er goed uitziet.

## Rekenvoorbeelden

De verwachtingen hieronder zijn **niet met de hand berekend**: ze staan zo in de
tabel die de Rijksoverheid publiceert. Wat het model doet is de percentages en
de afrondingsregel van het Besluit toepassen op de parameter van artikel 8 lid
1 onder a — en dat komt op de cent uit op de gepubliceerde bedragen. Dat is het
sterkste rekenvoorbeeld dat een model van een wet kan hebben: de uitkomst is
elders al eens langs een andere weg vastgesteld.

```testspraak
Testset Hoogte van het minimumloon
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie een werkgever en een betrekking
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
	Gegeven Bakkerij heeft Contract als aanstelling
```

### 21 jaar en ouder: het volle uurloon

```testspraak
Testgeval Een werknemer van 27 krijgt het volle minimumuurloon
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking

	Verwacht Noor met
		leeftijd        27 jaar
		minimumuurloon  14,99 EUR/uur
```

### 20 jaar: 80%

```testspraak
Testgeval Een werknemer van 20 krijgt tachtig procent
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Sanne) met
		geboortedatum  20-06-2006
		heeft een woonplaats binnen het Rijk
	Gegeven Sanne heeft Contract als betrekking

	Verwacht Sanne met
		leeftijd        20 jaar
		minimumuurloon  11,99 EUR/uur
```

### 18 jaar: 50%, en de halve cent naar boven

€ 14,99 maal 50% is € 7,495 — precies een halve cent. De afronding van artikel 2
lid 2 van het Besluit gaat dan naar boven, en dat maakt het verschil tussen
€ 7,49 en € 7,50.

```testspraak
Testgeval Een werknemer van 18 krijgt de helft, met de halve cent naar boven
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Milan) met
		geboortedatum  01-01-2008
		heeft een woonplaats binnen het Rijk
	Gegeven Milan heeft Contract als betrekking

	Verwacht Milan met
		leeftijd        18 jaar
		minimumuurloon  7,50 EUR/uur
```

### 17 jaar: 39½%

```testspraak
Testgeval Een werknemer van 17 krijgt negenendertigeneenhalf procent
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Jesse) met
		geboortedatum  01-01-2009
		heeft een woonplaats binnen het Rijk
	Gegeven Jesse heeft Contract als betrekking

	Verwacht Jesse met
		leeftijd        17 jaar
		minimumuurloon  5,92 EUR/uur
```

### 15 jaar: de ondergrens

```testspraak
Testgeval Een werknemer van 15 krijgt dertig procent
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Bram) met
		geboortedatum  01-01-2011
		heeft een woonplaats binnen het Rijk
	Gegeven Bram heeft Contract als betrekking

	Verwacht Bram met
		leeftijd        15 jaar
		minimumuurloon  4,50 EUR/uur
```

### De beroepsbegeleidende leerweg: 18 jaar, 45½% in plaats van 50%

Dezelfde persoon als hierboven bij 18, met één kenmerk erbij. Dit is het
randgeval van lid 4: als de tweede tabel niet zou vuren zou hier € 7,50 staan,
en dat is 68 cent per uur te veel.

```testspraak
Testgeval Een bbl-leerling van 18 krijgt de lagere staffel
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Milan) met
		geboortedatum  01-01-2008
		heeft een woonplaats binnen het Rijk
		is leerling in de beroepsbegeleidende leerweg
	Gegeven Milan heeft Contract als betrekking

	Verwacht Milan met
		reguliere minimumuurloon  7,50 EUR/uur
		leerwegminimumuurloon     6,82 EUR/uur
		staffelminimumuurloon     6,82 EUR/uur
		minimumuurloon            6,82 EUR/uur
	Verwacht regelversie Staffel van de leerling in de beroepsbegeleidende leerweg is gevuurd
```

### De beroepsbegeleidende leerweg onder de 18: gelijk aan de reguliere staffel

Van 15 tot en met 17 zijn de twee staffels hetzelfde. Dit geval zegt dat de
tweede tabel dan niets *verandert* — en niet dat hij niet vuurt.

```testspraak
Testgeval Een bbl-leerling van 17 krijgt hetzelfde als een reguliere werknemer
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Jesse) met
		geboortedatum  01-01-2009
		heeft een woonplaats binnen het Rijk
		is leerling in de beroepsbegeleidende leerweg
	Gegeven Jesse heeft Contract als betrekking

	Verwacht Jesse met
		reguliere minimumuurloon  5,92 EUR/uur
		leerwegminimumuurloon     5,92 EUR/uur
		minimumuurloon            5,92 EUR/uur
```

### De bbl-leerling van 21 valt terug op het volle uurloon

Artikel 3 van het Besluit noemt alleen 15 tot en met 20. De `n.v.t.`-rij vangt
de rest op.

```testspraak
Testgeval Een bbl-leerling van 21 krijgt het volle minimumuurloon
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Ilse) met
		geboortedatum  01-01-2005
		heeft een woonplaats binnen het Rijk
		is leerling in de beroepsbegeleidende leerweg
	Gegeven Ilse heeft Contract als betrekking

	Verwacht Ilse met
		leeftijd        21 jaar
		minimumuurloon  14,99 EUR/uur
```

### Het vorige halfjaar staat in `tests/`

De bedragen van 1 januari 2026 horen bij een andere parameterset, en een
testgeval mag de rekendatum overschrijven maar de parameterset niet — een
notebook is één testset en een testset noemt één set. De januaribedragen worden
daarom nagerekend in
[`tests/minimumjeugdloon-januari-2026.test.rgs`](../tests/minimumjeugdloon-januari-2026.test.rgs),
met dezelfde regels en dezelfde staffels.

Dat is geen omweg maar de vorm die de constructie oplegt, en zij is het waard:
`Minimumloonbedragen per 1 juli 2026` noemen in een testset die op 1 maart
rekent is **RS965**, en dat is de enige fout hier die niets anders in de editor
kan zien — elke naam bestaat, elk datatype past, de run is groen, en de bedragen
zijn een half jaar oud.

### Wat er over een maand verschuldigd is

152 uur maal € 14,99.

```testspraak
Testgeval Een volle maand bij het volle uurloon
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		arbeidsduur                152 uur
		verschuldigde minimumloon  2278,48 EUR
```

### En over een maand van een bbl-leerling van 18

Dezelfde uren, een ander uurloon: 152 maal € 6,82.

```testspraak
Testgeval Een volle maand bij de bbl-staffel van 18
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Milan) met
		geboortedatum  01-01-2008
		heeft een woonplaats binnen het Rijk
		is leerling in de beroepsbegeleidende leerweg
	Gegeven Milan heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
	Gegeven Milan heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  1036,64 EUR
```

### Geen recht, dus geen verschuldigd bedrag

Het randgeval waarin `het verschuldigde minimumloon` leeg blijft in plaats van
0 te worden — een tijdvak van iemand die de wet niet beschermt.

```testspraak
Testgeval Een kind van 14 levert geen verschuldigd minimumloon op
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Fenna) met
		geboortedatum  02-08-2012
		heeft een woonplaats binnen het Rijk
	Gegeven Fenna heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  40 uur
	Gegeven Fenna heeft Juli als tijdvak

	Verwacht Fenna met
		minimumuurloon  leeg
	Verwacht Juli met
		verschuldigde minimumloon  leeg
	Verwacht regelversie Verschuldigd minimumloon over het uitbetalingstijdvak is niet gevuurd
```

### Naar evenredigheid van de werkweek

Het maandbedrag van onderdeel b bij een arbeidsduur van 24 uur per week:
24 gedeeld door 36 maal € 2.337,00.

```testspraak
Testgeval Een deeltijdbetrekking van 24 uur per week
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Deeltijdcontract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  24 uur
	Gegeven Bakkerij heeft Deeltijdcontract als aanstelling

	Verwacht Deeltijdcontract met
		maandloon naar evenredigheid  1558,00 EUR
```

### En bij een volle werkweek is het het referentiemaandloon zelf

```testspraak
Testgeval Een volle werkweek levert het referentiemaandloon op
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Voltijdcontract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  36 uur
	Gegeven Bakkerij heeft Voltijdcontract als aanstelling

	Verwacht Voltijdcontract met
		maandloon naar evenredigheid  2337,00 EUR
```
