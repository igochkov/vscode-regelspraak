# Artikel 10. Een lager minimumloon bij besluit van de minister

## Lid 1

Onze Minister kan op verzoek van een werkgever of van een
rechtspersoonlijkheid bezittende organisatie van werkgevers of werknemers het
minimumloon van tot een door hem aangewezen categorie behorende werknemers in
een onderneming dan wel een tak van bedrijf of beroep voor een door hem te
bepalen termijn **op lagere dan de krachtens
[artikel 8](art-08-hoogte-van-het-minimumloon.rgs.md) geldende bedragen
vaststellen**, indien naar zijn oordeel het voortbestaan van of de omvang der
bedrijvigheid in die onderneming dan wel die tak van bedrijf of beroep ernstig
wordt bedreigd. Aan deze vaststelling kunnen voorwaarden worden verbonden. Op
een verzoek wordt niet beslist, zolang niet is gebleken, dat de verzoeker met de
naar het oordeel van Onze Minister representatieve organisaties van werknemers
onderscheidenlijk werkgevers ter zake overleg heeft gepleegd.

## Lid 2

Onze Minister kan een besluit van de in het eerste lid bedoelde strekking ten
aanzien van tot door hem aangewezen categorieën behorende werknemers, die
uitsluitend of in hoofdzaak huishoudelijke of persoonlijke diensten verrichten
in de huishouding van natuurlijke personen, ook ambtshalve nemen.

## Lid 3

Een besluit tot toepassing van het eerste of het tweede lid ten aanzien van
werknemers in een tak van bedrijf of beroep wordt in de *Staatscourant* bekend
gemaakt.

## Wat hier wél een regel is, en wat niet

Of de minister zo'n besluit neemt, en op welk bedrag, is **niet** iets dat een
model uitrekent: lid 1 zegt "naar zijn oordeel", en dat is de definitie van een
beoordeling. Dus is het lagere bedrag invoer.

Maar zodra er zo'n besluit is, verandert er iets in de uitkomst — en dat is een
regel. Artikel 10 is een *afwijking van* artikel 8, en de vorm daarvoor is
dezelfde als bij artikel 9: artikel 8 initialiseert, artikel 10 overschrijft.

```regelspraak
Regelgroep lager minimumloon

// Bron: [art. 10 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=10&lid=1&g=2026-07-01&z=2026-07-01)
Regel Lager minimumuurloon krachtens artikel 10
	geldig vanaf 01-01-2024
		Het minimumuurloon van een Natuurlijke persoon moet gesteld worden op zijn bij besluit verlaagde minimumuurloon
		indien hij aan alle volgende voorwaarden voldoet:
			• hij heeft een recht op minimumloon
			• zijn bij besluit verlaagde minimumuurloon is gevuld.
```

**Dat de regels van artikel 8 en 10 in twee verschillende notebooks staan doet
niets voor de orde waarin zij vuren.** RegelSpraak leidt af op afhankelijkheid en
niet op tekstuele volgorde: een initialisatie van een attribuut komt vóór een
gelijkstelling van dat attribuut, waar die ook staat. De laatste testgeval
hieronder is er om dat te bewijzen — want een model waarin dit *niet* zou
kloppen zou afhankelijk van de bestandsvolgorde een ander bedrag opleveren, en
dat is de soort fout die je nooit terugvindt.

Het tweede criterium (`is gevuld`) is wat de regel stil houdt waar geen besluit
is. Zonder dat criterium zou hij `leeg` over het bedrag van artikel 8 heen
schrijven, en dan zou elke werknemer in Nederland een leeg minimumuurloon
hebben.

## Rekenvoorbeelden

```testspraak
Testset Lager minimumloon
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie een werkgever en een betrekking
	Gegeven een Werkgever (Kwekerij) met
		handelsnaam  "Kwekerij De Zonnehoek"
		heeft een vestiging binnen het Rijk
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		heeft een vervulling binnen het Rijk
	Gegeven Kwekerij heeft Contract als aanstelling
```

### Zonder besluit geldt artikel 8

```testspraak
Testgeval Zonder besluit geldt het bedrag van artikel 8
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum  14-09-1998
		heeft een woonplaats binnen het Rijk
	Gegeven Noor heeft Contract als betrekking

	Verwacht Noor met
		staffelminimumuurloon  14,99 EUR/uur
		minimumuurloon         14,99 EUR/uur
	Verwacht regelversie Lager minimumuurloon krachtens artikel 10 is niet gevuurd
```

### Met besluit gaat het lagere bedrag voor

Dit is het geval dat zegt dat een gelijkstelling in dit notebook een
initialisatie in dat van artikel 8 overschrijft — en dat `het
staffelminimumuurloon` ondertussen onveranderd blijft, want dat is wat de
staffel zegt en niet wat de minister besliste.

```testspraak
Testgeval Een besluit krachtens artikel 10 gaat voor artikel 8
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum                         14-09-1998
		heeft een woonplaats binnen het Rijk
		bij besluit verlaagde minimumuurloon  12,50 EUR/uur
	Gegeven Noor heeft Contract als betrekking

	Verwacht Noor met
		staffelminimumuurloon  14,99 EUR/uur
		minimumuurloon         12,50 EUR/uur
	Verwacht regelversie Lager minimumuurloon krachtens artikel 10 is gevuurd
```

### Een besluit zonder recht op minimumloon doet niets

Een kind van 14 heeft geen recht, dus valt er ook niets te verlagen. Het
randgeval dat het eerste criterium van de voorwaarde ontmaskert.

```testspraak
Testgeval Zonder recht op minimumloon verlaagt een besluit niets
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Fenna) met
		geboortedatum                         02-08-2012
		heeft een woonplaats binnen het Rijk
		bij besluit verlaagde minimumuurloon  12,50 EUR/uur
	Gegeven Fenna heeft Contract als betrekking

	Verwacht Fenna met
		heeft geen recht op minimumloon
		minimumuurloon  leeg
```

### Het lagere bedrag werkt door in wat verschuldigd is

152 uur maal € 12,50 in plaats van maal € 14,99: een verschil van € 378,48 over
één maand.

```testspraak
Testgeval Het verlaagde bedrag bepaalt wat verschuldigd is
	Gegeven testinitialisatie een werkgever en een betrekking
	Gegeven een Natuurlijke persoon (Noor) met
		geboortedatum                         14-09-1998
		heeft een woonplaats binnen het Rijk
		bij besluit verlaagde minimumuurloon  12,50 EUR/uur
	Gegeven Noor heeft Contract als betrekking
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur
	Gegeven Noor heeft Juli als tijdvak

	Verwacht Juli met
		verschuldigde minimumloon  1900,00 EUR
```
