# Ontwikkelfixture (Markdown)

Deze map wordt geopend door de "Launch Client"-startconfiguratie. Dit bestand is
er voor de Markdown-injectie: een codeblok met de taalnaam `regelspraak` hoort
gekleurd te worden zoals een `.rgs`-bestand, en binnen dat blok hoort de
taalconfiguratie van RegelSpraak te gelden — `//` als commentaarteken, niet
`<!-- -->`.

Gewone markdown-tekst; hier geldt dat allemaal niet.

```regelspraak
Objecttype het Lid (mv: Leden) (bezield)
	--- identificatie
	het pasnummer                   Tekst;
	de inschrijfdatum               Datum in dagen;

Regel Jeugdlid
	geldig altijd
		Een Lid is jeugdlid
		indien zijn lidmaatschapsduur kleiner is dan 3 jaar.
```

Een blok in een andere taal blijft ongemoeid:

```json
{ "Objecttype": "geen RegelSpraak" }
```
