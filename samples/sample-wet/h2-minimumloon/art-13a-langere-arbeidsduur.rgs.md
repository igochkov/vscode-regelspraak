# Artikel 13a. Langere arbeidsduur dan overeengekomen

*Het artikel over meeruren: wat er gebeurt als er méér is gewerkt dan
afgesproken.*

## Lid 5

Indien de arbeidsduur niet eenduidig schriftelijk is overeengekomen in de
overeenkomst wordt voor de toepassing van het eerste en tweede lid, uitgegaan
van de **maximale** overeengekomen arbeidsduur.

Dit lid staat hier eerst omdat de rest van het artikel het nodig heeft: je kunt
niet weten of er meer is gewerkt dan overeengekomen zonder te weten wat er is
overeengekomen. En het is opnieuw *initialisatie plus uitzondering*, deze keer
met de uitzondering als het gewone geval — de wet noemt de maximale arbeidsduur
als terugvaloptie en de schriftelijke als de norm.

```regelspraak
Regelgroep langere arbeidsduur

// Bron: [art. 13a lid 5](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13a&lid=5&g=2026-07-01&z=2026-07-01)
Regel Arbeidsduur bij ontbrekende schriftelijke afspraak
	geldig altijd
		De arbeidsduur per week van een Arbeidsverhouding moet geïnitialiseerd worden op zijn maximale arbeidsduur per week.

// Bron: [art. 13a lid 5](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13a&lid=5&g=2026-07-01&z=2026-07-01)
Regel Schriftelijk overeengekomen arbeidsduur
	geldig altijd
		De arbeidsduur per week van een Arbeidsverhouding moet gesteld worden op zijn schriftelijke arbeidsduur per week
		indien hij schriftelijk overeengekomen is.
```

## Lid 1

Indien de feitelijke arbeidsduur van de werknemer binnen een uitbetalingstermijn
langer is dan de overeengekomen arbeidsduur wordt deze **langere arbeidsduur
uitbetaald uiterlijk in de eerstvolgende uitbetalingstermijn** na de
uitbetalingstermijn waarin deze is ontstaan.

```regelspraak
// Bron: [art. 13a lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13a&lid=1&g=2026-07-01&z=2026-07-01)
Regel Langere arbeidsduur binnen een uitbetalingstermijn
	geldig altijd
		De langere arbeidsduur van een Uitbetalingstijdvak moet berekend worden als zijn arbeidsduur verminderd met zijn overeengekomen arbeidsduur, met een minimum van 0 uur.
```

De begrenzing op 0 is wat "langer dan" betekent: wie minder heeft gewerkt dan
overeengekomen heeft geen negatieve meeruren maar geen meeruren.

## Lid 2

In geval van een langere arbeidsduur als bedoeld in het eerste lid, kan de
werkgever, in afwijking van het eerste lid, een langere arbeidsduur niet of
gedeeltelijk uitbetalen, maar geheel of gedeeltelijk **compenseren in betaalde
vrije tijd** conform het minimumloon binnen de overeengekomen arbeidsduur, indien
dit met de werknemer schriftelijk is overeengekomen voordat een langere
arbeidsduur wordt aangevangen.

## Lid 3

Een gehele of gedeeltelijke compensatie in betaalde vrije tijd als bedoeld in het
tweede lid **kan alleen worden overeengekomen en opgebouwd voor zover in deze
mogelijkheid is voorzien in de collectieve arbeidsovereenkomst**. Indien het een
werknemer betreft die aan een derde ter beschikking wordt gesteld […] alleen
indien in deze mogelijkheid is voorzien in de collectieve arbeidsovereenkomst die
van toepassing is op die derde.

*Lid 2 en lid 3 stellen voorwaarden aan de compensatie en niet aan de rekensom.
Óf er mocht worden gecompenseerd staat in een cao — een document dat dit model
niet kent — en hoeveel er is gecompenseerd is invoer.*

## Lid 4

De langere arbeidsduur, bedoeld in het tweede lid, wordt **uiterlijk voor 1 juli
van het jaar na het kalenderjaar waarin deze is ontstaan**, in betaalde vrije
tijd gecompenseerd dan wel uiterlijk in de eerste uitbetalingstermijn na juni
van dat jaar giraal uitbetaald. Indien de compensatie in tijd of in geld niet of
niet volledig heeft plaatsgevonden bij het einde van de dienstbetrekking wordt de
langere arbeidstijd dienovereenkomstig giraal uitbetaald. De uitbetaling vindt
plaats overeenkomstig het bedrag, genoemd in
[artikel 8, eerste lid, onder a](art-08-hoogte-van-het-minimumloon.rgs.md), dat
geldt in de termijn waarin de uitbetaling plaatsvindt.

Twee dingen zijn hier rekenbaar: de **uiterste datum**, en wat er ná compensatie
en uitbetaling nog openstaat.

```regelspraak
// Bron: [art. 13a lid 4](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13a&lid=4&g=2026-07-01&z=2026-07-01)
Regel Uiterste datum voor compensatie van langere arbeidsduur
	geldig altijd
		De compensatiedeadline van een Uitbetalingstijdvak moet berekend worden als de datum met jaar: het volgende jaartal, maand: 6 en dag: 30.
		Daarbij geldt:
			het volgende jaartal is (het jaar uit zijn einddatum) plus 1.

// Bron: [art. 13a lid 4](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13a&lid=4&g=2026-07-01&z=2026-07-01)
// Bron: [art. 18b lid 1 onder e](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18b&lid=1&g=2026-07-01&z=2026-07-01)
Regel Openstaande langere arbeidsduur
	geldig altijd
		De openstaande langere arbeidsduur van een Uitbetalingstijdvak moet berekend worden als zijn langere arbeidsduur verminderd met zijn gecompenseerde vrije tijd verminderd met zijn uitbetaalde langere arbeidsduur, met een minimum van 0 uur.
```

De haakjes in `(het jaar uit zijn einddatum) plus 1` zijn **verplicht**. `het jaar
uit` is een prefixfunctie en die reikt zo ver als hij kan, dus zonder haakjes
leest de zin als `het jaar uit (zijn einddatum plus 1)` — een datum plus één, en
dan het jaar daarvan. Dat levert een getal op dat er goed uitziet en in 364 van
de 365 gevallen ook goed *is*, en op 31 december fout. Dat is de duurste
vergissing van deze taal: een plausibel getal en geen enkele melding.

De datum is 30 juni en niet 1 juli, want de wet zegt "uiterlijk **voor** 1 juli".

## Rekenvoorbeelden

```testspraak
Testset Langere arbeidsduur
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  36 uur
		maximale arbeidsduur per week       40 uur
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Bakkerij heeft Contract als aanstelling
	Gegeven Noor heeft Contract als betrekking
```

### De schriftelijke afspraak gaat voor de maximale

```testspraak
Testgeval Een schriftelijke arbeidsduur gaat voor de maximale
	Gegeven testinitialisatie een werkgever en een werknemer van 27

	Verwacht Contract met
		arbeidsduur per week  36 uur
	Verwacht regelversie Schriftelijk overeengekomen arbeidsduur is gevuurd
```

### Zonder schriftelijke afspraak geldt de maximale

Lid 5 zelf. Alles gelijk, behalve dat er niets schriftelijk is overeengekomen —
en dan is de overeengekomen arbeidsduur 40 in plaats van 36 uur.

```testspraak
Testgeval Zonder schriftelijke afspraak geldt de maximale arbeidsduur
	Gegeven een Arbeidsverhouding (Mondeling contract) met
		aanvangsdatum                  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
		maximale arbeidsduur per week  40 uur

	Verwacht Mondeling contract met
		arbeidsduur per week  40 uur
	Verwacht regelversie Schriftelijk overeengekomen arbeidsduur is niet gevuurd
```

### Meeruren

156 uur gewerkt waar 152 is overeengekomen: vier meeruren.

```testspraak
Testgeval Vier uur meer dan overeengekomen
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum                  01-07-2026
		einddatum                   31-07-2026
		verrichte arbeidstijd       156 uur
		overeengekomen arbeidsduur  152 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		arbeidsduur                      156 uur
		langere arbeidsduur              4 uur
		openstaande langere arbeidsduur  4 uur
		compensatiedeadline              30-06-2027
```

### Minder gewerkt dan overeengekomen

Het randgeval van de begrenzing op 0: 148 uur waar 152 is overeengekomen levert
geen negatieve meeruren op.

```testspraak
Testgeval Minder werken levert geen negatieve meeruren op
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum                  01-07-2026
		einddatum                   31-07-2026
		verrichte arbeidstijd       148 uur
		overeengekomen arbeidsduur  152 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		langere arbeidsduur  0 uur
```

### Meeruren deels gecompenseerd en deels uitbetaald

Acht meeruren, waarvan vijf in vrije tijd gecompenseerd en twee uitbetaald: er
staat één uur open, en dát is de overtreding van
[artikel 18b lid 1 onder e](../h4-toezicht/p2-bestuurlijke-boete/art-18b-overtredingen.rgs.md).

```testspraak
Testgeval Eén uur blijft openstaan
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum                       01-07-2026
		einddatum                        31-07-2026
		verrichte arbeidstijd            160 uur
		overeengekomen arbeidsduur       152 uur
		gecompenseerde vrije tijd        5 uur
		uitbetaalde langere arbeidsduur  2 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		langere arbeidsduur              8 uur
		openstaande langere arbeidsduur  1 uur
```

### Alles gecompenseerd

```testspraak
Testgeval Volledig gecompenseerd laat niets openstaan
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum                  01-07-2026
		einddatum                   31-07-2026
		verrichte arbeidstijd       160 uur
		overeengekomen arbeidsduur  152 uur
		gecompenseerde vrije tijd   8 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		openstaande langere arbeidsduur  0 uur
```

### De deadline van een tijdvak in december

Het randgeval van lid 4, en van de haakjes: meeruren die in december 2026
ontstaan moeten voor 1 juli **2027** zijn vereffend. Wie `het jaar uit (zijn
einddatum plus 1)` schrijft in plaats van `(het jaar uit zijn einddatum) plus 1`
komt hier op 2027 uit omdat 31 december plus één dag in 2027 valt — en in elke
andere maand op het verkeerde jaar.

```testspraak
Testgeval Meeruren uit december moeten voor 1 juli van het jaar erna zijn vereffend
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (December) met
		begindatum                  01-12-2026
		einddatum                   31-12-2026
		verrichte arbeidstijd       160 uur
		overeengekomen arbeidsduur  152 uur
	Gegeven Noor heeft December als tijdvak

	Verwacht December met
		compensatiedeadline  30-06-2027
```

### En van een tijdvak in januari

Hetzelfde jaar, de andere kant. Hier zou de verkeerde haakjesplaatsing 2026
opleveren in plaats van 2027 — dus is dit het geval dat de fout zichtbaar maakt.

```testspraak
Testgeval Meeruren uit januari hebben dezelfde deadline
	Gegeven testinitialisatie een werkgever en een werknemer van 27
	Gegeven een Uitbetalingstijdvak (Januari) met
		begindatum                  01-01-2026
		einddatum                   31-01-2026
		verrichte arbeidstijd       160 uur
		overeengekomen arbeidsduur  152 uur
	Gegeven Noor heeft Januari als tijdvak

	Verwacht Januari met
		compensatiedeadline  30-06-2027
```
