# Artikel 11. Vaste arbeidsduur en vaste maandbeloning

## Lid 1

Indien ten aanzien van een werknemer op grond van een collectieve
arbeidsovereenkomst, publiekrechtelijke regeling of een schriftelijke
arbeidsovereenkomst sprake is van een vaste overeengekomen arbeidsduur per week
en een vaste beloning per maand, wordt aan de werknemer ten minste het
minimumuurloon dat geldt in het betreffende tijdvak **over het gemiddeld aantal
arbeidsuren van de betreffende maand, afgeleid van het totaal aantal arbeidsuren
dat de betreffende werknemer arbeid verricht in dat kalenderjaar**, betaald.

Dit lid is de oplossing van een probleem dat het minimumuurloon van 2024 heeft
geschapen: een maand heeft niet altijd evenveel werkdagen, dus levert een vaste
maandbeloning bij een vast aantal uren per week in de ene maand meer per uur op
dan in de andere. Wie in januari 23 werkdagen heeft en in februari 20 zou in
januari onder het minimum kunnen uitkomen terwijl hij over het jaar ruim
daarboven zit.

Het antwoord van de wet is een **jaargemiddelde**: niet de uren van die maand
maar het jaartotaal gedeeld door twaalf.

```regelspraak
Regelgroep vaste arbeidsduur

// Bron: [art. 11 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=11&lid=1&g=2026-07-01&z=2026-07-01)
Regel Gemiddelde maandelijkse arbeidsduur
	geldig vanaf 01-01-2024
		De gemiddelde maandelijkse arbeidsduur van een Arbeidsverhouding moet berekend worden als (zijn jaarlijkse arbeidsduur gedeeld door 12) rekenkundig afgerond op 2 decimalen
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is schriftelijk overeengekomen
			• zijn jaarlijkse arbeidsduur is gevuld
			• zijn arbeidsduur per week is gevuld
			• zijn vaste maandbeloning is gevuld.
```

Vier criteria, en drie ervan zijn `is gevuld`. Dat is niet omzichtigheid maar de
voorwaarde die lid 1 zelf stelt: "**indien** … sprake is van een vaste
overeengekomen arbeidsduur per week **en** een vaste beloning per maand". Zonder
die twee is dit lid niet van toepassing, en dan is `leeg` het juiste antwoord en
niet een getal dat eruitziet als een uitkomst.

Het derde is er om een andere reden, en dat is een reden van de taal: `gedeeld
door` op een lege waarde is een run-time fout (§6.5) en geen lege uitkomst. De
andere manier om dat te vermijden is de deling in een `Daarbij geldt:`-variabele
zetten, want die is lui — maar een expliciete voorwaarde zegt hier beter wat de
wet bedoelt.

## Lid 2

Indien bij publiekrechtelijke regeling of collectieve arbeidsovereenkomst een
periode van afrekening, welke meerdere uitbetalingstermijnen omvat, is
vastgesteld, wordt zodanige periode van afrekening voor de toepassing van de
[artikelen 7, zesde lid](art-07-recht-op-minimumloon.rgs.md),
[8](art-08-hoogte-van-het-minimumloon.rgs.md) en
[13a](art-13a-langere-arbeidsduur.rgs.md) als uitbetalingstermijn beschouwd.
**Een periode van afrekening kan ten hoogste twaalf maanden omvatten.**

De laatste volzin is een norm met een grens erin, en dat is een
consistentieregel: zij rekent niets uit en verklaart het model inconsistent waar
zij niet klopt.

De regel heet `… van maximaal twaalf maanden` en niet `… van ten hoogste twaalf
maanden`, want `ten hoogste` is één sleutelwoord van de taal (de kwantificatie
van een samengestelde voorwaarde) en een verwijzing naar een regelnaam leest
alleen gewone naamwoorden.

```regelspraak
// Bron: [art. 11 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=11&lid=2&g=2026-07-01&z=2026-07-01)
Regel Periode van afrekening van maximaal twaalf maanden
	geldig altijd
		De periode van afrekening van een Arbeidsverhouding moet kleiner of gelijk zijn aan 12 maand
		indien zijn periode van afrekening gevuld is.
```

## Rekenvoorbeelden

```testspraak
Testset Vaste arbeidsduur
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026
```

### Een voltijdbetrekking van 1.878 uur per jaar

36 uur per week maal 52,14 weken is ongeveer 1.878 uur; gedeeld door twaalf is
dat 156,50 uur per maand. Merk op dat dat niet precies de 156 uur is die
[artikel 14 lid 10](art-14-herziening.rgs.md) als rekengrootheid gebruikt: dat
is 4⅓ maal 36, en het verschil zijn de weken die een jaar meer heeft dan 52.

```testspraak
Testgeval Een jaar van 1878 uur levert 156,50 uur per maand op
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  36 uur
		vaste maandbeloning                 2800,00 EUR
		jaarlijkse arbeidsduur              1878 uur

	Verwacht Contract met
		arbeidsduur per week                 36 uur
		gemiddelde maandelijkse arbeidsduur  156,50 uur
```

### Een deeltijdbetrekking

```testspraak
Testgeval Een deeltijdjaar van 1252 uur levert 104,33 uur per maand op
	Gegeven een Arbeidsverhouding (Deeltijdcontract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  24 uur
		vaste maandbeloning                 1900,00 EUR
		jaarlijkse arbeidsduur              1252 uur

	Verwacht Deeltijdcontract met
		gemiddelde maandelijkse arbeidsduur  104,33 uur
```

### Zonder vaste maandbeloning is lid 1 niet van toepassing

Het randgeval van de voorwaarde: alles is er behalve de vaste beloning per
maand, en dan zegt dit lid niets.

```testspraak
Testgeval Zonder vaste maandbeloning blijft het gemiddelde leeg
	Gegeven een Arbeidsverhouding (Uurcontract) met
		aanvangsdatum                       01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		is schriftelijk overeengekomen
		schriftelijke arbeidsduur per week  36 uur
		jaarlijkse arbeidsduur              1878 uur

	Verwacht Uurcontract met
		gemiddelde maandelijkse arbeidsduur  leeg
	Verwacht regelversie Gemiddelde maandelijkse arbeidsduur is niet gevuurd
```

### Een periode van afrekening van twaalf maanden mag

Het randgeval van "ten hoogste".

```testspraak
Testgeval Twaalf maanden is nog toegestaan
	Gegeven een Arbeidsverhouding (Jaarcontract) met
		aanvangsdatum           01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		periode van afrekening  12 maand

	Verwacht regelversie Periode van afrekening van maximaal twaalf maanden is gevuurd
```

### Dertien maanden niet

```testspraak
Testgeval Dertien maanden maakt het model inconsistent
	Gegeven een Arbeidsverhouding (Jaarcontract) met
		aanvangsdatum           01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		periode van afrekening  13 maand

	Verwacht regelversie Periode van afrekening van maximaal twaalf maanden is inconsistent
```

### Zonder periode van afrekening zegt de regel niets

```testspraak
Testgeval Zonder periode van afrekening toetst de regel niets
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht

	Verwacht regelversie Periode van afrekening van maximaal twaalf maanden is niet gevuurd
```
