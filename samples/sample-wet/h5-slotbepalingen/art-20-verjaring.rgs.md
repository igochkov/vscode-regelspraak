# Artikel 20. Verjaring van de vordering tot vakantiebijslag

Ieder vorderingsrecht tot betaling van vakantiebijslag als bedoeld in
[Hoofdstuk III](../h3-minimumvakantiebijslag/art-15-recht-op-vakantiebijslag.rgs.md)
**verjaart na verloop van vijf jaren na het tijdstip, waarop de uitbetaling had
moeten geschieden**.

## Eén volzin, één datum

Het tijdstip waarop de uitbetaling had moeten geschieden is de uitbetalingsdatum
van [artikel 17](../h3-minimumvakantiebijslag/art-17-tijdstip-van-uitbetaling.rgs.md)
— 30 juni, of de dag waarop de dienstbetrekking eindigde. Vijf jaar daarna
verjaart de vordering.

```regelspraak
Regelgroep verjaring

// Bron: [art. 20](jci1.3:c:BWBR0002638&hoofdstuk=V&artikel=20&g=2026-07-01&z=2026-07-01)
Regel Verjaring van de vordering tot vakantiebijslag
	geldig altijd
		De verjaringsdatum van een Vakantiejaar moet berekend worden als zijn uitbetalingsdatum plus de verjaringstermijn.
```

De vijf jaar staan als parameter in
[`tests/parameterwaarden.test.rgs`](../tests/parameterwaarden.test.rgs) en niet
als literal in de regel, en dat is hier een grensgeval. Het getal staat *in de
wet* — anders dan de bedragen van artikel 8, die krachtens artikel 14 worden
vervangen — dus zou een literal verdedigbaar zijn. Er is voor een parameter
gekozen omdat de verjaringstermijn met een eenheid komt (`5 jaar`) en de regel
dan leest als wat zij doet: een datum plus een termijn. Een lezer die de termijn
wil zien kijkt in één bestand waar alle grootheden van dit model staan.

Dat een datum plus `5 jaar` een datum oplevert is de datumrekenkunde van §6.11 en
geen vermenigvuldiging met dagen: maanden en jaren hebben in deze taal een eigen
basis, juist omdat een jaar geen vast aantal dagen heeft.

## Wat dit artikel niet zegt, en het model dus ook niet

Er staat geen regel over **of** een vordering is verjaard, en dat is met opzet.
Dat zou een vergelijking met "vandaag" zijn, en vandaag is in een model met een
rekendatum niet zomaar een gegeven: de rekendatum is de dag waarnaar de
berekening kijkt, en die kan in het verleden liggen omdat iemand een oud
vakantiejaar naloopt. Een regel `is verjaard indien de verjaringsdatum eerder is
dan de Rekendatum` zou dan zeggen dat een vordering is verjaard omdat de
*berekening* laat is, en niet omdat de vordering oud is.

Wie die vraag wil stellen stelt haar over een genoemde datum, en dan is het
antwoord de vergelijking van twee data die het model allebei heeft.

## Rekenvoorbeelden

```testspraak
Testset Verjaring
Rekendatum 01-06-2026
Parameterset Minimumloonbedragen per 1 januari 2026
```

### Het gewone geval

Uitbetaling had op 30 juni 2026 moeten gebeuren, dus verjaart de vordering op
30 juni 2031.

```testspraak
Testgeval Een vordering over 2026 verjaart in 2031
	Gegeven een Vakantiejaar (Bijslag 2026) met
		einddatum van het bijslagtijdvak   31-05-2026
		maandental van het bijslagtijdvak  12

	Verwacht Bijslag 2026 met
		uitbetalingsdatum  30-06-2026
		verjaringsdatum    30-06-2031
```

### Bij het einde van de dienstbetrekking loopt de termijn eerder

Artikel 17 lid 3 vervroegt de uitbetalingsdatum, en daarmee de verjaring.

```testspraak
Testgeval Bij een eindafrekening verjaart de vordering vijf jaar na die dag
	Gegeven een Vakantiejaar (Eindafrekening) met
		einddatum van het bijslagtijdvak   28-02-2026
		maandental van het bijslagtijdvak  9
		is bij het einde van de dienstbetrekking verworven

	Verwacht Eindafrekening met
		uitbetalingsdatum  28-02-2026
		verjaringsdatum    28-02-2031
```

### Een schrikkeldag

Het randgeval van de datumrekenkunde: 29 februari 2028 plus vijf jaar. 2033 is
geen schrikkeljaar, en wat de taal daar oplevert is een feit over §6.11 dat het
waard is vast te leggen in plaats van aan te nemen.

```testspraak
Testgeval Vijf jaar na een schrikkeldag
	Gegeven een Vakantiejaar (Schrikkeljaar) met
		einddatum van het bijslagtijdvak   29-02-2028
		maandental van het bijslagtijdvak  12
		is bij het einde van de dienstbetrekking verworven

	Verwacht Schrikkeljaar met
		uitbetalingsdatum  29-02-2028
		verjaringsdatum    28-02-2033
```
