# Artikel 5 — Erebonus

Fixture van de §4.5-gate: het uitvoeren van een rekenvoorbeeld in een cel. Hij
staat **op zichzelf** en deelt geen enkele naam met de andere fixtures, want
alles buiten een werkmap zit in één scope ([N-10]) en twee notebooks die samen
openstaan zouden elkaars verklaringen anders dubbel vinden.

## Lid 1

De gastlezer ontvangt een erebonus van vijfentwintig euro, verhoogd met een
toeslag van vijf euro.

```regelspraak
Regelgroep erebonus voor een gastlezer

Domein Gastbedrag is van het type Numeriek (getal met 2 decimalen) met eenheid €

Objecttype de Gastlezer (mv: Gastlezers)
	de erebonus  Gastbedrag;
	de toeslag  Gastbedrag;

Regel bepaal de erebonus
	geldig altijd
		De erebonus van een Gastlezer moet gesteld worden op 25 €.

Regel bepaal de toeslag
	geldig altijd
		De toeslag van een Gastlezer moet gesteld worden op 5 €.
```

## Rekenvoorbeelden

De kop van de testset staat in een cel van zichzelf — de gewone vorm van een
notebook ([N-2]) — en er valt in deze cel dus niets uit te voeren.

```testspraak
Testset Erebonus van een gastlezer
Rekendatum 01-06-2027
```

### Een voorbeeld met één verwachting die niet uitkomt

De toeslag is met opzet verkeerd opgeschreven, zodat de cel zowel een geslaagde
als een mislukte verwachting laat zien.

```testspraak
Testgeval 001
	Gegeven een Gastlezer (G1)

	Verwacht G1 met
		erebonus  25,00 EUR
		toeslag  10,00 EUR
```

### Een voorbeeld dat niets controleert

```testspraak
Testgeval 002
	Gegeven een Gastlezer (G2)
```

### Een voorbeeld waarvan de verwachting een cel verderop staat

Dit is de vorm waar §4.6 over gaat: het testgeval staat in de ene cel en wat het
verwacht in de volgende, met de uitleg ertussen. De cellen zijn samen één
document ([N-3]), dus de zin loopt gewoon door — en de mislukte verwachting
staat dan in een *andere* cel dan het `Testgeval` waar ze bij hoort, wat de enige
plek is waar `TestAssertion.uri` iets anders zegt dan de cel van het testgeval.

```testspraak
Testgeval 003
	Gegeven een Gastlezer (G3)
```

De toeslag is hier met dezelfde opzet verkeerd opgeschreven als in 001.

```testspraak
	Verwacht G3 met
		toeslag  10,00 EUR
```
