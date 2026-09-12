# Artikel 5. Werkgever

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde wordt onder
werkgever verstaan de persoon, tot wie een werknemer in dienstbetrekking staat.

## Lid 2

In het geval, bedoeld in
[artikel 2, tweede lid](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&z=2026-07-01&g=2026-07-01),
wordt onder werkgever verstaan de persoon, met wie de overeenkomst van opdracht
is gesloten.

## Lid 3

Ingeval toepassing wordt gegeven aan
[artikel 2, derde lid](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&z=2026-07-01&g=2026-07-01),
wordt tevens bij of krachtens algemene maatregel van bestuur bepaald wie in de
daarbij betrokken gevallen onder werkgever wordt verstaan.

## Waarom hier geen regel staat, en toch een declaratie

Dit artikel **wijst aan** en rekent niet. Het zegt niet hoe je de werkgever
berekent maar dat de werkgever de andere kant van de arbeidsverhouding is — en
dat is precies wat een feittype is en geen regel.

Vandaar dat artikel 5 in dit model twee dingen oplevert en geen van beide een
`Regel`:

```
Objecttype de Werkgever (mv: Werkgevers)          gegevens/werkgever.rgs

Feittype arbeidsverhouding met de wederpartij     gegevens/feittypen.rgs
	de wederpartij                      Werkgever
	de aanstelling (mv: aanstellingen)  Arbeidsverhouding
```

Twee dingen over de naam `de wederpartij`. Het is het woord van lid 2 zelf ("de
persoon, met wie de overeenkomst … is gesloten"), en het is met opzet niet
`de werkgever`: een rol die zo heet naast `Objecttype de Werkgever` zou één
sleutel zijn, en dan is elk gebruik van het woord dubbelzinnig (RS115) — in het
model een waarschuwing, in een run een fout op elke zin die het woord schrijft.

Lid 1 en lid 2 leveren in dit model **dezelfde** relatie op. De wet onderscheidt
ze omdat de een over een arbeidsovereenkomst gaat en de ander over een
overeenkomst van opdracht, maar de vraag die ze allebei beantwoorden — wie is de
wederpartij — heeft één antwoord, en dat antwoord is deze rol. Lid 3 is, zoals
artikel 3 en artikel 4 lid 3, een bevoegdheid.

## Waarom de werkgever wél een objecttype is en de werknemer niet

Artikel 4 zegt "de natuurlijke **persoon**, die … in dienstbetrekking staat", en
artikel 5 zegt "de **persoon**, tot wie een werknemer in dienstbetrekking
staat". Één woord verschil, en het is het beslissende: een werkgever hoeft geen
natuurlijke persoon te zijn. Een besloten vennootschap is werkgever en heeft
geen geboortedatum, geen leeftijd en geen recht op minimumloon.

Dus is werknemer-zijn een kenmerk van de natuurlijke persoon, en is de werkgever
een soort ding van zichzelf. Dat is geen modelleerkeuze maar de wet die twee
verschillende woorden gebruikt.

## Rekenvoorbeeld

De werkgever wordt hier niet afgeleid maar wél gebruikt: de tweede volzin van
[artikel 4 lid 2](art-04-werknemer.rgs.md) loopt erlangs, en het geval hieronder
is het geval waarin die ketting het antwoord bepaalt.

```testspraak
Testset Werkgever
Rekendatum 01-08-2026
```

### De wederpartij bij een overeenkomst van opdracht

```testspraak
Testgeval De opdrachtgever is de wederpartij
	Gegeven een Werkgever (Uitgeverij) met
		handelsnaam  "Uitgeverij Wolkenveld"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Opdracht Iris) met
		aanvangsdatum  01-04-2026
		is overeenkomst van opdracht
		heeft een bemiddeling tegen beloning
	Gegeven een Natuurlijke persoon (Iris) met
		geboortedatum  30-06-1992
		heeft een woonplaats binnen het Rijk
	Gegeven Iris heeft Opdracht Iris als betrekking
	Gegeven Uitgeverij heeft Opdracht Iris als aanstelling

	Verwacht Opdracht Iris met
		is dienstbetrekking
	Verwacht Iris met
		heeft een gelijkgestelde buitenlandse dienstbetrekking
		is werknemer
```
