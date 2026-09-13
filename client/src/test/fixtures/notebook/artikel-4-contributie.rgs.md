# Artikel 4 — Contributie

Fixture van de §4.4-gate. Hij staat **op zichzelf**: het bestand ligt buiten elke
werkmap en dus in een scope van één ([N-10]), zodat wat hier gebeurt niets zegt
over hoe `samples/` toevallig is geschreven. Hij is in de canonieke vorm van
[N-1] geschreven, want de suite slaat hem op en leest hem byte voor byte terug.

## Lid 1

De proeflezer betaalt een contributie van dertig euro.

```regelspraak
Regelgroep contributie van een proeflezer

Domein Proefbedrag is van het type Numeriek (getal met 2 decimalen) met eenheid €

Objecttype de Proeflezer (mv: Proeflezers)
	de contributie  Proefbedrag;

Regel bepaal de contributie
	geldig altijd
		De contributie van een Proeflezer moet gesteld worden op 30 €.
```

## Lid 2

Een bepaling die naar iets verwijst dat dit notebook niet kent — met opzet, want
de gate wil zien dat een diagnose in de cel terechtkomt waar zij thuishoort.

```regelspraak
Regel bepaal de onbekende contributie
	geldig altijd
		De contributie van een Boekenkabouter moet gesteld worden op 1 €.
```

## Rekenvoorbeeld

Je voert het rekenvoorbeeld uit, niet de regel.

```testspraak
Testset Contributie van een proeflezer
Rekendatum 01-06-2027

Testgeval 001
	Gegeven een Proeflezer (P1)

	Verwacht P1 met
		contributie  30,00 EUR
```
