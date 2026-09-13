# Artikel 13. Inhouding op en verrekening met het minimumloon

## Lid 1

Het minimumloon is niet vatbaar voor inhouding of verrekening door de werkgever
met overeenkomstige toepassing van
[artikel 631](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=631&z=2026-07-01&g=2026-07-01)
onderscheidenlijk
[artikel 632, met uitzondering van het tweede lid, tweede zin, van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=632&z=2026-07-01&g=2026-07-01).

**"Het minimumloon" en niet "het loon".** Dat is het hele artikel: wat een
werkgever boven het minimumloon betaalt mag hij inhouden of verrekenen, en wat
daaronder zit niet. Dus is er een bedrag dat vrij is, en dat is het loon min het
verschuldigde minimumloon.

```regelspraak
Regelgroep inhouding en verrekening

// Bron: [art. 13 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13&lid=1&g=2026-07-01&z=2026-07-01)
Regel Vrije loonruimte boven het minimumloon
	geldig altijd
		De vrije loonruimte van een Uitbetalingstijdvak moet berekend worden als zijn loon verminderd met zijn verschuldigde minimumloon, met een minimum van 0,00 €.

// Bron: [art. 13 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13&lid=1&g=2026-07-01&z=2026-07-01)
Regel Toegestane inhouding zonder volmacht
	geldig altijd
		De toegestane inhouding van een Uitbetalingstijdvak moet geïnitialiseerd worden op zijn vrije loonruimte.
```

De begrenzing `met een minimum van 0,00 €` is er omdat een tijdvak waarin te
weinig is betaald een negatieve loonruimte zou opleveren, en dat is geen ruimte
maar een onderbetaling — die staat in
[artikel 18b](../h4-toezicht/p2-bestuurlijke-boete/art-18b-overtredingen.rgs.md).
Twee dingen in één getal stoppen maakt beide onleesbaar.

## Lid 2

In afwijking van het eerste lid **is inhouding toegestaan**, met overeenkomstige
toepassing van
[artikel 631, derde lid, van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=631&z=2026-07-01&g=2026-07-01).
Bij of krachtens algemene maatregel van bestuur kunnen betalingsverplichtingen
van de werknemer worden aangewezen ten aanzien waarvan hij bevoegd is om
**schriftelijke volmacht** te verlenen aan de werkgever om uit het uit te betalen
loon betalingen in zijn naam te verrichten. […]

```regelspraak
// Bron: [art. 13 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13&lid=2&g=2026-07-01&z=2026-07-01)
Regel Inhouding krachtens schriftelijke volmacht
	geldig altijd
		De toegestane inhouding van een Uitbetalingstijdvak moet gesteld worden op zijn loon
		indien hij een volmacht voor de inhouding heeft.
```

*Welke betalingsverplichtingen krachtens lid 2 kunnen worden aangewezen staat in
een algemene maatregel van bestuur, en dat het om een aangewezen verplichting
gaat is in dit model onderdeel van de volmacht: een volmacht voor iets dat niet
is aangewezen is geen volmacht in de zin van dit lid.*

## Lid 3

In afwijking van het eerste lid zijn **voorschotten** op het minimumloon,
overeenkomstig [artikel 7a](art-07a-girale-betaling.rgs.md) aan de werknemer
verstrekt, vatbaar voor verrekening met het minimumloon, mits dit vooraf
schriftelijk met de werknemer is overeengekomen.

Dit lid werkt anders dan lid 2: het verruimt niet wat er ingehouden mág worden
maar haalt een bedrag uit de vergelijking. Een verrekend voorschot is geld dat de
werknemer al heeft gehad, dus telt het niet mee in wat er te veel is ingehouden.

## De norm van dit artikel

```regelspraak
// Bron: [art. 13 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 13 lid 3](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=13&lid=3&g=2026-07-01&z=2026-07-01)
Regel Inhouding blijft binnen het toegestane
	geldig altijd
		De inhouding op het loon van een Uitbetalingstijdvak verminderd met zijn verrekende voorschot moet kleiner of gelijk zijn aan zijn toegestane inhouding.
```

Eén consistentieregel, met de drie leden erin: het verminderde voorschot is lid
3, het toegestane bedrag is lid 1 of lid 2, en de vergelijking zelf is de norm.
Dat `verminderd met` een lege rechteroperand als 0 leest is hier precies goed —
een tijdvak zonder voorschot noemt het niet, en dan is er niets af te trekken.

## Rekenvoorbeelden

```testspraak
Testset Inhouding en verrekening
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie een werknemer van 27 in een volle maand
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
```

### Inhouding binnen de vrije ruimte

Het loon is € 2.500,00 en het verschuldigde minimumloon € 2.278,48, dus is
€ 221,52 vrij. Een inhouding van € 200,00 blijft daaronder.

```testspraak
Testgeval Een inhouding binnen de vrije ruimte is toegestaan
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2500,00 EUR
		giraal voldane loon    2300,00 EUR
		inhouding op het loon  200,00 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  2278,48 EUR
		vrije loonruimte           221,52 EUR
		toegestane inhouding       221,52 EUR
	Verwacht regelversie Inhouding blijft binnen het toegestane is gevuurd
```

### Eén cent te veel ingehouden

Het randgeval van `kleiner of gelijk`: € 221,53 waar € 221,52 vrij is.

```testspraak
Testgeval Eén cent te veel inhouden maakt het model inconsistent
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2500,00 EUR
		giraal voldane loon    2278,47 EUR
		inhouding op het loon  221,53 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht regelversie Inhouding blijft binnen het toegestane is inconsistent
```

### Met schriftelijke volmacht mag het hele loon

Lid 2. Dezelfde inhouding als hierboven, met een volmacht erbij.

```testspraak
Testgeval Met volmacht is een grotere inhouding toegestaan
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2500,00 EUR
		giraal voldane loon    2278,47 EUR
		inhouding op het loon  221,53 EUR
		heeft een volmacht voor de inhouding
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		toegestane inhouding  2500,00 EUR
	Verwacht regelversie Inhouding krachtens schriftelijke volmacht is gevuurd
	Verwacht regelversie Inhouding blijft binnen het toegestane is gevuurd
```

### Een verrekend voorschot telt niet mee

Lid 3. Er is € 500,00 verrekend, waarvan € 400,00 een eerder verstrekt
voorschot. Wat overblijft is € 100,00, en dat past binnen de vrije ruimte.

```testspraak
Testgeval Een verrekend voorschot valt buiten de toets
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2500,00 EUR
		giraal voldane loon    2000,00 EUR
		inhouding op het loon  500,00 EUR
		verrekende voorschot   400,00 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht regelversie Inhouding blijft binnen het toegestane is gevuurd
```

### Zonder voorschot is dezelfde inhouding te veel

Hetzelfde geval zonder het voorschot. Dit is het paar dat zegt dat lid 3 iets
doet — zonder die ene regel is € 500,00 te veel.

```testspraak
Testgeval Zonder voorschot is vijfhonderd euro te veel
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2500,00 EUR
		giraal voldane loon    2000,00 EUR
		inhouding op het loon  500,00 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht regelversie Inhouding blijft binnen het toegestane is inconsistent
```

### Bij onderbetaling is er geen vrije ruimte

Het loon ligt onder het minimumloon, dus is de vrije loonruimte 0 en niet
negatief — en dan mag er niets worden ingehouden.

```testspraak
Testgeval Onder het minimumloon is er geen vrije loonruimte
	Gegeven testinitialisatie een werknemer van 27 in een volle maand
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2000,00 EUR
		giraal voldane loon    1990,00 EUR
		inhouding op het loon  10,00 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		vrije loonruimte      0,00 EUR
		toegestane inhouding  0,00 EUR
	Verwacht regelversie Inhouding blijft binnen het toegestane is inconsistent
```
