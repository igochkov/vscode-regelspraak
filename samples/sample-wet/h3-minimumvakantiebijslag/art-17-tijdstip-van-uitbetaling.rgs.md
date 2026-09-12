# Artikel 17. Tijdstip van uitbetaling

## Lid 1

De vakantiebijslag, waarop de werknemer over het loon en de uitkeringen krachtens
de Ziektewet, de Wet arbeid en zorg en de Werkloosheidswet, voor zover een en
ander **over het tijdvak tot en met 31 mei van het lopende jaar** opeisbaar is
geworden, recht heeft verworven, wordt behoudens het bepaalde in de volgende
leden **in de maand juni** uitbetaald.

Dit lid definieert het bijslagtijdvak waar heel hoofdstuk III over gaat, en het
is de reden dat een `Vakantiejaar` in dit model een objecttype van zichzelf is:
een tijdvak dat op 31 mei eindigt valt niet samen met een kalenderjaar en niet
met een uitbetalingstermijn.

```regelspraak
Regelgroep tijdstip van uitbetaling

// Bron: [art. 17 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=17&lid=1&g=2026-07-01&z=2026-07-01)
Regel Uitbetaling in de maand juni
	geldig altijd
		De uitbetalingsdatum van een Vakantiejaar moet geïnitialiseerd worden op de datum met jaar: het bijslagjaartal, maand: 6 en dag: 30.
		Daarbij geldt:
			het bijslagjaartal is het jaar uit zijn einddatum van het bijslagtijdvak.
```

De datum is 30 juni: de wet zegt "in de maand juni", en de laatste dag daarvan is
de uiterste. Dat het bijslagjaartal in een `Daarbij geldt:`-variabele staat is
geen sierlijkheid — `het jaar uit` is een prefixfunctie die zo ver reikt als hij
kan, en binnen `de datum met jaar: …, maand: 6 en dag: 30` zou hij de rest van de
opsomming kunnen opslokken.

## Lid 2

Bij publiekrechtelijke regeling of schriftelijke overeenkomst **kan ter zake van
het tijdstip van uitbetaling van het eerste lid worden afgeweken**, met dien
verstande, dat uitbetaling ten minste eenmaal per kalenderjaar dient te
geschieden.

*Een afwijkingsbevoegdheid, en wat er is afgesproken is invoer. De grens die het
lid eraan stelt — ten minste eenmaal per kalenderjaar — is een norm over een
reeks uitbetalingen en niet over één vakantiejaar; dit model heeft er geen
grootheid voor, en een regel die er een zou verzinnen zou meer beweren dan het
model weet.*

## Lid 3

**Bij het einde van de dienstbetrekking** wordt aan de werknemer het bedrag aan
vakantiebijslag uitbetaald, waarop hij op dat tijdstip recht heeft verworven.

De uitzondering op lid 1, en opnieuw in de vorm *initialisatie plus
gelijkstelling*: lid 1 schrijft de junidatum, lid 3 overschrijft haar met het
einde van het tijdvak.

```regelspraak
// Bron: [art. 17 lid 3](jci1.3:c:BWBR0002638&hoofdstuk=III&artikel=17&lid=3&g=2026-07-01&z=2026-07-01)
Regel Uitbetaling bij het einde van de dienstbetrekking
	geldig altijd
		De uitbetalingsdatum van een Vakantiejaar moet gesteld worden op zijn einddatum van het bijslagtijdvak
		indien hij bij het einde van de dienstbetrekking verworven is.
```

## Rekenvoorbeelden

```testspraak
Testset Tijdstip van uitbetaling
Rekendatum 01-06-2026
Parameterset Minimumloonbedragen per 1 januari 2026
```

### Het gewone geval: 30 juni

```testspraak
Testgeval Vakantiebijslag over een tijdvak tot 31 mei wordt in juni uitbetaald
	Gegeven een Vakantiejaar (Bijslag 2026) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  12

	Verwacht Bijslag 2026 met
		uitbetalingsdatum  30-06-2026
	Verwacht regelversie Uitbetaling bij het einde van de dienstbetrekking is niet gevuurd
```

### Bij het einde van de dienstbetrekking

Lid 3. Een dienstbetrekking die in februari eindigt: de bijslag is dan opeisbaar
en niet pas in juni.

```testspraak
Testgeval Bij het einde van de dienstbetrekking wordt direct afgerekend
	Gegeven een Vakantiejaar (Eindafrekening) met
		einddatum van het bijslagtijdvak   28-02-2026
		maandental van het bijslagtijdvak  9
		is bij het einde van de dienstbetrekking verworven

	Verwacht Eindafrekening met
		uitbetalingsdatum  28-02-2026
	Verwacht regelversie Uitbetaling bij het einde van de dienstbetrekking is gevuurd
```

### Een tijdvak dat in december eindigt

Het randgeval van de datumrekening: waar het tijdvak niet op 31 mei eindigt —
wat lid 2 toelaat — valt de junidatum in hetzelfde kalenderjaar als het einde van
het tijdvak, en niet in het jaar erna. Dat is precies wat `het jaar uit zijn
einddatum` zegt en wat een `plus 1` erbij fout zou maken.

```testspraak
Testgeval Een tijdvak dat in december eindigt heeft juni van dat jaar
	Gegeven een Vakantiejaar (Afwijkend tijdvak) met
		einddatum van het bijslagtijdvak   31-12-2026
		maandental van het bijslagtijdvak  12

	Verwacht Afwijkend tijdvak met
		uitbetalingsdatum  30-06-2026
```
