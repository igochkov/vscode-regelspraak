# Artikel 9. Uitbetalingstermijn bij een dienstbetrekking zonder arbeidsovereenkomst

De uitbetaling van het loon aan werknemers, wier dienstbetrekking niet op een
arbeidsovereenkomst berust, geschiedt, voor wat het bedrag van het minimumloon
betreft, telkens na een kwartaal, tenzij partijen een kortere uitbetalingstermijn
zijn overeengekomen.

## Eén volzin, twee regels

De hoofdregel is een kwartaal, en de "tenzij" is een uitzondering die de
hoofdregel overschrijft. Dat is precies de vorm *initialisatie plus
gelijkstelling*: de eerste schrijft onvoorwaardelijk wat de wet voorschrijft, de
tweede overschrijft alleen waar partijen iets anders zijn overeengekomen. Twee
voorwaardelijke gelijkstellingen naar hetzelfde attribuut zouden om dezelfde
waarde vechten, en wie er dan wint hangt af van de afleidingsorde en niet van de
wet.

```regelspraak
Regelgroep uitbetalingstermijn

// Bron: [art. 9](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=9&g=2026-07-01&z=2026-07-01)
Regel Uitbetalingstermijn van drie maanden
	geldig altijd
		De uitbetalingstermijn van een Arbeidsverhouding moet geïnitialiseerd worden op 3 maand
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is dienstbetrekking
			• hij is geen arbeidsovereenkomst naar burgerlijk recht.

// Bron: [art. 9](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=9&g=2026-07-01&z=2026-07-01)
Regel Kortere overeengekomen uitbetalingstermijn
	geldig altijd
		De uitbetalingstermijn van een Arbeidsverhouding moet gesteld worden op zijn overeengekomen uitbetalingstermijn
		indien zijn overeengekomen uitbetalingstermijn kleiner is dan 3 maand.
```

"Telkens na een kwartaal" is in dit model `3 maand` en niet `1 kwartaal`, en dat
is geen versimpeling maar een eenheidskeuze: de taal kent twee bases voor tijd —
dagen en maanden — en een kwartaal en een maand zitten in dezelfde. Zo is de
vergelijking met de overeengekomen termijn een gewone vergelijking en niet een
omrekening.

De regel heet daarom ook `Uitbetalingstermijn van drie maanden` en niet
`… van een kwartaal`. Een regel*naam* is vrije tekst, maar een *verwijzing* naar
die naam (`Verwacht regelversie … is gevuurd`) leest alleen gewone naamwoorden —
en `een` is er geen. Een regel met `een` in de naam declareert prima en kan nooit
worden aangehaald, wat je merkt als een RS001 op de verwachting en niet op de
regel.

Merk op dat de eerste regel **niets doet** bij een gewone arbeidsovereenkomst.
Dat is de wet: voor die dienstbetrekkingen staat de uitbetalingstermijn in
[artikel 7:623 BW](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=623&z=2026-07-01&g=2026-07-01)
en niet hier, en `leeg` is dan het eerlijke antwoord.

## Rekenvoorbeelden

```testspraak
Testset Uitbetalingstermijn
Rekendatum 01-08-2026
```

### Een overeenkomst van opdracht: per kwartaal

```testspraak
Testgeval Een gelijkgestelde opdracht wordt per kwartaal uitbetaald
	Gegeven een Arbeidsverhouding (Opdracht) met
		aanvangsdatum  01-01-2026
		is overeenkomst van opdracht
		heeft een bemiddeling tegen beloning

	Verwacht Opdracht met
		is dienstbetrekking
		uitbetalingstermijn  3 maand
```

### Met een kortere termijn overeengekomen

```testspraak
Testgeval Een overeengekomen maandtermijn gaat voor
	Gegeven een Arbeidsverhouding (Opdracht) met
		aanvangsdatum                       01-01-2026
		is overeenkomst van opdracht
		heeft een bemiddeling tegen beloning
		overeengekomen uitbetalingstermijn  1 maand

	Verwacht Opdracht met
		uitbetalingstermijn  1 maand
	Verwacht regelversie Kortere overeengekomen uitbetalingstermijn is gevuurd
```

### Een langere overeengekomen termijn verandert niets

Het randgeval van "korter": zes maanden is niet korter dan een kwartaal, dus
blijft het kwartaal staan. Wie de "tenzij" als "wat partijen ook afspreken"
leest komt hier op zes maanden uit.

```testspraak
Testgeval Een langere overeengekomen termijn wordt genegeerd
	Gegeven een Arbeidsverhouding (Opdracht) met
		aanvangsdatum                       01-01-2026
		is overeenkomst van opdracht
		heeft een bemiddeling tegen beloning
		overeengekomen uitbetalingstermijn  6 maand

	Verwacht Opdracht met
		uitbetalingstermijn  3 maand
	Verwacht regelversie Kortere overeengekomen uitbetalingstermijn is niet gevuurd
```

### Een arbeidsovereenkomst valt buiten dit artikel

```testspraak
Testgeval Een arbeidsovereenkomst krijgt geen termijn uit dit artikel
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht

	Verwacht Contract met
		uitbetalingstermijn  leeg
	Verwacht regelversie Uitbetalingstermijn van drie maanden is niet gevuurd
```
