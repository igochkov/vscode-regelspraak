# Artikel 7a. Girale betaling van het minimumloon

## Lid 1

In afwijking van
[artikel 620 van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=620&z=2026-07-01&g=2026-07-01)
geschiedt de voldoening van het verschuldigde minimumloon door girale betaling
overeenkomstig
[artikel 114 van Boek 6 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005289&boek=6&artikel=114&z=2026-07-01&g=2026-07-01).

## Lid 2

Het eerste lid is niet van toepassing op de werknemer die doorgaans op minder
dan vier dagen per week uitsluitend of nagenoeg uitsluitend diensten verricht
ten behoeve van het huishouden van de natuurlijke persoon tot wie hij in
dienstbetrekking staat.

## Dit is een consistentieregel en geen rekenregel

Artikel 7a rekent niets uit: het zegt dat iets **moet**. Daarvoor heeft
RegelSpraak een eigen soort resultaatdeel — de consistentieregel — die niets
schrijft en het model inconsistent verklaart als zij niet klopt. Een testgeval
toetst haar met `Verwacht regelversie … is inconsistent`, en dat is de enige
manier waarop zo'n regel te testen is.

```regelspraak
Regelgroep girale betaling

// Bron: [art. 7a lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7a&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 7a lid 2](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7a&lid=2&g=2026-07-01&z=2026-07-01)
Regel Girale voldoening van het verschuldigde minimumloon
	geldig altijd
		Het giraal voldane loon van een Uitbetalingstijdvak moet groter of gelijk zijn aan zijn verschuldigde minimumloon
		indien hij aan alle volgende voorwaarden voldoet:
			• zijn verschuldigde minimumloon is gevuld
			• zijn beloonde werknemer heeft geen huishoudelijke dienstverlening.
```

Twee dingen over de voorwaarde.

Het eerste criterium is er omdat een tijdvak van iemand zonder recht op
minimumloon geen verschuldigd bedrag heeft, en `leeg` vergelijken met een bedrag
zegt niets. Dit is de regel die het hele model draagt: **geen type, geen
melding** — waar het model iets niet weet doet het geen uitspraak, want een
onjuiste melding over een goede zin kost meer vertrouwen dan een gemiste melding
waarde oplevert.

Het tweede is lid 2. Het staat als `zijn beloonde werknemer heeft geen
huishoudelijke dienstverlening` en niet als `… is geen huishoudelijke
dienstbetrekking`, en dat is geen stijl: `is` is sinds [D-55] een naamwoord, dus
slikt de gulzige naamlezing achter een ketting de hele staart op en vraagt het
model naar een kenmerk dat niemand heeft gedeclareerd. `heeft` is geen naamwoord
en breekt de naam wél. De volle reden staat in
[`gegevens/werkgever.rgs`](../gegevens/werkgever.rgs).

## Rekenvoorbeelden

```testspraak
Testset Girale betaling
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

### Giraal en genoeg

152 uur maal € 14,99 is € 2.278,48, en dat is wat er op de rekening stond.

```testspraak
Testgeval Het volle bedrag giraal voldaan is consistent
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		giraal voldane loon    2278,48 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  2278,48 EUR
	Verwacht regelversie Girale voldoening van het verschuldigde minimumloon is gevuurd
```

### Giraal, maar niet genoeg

Eén cent te weinig. Dit is het randgeval van `groter of gelijk`.

```testspraak
Testgeval Eén cent te weinig maakt het model inconsistent
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
		giraal voldane loon    2278,47 EUR
	Gegeven Noor heeft Juli als tijdvak

	Verwacht regelversie Girale voldoening van het verschuldigde minimumloon is inconsistent
```

### Niets giraal voldaan

Contant betaald, of helemaal niet. Een leeg `giraal voldane loon` is geen nul die
er goed uitziet: de vergelijking klopt niet en het model zegt het.

```testspraak
Testgeval Contant betalen maakt het model inconsistent
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

	Verwacht regelversie Girale voldoening van het verschuldigde minimumloon is inconsistent
```

### De uitzondering van lid 2

Dezelfde situatie als het geval erboven, met één kenmerk erbij. De huishoudelijke
hulp die op minder dan vier dagen per week werkt mag contant worden betaald, en
dan zegt het model niets.

```testspraak
Testgeval De huishoudelijke hulp van lid 2 mag contant worden betaald
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Ans) met
		geboortedatum  03-03-1970
		heeft een woonplaats binnen het Rijk
		heeft een huishoudelijke dienstverlening
	Gegeven Ans heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  40 uur
	Gegeven Ans heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  599,60 EUR
	Verwacht regelversie Girale voldoening van het verschuldigde minimumloon is niet gevuurd
```

### Geen recht op minimumloon, dus niets te toetsen

Het eerste criterium van de voorwaarde, alleen. Er is niets betaald en toch is
het model consistent — want er is ook niets verschuldigd.

```testspraak
Testgeval Zonder verschuldigd bedrag toetst de regel niets
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Fenna) met
		geboortedatum  02-08-2012
		heeft een woonplaats binnen het Rijk
	Gegeven Fenna heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  20 uur
	Gegeven Fenna heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  leeg
	Verwacht regelversie Girale voldoening van het verschuldigde minimumloon is niet gevuurd
```
