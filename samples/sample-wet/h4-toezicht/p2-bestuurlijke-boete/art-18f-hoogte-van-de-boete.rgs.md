# Artikel 18f. De hoogte van de bestuurlijke boete

## Lid 1

De bestuurlijke boete die voor een overtreding kan worden opgelegd bedraagt **ten
hoogste het bedrag van de vijfde categorie**, bedoeld in
[artikel 23, vierde lid, van het Wetboek van Strafrecht](https://wetten.overheid.nl/jci1.3:c:BWBR0001854&boek=Eerste&titeldeel=II&artikel=23&z=2026-07-01&g=2026-07-01).

Een plafond dat in een andere wet staat en daar tweejaarlijks wordt geïndexeerd
— per 1 januari 2026 € 110.000. Dus is het een parameter en geen getal in een
regel: zie [`gegevens/parameters.rgs`](../../gegevens/parameters.rgs).

## Lid 6

Onze Minister stelt **beleidsregels** vast waarin onder meer de boetebedragen
voor iedere overtreding worden vastgesteld. […]

**Dit lid is de reden dat de boetebedragen in dit model uit een tabel komen en
niet uit een regel.** Het zijn vijf bedragen — één per letter van
[artikel 18b lid 1](art-18b-overtredingen.rgs.md) — die per jaar verschillen en
die in een beleidsregel staan, niet in de wet.

Dat is geen parameter, want een parameter is één waarde. Het is geen beslistabel,
want die is een schrijfwijze voor regels en zou de bedragen in het model zetten.
Het is een **tabel van buiten**, met twee assen, en daar is `Gegevensbron` voor:

```
Gegevensbron de boetebedragen
	het soortnummer  Numeriek (positief geheel getal) (sleutel);
	het boetejaar    Numeriek (positief geheel getal) (sleutel);
	het boetebedrag  Bedrag;
```

Het model legt de **vorm** vast en de omgeving levert de **inhoud** — in dit
voorbeeld [`externe-tabellen/boetebedragen.csv`](../../externe-tabellen/boetebedragen.csv)
met het manifest ernaast. De bedragen erin zijn *voorbeeldbedragen* en geen echte
beleidsregel; dat staat ook in de metadata van de levering, en een run zegt welke
levering hij heeft gelezen met naam, manifest en sha256.

```regelspraak
Regelgroep hoogte van de bestuurlijke boete

// Bron: [art. 18f lid 6](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=6&g=2026-07-01&z=2026-07-01)
Regel Basisboetebedrag uit de beleidsregels
	geldig altijd
		Het basisboetebedrag van een Overtreding moet gesteld worden op het boetebedrag uit de boetebedragen bij zijn overtredingsnummer en het constateringsjaar.
		Daarbij geldt:
			het constateringsjaar is het jaar uit zijn constateringsdatum.
```

De sleutels gaan mee in de volgorde waarin ze zijn gedeclareerd, en een opzoeking
op een sleutel die de levering niet heeft is een **modelfout** en nooit `leeg` —
zodat een boete over een jaar waarvoor geen beleidsregel is geleverd een
zichtbare fout oplevert en niet een boete van nul.

## Lid 2 tot en met 5: recidive

Lid 2: onverminderd het eerste lid **verhoogt** de aangewezen ambtenaar de op te
leggen bestuurlijke boete **met 100 procent** van het boetebedrag, indien binnen
een tijdvak van vijf jaar voorafgaand aan de dag van constatering **een eerdere
overtreding** […] is geconstateerd en de bestuurlijke boete wegens de eerdere
overtreding onherroepelijk is geworden.

Lid 3: de verhoging bedraagt **200 procent** indien **zowel de overtreding als de
eerdere overtreding** […] zijn aangewezen als ernstige overtredingen.

Lid 4: onverminderd het eerste lid verhoogt […] **met 200 procent** indien binnen
vijf jaar **twee maal** een eerdere overtreding is geconstateerd […].

Lid 5: het tijdvak van vijf jaar is **tien jaar** indien de onherroepelijke
boetes zijn opgelegd wegens aangewezen ernstige overtredingen.

Drie verhogingen die elkaar uitsluiten, met een rangorde erin: 200% bij twee
eerdere overtredingen, 200% bij één eerdere ernstige overtreding waar ook deze
ernstig is, en 100% bij één eerdere overtreding zonder meer. Dat is een
**beslistabel**: de rijen op volgorde, en de eerste waarvan de voorwaarden
kloppen beslist.

```regelspraak
// Bron: [art. 18f lid 2](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=2&g=2026-07-01&z=2026-07-01)
// Bron: [art. 18f lid 3](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=3&g=2026-07-01&z=2026-07-01)
// Bron: [art. 18f lid 4](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=4&g=2026-07-01&z=2026-07-01)
Beslistabel Verhoging bij recidive
	geldig altijd
		|   | de verhogingsfactor van een Overtreding moet gesteld worden op | indien zijn recidivegetal groter of gelijk is aan | indien zijn ernstige overtreding gelijk is aan | indien zijn eerdere ernstige overtreding gelijk is aan |
		| 1 | 3                                                              | 2                                                 | n.v.t.                                         | n.v.t.                                                 |
		| 2 | 3                                                              | 1                                                 | waar                                           | waar                                                   |
		| 3 | 2                                                              | 1                                                 | n.v.t.                                         | n.v.t.                                                 |
		| 4 | 1                                                              | n.v.t.                                            | n.v.t.                                         | n.v.t.                                                 |
```

**Waarom een factor en niet een percentage.** De wet zegt "verhoogt … met 100
procent van het boetebedrag", dus is de boete het basisbedrag *plus* 100% ervan —
twee keer het basisbedrag. Een factor van 1, 2 of 3 zegt hetzelfde in één getal.

Dat het geen `Percentage` is heeft ook een reden van de taal: §6.4 laat een
percentage geen operand van `maal` zijn en §13.4.17 #12 schrijft een percentage
als *literal*, dus een percentage dat uit een tabel of een attribuut komt kan
niet worden vermenigvuldigd. Een factor kan dat wel, en het is bovendien het
enige getal waar de drie leden van dit artikel samen op uitkomen.

**Waarom de ernst een `Boolean` is en geen kenmerk.** Een conditiekolom van een
beslistabel draagt haar zin tot aan de operator en de datacel levert de waarde;
een kenmerkvraag heeft geen operator, dus is er niets voor de cel over. Met een
booleaans attribuut wordt de kolom `indien zijn ernstige overtreding gelijk is
aan` met `waar` in de cel, en dat werkt.

En de boete zelf, met het plafond van lid 1:

```regelspraak
// Bron: [art. 18f lid 1](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 18f lid 2](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18f&lid=2&g=2026-07-01&z=2026-07-01)
Regel Bestuurlijke boete
	geldig altijd
		De bestuurlijke boete van een Overtreding moet berekend worden als zijn basisboetebedrag maal zijn verhogingsfactor, met een maximum van het boetemaximum.
```

"Onverminderd het eerste lid" in lid 2 en lid 4 betekent dat het plafond ook na
de verhoging geldt, en dat is precies wat `met een maximum van` doet: eerst de
vermenigvuldiging, dan de begrenzing.

## Lid 7

In afwijking van
[artikel 8:69 van de Algemene wet bestuursrecht](https://wetten.overheid.nl/jci1.3:c:BWBR0005537&artikel=8:69&z=2026-07-01&g=2026-07-01)
kan de rechter in beroep of hoger beroep de hoogte van de bestuurlijke boete ook
ten nadele van de belanghebbende wijzigen.

*Een procesrechtelijke bepaling over wat een rechter mag. Geen rekensom, en geen
grootheid die dit model heeft.*

## Rekenvoorbeelden

De rekenvoorbeelden hieronder geven de tabel een **miniatuur** mee: een paar
rijen in het testgeval zelf, zoals `Parameters` een parameter een waarde geeft.
De andere vorm — een `Gegevensbronnen`-blok dat de hele testset aan de levering
op schijf bindt — staat in
[`tests/boetebedragen.test.rgs`](../../tests/boetebedragen.test.rgs), met daar
ook de reden dat zij daar staat en niet hier.

```testspraak
Testset Hoogte van de bestuurlijke boete
Rekendatum 01-08-2026
Parameterset Minimumloonbedragen per 1 juli 2026

Testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven de boetebedragen met de rijen
		1, 2026 : 2000,00 EUR
		2, 2026 : 1250,00 EUR
		3, 2026 : 1250,00 EUR
		4, 2026 : 500,00 EUR
		5, 2026 : 500,00 EUR
		1, 2027 : 2100,00 EUR
```

### Een eerste overtreding

Onderbetaling (soort 1) in 2026: € 2.000,00 uit de tabel, geen verhoging.

```testspraak
Testgeval Een eerste overtreding levert het basisbedrag op
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Eerste keer) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 0
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht Eerste keer met
		basisboetebedrag    2000,00 EUR
		verhogingsfactor    1
		bestuurlijke boete  2000,00 EUR
```

### Lid 2: één eerdere overtreding verhoogt met 100 procent

```testspraak
Testgeval Eén eerdere overtreding verdubbelt de boete
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Tweede keer) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 1
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht Tweede keer met
		verhogingsfactor    2
		bestuurlijke boete  4000,00 EUR
```

### Lid 3: twee ernstige overtredingen verhogen met 200 procent

Hetzelfde recidivegetal als hierboven, met beide overtredingen ernstig. Dit is
het randgeval dat rij 2 van de tabel bestaat: zonder die rij zou rij 3 vuren en
zou de boete € 4.000,00 zijn in plaats van € 6.000,00.

```testspraak
Testgeval Twee ernstige overtredingen verdrievoudigen de boete
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Ernstige recidive) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 1
		ernstige overtreding          waar
		eerdere ernstige overtreding  waar

	Verwacht Ernstige recidive met
		verhogingsfactor    3
		bestuurlijke boete  6000,00 EUR
```

### Eén van de twee ernstig is niet genoeg

Lid 3 zegt "**zowel** de overtreding **als** de eerdere overtreding". Waar
alleen deze ernstig is geldt lid 2 en niet lid 3.

```testspraak
Testgeval Alleen deze overtreding ernstig geeft de gewone verdubbeling
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Half ernstig) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 1
		ernstige overtreding          waar
		eerdere ernstige overtreding  onwaar

	Verwacht Half ernstig met
		verhogingsfactor    2
		bestuurlijke boete  4000,00 EUR
```

### Lid 4: twee eerdere overtredingen verhogen met 200 procent

Zonder dat ze ernstig hoeven te zijn. Rij 1 van de tabel staat bovenaan omdat zij
de zwaarste is, en de rijorde is wat haar laat winnen van rij 3.

```testspraak
Testgeval Twee eerdere overtredingen verdrievoudigen de boete
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Derde keer) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 2
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht Derde keer met
		verhogingsfactor    3
		bestuurlijke boete  6000,00 EUR
```

### Een andere overtreding, een ander bedrag

Soort 4 is het niet schriftelijk overeenkomen van stukloonwerk
([artikel 12b](../../h2-minimumloon/art-12b-specifieke-werkzaamheden.rgs.md)):
€ 500,00.

```testspraak
Testgeval De soort van de overtreding bepaalt het bedrag
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (Stukloon) met
		constateringsdatum            15-07-2026
		overtredingsnummer            4
		recidivegetal                 0
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht Stukloon met
		basisboetebedrag    500,00 EUR
		bestuurlijke boete  500,00 EUR
```

### Een ander jaar, een andere beleidsregel

Dezelfde overtreding, geconstateerd in 2027: de tweede as van de tabel.

```testspraak
Testgeval Het jaar van constatering bepaalt welke beleidsregel geldt
	Rekendatum 01-08-2026
	Gegeven testinitialisatie de beleidsregelbedragen van 2026 en 2027
	Gegeven een Overtreding (In 2027) met
		constateringsdatum            15-03-2027
		overtredingsnummer            1
		recidivegetal                 0
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht In 2027 met
		basisboetebedrag    2100,00 EUR
		bestuurlijke boete  2100,00 EUR
```

### Het plafond van lid 1

Een miniatuur vervangt de levering voor dit ene testgeval, met een basisbedrag
dat na verdrievoudiging boven de vijfde categorie uitkomt: 3 maal € 50.000,00 is
€ 150.000,00, en het plafond is € 110.000.

```testspraak
Testgeval De boete wordt afgekapt op de vijfde categorie
	Gegeven de boetebedragen met de rijen
		1, 2026 : 50000,00 EUR
	Gegeven een Overtreding (Groot) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 2
		ernstige overtreding          waar
		eerdere ernstige overtreding  waar

	Verwacht Groot met
		basisboetebedrag    50000,00 EUR
		verhogingsfactor    3
		bestuurlijke boete  110000,00 EUR
```

### Precies op het plafond

Het randgeval van `met een maximum van`: 3 maal € 36.666,66 is € 109.999,98 en
wordt niet afgekapt; één cent meer per basisbedrag wel.

```testspraak
Testgeval Onder het plafond wordt niets afgekapt
	Gegeven de boetebedragen met de rijen
		1, 2026 : 36666,66 EUR
	Gegeven een Overtreding (Net eronder) met
		constateringsdatum            15-07-2026
		overtredingsnummer            1
		recidivegetal                 2
		ernstige overtreding          onwaar
		eerdere ernstige overtreding  onwaar

	Verwacht Net eronder met
		bestuurlijke boete  109999,98 EUR
```
