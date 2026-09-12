# Artikel 12b. De schriftelijke stukloonovereenkomst

Indien de werkgever **schriftelijk met de werknemer overeenkomt** specifieke
werkzaamheden te verrichten die zijn aangewezen op grond van
[artikel 12a, eerste lid](art-12a-stukloonnormen.rgs.md), wordt in afwijking van
[artikel 5a, tweede lid](../h1-algemene-bepalingen/art-05a-arbeidsduur.rgs.md),
voor de toepassing van het bij of krachtens deze wet bepaalde als arbeidsduur
aangemerkt: de tijd die overeenkomstig de door de Stichting van de Arbeid
bekendgemaakte berekening, bedoeld in [artikel 12a](art-12a-stukloonnormen.rgs.md),
met de uitvoering van de te verrichten arbeid is gemoeid.

## Wat dit artikel oplevert

De rekengevolgen van dit artikel zijn die van artikel 12a: de arbeidsduur wordt
anders gemeten, en dat is invoer.

Maar het **schriftelijkheidsvereiste** is een echte norm, en
[artikel 18b lid 1 onder d](../h4-toezicht/p2-bestuurlijke-boete/art-18b-overtredingen.rgs.md)
maakt het niet nakomen ervan een beboetbare overtreding. Dat is dus wél iets dat
het model kan afleiden: waar stukloonwerk is aangewezen en de overeenkomst niet
schriftelijk is, ontbreekt er iets wat er had moeten zijn.

```regelspraak
Regelgroep specifieke werkzaamheden

// Bron: [art. 12b](jci1.3:c:BWBR0002638&hoofdstuk=II&artikel=12b&g=2026-07-01&z=2026-07-01)
// Bron: [art. 18b lid 1 onder d](jci1.3:c:BWBR0002638&hoofdstuk=IV&artikel=18b&lid=1&g=2026-07-01&z=2026-07-01)
Regel Ontbrekende schriftelijke stukloonovereenkomst
	geldig altijd
		Een Arbeidsverhouding heeft een ontbrekende stukloonovereenkomst
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is stukloonwerk
			• hij heeft geen schriftelijke stukloonovereenkomst.
```

**Dit is een kenmerk en geen consistentieregel, en de reden is een valkuil van de
taal.** Een consistentieregel met een bulletlijst kan geen `indien` achter zich
hebben: de voorwaarde bindt dan aan het laatste criterium in plaats van aan de
regel, de zin ontleedt zonder klacht, en er komt een ander getal uit. Een kenmerk
met een samengestelde voorwaarde heeft dat probleem niet.

Het past ook beter bij wat de wet doet. Artikel 12b zegt niet "dit moet" maar
"indien dit is overeengekomen, dan geldt dat" — de sanctie staat in hoofdstuk IV,
en daar hoort zij ook: één overtreding, één plaats waar haar hoogte wordt
bepaald.

## Rekenvoorbeelden

```testspraak
Testset Specifieke werkzaamheden
Rekendatum 01-08-2026
```

### Stukloonwerk met een schriftelijke overeenkomst

```testspraak
Testgeval Schriftelijk overeengekomen stukloonwerk is in orde
	Gegeven een Arbeidsverhouding (Stuklooncontract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		is stukloonwerk
		heeft een schriftelijke stukloonovereenkomst

	Verwacht Stuklooncontract met
		heeft geen ontbrekende stukloonovereenkomst
```

### Stukloonwerk zonder schriftelijke overeenkomst

```testspraak
Testgeval Stukloonwerk zonder schriftelijke overeenkomst is een overtreding
	Gegeven een Arbeidsverhouding (Stuklooncontract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht
		is stukloonwerk

	Verwacht Stuklooncontract met
		heeft een ontbrekende stukloonovereenkomst
	Verwacht regelversie Ontbrekende schriftelijke stukloonovereenkomst is gevuurd
```

### Geen stukloonwerk, dus niets te ontbreken

Het randgeval dat het eerste criterium ontmaskert: een gewone
arbeidsovereenkomst zonder schriftelijke stukloonovereenkomst is geen
overtreding, want er is geen stukloonwerk.

```testspraak
Testgeval Zonder stukloonwerk ontbreekt er niets
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht

	Verwacht Contract met
		heeft geen ontbrekende stukloonovereenkomst
	Verwacht regelversie Ontbrekende schriftelijke stukloonovereenkomst is niet gevuurd
```
