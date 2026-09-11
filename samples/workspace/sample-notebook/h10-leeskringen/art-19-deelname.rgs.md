# Artikel 19. Deelname aan een leeskring

*Hoofdstuk 10 van het reglement van De Boekerij, geschreven in juridische modus:
de tekst en de regels staan in één document, in de volgorde die de tekst heeft, en
het rekenvoorbeeld staat onder de bepaling die het narekent.*

## Lid 1

Een lid kan deelnemen aan ten hoogste één leeskring. Het lid dat aan een leeskring
deelneemt, is leeskringlid. De leeskring draagt bij aan de functies die
[artikel 5 Wsob](https://wetten.overheid.nl/jci1.3:c:BWBR0035878&artikel=5) aan
een openbare bibliotheekvoorziening toekent.

```regelspraak
Regelgroep deelname aan een leeskring

Regel Leeskringlid
	geldig altijd
		Een Lid is leeskringlid
		indien hij een deelnemer is.
```

## Lid 2

Een lid dat op de peildatum jonger is dan achttien jaar, is jeugdlid.

```regelspraak
Regel bepaal de leeftijd
	geldig altijd
		De leeftijd van een Lid moet berekend worden als de tijdsduur van zijn geboortedatum tot de Rekendatum in hele jaren.

Regel Jeugdlid
	geldig altijd
		Een Lid is jeugdlid
		indien zijn leeftijd kleiner is dan 18 jaar.
```

## Rekenvoorbeelden

De kop van de testset staat in een cel van zichzelf; elk rekenvoorbeeld daarna
krijgt er één. Je voert het rekenvoorbeeld uit, niet de regel -- de knop staat op
deze cellen en op geen enkele andere.

```testspraak
Testset Deelname aan een leeskring
Rekendatum 01-06-2027
```

### Een jong lid dat deelneemt

```testspraak
Testgeval Noor is jeugdlid en leeskringlid
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Noor) met
		geboortedatum  14-09-2011
	Gegeven Donderdagkring heeft Noor als deelnemer

	Verwacht Noor met
		leeftijd  15 jaar
		is jeugdlid
		is leeskringlid
```

### Een volwassen lid dat deelneemt

```testspraak
Testgeval Sam is geen jeugdlid
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Sam) met
		geboortedatum  02-02-1984
	Gegeven Donderdagkring heeft Sam als deelnemer

	Verwacht Sam met
		leeftijd  43 jaar
		is geen jeugdlid
		is leeskringlid
```
