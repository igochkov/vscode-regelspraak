# Ontwikkelfixture (Markdown)

Deze map wordt geopend door de "Launch Client"-startconfiguratie. Dit bestand is
er voor de Markdown-injectie: een codeblok met de taalnaam `regelspraak` hoort
gekleurd te worden zoals een `.rgs`-bestand, en binnen dat blok hoort de
taalconfiguratie van RegelSpraak te gelden — `//` als commentaarteken, niet
`<!-- -->`.

Gewone markdown-tekst; hier geldt dat allemaal niet.

```regelspraak
Objecttype de Kruidentuin (mv: Kruidentuinen)
	de oppervlakte                       Numeriek (geheel getal) met eenheid m2;
	is openbaar                          kenmerk (bijvoeglijk);

Regel bepaal oppervlakte
	geldig altijd
		De oppervlakte van een Kruidentuin moet gesteld worden op 100 m2.
```

Een blok in een andere taal blijft ongemoeid:

```json
{ "Objecttype": "geen RegelSpraak" }
```
