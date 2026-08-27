# Amplitudenmodulation

**Sprache:** [English](../en/am.md) | [Polski](../pl/am.md) | Deutsch |
[Español](../es/am.md) | [Português (Brasil)](../pt-BR/am.md) |
[简体中文](../zh-CN/am.md) | [日本語](../ja/am.md)

[Zurück zur Übersicht des Labors](../../README.de.md)

Bei der Amplitudenmodulation wird die Nachricht in der veränderlichen
Hüllkurve eines Trägers gespeichert. Das Experiment verwendet konventionelle
Zweiseitenband-AM mit übertragenem Träger — die Form, die historisch mit dem
AM-Rundfunk und einfachen Hüllkurvendemodulatoren verbunden ist.

## Wie AM eine Nachricht speichert

Es seien `m(t)` eine auf `[-1, 1]` normierte Nachricht, `fc` die
Trägerfrequenz und `μ` der Modulationsgrad:

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

Der Träger schwingt weiterhin bei `fc`; nur seine Amplitude ändert sich. Bei
einem Modulationsgrad von 80% gilt `μ = 0.8`:

```text
m(t) = -1.0  →  Hüllkurve = 0.2A
m(t) =  0.0  →  Hüllkurve = 1.0A
m(t) = +1.0  →  Hüllkurve = 1.8A
```

Bei 0% enthält die Datei einen unmodulierten Träger und keine Nachricht. Bei
100% erreicht die Hüllkurve am negativen Spitzenwert der Nachricht gerade den
Wert null.

## Träger und Seitenbänder

Eine sinusförmige Nachricht mit der Frequenz `fm` erzeugt drei deutlich
erkennbare Spektralkomponenten:

```text
unteres Seitenband   Träger   oberes Seitenband
      fc - fm          fc          fc + fm
```

Reale Sprache und Musik enthalten viele Frequenzen. Dadurch entstehen
gespiegelte untere und obere Seitenbänder um den Träger. Ist die Nachricht auf
die Bandbreite `B` begrenzt, belegt gewöhnliche AM ungefähr:

```text
belegte AM-Bandbreite = 2B
```

Das Labor begrenzt die Nachricht eines Einzelsenders auf 2,4 kHz. So entsteht
ein ungefähr 4,8 kHz breiter AM-Kanal, dessen beide Seitenbänder vollständig
unterhalb der Nyquist-Frequenz von 24 kHz einer 48-kHz-Audiodatei liegen.

## Übermodulation

Wenn der Modulationsgrad 100% überschreitet, wird ein Teil von `1 + μm(t)`
negativ. Der mathematische Träger erfährt bei jedem Nulldurchgang der Hüllkurve
einen Phasensprung von 180 Grad. Ein Hüllkurvendemodulator misst jedoch den
Betrag und kann das Vorzeichen nicht erhalten:

```text
gemessene Hüllkurve = |1 + μm(t)|
```

Das Ergebnis ist eine Verzerrung. Die Oberfläche lässt bewusst Werte bis 150%
zu und kennzeichnet sie als **Übermoduliert**, anstatt sie zu blockieren. So
wird eine grundlegende Grenze von AM sowohl im Spektrum des modulierten Signals
sichtbar als auch in der wiedergewonnenen Aufnahme hörbar.

## Funktionsweise des Empfängers

Der Empfänger mischt die reale AM-Wellenform zunächst mit Kosinus- und
Sinusoszillatoren bei der gewählten Trägerfrequenz. Tiefpassfilter lassen die
In-Phase- und Quadraturkomponenten übrig:

```text
z[n] = I[n] + jQ[n]
```

Ihr Betrag ist die Hüllkurve:

```text
Hüllkurve[n] = sqrt(I[n]² + Q[n]²)
```

Ein Gleichspannungsfilter entfernt den konstanten Trägeranteil, ein
Programm-Tiefpass die verbleibenden hochfrequenten Bestandteile. Diese
Quadratur-Eingangsstufe verhält sich wie ein ideal abgestimmter
Hüllkurvenempfänger: Sie wählt einen Träger aus, bevor sie dessen Amplitude
misst, und funktioniert auch dann, wenn die Oszillatorphase nicht mit dem
Sender übereinstimmt.

## Mehrere AM-Sender

Der Frequenzbandmodus erzeugt drei konventionelle AM-Sender:

```text
5 kHz AM  ─┐
12 kHz AM ─┼─→ ein akustisches Frequenzband
19 kHz AM ─┘
```

Jedes Programm wird auf 2 kHz begrenzt und mit einem Modulationsgrad von 80%
übertragen. Ein Sender belegt daher ungefähr 4 kHz; zwischen benachbarten
Trägern bleibt ein Abstand. Vor dem Addieren werden die drei Wellenformen im
Pegel reduziert, damit die gemeinsame Datei nicht übersteuert.

Der Live-Empfänger lässt die Zeitleiste der gemeinsamen Datei weiterlaufen,
während sein lokaler Oszillator der **Empfängerabstimmung** folgt. Durch das
Mischen gelangt der ausgewählte Sender ins Basisband. Der I/Q-Tiefpass
unterdrückt die außerhalb des Empfangsbereichs verbleibenden Sender, und der
Hüllkurvendemodulator gewinnt das gewählte Programm zurück.

Endet ein kürzeres Programm, wird sein Nachrichtensignal null. Der
entsprechende Sender läuft deshalb als reiner Träger weiter, bis das längste
Programm endet.

## Was zu beobachten ist

- Bei 0% bleibt nur der Träger übrig.
- Ein höherer Modulationsgrad verstärkt beide Seitenbänder, ohne ihren Abstand
  vom Träger zu verändern.
- Eine andere Nachricht verändert den Inhalt der Seitenbänder, nicht die
  Trägerfrequenz.
- Oberhalb von 100% erzeugen Nulldurchgänge der Hüllkurve hörbare Verzerrungen.
- Zwischen den Sendern unterdrückt der Empfänger zunehmend beide AM-Kanäle.

Der akustische Träger kann als gleichmäßiger Ton hörbar sein. Er ist jedoch
keine leise in die Datei gemischte Kopie der ursprünglichen Aufnahme. Die
Nachricht befindet sich in der Hüllkurve des Trägers und muss von einem
Empfänger wiedergewonnen werden.
