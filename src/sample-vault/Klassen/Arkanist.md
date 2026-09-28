---
tags:
  - Regeln/Endeavour/Charakter/Klasse
BasisTP: 2
BasisRP: 0
Kernattribute:
  - "[[Verstand]]"
  - "[[Entschlossenheit]]"
Übung:
  Waffen:
    - Einfache Waffen
  Rüstungen:
    - keine
Rettungswürfe:
  Vorteil:
    - "[[Verstandsrettungswürfe|VS-Rettungswürfe]]"
    - "[[Entschlossenheitsrettungswürfe|EN-Rettungswürfe]]"
  Nachteil:
    - "[[Stärkerettungswürfe|ST-Rettungswürfe]]"
    - "[[Konstitutionsrettungswürfe|KO-Rettungswürfe]]"
Zauberattribut: "[[Verstand]]"
Beschreibung: Beherrsche und forme die Elemente von Feuer, Eis und Blitz.
---
# `=this.file.name`
Arkanisten erforschen die Magie als Wissenschaft. Sie wirken ihre Zauber mit [[Verstand]] und halten ihre Formeln in einem Zauberbuch fest.

## Trefferpunkte
[[Trefferpunkte|TP]] auf Stufe 1: (`=this.BasisTP` + [[Konstitution]]) × 2
[[Trefferpunkte|TP]] pro Stufenaufstieg: `=this.BasisTP` + [[Konstitution]]

## Resilienzpunkte
[[Resilienzpunkte|RP]] auf Stufe 1: (`=this.BasisRP` + [[Entschlossenheit]]/2 abgerundet) × 2
[[Resilienzpunkte|RP]] pro Stufenaufstieg: `=this.BasisRP` + [[Entschlossenheit]]/2 abgerundet

> [!note]- Beispiel-Klassennotiz
> Die App liest `BasisTP`, `BasisRP`, `Kernattribute`, `Rettungswürfe` und `Übung` aus einer Notiz, die wie die Klasse heißt: daraus berechnet sie maximale [[Trefferpunkte]] und [[Resilienzpunkte]], markiert die Kernattribute, würfelt Klassen-Rettungswürfe mit Vorteil bzw. Nachteil und listet die Waffen- und Rüstungsübung.
