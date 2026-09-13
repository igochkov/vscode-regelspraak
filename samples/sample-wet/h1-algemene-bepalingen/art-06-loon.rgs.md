# Artikel 6. Loon

*Het tweede artikel waar het geld vandaan komt. Artikel 5a zegt hoeveel uren,
dit artikel zegt hoeveel loon — en samen maken ze de vraag van artikel 18b
beantwoordbaar: is er genoeg betaald?*

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde worden onder loon
verstaan de geldelijke inkomsten uit hoofde van de dienstbetrekking, met
uitzondering van:

- a. vakantiebijslagen;
- b. winstuitkeringen;
- c. uitkeringen bij bijzondere gelegenheden;
- d. uitkeringen ingevolge aanspraken om na verloop van tijd of onder een
  voorwaarde één of meer uitkeringen te ontvangen;
- e. vergoedingen voor zover zij geacht kunnen worden te strekken tot
  bestrijding van noodzakelijke kosten, die de werknemer in verband met zijn
  dienstbetrekking heeft te maken, waaronder in ieder geval worden begrepen
  kosten voor reizen, huisvesting of voeding;
- f. een transitievergoeding als bedoeld in
  [artikel 673 van Boek 7 van het Burgerlijk Wetboek](https://wetten.overheid.nl/jci1.3:c:BWBR0005290&boek=7&artikel=673&z=2026-07-01&g=2026-07-01);
- g. uitkeringen ingevolge een spaarloonregeling als bedoeld in
  [artikel 32, eerste lid, van de Wet op de loonbelasting 1964](https://wetten.overheid.nl/jci1.3:c:BWBR0002471&artikel=32&z=2026-07-01&g=2026-07-01);
- h. eindejaarsuitkeringen;
- i. een werkgeversbijdrage in de premie voor de ziektekostenverzekering van een
  persoon, bedoeld in
  [artikel 2, tweede lid, onderdeel a, van de Zorgverzekeringswet](https://wetten.overheid.nl/jci1.3:c:BWBR0018450&artikel=2&z=2026-07-01&g=2026-07-01).

Negen uitzonderingen, en samen zijn ze **één** grootheid met negen coördinaten.
Dat is een dimensie (§13.3.7) en niet negen attributen, om drie redenen die alle
drie over leesbaarheid gaan: negen attributen zouden negen keer `verminderd met`
op één regel vragen (een zin mag niet worden afgebroken), er zou niets in het
model staan dat zegt dat die negen bij elkaar horen, en de opsomming van de wet
zou over negen plaatsen verspreid raken. Nu staat zij één keer, in
[`gegevens/dimensies.rgs`](../gegevens/dimensies.rgs), in de volgorde en met de
letters van de wet.

```regelspraak
Regelgroep loon

// Bron: [art. 6 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=6&lid=1&g=2026-07-01&z=2026-07-01)
Regel Loon over het uitbetalingstijdvak
	geldig altijd
		Het loon van een Uitbetalingstijdvak moet berekend worden als zijn geldelijke inkomsten verminderd met de som van zijn uitgezonderde inkomsten over alle inkomstensoorten.
```

Eén regel voor een artikel van negen onderdelen, en dat is geen versimpeling:
`de som van … over alle inkomstensoorten` telt precies die negen op, en een
soort die een testgeval niet noemt draagt niets bij.

## Lid 2

Bij algemene maatregel van bestuur kunnen andere uitzonderingen dan de in het
eerste lid genoemde worden gesteld.

## Lid 3

Onze Minister kan regelen stellen naar welke wordt beoordeeld welke inkomsten
moeten worden aangemerkt als uitkeringen of vergoedingen als bedoeld in het
eerste lid, onder b tot en met h.

**Dit lid is de reden dat de negen soorten invoer zijn en geen rekenuitkomst.**
Of een betaling een *uitkering bij bijzondere gelegenheden* is, of een
*vergoeding tot bestrijding van noodzakelijke kosten*, is een kwalificatie — en
de wet zegt zelf dat de minister daar regels voor kan stellen. Een model dat die
kwalificatie zou uitrekenen zou iets beweren wat de wet uitdrukkelijk aan een
ander laat.

## Lid 4

Indien niet blijkt uit de arbeidsvoorwaarden en -omstandigheden die van
toepassing zijn op de dienstbetrekking van een werknemer die tijdelijk arbeid
verricht in een ander land dan waar hij gewoonlijk arbeid verricht of verblijft
of, en zo ja welke, onderdelen van een vergoeding strekken tot bestrijding van
noodzakelijke kosten, die deze werknemer heeft te maken in verband met het
verrichten van arbeid in een ander land dan waar hij gewoonlijk arbeid verricht
of verblijft, wordt de volledige vergoeding aangemerkt als vergoeding in de zin
van het eerste lid, onderdeel e.

*Ook dit is een kwalificatieregel: hij zegt wat er gebeurt als de
arbeidsvoorwaarden ergens over zwijgen, en hij verandert niet de rekensom maar
de waarde die erin gaat. In dit model komt hij uit op dezelfde coördinaat
`kostenvergoeding`, met als enige verschil dat er dan méér in staat.*

## Rekenvoorbeelden

```testspraak
Testset Loon
Rekendatum 01-08-2026
```

### Loon zonder uitzonderingen

```testspraak
Testgeval Alles is loon als er niets is uitgezonderd
	Gegeven een Uitbetalingstijdvak (Juli) met
		begindatum            01-07-2026
		einddatum             31-07-2026
		geldelijke inkomsten  2500,00 EUR

	Verwacht Juli met
		loon  2500,00 EUR
```

### De maand waarin de vakantiebijslag wordt uitbetaald

Juni, de maand van
[artikel 17 lid 1](../h3-minimumvakantiebijslag/art-17-tijdstip-van-uitbetaling.rgs.md):
de vakantiebijslag staat op de loonstrook en is geen loon. Wie hem meetelt
concludeert dat er genoeg is betaald terwijl het loon zelf onder het minimum
kan liggen.

```testspraak
Testgeval Vakantiebijslag is geen loon
	Gegeven een Uitbetalingstijdvak (Juni) met
		begindatum                                   01-06-2026
		einddatum                                    30-06-2026
		geldelijke inkomsten                         4700,00 EUR
		uitgezonderde inkomsten uit vakantiebijslag  2200,00 EUR

	Verwacht Juni met
		loon  2500,00 EUR
```

### Verschillende soorten in één tijdvak

December, met een eindejaarsuitkering, een reiskostenvergoeding en de
werkgeversbijdrage van onderdeel i.

```testspraak
Testgeval Alle uitgezonderde soorten worden bij elkaar opgeteld
	Gegeven een Uitbetalingstijdvak (December) met
		begindatum                                                              01-12-2026
		einddatum                                                               31-12-2026
		geldelijke inkomsten                                                    3480,00 EUR
		uitgezonderde inkomsten uit eindejaarsuitkering                         750,00 EUR
		uitgezonderde inkomsten uit kostenvergoeding                            138,00 EUR
		uitgezonderde inkomsten uit werkgeversbijdrage ziektekostenverzekering  92,00 EUR

	Verwacht December met
		loon  2500,00 EUR
```

### Het randgeval: alles is uitgezonderd

Een tijdvak waarin niet is gewerkt en alleen een transitievergoeding is betaald.
Het loon is 0, en dat is niet hetzelfde als leeg: het is een bedrag waaraan
[artikel 18b](../h4-toezicht/p2-bestuurlijke-boete/art-18b-overtredingen.rgs.md)
kan rekenen.

```testspraak
Testgeval Een tijdvak met alleen een transitievergoeding heeft geen loon
	Gegeven een Uitbetalingstijdvak (Eindafrekening) met
		begindatum                                       01-10-2026
		einddatum                                        31-10-2026
		geldelijke inkomsten                             6000,00 EUR
		uitgezonderde inkomsten uit transitievergoeding  6000,00 EUR

	Verwacht Eindafrekening met
		loon  0,00 EUR
```
