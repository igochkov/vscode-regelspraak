# Artikel 18. Vakantiebonnen en betaling aan een fonds

## Lid 1

Indien hierin bij publiekrechtelijke regeling of collectieve arbeidsovereenkomst
is voorzien, kan de werkgever aan zijn verplichtingen tegenover de werknemer
betreffende de vakantiebijslag voldoen hetzij door aan de werknemer
**vakantiebonnen** over te dragen ten laste van een fonds, hetzij door betaling
van de vakantiebijslag **aan een fonds** ten laste waarvan de werknemer het recht
op vakantiebijslag verwerft, **mits het bedrag, waarop de werknemer door deze
overdracht onderscheidenlijk deze betaling, op dat fonds recht verwerft, niet
lager ligt dan het bedrag, waarop de werknemer krachtens de
[artikelen 15](art-15-recht-op-vakantiebijslag.rgs.md) en
[16](art-16-afwijking-en-aanvulling.rgs.md) recht heeft**.

Dit lid laat een andere manier van betalen toe en stelt er één grens aan. Die
grens is een consistentieregel: het bedrag dat via het fonds wordt verworven mag
niet lager zijn dan wat hoofdstuk III geeft.

```regelspraak
Regelgroep vakantiebonnen

// Bron: [art. 18 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=18&lid=1&g=2026-07-01&z=2026-07-01)
Regel Fondsbedrag dekt het recht uit hoofdstuk III
	geldig altijd
		Het fondsbedrag van een Vakantiejaar moet groter of gelijk zijn aan zijn verschuldigde vakantiebijslag
		indien hij via het fonds voldaan is.
```

De regel heet `Fondsbedrag dekt het recht …` en niet `… ten minste gelijk aan het
recht …`, want `ten minste` is één sleutelwoord van de taal en een verwijzing
naar een regelnaam leest alleen gewone naamwoorden.

De voorwaarde is er omdat het lid een **mogelijkheid** biedt en geen
verplichting: waar niet via een fonds is betaald toetst deze regel niets, en dan
geldt gewoon [artikel 17](art-17-tijdstip-van-uitbetaling.rgs.md).

## Lid 2

Een fonds als bedoeld in het eerste lid dient te zijn ingericht overeenkomstig de
voorwaarden, gesteld krachtens
[artikel 631, derde lid, onder c, van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=631&z=2026-07-01&g=2026-07-01).

*Een eis aan de inrichting van een fonds, gesteld in een andere wet. Dat een
fonds daaraan voldoet is in dit model onderdeel van `is via het fonds voldaan`:
een fonds dat niet zo is ingericht is geen fonds in de zin van lid 1, en dan
heeft de werkgever niet aan zijn verplichting voldaan.*

## Rekenvoorbeelden

```testspraak
Testset Vakantiebonnen
Rekendatum 01-06-2026
Parameterset Minimumloonbedragen per 1 januari 2026

Testinitialisatie een werknemer van 27 die drie maanden op het minimumloon werkte
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
	Gegeven een Uitbetalingstijdvak (Maart) met
		begindatum             01-03-2026
		einddatum              31-03-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2235,92 EUR
	Gegeven een Uitbetalingstijdvak (April) met
		begindatum             01-04-2026
		einddatum              30-04-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2235,92 EUR
	Gegeven een Uitbetalingstijdvak (Mei) met
		begindatum             01-05-2026
		einddatum              31-05-2026
		verrichte arbeidstijd  152 uur
		geldelijke inkomsten   2235,92 EUR
	Gegeven Noor heeft Maart, April, Mei als tijdvak
```

Het recht uit hoofdstuk III is hier € 536,62 — het geval waarin
[artikel 15 en 16](art-16-afwijking-en-aanvulling.rgs.md) op hetzelfde bedrag
uitkomen.

### Een fonds dat genoeg geeft

```testspraak
Testgeval Een fondsbedrag boven het recht is toegestaan
	Gegeven testinitialisatie een werknemer van 27 die drie maanden op het minimumloon werkte
	Gegeven een Vakantiejaar (Bijslag via fonds) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
		fondsbedrag                        600,00 EUR
		is via het fonds voldaan
	Gegeven Noor heeft Bijslag via fonds als bijslagjaar
	Gegeven Bijslag via fonds heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht Bijslag via fonds met
		verschuldigde vakantiebijslag  536,62 EUR
	Verwacht regelversie Fondsbedrag dekt het recht uit hoofdstuk III is gevuurd
```

### Precies genoeg

Het randgeval van `groter of gelijk`.

```testspraak
Testgeval Een fondsbedrag gelijk aan het recht is toegestaan
	Gegeven testinitialisatie een werknemer van 27 die drie maanden op het minimumloon werkte
	Gegeven een Vakantiejaar (Bijslag via fonds) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
		fondsbedrag                        536,62 EUR
		is via het fonds voldaan
	Gegeven Noor heeft Bijslag via fonds als bijslagjaar
	Gegeven Bijslag via fonds heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht regelversie Fondsbedrag dekt het recht uit hoofdstuk III is gevuurd
```

### Eén cent te weinig

```testspraak
Testgeval Eén cent te weinig in het fonds maakt het model inconsistent
	Gegeven testinitialisatie een werknemer van 27 die drie maanden op het minimumloon werkte
	Gegeven een Vakantiejaar (Bijslag via fonds) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
		fondsbedrag                        536,61 EUR
		is via het fonds voldaan
	Gegeven Noor heeft Bijslag via fonds als bijslagjaar
	Gegeven Bijslag via fonds heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht regelversie Fondsbedrag dekt het recht uit hoofdstuk III is inconsistent
```

### Zonder fonds toetst de regel niets

Hetzelfde ontbrekende bedrag, maar er is niet via een fonds betaald. Dan is dit
artikel niet van toepassing en zegt de regel niets — wat niet betekent dat er
niets aan de hand is: dan geldt artikel 17, en of er op tijd is betaald is iets
dat dit model niet weet.

```testspraak
Testgeval Zonder fonds is artikel 18 niet van toepassing
	Gegeven testinitialisatie een werknemer van 27 die drie maanden op het minimumloon werkte
	Gegeven een Vakantiejaar (Bijslag zonder fonds) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  3
	Gegeven Noor heeft Bijslag zonder fonds als bijslagjaar
	Gegeven Bijslag zonder fonds heeft Maart, April, Mei als meetellende tijdvakken

	Verwacht regelversie Fondsbedrag dekt het recht uit hoofdstuk III is niet gevuurd
```
