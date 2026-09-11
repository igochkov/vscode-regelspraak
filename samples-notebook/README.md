# Hoofdstuk 10 van het reglement, als notebooks

Dit is het voorbeeld van **juridische modus**: de tekst van het reglement en de
RegelSpraak die haar uitrekent staan in één document, in de volgorde die de tekst
heeft. Elk notebook is één artikel, de mappen erboven zijn de niveaus die het
document zelf heeft, en onder elke bepaling staat het rekenvoorbeeld dat haar
narekent.

```
h10-leeskringen/     een map per niveau dat het document heeft
  art-19-...rgs.md   een notebook per artikel
gegevens/            de declaraties, in technische modus ernaast
```

Open een `.rgs.md` en VS Code opent hem als notebook: de tekst leest als tekst,
de cellen zijn RegelSpraak, en op een `testspraak`-cel staat een knop. **Je voert
het rekenvoorbeeld uit, niet de regel.** *Openen met → Teksteditor* laat zien dat
er gewoon Markdown onder ligt, en **Reglement bekijken** geeft het hele artikel
als één doorlopend document.

Twee dingen die dit voorbeeld met opzet niet is. Het is **geen tweede exemplaar
van [samples/](../samples)**: dat is hetzelfde reglement in technische modus, met
de artikelen 1 tot en met 18, en de artikelen hier staan daar niet. En het is
**geen volledige rondleiding langs de taal** -- daarvoor is `samples/`, waarin
elke constructie van beide talen één keer voorkomt.

De mappen zijn twee werkmappen en dus twee modellen ([N-10]): allebei
declareren ze `het Lid` en allebei kennen ze een `Regel Jeugdlid`, met andere
inhoud, en ze weten niets van elkaar. Open ze samen en de modelverkenner zet elk
onder de naam van zijn eigen map.

Hoe je zelf zo'n reglement opzet, staat in
[docs/AUTHORING.md](../docs/AUTHORING.md).
