# Artikel 5a. Arbeidsduur

*Sinds 1 januari 2024 is het minimumloon een uurloon
([artikel 8 lid 1 onder a](../h2-minimumloon/art-08-hoogte-van-het-minimumloon.rgs.md)),
en daarmee is dit artikel het artikel geworden waar het geld vandaan komt: wat
een werkgever moet betalen is de arbeidsduur maal het minimumuurloon, en dit
artikel zegt wat de arbeidsduur is.*

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde wordt verstaan
onder arbeidsduur: de tijd dat de werknemer in dienstbetrekking arbeid verricht
of de tijd waarover hij recht op loon heeft als bedoeld in
[artikel 7, vijfde lid](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&z=2026-07-01&g=2026-07-01).

De "of" in deze zin is een **optelling** en geen keuze. Het gaat om twee stukken
tijd die niet samenvallen — gewerkte tijd, en tijd waarover loon doorloopt
zonder dat er is gewerkt (ziekte, verlof, de gevallen van artikel 7 lid 5) — en
allebei tellen ze mee. Zo leest de Rijksoverheid het ook: voor de arbeidsduur
tellen de gewerkte uren mee, de uren dat verlof is opgenomen, en de uren dat
iemand ziek was met recht op doorbetaling.

```regelspraak
Regelgroep arbeidsduur

// Bron: [art. 5a lid 1](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=5a&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 7 lid 5](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=7&lid=5&g=2026-07-01&z=2026-07-01)
Regel Arbeidsduur van het uitbetalingstijdvak
	geldig altijd
		De arbeidsduur van een Uitbetalingstijdvak moet berekend worden als zijn verrichte arbeidstijd plus zijn tijd met recht op loon.
```

Dat `plus` een lege operand als 0 leest is hier precies goed: een tijdvak waarin
niemand ziek was noemt de tweede term helemaal niet, en dan is de arbeidsduur de
gewerkte tijd. Een `gedeeld door` zou op diezelfde lege waarde een run-time fout
geven; een optelling niet.

## Lid 2

Voor zover het loon niet naar tijdruimte is vastgesteld maar afhankelijk is van
de uitvoering van de verrichte arbeid, wordt voor de toepassing van het bij of
krachtens deze wet bepaalde als arbeidsduur aangemerkt: de daadwerkelijke tijd
die de werknemer heeft besteed aan de uitvoering van de verrichte arbeid.

## Lid 3

Ten aanzien van degene die op grond van
[artikel 2, tweede en krachtens het derde lid](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&z=2026-07-01&g=2026-07-01),
in dienstbetrekking staat, wordt de arbeidsduur bepaald door de tijd die gemoeid
is met de uitvoering van de werkzaamheden.

*Lid 2 en lid 3 leveren geen eigen regel op, en dat is een uitspraak over het
model en niet een weglating. Ze zeggen niet dat de arbeidsduur iets anders is
maar dat zij anders wordt **gemeten**: bij stukloon de daadwerkelijk bestede
tijd, bij een overeenkomst van opdracht de tijd die met de uitvoering gemoeid
is. Dat is in dit model dezelfde grootheid `de verrichte arbeidstijd`, en hoe
zij is vastgesteld is invoer. Artikel 12a en 12b gaan over precies die
vaststelling, en ook daar is het antwoord dat een beleidsregel het zegt en niet
een rekenregel.*

## Rekenvoorbeelden

```testspraak
Testset Arbeidsduur
Rekendatum 01-08-2026
```

### Alleen gewerkte tijd

```testspraak
Testgeval Een tijdvak zonder doorbetaalde afwezigheid
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum             01-07-2026
		einddatum              31-07-2026
		verrichte arbeidstijd  152 uur

	Verwacht Juli met
		arbeidsduur  152 uur
```

### Gewerkte tijd en doorbetaalde afwezigheid

```testspraak
Testgeval Verlof en ziekte tellen mee in de arbeidsduur
	Gegeven een Uitbetalingstijdvak (Augustus) met
		begindatum              01-08-2026
		einddatum               31-08-2026
		verrichte arbeidstijd   120 uur
		tijd met recht op loon  32 uur

	Verwacht Augustus met
		arbeidsduur  152 uur
```

### Een tijdvak waarin niet is gewerkt

De hele maand ziek: de arbeidsduur is de doorbetaalde tijd, en die is niet nul.
Dit is het randgeval dat de "of" van lid 1 als optelling ontmaskert — wie hem
als keuze leest komt hier op de gewerkte tijd uit, en die is 0.

```testspraak
Testgeval Een maand ziekte levert een volle arbeidsduur op
	Gegeven een Uitbetalingstijdvak (September) met
		begindatum              01-09-2026
		einddatum               30-09-2026
		tijd met recht op loon  144 uur

	Verwacht September met
		arbeidsduur  144 uur
```

### Een gedeeltelijk uur

Twee decimalen, want een kwartier is 0,25 uur en een minimumloon per uur moet
op een kwartier uitkomen.

```testspraak
Testgeval De arbeidsduur telt kwartieren mee
	Gegeven een Uitbetalingstijdvak (Week) met
		begindatum              03-08-2026
		einddatum               09-08-2026
		verrichte arbeidstijd   36,25 uur
		tijd met recht op loon  1,75 uur

	Verwacht Week met
		arbeidsduur  38 uur
```
