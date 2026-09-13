# Artikel 20. Bijwoning van bijeenkomsten

## Lid 1

Het bestuur houdt per deelnemend lid bij hoeveel bijeenkomsten van zijn leeskring
hij heeft bijgewoond.

*Deze bepaling levert geen regel op: wat zij beschrijft is invoer, en een kop
zonder cel eronder is de gewone vorm van een reglement.*

## Lid 2

Het aantal gemiste bijeenkomsten van een leeskringlid is het aantal bijeenkomsten
van zijn bezochte leeskring, verminderd met het aantal bijeenkomsten dat hij heeft
bijgewoond.

```regelspraak
Regelgroep bijwoning van bijeenkomsten

Regel bepaal het aantal gemiste bijeenkomsten
	geldig altijd
		Het aantal gemiste bijeenkomsten van een Lid moet berekend worden als het aantal bijeenkomsten van zijn bezochte leeskring verminderd met zijn aantal bijgewoonde bijeenkomsten.
```

## Lid 3

Het lid dat niet meer bijeenkomsten heeft gemist dan de bijwoningsdrempel, is
trouwe deelnemer.

```regelspraak
Regel Trouwe deelnemer
	geldig altijd
		Een Lid is een trouwe deelnemer
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is leeskringlid
			• zijn aantal gemiste bijeenkomsten is kleiner of gelijk aan de bijwoningsdrempel.
```

## Rekenvoorbeelden

```testspraak
Testset Bijwoning van bijeenkomsten
Rekendatum 01-06-2027

Parameters
	de bijwoningsdrempel  1
	de basiskorting       12,00 EUR
```

### Een lid dat één bijeenkomst miste

```testspraak
Testgeval Noor miste er één en blijft trouwe deelnemer
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Noor) met
		geboortedatum                     14-09-2011
		aantal bijgewoonde bijeenkomsten  9
	Gegeven Donderdagkring heeft Noor als deelnemer

	Verwacht Noor met
		aantal gemiste bijeenkomsten  1
		is een trouwe deelnemer
```

### Een lid dat er drie miste

```testspraak
Testgeval Sam miste er drie en is geen trouwe deelnemer
	Gegeven een Leeskring (Donderdagkring) met
		leeskringnaam         "De donderdagkring"
		aantal bijeenkomsten  10
	Gegeven een Lid (Sam) met
		geboortedatum                     02-02-1984
		aantal bijgewoonde bijeenkomsten  7
	Gegeven Donderdagkring heeft Sam als deelnemer

	Verwacht Sam met
		aantal gemiste bijeenkomsten  3
		is geen trouwe deelnemer
```
