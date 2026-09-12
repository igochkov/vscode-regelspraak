# Artikel 3. Uitzondering van een categorie arbeidsverhoudingen

Indien hiertoe in verband met de bijzondere aard van de arbeidsverhouding dan
wel in verband met bijzondere omstandigheden aanleiding bestaat, kan bij
algemene maatregel van bestuur worden bepaald, dat de arbeidsverhouding van tot
een daarbij aangewezen categorie behorende personen niet onder dienstbetrekking
als bedoeld in
[artikel 2](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&z=2026-07-01&g=2026-07-01)
wordt verstaan.

## Wat dit artikel het model oplevert

Een bevoegdheid, en dus geen regel. Welke categorieën zijn aangewezen staat in
een algemene maatregel van bestuur, en die is een eigen regeling met een eigen
model — het model van *deze* wet kan haar niet kennen.

Maar het artikel is niet zonder gevolg voor dit model, en dat is precies het
verschil tussen een bepaling die niets oplevert en een bepaling die geen regel
oplevert. Artikel 3 **beperkt** artikel 2: wat krachtens artikel 3 is
uitgezonderd is geen dienstbetrekking, ook al valt het onder artikel 2. Dus
draagt de arbeidsverhouding een kenmerk dat zegt dat zij is uitgezonderd, en
leest de regel van artikel 2 dat kenmerk als laatste criterium.

Het kenmerk is **invoer**: het feit dat een AMvB deze verhouding heeft
uitgezonderd komt van buiten. De declaratie staat in
[`gegevens/arbeidsverhouding.rgs`](../gegevens/arbeidsverhouding.rgs) en
verwijst hiernaar:

```
	de uitzondering krachtens artikel 3           kenmerk (bezittelijk);
```

## Rekenvoorbeeld

De regel die hier hoort te vuren staat in
[artikel 2](art-02-dienstbetrekking.rgs.md); dit is het geval waarin zij
*niet* vuurt terwijl al haar andere criteria kloppen.

```testspraak
Testset Uitzondering krachtens artikel 3
Rekendatum 01-08-2026
```

### Een arbeidsovereenkomst die krachtens artikel 3 is uitgezonderd

```testspraak
Testgeval Een uitgezonderde categorie is geen dienstbetrekking
	Gegeven een Arbeidsverhouding (Uitgezonderd contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een uitzondering krachtens artikel 3

	Verwacht Uitgezonderd contract met
		is geen dienstbetrekking
	Verwacht regelversie Dienstbetrekking is niet gevuurd
```
