# Artikel 2. Dienstbetrekking

*Het eerste artikel van de wet dat werkelijk iets bepaalt: welke
arbeidsverhoudingen dienstbetrekking zijn. Daar hangt de hele wet aan — artikel
4 maakt iemand werknemer omdat hij in dienstbetrekking staat, artikel 7 geeft de
werknemer recht op minimumloon, en artikel 15 geeft hem vakantiebijslag.*

## Lid 1

Voor de toepassing van het bij of krachtens deze wet bepaalde wordt onder
dienstbetrekking verstaan de dienstbetrekking krachtens arbeidsovereenkomst naar
burgerlijk recht.

## Lid 2

Onder dienstbetrekking wordt mede verstaan de arbeidsverhouding van degene, die
krachtens overeenkomst van opdracht met een ander tegen beloning:

- a. geregeld bemiddeling verleent bij het tot stand komen van overeenkomsten
  van die ander, of een opdrachtgever van deze, met derden, mits hij die
  bemiddeling uitsluitend voor die ander verleent, het verlenen van die
  bemiddeling niet een voor hem bijkomstige werkzaamheid is en hij zich daarbij
  doorgaans niet door meer dan twee andere personen laat bijstaan; of
- b. arbeid verricht, tenzij deze overeenkomst is aangegaan in de uitoefening
  van bedrijf of in de zelfstandige uitoefening van beroep.

Onderdeel b heeft een *tenzij*, en die staat hier apart. Dat is niet
opsmuk: een voorwaarde die je in de grote samengestelde voorwaarde meeneemt zou
een derde niveau bullets nodig hebben, en drie niveaus leest niemand meer na.
Zo is het één kenmerk met twee criteria, en heeft het de naam die de uitzondering
beschrijft.

```regelspraak
Regelgroep dienstbetrekking

// Bron: [art. 2 lid 2 onder b](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&lid=2&g=2026-07-01&z=2026-07-01)
Regel Arbeid tegen beloning buiten bedrijf
	geldig altijd
		Een Arbeidsverhouding heeft een arbeid tegen beloning buiten bedrijf
		indien hij aan alle volgende voorwaarden voldoet:
			• hij heeft een arbeid tegen beloning
			• hij heeft geen zelfstandige beroepsuitoefening.
```

De gelijkstelling van lid 2 zelf: een overeenkomst van opdracht is
dienstbetrekking als zij onder a **of** onder b valt.

```regelspraak
// Bron: [art. 2 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&lid=2&g=2026-07-01&z=2026-07-01)
Regel Gelijkstelling van de overeenkomst van opdracht
	geldig altijd
		Een Arbeidsverhouding heeft een gelijkstelling krachtens artikel 2
		indien hij aan alle volgende voorwaarden voldoet:
			• hij is overeenkomst van opdracht
			• hij voldoet aan ten minste één van de volgende voorwaarden:
				•• hij heeft een bemiddeling tegen beloning
				•• hij heeft een arbeid tegen beloning buiten bedrijf.
```

## Lid 3

Bij of krachtens algemene maatregel van bestuur kunnen regels worden gesteld
ingevolge welke de arbeidsverhouding van degene, die tegen beloning arbeid
verricht en wiens arbeidsverhouding niet reeds ingevolge het eerste of tweede
lid als dienstbetrekking wordt beschouwd, doch hiermede maatschappelijk gelijk
kan worden gesteld, eveneens onder dienstbetrekking wordt verstaan.

*Dit lid levert geen regel op, en dat is een inhoudelijke uitspraak en geen
weglating: het geeft een bevoegdheid aan de regering en niet een norm aan een
werkgever. Wat er krachtens dit lid geldt staat in een algemene maatregel van
bestuur, en die is een eigen regeling met een eigen model.*

## De hoofdregel van dit artikel

Lid 1 en lid 2 samen, met de uitzondering van
[artikel 3](../h1-algemene-bepalingen/art-03-uitzonderingen.rgs.md) eraf.

```regelspraak
// Bron: [art. 2 lid 1](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&lid=1&g=2026-07-01&z=2026-07-01)
// Bron: [art. 2 lid 2](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=2&lid=2&g=2026-07-01&z=2026-07-01)
// Bron: [art. 3](jci1.3:c:BWBR0002638&hoofdstuk=I&artikel=3&g=2026-07-01&z=2026-07-01)
Regel Dienstbetrekking
	geldig altijd
		Een Arbeidsverhouding is dienstbetrekking
		indien hij aan alle volgende voorwaarden voldoet:
			• hij voldoet aan ten minste één van de volgende voorwaarden:
				•• hij is arbeidsovereenkomst naar burgerlijk recht
				•• hij heeft een gelijkstelling krachtens artikel 2
			• hij heeft geen uitzondering krachtens artikel 3.
```

## Rekenvoorbeelden

```testspraak
Testset Dienstbetrekking
Rekendatum 01-08-2026
```

### De gewone arbeidsovereenkomst

```testspraak
Testgeval Een arbeidsovereenkomst naar burgerlijk recht is dienstbetrekking
	Gegeven een Arbeidsverhouding (Contract) met
		aanvangsdatum  01-01-2026
		is arbeidsovereenkomst naar burgerlijk recht

	Verwacht Contract met
		is dienstbetrekking
		heeft geen gelijkstelling krachtens artikel 2
```

### De bemiddelaar van lid 2 onder a

```testspraak
Testgeval Een bemiddelaar krachtens overeenkomst van opdracht is dienstbetrekking
	Gegeven een Arbeidsverhouding (Bemiddeling) met
		aanvangsdatum  01-02-2026
		is overeenkomst van opdracht
		heeft een bemiddeling tegen beloning

	Verwacht Bemiddeling met
		heeft een gelijkstelling krachtens artikel 2
		is dienstbetrekking
		heeft geen arbeid tegen beloning buiten bedrijf
```

### De opdrachtnemer van lid 2 onder b

```testspraak
Testgeval Arbeid krachtens overeenkomst van opdracht is dienstbetrekking
	Gegeven een Arbeidsverhouding (Opdracht) met
		aanvangsdatum  01-02-2026
		is overeenkomst van opdracht
		heeft een arbeid tegen beloning

	Verwacht Opdracht met
		heeft een arbeid tegen beloning buiten bedrijf
		heeft een gelijkstelling krachtens artikel 2
		is dienstbetrekking
```

### De *tenzij* van lid 2 onder b

De zelfstandige die in de uitoefening van zijn beroep werkt valt er buiten — en
dat is het randgeval van dit artikel, want alles behalve dat ene kenmerk is
gelijk aan het geval erboven.

```testspraak
Testgeval De zelfstandige beroepsuitoefenaar is geen dienstbetrekking
	Gegeven een Arbeidsverhouding (Zzp) met
		aanvangsdatum  01-02-2026
		is overeenkomst van opdracht
		heeft een arbeid tegen beloning
		heeft een zelfstandige beroepsuitoefening

	Verwacht Zzp met
		heeft geen arbeid tegen beloning buiten bedrijf
		heeft geen gelijkstelling krachtens artikel 2
		is geen dienstbetrekking
```

### Een overeenkomst van opdracht zonder bemiddeling en zonder arbeid

```testspraak
Testgeval Een overeenkomst van opdracht zonder meer is geen dienstbetrekking
	Gegeven een Arbeidsverhouding (Losse opdracht) met
		aanvangsdatum  01-03-2026
		is overeenkomst van opdracht

	Verwacht Losse opdracht met
		heeft geen gelijkstelling krachtens artikel 2
		is geen dienstbetrekking
```
