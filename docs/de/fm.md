# Frequenzmodulation und RDS

**Sprache:** [English](../en/fm.md) | [Polski](../pl/fm.md) | Deutsch |
[Español](../es/fm.md) | [Português (Brasil)](../pt-BR/fm.md) |
[简体中文](../zh-CN/fm.md) | [日本語](../ja/fm.md) |
[Français](../fr/fm.md)

[Zurück zur Übersicht des Labors](../../README.de.md)

Bei der Frequenzmodulation wird die Nachricht in der Momentanfrequenz eines
Trägers mit konstanter Amplitude gespeichert. Anders als bei AM folgt die
Hüllkurve des Trägers dem Programm nicht direkt.

## Wie FM eine Nachricht speichert

Es seien `m(t)` die normierte Nachricht, `fc` die Trägerfrequenz und `Δf` der
maximale Frequenzhub:

```text
fi(t) = fc + Δf · m(t)
```

Für einen 18-kHz-Träger und einen Frequenzhub von ±1 kHz gilt:

```text
m(t) = -1.0  →  fi(t) = 17 kHz
m(t) =  0.0  →  fi(t) = 18 kHz
m(t) = +1.0  →  fi(t) = 19 kHz
```

Die Frequenz ist die Ableitung der Phase. Eine korrekte diskrete
FM-Modulation muss die Oszillatorphase deshalb fortlaufend akkumulieren:

```text
phase += 2π · instantaneousFrequency / sampleRate
fmSample = sin(phase)
```

Würde für jede Frequenz und absolute Zeit ein neuer, unabhängiger Sinuswert
berechnet, entstünden Phasensprünge und damit kein korrektes FM-Signal.

## Funktionsweise des FM-Empfängers

Der Empfänger mischt das Signal mit Sinus- und Kosinusoszillatoren bei der
gewählten Trägerfrequenz. Nach der Filterung bilden die Komponenten ein
komplexes Basisbandsignal:

```text
z[n] = I[n] + jQ[n]
```

Der Empfänger misst die Phasenänderung zwischen benachbarten Abtastwerten:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · sampleRate / (2π · Δf)
```

Dieser I/Q-Diskriminator gewinnt den Frequenzhub zurück, ohne dass die Phase in
einem eigenen Schritt entrollt werden muss. Ein Programm-Tiefpass lässt die
ursprüngliche Aufnahme übrig.

## FM-Bandbreite

Der momentane Frequenzbereich reicht nur von der Trägerfrequenz minus bis zur
Trägerfrequenz plus Frequenzhub. Ein FM-Signal besitzt jedoch zusätzlich
Seitenbänder. Das Experiment verwendet deshalb die nützliche Abschätzung nach
Carson:

```text
belegte FM-Bandbreite ≈ 2 · (Frequenzhub + Nachrichtenbandbreite)
```

Das Audio eines Einzelsenders wird auf ein 2,4-kHz-Sprachband begrenzt. Die
Oberfläche weist Kombinationen von Trägerfrequenz und Frequenzhub zurück, deren
geschätzte Seitenbänder die untere Spektrumsgrenze oder die Nyquist-Grenze von
24 kHz überschreiten.

## Skaliertes RDS

RDS zeigt, dass Programmaudio und digitale Informationen denselben FM-Träger
gleichzeitig modulieren können. In einem realen Stereo-FM-Multiplex verwendet
RDS einen unterdrückten 57-kHz-Unterträger — genau das Dreifache des
19-kHz-Stereopiloten — und eine Datenrate von 1187,5 bit/s.

Eine 48-kHz-Audiodatei kann 57 kHz nicht darstellen. Deshalb wird jeder
RDS-Takt durch acht geteilt, wobei seine relative Lage erhalten bleibt:

| Komponente | RDS-Rundfunk | Akustisches Modell |
| --- | ---: | ---: |
| Pilotton | 19 kHz | 2,375 kHz |
| RDS-Unterträger | 57 kHz | 7,125 kHz |
| Datenrate | 1187,5 bit/s | 148,4375 bit/s |

Folgende Modi stehen zur Verfügung:

- **Kein RDS** — nur Programmaudio;
- **PS** — eine acht Zeichen lange Senderkennung (Programme Service) in
  0A-Gruppen;
- **RadioText** — bis zu 64 Zeichen in 2A-Gruppen.

Das Modell erzeugt RDS-Blöcke, Prüfwörter, Differenzcodierung und
Biphase-Symbole. Der Empfänger gewinnt gültige Gruppen aus der demodulierten
Wellenform zurück; der Text wird nicht als WAV-Metadaten gespeichert. Ist die
Quelle für einen vollständigen Datenzyklus zu kurz, verlängert stummes
Programmaudio die Übertragung.

Nach der Demodulation wird der vollständige Multiplex dem Datendecoder
zugeführt. Ein separater Hörpfad entfernt den skalierten Pilotton und verwendet
einen steilen Programm-Tiefpass. Der Player für das wiedergewonnene Audio
enthält dadurch das Programm und nicht die RDS-Töne.

RDS benötigt ein deutlich breiteres Basisband und verkleinert deshalb den
sicheren Bereich der akustischen Trägerfrequenz. Dies ist eine skalierte
Lehrwellenform und kein Signal, das ein kommerzieller RDS-Empfänger decodieren
kann.

## Mehrere FM-Sender

Der Frequenzbandmodus kombiniert Träger bei 5, 12 und 19 kHz. Jeder Sender
verwendet einen Frequenzhub von ±0,75 kHz und ein 2-kHz-Programmband:

```text
5 kHz FM  ─┐
12 kHz FM ─┼─→ ein akustisches Frequenzband
19 kHz FM ─┘
```

Die geschätzte Kanalbreite beträgt ungefähr 5,5 kHz, sodass zwischen den
Sendern Abstand bleibt. Der Live-Empfänger verändert seinen lokalen Oszillator
fortlaufend, während das gemeinsame Frequenzband weiterspielt. Die Abstimmung
verhält sich dadurch wie das Drehen eines Radioknopfs.

RDS ist im Frequenzbandmodus deaktiviert. Im 1:8-Modell belegt ein einzelner
RDS-Sender ungefähr 17,2 kHz; mehrere realistisch modellierte RDS-Kanäle würden
nicht in das verfügbare Audiospektrum von 0 bis 24 kHz passen.

Endet ein Programm, wird sein Nachrichtensignal null und der Sender läuft als
unmodulierter Träger weiter. Die Signalpegelregler verändern die Stärke der
Sender, während der Mischer Aussteuerungsreserve für alle drei Sender lässt.

## Was zu beobachten ist

- Tiefere Träger sind leichter als veränderlicher Pfeifton zu hören.
- Ein größerer Frequenzhub verteilt die Energie weiter vom Träger entfernt.
- Die Amplitude des Trägers bleibt konstant, während sich seine Schwingungsrate
  ändert.
- RDS erzeugt vor der FM-Modulation sichtbare hochfrequente
  Multiplexkomponenten.
- Zwischen den Sendern unterdrückt der Empfänger Träger außerhalb seines
  Basisbandfilters.

FM ist keine leise Kopie der Quelle, die unter einem Ton verborgen liegt. Es
handelt sich um eine einzige kontinuierliche Wellenform, deren akkumulierte
Phase die Aufnahme trägt.
