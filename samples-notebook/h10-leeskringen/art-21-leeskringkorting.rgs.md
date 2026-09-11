# Artikel 21. Leeskringkorting

## Lid 1

Het leeskringlid ontvangt een korting op de contributie van het volgende jaar.
De korting bedraagt de basiskorting bij ten hoogste één gemiste bijeenkomst, de
helft daarvan bij ten hoogste drie, en niets daarboven.

```regelspraak
Regelgroep leeskringkorting

Beslistabel Kortingsstaffel
	geldig vanaf 2027
		|   | de leeskringkorting van een Lid moet gesteld worden op | indien zijn aantal gemiste bijeenkomsten kleiner is dan |
		| 1 | de basiskorting                                        | 2                                                       |
		| 2 | de basiskorting gedeeld door 2                         | 4                                                       |
		| 3 | 0,00 €                                                 | n.v.t.                                                  |
```

## Lid 2

Aan een jeugdlid wordt de korting dubbel uitgekeerd.

```regelspraak
Regel Initialiseer de kortingsuitkering
	geldig altijd
		De kortingsuitkering van een Lid moet geïnitialiseerd worden op zijn leeskringkorting.

Regel Dubbele uitkering voor een jeugdlid
	geldig altijd
		De kortingsuitkering van een Lid moet gesteld worden op zijn leeskringkorting maal 2
		indien hij jeugdlid is.
```

## Rekenvoorbeelden

```testspraak
Testset Leeskringkorting
Rekendatum 01-06-2027

Parameters
	de bijwoningsdrempel  1
	de basiskorting       12,00 EUR
```

### Een jeugdlid dat niets miste

```testspraak
Testgeval Noor ontvangt de dubbele basiskorting
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Noor) met
		geboortedatum                     14-09-2011
		aantal bijgewoonde bijeenkomsten  10
	Gegeven Donderdagkring heeft Noor als deelnemer

	Verwacht Noor met
		leeskringkorting   12,00 EUR
		kortingsuitkering  24,00 EUR
```

### Een volwassen lid dat er drie miste

```testspraak
Testgeval Sam ontvangt de halve korting
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Sam) met
		geboortedatum                     02-02-1984
		aantal bijgewoonde bijeenkomsten  7
	Gegeven Donderdagkring heeft Sam als deelnemer

	Verwacht Sam met
		leeskringkorting   6,00 EUR
		kortingsuitkering  6,00 EUR
```
