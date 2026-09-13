# Artikel 8 — Boete bij te late inlevering

Deze notebook is een *fixture* van de §4.1-spike, geen sample: het sample staat
in §4.9 en hoort in de werkmap. Hij is in de canonieke vorm van [N-1]
geschreven, want de suite slaat hem op en leest hem byte voor byte terug.

De boete rust op [artikel 8 van het reglement](bron/reglement.md#artikel-8-boete),
en waar een bepaling op de wet rust wordt zij zo aangehaald:
[artikel 13 Wsob](https://wetten.overheid.nl/jci1.3:c:BWBR0035878&artikel=13).

![Staffel](media/artikel-8-boete/staffel.png)

## Lid 1

Het lid dat een werk te laat inlevert, is een boete verschuldigd van het
boetetarief per dag dat het werk te laat is.

```regelspraak
Regelgroep boete bij te late inlevering

Regel bepaal boete
	geldig altijd
		De boete van een Uitlening moet berekend worden als de dagen te laat van de Uitlening maal het boetetarief.
```

## Lid 2

De boete bedraagt ten hoogste veertig euro.

```regelspraak
Regel begrens boete
	geldig altijd
		De boete van een Uitlening moet gesteld worden op 40 €
		indien de boete van de Uitlening groter is dan 40 €.
```

## Rekenvoorbeeld

Een uitlening die drie dagen te laat is, bij een boetetarief van 1 euro per dag.

```testspraak
Testset Boete bij te late inlevering
	Rekendatum 01-06-2027

	Testgeval 001
		Gegeven Uitlening U1 (Uitlening) met
			dagen te laat  3
		Verwacht U1 met
			boete  3,00 EUR
```
