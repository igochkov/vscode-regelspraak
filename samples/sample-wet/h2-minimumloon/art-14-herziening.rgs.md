# Artikel 14. Herziening van de bedragen

*Het artikel waar de bedragen van [artikel 8](art-08-hoogte-van-het-minimumloon.rgs.md)
vandaan komen. Twee keer per jaar rekent de minister ze opnieuw uit, en dit
artikel zegt hoe — met een formule, een afronding op € 0,60 en een afronding op
een cent.*

## Lid 1

Het bedrag, genoemd in artikel 8, eerste lid, onder b, wordt telkens met ingang
van **1 januari** door Onze Minister herzien overeenkomstig:

- a. de helft van de ontwikkeling van de contractlonen zoals deze voor het
  betrokken jaar, blijkens bekendmaking in de Macro-Economische Verkenningen in
  het voorafgaande jaar, is geraamd; en
- b. het verschil tussen de ontwikkeling van de contractlonen zoals deze voor
  het voorafgaande jaar, blijkens bekendmaking in het Centraal Economisch Plan
  in dat jaar, was geraamd en de ontwikkeling zoals deze voor het voorafgaande
  jaar, blijkens bekendmaking in de Macro-Economische Verkenningen in dat jaar,
  nader is geraamd.

## Lid 2

Het bedrag […] wordt telkens met ingang van **1 juli** door Onze Minister opnieuw
herzien overeenkomstig het verschil tussen de helft van de ontwikkeling van de
contractlonen zoals deze voor het betrokken jaar, blijkens bekendmaking in de
Macro-Economische Verkenningen in het voorafgaande jaar, was geraamd en de
ontwikkeling zoals deze voor het betrokken jaar, blijkens bekendmaking in het
Centraal Economisch Plan in dat jaar, nader is geraamd.

## Lid 3

Voor de toepassing van het eerste en tweede lid wordt onder ontwikkeling van de
contractlonen verstaan: het gemiddelde van de procentuele ontwikkeling van de
contractlonen in marktsector, gepremieerde en gesubsidieerde sector, en bij de
overheid, **zoals deze door het Centraal Planbureau wordt bekend gemaakt**.

**Lid 1, 2 en 3 leveren geen regel op, en lid 3 zegt waarom.** De
contractloonontwikkeling is geen grootheid die deze wet uitrekent maar een
publicatie van het Centraal Planbureau — twee publicaties zelfs, de MEV en het
CEP, met ramingen over twee jaren. Het model kan niet weten wat er in staat, en
een regel die zou doen alsof zou een getal opleveren dat niemand kan nazoeken.

Wat er wél uit lid 1 tot en met 3 komt is **één factor**, en die is invoer:
`de herzieningsfactor` van een `Herziening`. De reden dat het een factor is en
geen percentage staat in
[`gegevens/domeinen.rgs`](../gegevens/domeinen.rgs) — §6.4 laat een percentage
geen operand van `maal` zijn en §13.4.17 #12 schrijft een percentage als
*literal*, dus is een ontwikkeling die van buiten komt een getal.

## Lid 4

Indien de toepassing van het eerste, dan wel het tweede lid zou leiden tot
**verlaging** van het bedrag […] wordt dat bedrag ongewijzigd vastgesteld. Voor
zover hierdoor geen toepassing wordt gegeven aan het eerste, dan wel het tweede
lid wordt het daarmee gemoeide percentage bij de eerstvolgende herziening […]
alsnog in aanmerking genomen.

De eerste volzin is één begrenzing. De tweede is een verrekening over
herzieningen heen, en die zit in dit model in de factor van de *volgende*
herziening — precies zoals de minister hem daar zou verrekenen.

```regelspraak
Regelgroep herziening van de bedragen

// Bron: [art. 14 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=14&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 14 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=14&lid=2&g=2026-07-01&z=2026-07-01)
// Bron: [art. 14 lid 4](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=14&lid=4&g=2026-07-01&z=2026-07-01)
Regel Ongerond herzien maandloon
	geldig altijd
		Het ongeronde maandloon van een Herziening moet berekend worden als (zijn vorige maandloon maal zijn herzieningsfactor) rekenkundig afgerond op 2 decimalen, met een minimum van zijn vorige maandloon.
```

## Lid 5 tot en met 8, en 12 tot en met 17

Lid 5 laat toe dat het bedrag bij algemene maatregel van bestuur **afwijkend**
wordt vastgesteld bij bovenmatige loonontwikkeling of een volume-ontwikkeling in
de sociale zekerheid; lid 6 en 7 regelen wat er dan met de andere halfjaarlijkse
herziening gebeurt; lid 8 schrijft voorhang bij beide Kamers voor. Lid 12 laat
de laatstelijk vastgestelde bedragen ten hoogste drie maanden doorlopen als een
maatregel niet tijdig af komt. Lid 13 vraagt een vierjaarlijkse beoordeling, lid
14 verlaagt het bedrag als de minimumvakantiebijslag wordt verhoogd, lid 15
regelt samenloop, en lid 16 en 17 geven de criteria voor de beoordeling van lid
13 — koopkracht, loonniveau, loongroei, productiviteit — plus de bevoegdheid om
er meer bij te stellen.

*Geen van deze leden levert een regel op, en ze vallen alle in dezelfde
categorie: het zijn bevoegdheden en procedures, en wat er krachtens een van hen
wordt vastgesteld komt dit model binnen als een bedrag of als een factor. Lid 13
en 16 zijn bovendien uitdrukkelijk een **beoordeling** — "of er omstandigheden
aanwezig zijn die een bijzondere wijziging wenselijk maken" — en een beoordeling
is niet iets dat een rekenregel doet.*

## Lid 9

Het overeenkomstig het eerste tot en met het vierde en het zesde lid herziene
bedrag wordt **afgerond op het dichtstbijzijnde veelvoud van € 0,60**. Indien het
restbedrag € 0,30 bedraagt, geschiedt de afronding naar boven.

Een afronding op een veelvoud van iets anders dan een macht van tien schrijf je
als deling, afronding en vermenigvuldiging. Dat de deling in een `Daarbij
geldt:`-variabele staat is niet alleen leesbaarheid: de afronding is losser dan
`maal`, dus zou `A gedeeld door B rekenkundig afgerond op 0 decimalen maal B` de
hele uitdrukking afronden in plaats van alleen het quotiënt.

`rekenkundig` is precies de afronding die de tweede volzin beschrijft: bij een
restbedrag van € 0,30 — de helft van € 0,60 — naar boven.

```regelspraak
// Bron: [art. 14 lid 9](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=14&lid=9&g=2026-07-01&z=2026-07-01)
Regel Afronding van het maandloon op zestig eurocent
	geldig altijd
		Het herziene maandloon van een Herziening moet berekend worden als het veelvoud maal de afrondingseenheid van het maandloon.
		Daarbij geldt:
			het veelvoud is (zijn ongeronde maandloon gedeeld door de afrondingseenheid van het maandloon) rekenkundig afgerond op 0 decimalen.
```

De eenheden kloppen van rechts naar links: € gedeeld door € is een getal zonder
eenheid, dat getal afgerond is nog steeds een getal, en dat getal maal € is weer
€.

## Lid 10

Bij een herziening overeenkomstig het eerste tot en met zesde lid wordt tevens
het **minimumuurloon**, genoemd in artikel 8, eerste lid, onder a, herzien
overeenkomstig de volgende formule, waarbij het resultaat **naar boven wordt
afgerond op een veelvoud van € 0,01**:

> A ÷ (B × C)

waarbij:

- **A** = het herziene minimummaandloon overeenkomstig het eerste tot en met
  zesde lid.
- **B** = het aantal weken per maand dat wordt gesteld op **4 1/3**.
- **C** = het aantal uren per week dat wordt gesteld op **36**.

```regelspraak
// Bron: [art. 14 lid 10](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=14&lid=10&g=2026-07-01&z=2026-07-01)
Regel Herzien minimumuurloon uit het maandloon
	geldig altijd
		Het herziene uurloon van een Herziening moet berekend worden als het onafgeronde uurloon naar boven afgerond op 2 decimalen.
		Daarbij geldt:
			het maanduurtal is het wekental per maand maal de normale werkweek
			het onafgeronde uurloon is zijn herziene maandloon gedeeld door het maanduurtal.
```

**`4 1/3` is een rationaal getal en geen 4,33.** De taal heeft er een schrijfwijze
voor — `4_1/3` — en die is exact; zie
[`tests/parameterwaarden.test.rgs`](../tests/parameterwaarden.test.rgs), waar de
waarde staat. Het verschil is niet academisch: € 2.337,00 gedeeld door
(4⅓ × 36 = 156) is € 14,980769…, en dat naar boven afgerond is **€ 14,99**.
Gedeeld door (4,33 × 36 = 155,88) is het € 14,9923…, en dat naar boven afgerond
is **€ 15,00**. Eén cent per uur, over ruim anderhalf miljoen mensen.

`naar boven` en niet `rekenkundig`: de wet zegt "naar boven wordt afgerond", en
dat is hier het verschil tussen € 14,98 en € 14,99.

## Lid 11

De overeenkomstig het eerste tot en met het zesde en het tiende lid herziene
bedragen **treden in de plaats van** de bedragen, genoemd in artikel 8, eerste
lid, met dien verstande dat de afronding, bedoeld in het negende lid, bij de
eerstvolgende herziening buiten beschouwing blijft.

*Dit lid is de reden dat de bedragen van artikel 8 in dit model een parameter
zijn en geen getal in een regel. De volledige overweging staat in
[`gegevens/parameters.rgs`](../gegevens/parameters.rgs).*

De laatste bijzin is het spiegelbeeld van lid 4's tweede volzin en zit op
dezelfde plaats in het model: `het vorige maandloon` van de volgende herziening
is het **onafgeronde** bedrag en niet het afgeronde, zodat de afrondingen zich
niet over de jaren opstapelen. Dat de testgevallen hieronder het afgeronde
bedrag als vorige maandloon nemen is een vereenvoudiging van het voorbeeld en
niet van het model — de wet laat hier een keuze aan de invoer.

## Rekenvoorbeelden

**Dit is het rekenvoorbeeld dat het hele model rechtvaardigt.** De uitkomst van
het eerste geval hieronder, € 14,99 per uur, is het bedrag dat per 1 juli 2026
daadwerkelijk in de Staatscourant is vastgesteld — en dit model komt eraan door
de formule van lid 10 toe te passen op het referentiemaandloon dat lid 9 uit het
vorige oplevert. Een uitkomst die elders al langs een andere weg is vastgesteld
is het sterkste bewijs dat een model van een wet kan leveren.

```testspraak
Testset Herziening van de bedragen
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026
```

### De herziening per 1 juli 2026

Van € 2.294,40 naar € 2.337,00, en daaruit € 14,99 per uur.

```testspraak
Testgeval De herziening per 1 juli 2026 levert 14,99 euro per uur op
	Gegeven een Herziening (Juli 2026) met
		ingangsdatum       01-07-2026
		vorige maandloon   2294,40 EUR
		herzieningsfactor  1,018567

	Verwacht Juli 2026 met
		ongeronde maandloon  2337,00 EUR
		herziene maandloon   2337,00 EUR
		herziene uurloon     14,99 EUR/uur
```

### Een herziening waarbij de afronding op € 0,60 bijt

Een factor van precies 2%: € 2.340,29 is geen veelvoud van € 0,60, en de
afronding brengt het op € 2.340,00 — negenentwintig cent naar beneden, en toch
een uurloon van € 15,00 omdat dat weer naar boven wordt afgerond.

```testspraak
Testgeval Een maandloon dat geen veelvoud van zestig cent is wordt afgerond
	Gegeven een Herziening (Twee procent) met
		ingangsdatum       01-01-2027
		vorige maandloon   2294,40 EUR
		herzieningsfactor  1,020000

	Verwacht Twee procent met
		ongeronde maandloon  2340,29 EUR
		herziene maandloon   2340,00 EUR
		herziene uurloon     15,00 EUR/uur
```

### Het restbedrag van € 0,30 gaat naar boven

De tweede volzin van lid 9, precies op de grens: € 2.337,30 is € 0,30 boven een
veelvoud van € 0,60, en dan rondt de wet naar boven in plaats van naar de
dichtstbijzijnde.

```testspraak
Testgeval Een restbedrag van dertig cent wordt naar boven afgerond
	Gegeven een Herziening (Op de grens) met
		ingangsdatum       01-01-2027
		vorige maandloon   2294,40 EUR
		herzieningsfactor  1,018698

	Verwacht Op de grens met
		ongeronde maandloon  2337,30 EUR
		herziene maandloon   2337,60 EUR
		herziene uurloon     14,99 EUR/uur
```

### Lid 4: een negatieve ontwikkeling verlaagt niets

Een factor onder 1 zou tot € 2.271,46 leiden. Lid 4 zegt dat het bedrag dan
ongewijzigd wordt vastgesteld, en dat is wat de begrenzing `met een minimum van
zijn vorige maandloon` doet. Zonder die begrenzing zou het minimumloon in een
slecht jaar dalen — wat de wet uitdrukkelijk verbiedt.

```testspraak
Testgeval Een dalende contractloonontwikkeling verlaagt het minimumloon niet
	Gegeven een Herziening (Slecht jaar) met
		ingangsdatum       01-01-2027
		vorige maandloon   2294,40 EUR
		herzieningsfactor  0,990000

	Verwacht Slecht jaar met
		ongeronde maandloon  2294,40 EUR
		herziene maandloon   2294,40 EUR
		herziene uurloon     14,71 EUR/uur
```

### Een factor van precies 1 verandert niets

Het randgeval van de begrenzing aan de andere kant: geen ontwikkeling, geen
herziening, en dezelfde bedragen als per 1 januari 2026 — wat ook zegt dat de
formule van lid 10 die maand reproduceert.

```testspraak
Testgeval Zonder ontwikkeling blijven de bedragen van 1 januari 2026 staan
	Gegeven een Herziening (Ongewijzigd) met
		ingangsdatum       01-01-2027
		vorige maandloon   2294,40 EUR
		herzieningsfactor  1,000000

	Verwacht Ongewijzigd met
		herziene maandloon  2294,40 EUR
		herziene uurloon    14,71 EUR/uur
```
