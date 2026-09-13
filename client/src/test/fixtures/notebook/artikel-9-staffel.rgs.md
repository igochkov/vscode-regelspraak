# Artikel 9 — De bezoekkorting

Fixture van de figuur-gate ([V-1]…[V-10]): een `// Visualisatie:`-richtlijn boven
een testgeval, en wat er onder de cel komt te staan.

Hij staat **op zichzelf** en deelt geen enkele naam met de andere fixtures in
deze map, want alles buiten een werkmap zit in één scope ([N-10]) en twee
notebooks die samen openstaan zouden elkaars verklaringen anders dubbel vinden.
Een fixture per gate is ook waarom dit een bestand van zichzelf is: `artikel-5`
draagt de §4.5-gate en `artikel-4` de §4.6-gate, en die tellen allebei hun eigen
testgevallen.

## Lid 1

De korting loopt op met het aantal bezoeken, en een vaste bezoeker krijgt een
hoger bedrag per bezoek.

```regelspraak
Regelgroep bezoekkorting

Domein Bezoekbedrag is van het type Numeriek (getal met 2 decimalen) met eenheid €

Objecttype de Bezoeker (mv: Bezoekers) (bezield)
	het aantal bezoeken  Numeriek (geheel getal);
	de korting  Bezoekbedrag;
	is vaste bezoeker  kenmerk (bijvoeglijk);

Regel bepaal de bezoekkorting
	geldig altijd
		De korting van een Bezoeker moet geïnitialiseerd worden op zijn aantal bezoeken maal 2 €.

Regel bepaal de korting van een vaste bezoeker
	geldig altijd
		De korting van een Bezoeker moet gesteld worden op zijn aantal bezoeken maal 3 €
		indien hij vaste bezoeker is.
```

Initialisatie plus uitzondering, zodat de twee regels niet om dezelfde waarde
vechten — dezelfde vorm die `samples/sample-wet` voor zijn eigen staffel kiest.

## Rekenvoorbeelden

```testspraak
Testset Bezoekkorting
Rekendatum 01-06-2027
```

### De staffel in één figuur

De richtlijn hieronder is een gewoon commentaar ([V-1]): het model kent haar
niet, en het notebook leest haar om te weten wat het naast het oordeel tekent.
De verwachtingen eronder zijn wat de figuur nog een test maakt ([V-5]) — een
tekening die niet meer klopt is dan rood en niet alleen verkeerd.

```testspraak
// Visualisatie: staffel
//   x:      aantal bezoeken van de Bezoeker
//   y:      korting van de Bezoeker
//   reeks:  vaste bezoeker
Testgeval De kortingsstaffel
	Gegeven een Bezoeker (B1) met
		aantal bezoeken  1
	Gegeven een Bezoeker (B2) met
		aantal bezoeken  3
	Gegeven een Bezoeker (V1) met
		aantal bezoeken  1
		is vaste bezoeker
	Gegeven een Bezoeker (V2) met
		aantal bezoeken  3
		is vaste bezoeker

	Verwacht B2 met
		korting  6,00 EUR
	Verwacht V2 met
		korting  9,00 EUR
```

### Een voorbeeld zonder figuur

Dezelfde vorm, zonder richtlijn: er hoort dan ook niets getekend te worden.

```testspraak
Testgeval De korting van één bezoeker
	Gegeven een Bezoeker (B3) met
		aantal bezoeken  2

	Verwacht B3 met
		korting  4,00 EUR
```
