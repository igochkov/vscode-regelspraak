# Artikel 1. Begripsbepalingen

*De [Wet minimumloon en minimumvakantiebijslag](https://wetten.overheid.nl/jci1.3:c:BWBR0002638&z=2026-07-01&g=2026-07-01),
geschreven in juridische modus: de tekst van de wet en de RegelSpraak die haar
uitrekent staan in één document, in de volgorde die de wet heeft, en onder elke
bepaling staat het rekenvoorbeeld dat haar narekent. Deze uitgave volgt de
geconsolideerde tekst van **1 juli 2026** — de zichtdatum en de
geldigheidsdatum staan in elke bronverwijzing.*

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde wordt verstaan
onder:

- a. **Onze Minister**: Onze Minister van Sociale Zaken en Werkgelegenheid;
- b. **publiekrechtelijke regeling**: een regeling als bedoeld in
  [artikel 5](https://wetten.overheid.nl/jci1.3:c:BWBR0002698&artikel=5&g=2026-07-01&z=2026-07-01)
  of [6 van de Wet op de loonvorming](https://wetten.overheid.nl/jci1.3:c:BWBR0002698&artikel=6&g=2026-07-01&z=2026-07-01).

## Lid 2

Voor de toepassing van het bij of krachtens deze wet bepaalde worden onder
**collectieve arbeidsovereenkomst** mede verstaan bepalingen van een collectieve
arbeidsovereenkomst, welke krachtens
[artikel 2 van de Wet AVV](https://wetten.overheid.nl/jci1.3:c:BWBR0001987&artikel=2&g=2026-07-01&z=2026-07-01)
algemeen verbindend zijn verklaard.

## Waarom hier geen regel staat

Dit artikel wijst twee woorden aan en rekent niets uit. *Onze Minister* is een
ambt en geen gegeven: geen enkele uitkomst van deze wet verandert als je weet
wie het is. En *publiekrechtelijke regeling* en *collectieve
arbeidsovereenkomst* zijn de bronnen waarin een afwijking mag staan — artikel
16 lid 1 en artikel 11 lid 2 doen dat — maar of er zo'n regeling is, en wat er
in staat, is invoer.

Een kop zonder cel eronder is de gewone vorm van een wet in juridische modus:
de meeste bepalingen van een wet zijn geen rekenregel, en het model dat doet
alsof dat wel zo is liegt over allebei.

## Waarom de declaraties niet in dit notebook staan

Bij een wet is dit hét artikel waar je ze zou verwachten: de
begripsbepalingen zijn de plaats waar de wet zelf haar gegevens definieert. Ze
staan toch in [`gegevens/`](../gegevens/), en de reden is dat een objecttype
over het **hele** document heen wordt samengesteld. `de Natuurlijke persoon`
krijgt zijn `leeftijd` van artikel 7, zijn `minimumuurloon` van artikel 8, en
zijn kenmerk `is werknemer` van artikel 4 — er is geen artikel waar hij bij
hoort, dus is hij gegroepeerd naar wat hij *is* en niet naar waar hij vandaan
komt.

`docs/AUTHORING.md` laat beide plaatsingen toe en zegt waarom: `regels/` volgt
het document, `gegevens/` volgt het model, en dat zijn twee verschillende
indelingen die je niet op elkaar moet forceren. In dit model staat wel bij elke
declaratie een `// Bron:`-regel naar de bepaling waar zij uit voortkomt, dus de
weg terug is er.
