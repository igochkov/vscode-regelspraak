# Artikel 4. Werknemer

*Het artikel dat bepaalt wie de wet beschermt. Alles wat daarna komt — het recht
op minimumloon van artikel 7, de vakantiebijslag van artikel 15 — begint met
"de werknemer".*

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde wordt onder
werknemer verstaan de natuurlijke persoon, die overeenkomstig het bepaalde bij
of krachtens de
[artikelen 2](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&z=2026-07-01&g=2026-07-01)
of [3](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=3&z=2026-07-01&g=2026-07-01)
in dienstbetrekking staat.

Dit is waarom het objecttype van dit model `de Natuurlijke persoon` heet en niet
`de Werknemer`: de wet *definieert* werknemer-zijn, dus is het een kenmerk dat
het model afleidt en niet het soort ding waar het over gaat. Een objecttype
`de Werknemer` naast een kenmerk `is werknemer` zou één naam zijn, en dan zou
`hij is werknemer` altijd naar het objecttype wijzen (RS119) — één zelfverzekerd
verkeerd antwoord in plaats van een foutmelding.

De binnenlandse dienstbetrekking van lid 1:

```regelspraak
Regelgroep werknemer

// Bron: [art. 4 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=4&lid=1&g=2026-07-01&z=2026-07-01)
Regel Binnenlandse dienstbetrekking
	geldig altijd
		Een Natuurlijke persoon heeft een binnenlandse dienstbetrekking
		indien hij aan alle volgende voorwaarden voldoet:
			• zijn betrekking is dienstbetrekking
			• zijn betrekking heeft een vervulling binnen het Rijk.
```

## Lid 2

Wie zijn dienstbetrekking niet binnen het Rijk vervult, wordt slechts als
werknemer beschouwd, indien hij binnen het Rijk woont en zijn werkgever eveneens
binnen het Rijk woont of gevestigd is. Voor zover een werkgever binnen het Rijk
een vaste inrichting voor de uitoefening van zijn bedrijf of beroep of een
binnen het Rijk wonende of gevestigde vaste vertegenwoordiger heeft, wordt hij
voor de toepassing van de vorige volzin gelijkgesteld met een binnen het Rijk
gevestigde werkgever.

Twee volzinnen, één voorwaarde. De tweede volzin doet niets anders dan de eerste
uitbreiden: waar de eerste vraagt of de werkgever binnen het Rijk is gevestigd,
zegt de tweede dat een vaste inrichting daarmee gelijkstaat. Dus is het één
criterium met twee manieren om eraan te voldoen.

```regelspraak
// Bron: [art. 4 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=4&lid=2&g=2026-07-01&z=2026-07-01)
Regel Gelijkgestelde buitenlandse dienstbetrekking
	geldig altijd
		Een Natuurlijke persoon heeft een gelijkgestelde buitenlandse dienstbetrekking
		indien hij aan alle volgende voorwaarden voldoet:
			• zijn betrekking is dienstbetrekking
			• zijn betrekking heeft geen vervulling binnen het Rijk
			• hij heeft een woonplaats binnen het Rijk
			• hij voldoet aan ten minste één van de volgende voorwaarden:
				•• de wederpartij van zijn betrekking heeft een vestiging binnen het Rijk
				•• de wederpartij van zijn betrekking heeft een vaste inrichting binnen het Rijk.
```

De ketting `de wederpartij van zijn betrekking` loopt over twee feittypen: van
de persoon naar zijn arbeidsverhouding, en van de arbeidsverhouding naar de
werkgever. Dat `zijn` daar staat is niet alleen korter — het is ook wat de
gulzige naamlezing breekt, want een bezittelijk voornaamwoord is geen naamwoord
en beëindigt dus de naam die ervoor loopt ([D-12]).

## Lid 3

Bij of krachtens algemene maatregel van bestuur kan worden bepaald, dat
personen, die niet binnen het Rijk wonen, ook als werknemer worden beschouwd,
voor zover zij hun dienstbetrekking buiten het Rijk vervullen.

*Een bevoegdheid, en dus geen regel — net als artikel 3.*

## Lid 4

Voor de toepassing van de vorige leden worden schepen en luchtvaartuigen, welke
binnen het Rijk hun thuishaven hebben, ten opzichte van de werkgever en de
bemanning beschouwd als deel van het Rijk.

*Dit lid levert geen eigen regel op maar bepaalt wat "binnen het Rijk" betekent
voor een bepaald geval. Waar de dienstbetrekking wordt vervuld is in dit model
invoer (`de vervulling binnen het Rijk`), dus valt dit lid samen met de vraag
hoe die invoer wordt vastgesteld — en dat is geen rekenregel maar een
kwalificatie.*

## De hoofdregel van dit artikel

```regelspraak
// Bron: [art. 4 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=4&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 4 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=4&lid=2&g=2026-07-01&z=2026-07-01)
Regel Werknemer
	geldig altijd
		Een Natuurlijke persoon is werknemer
		indien hij aan ten minste één van de volgende voorwaarden voldoet:
			• hij heeft een binnenlandse dienstbetrekking
			• hij heeft een gelijkgestelde buitenlandse dienstbetrekking.
```

## Een keuze die het model maakt en de wet niet

Eén persoon staat in dit model in **één** arbeidsverhouding
(`Eén werkende staat in één betrekking`, in
[`gegevens/feittypen.rgs`](../gegevens/feittypen.rgs)). In werkelijkheid kan
iemand twee banen hebben, en dan is hij per baan werknemer.

De reden is dat de wet haar eigen zinnen zo schrijft: artikel 4 lid 2 zegt "Wie
**zijn** dienstbetrekking niet binnen het Rijk vervult" en artikel 5a lid 1 "de
tijd dat de werknemer **in dienstbetrekking** arbeid verricht" — enkelvoud, en
bij een tweede baan zou elke ketting van dit model een verzameling opleveren in
plaats van een waarde. Wie dat wél wil modelleren verplaatst `is werknemer` naar
de arbeidsverhouding; het is één regel en één rolnaam, maar het is een ander
model en het hoort in het model te staan dat het kiest.

## Rekenvoorbeelden

```testspraak
Testset Werknemer
Rekendatum 01-08-2026
```

### De binnenlandse werknemer

```testspraak
Testgeval Wie hier werkt is werknemer
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract Noor) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract Noor als betrekking
	Gegeven Bakkerij heeft Contract Noor als aanstelling

	Verwacht Noor met
		heeft een binnenlandse dienstbetrekking
		heeft geen gelijkgestelde buitenlandse dienstbetrekking
		is werknemer
```

### De grensganger van lid 2

Werkt buiten het Rijk, woont erbinnen, en zijn werkgever is hier gevestigd.

```testspraak
Testgeval Wie buiten het Rijk werkt maar hier woont is werknemer
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract Sam) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
	Gegeven een Natuurlijke persoon (Sam) met
		geboortedatum  02-02-1984
		heeft een woonplaats binnen het Rijk
	Gegeven Sam heeft Contract Sam als betrekking
	Gegeven Bakkerij heeft Contract Sam als aanstelling

	Verwacht Sam met
		heeft geen binnenlandse dienstbetrekking
		heeft een gelijkgestelde buitenlandse dienstbetrekking
		is werknemer
```

### De tweede volzin van lid 2: de vaste inrichting

Dezelfde situatie, maar de werkgever is niet hier gevestigd en heeft hier wel
een vaste inrichting. Zonder de tweede volzin zou dit geen werknemer zijn.

```testspraak
Testgeval Een vaste inrichting staat gelijk aan vestiging binnen het Rijk
	Gegeven een Werkgever (Buitenlandse keten) met
		handelsnaam  "Panificio Aurora"
		heeft een vaste inrichting binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract Lars) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
	Gegeven een Natuurlijke persoon (Lars) met
		geboortedatum  11-11-1990
		heeft een woonplaats binnen het Rijk
	Gegeven Lars heeft Contract Lars als betrekking
	Gegeven Buitenlandse keten heeft Contract Lars als aanstelling

	Verwacht Lars met
		heeft een gelijkgestelde buitenlandse dienstbetrekking
		is werknemer
```

### Buiten het Rijk werken en buiten het Rijk wonen

```testspraak
Testgeval Wie buiten het Rijk werkt en woont is geen werknemer
	Gegeven een Werkgever (Bakkerij) met
		handelsnaam  "Bakkerij De Korenaar"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract Mila) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
	Gegeven een Natuurlijke persoon (Mila) met
		geboortedatum  05-05-1995
	Gegeven Mila heeft Contract Mila als betrekking
	Gegeven Bakkerij heeft Contract Mila als aanstelling

	Verwacht Mila met
		heeft geen binnenlandse dienstbetrekking
		heeft geen gelijkgestelde buitenlandse dienstbetrekking
		is geen werknemer
```

### Geen dienstbetrekking, dus geen werknemer

De zelfstandige van [artikel 2 lid 2 onder b](art-02-dienstbetrekking.rgs.md),
die hier werkt en hier woont en toch geen werknemer is.

```testspraak
Testgeval Een zelfstandige is geen werknemer
	Gegeven een Werkgever (Opdrachtgever) met
		handelsnaam  "Uitgeverij Wolkenveld"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Opdracht Joris) met
		aanvangsdatum  01-01-2026
		is overeenkomst van opdracht
		heeft een arbeid tegen beloning
		heeft een zelfstandige beroepsuitoefening
		heeft een vervulling binnen het Rijk
	Gegeven een Natuurlijke persoon (Joris) met
		geboortedatum  20-07-1979
		heeft een woonplaats binnen het Rijk
	Gegeven Joris heeft Opdracht Joris als betrekking
	Gegeven Opdrachtgever heeft Opdracht Joris als aanstelling

	Verwacht Joris met
		is geen werknemer
	Verwacht Opdracht Joris met
		is geen dienstbetrekking
```
