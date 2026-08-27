# Labor für akustische Modulation

**Sprache:** [English](README.md) | [Polski](README.pl.md) | Deutsch |
[Español](README.es.md) | [Português (Brasil)](README.pt-BR.md) |
[简体中文](README.zh-CN.md) | [日本語](README.ja.md) |
[Français](README.fr.md)

**Das Labor für akustische Modulation macht die Prinzipien des AM- und
FM-Rundfunks direkt im Browser sichtbar und hörbar.**

Anstelle einer elektromagnetischen Trägerwelle moduliert das Labor einen
akustischen Träger, der als Audiosignal mit 48 kHz Abtastrate gespeichert wird.
Das physikalische Medium ist ein anderes, doch die Gleichungen für AM und FM
sowie die Prinzipien von Seitenbändern, Abstimmung und Demodulation bleiben
gleich.

[Labor auf Deutsch öffnen](https://volter2pl.github.io/acoustic-modulation-lab/?lang=de)
· [Español](https://volter2pl.github.io/acoustic-modulation-lab/?lang=es)
· [Português (Brasil)](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pt-BR)
· [简体中文](https://volter2pl.github.io/acoustic-modulation-lab/?lang=zh-CN)
· [日本語](https://volter2pl.github.io/acoustic-modulation-lab/?lang=ja)
· [Français](https://volter2pl.github.io/acoustic-modulation-lab/?lang=fr)

```text
Sprache oder Musik
        ↓
AM- oder FM-Sender
        ↓
hochfrequentes akustisches Signal
        ↓
abgestimmter AM- oder FM-Empfänger
        ↓
wiedergewonnene Sprache oder Musik
```

## Was das Labor zeigt

Wähle eine Modulationsart und vergleiche, wie dieselbe Aufnahme jeweils
übertragen wird:

| | AM | FM |
| --- | --- | --- |
| Veränderte Größe | Amplitude des Trägers | Momentanfrequenz |
| Wichtigster Parameter | Modulationsgrad | Frequenzhub |
| Spektrum | Träger mit zwei Seitenbändern | Träger mit mehreren Seitenbändern |
| Messgröße des Empfängers | Betrag der I/Q-Hüllkurve | I/Q-Phasenänderung |
| Zusätzliches Experiment | Übermodulation | Skaliertes RDS |

Die Anwendung zeigt drei aufeinanderfolgende Signale:

1. **Nachricht** — eine mitgelieferte Aufnahme, eine eigene Audiodatei oder
   eine Mikrofonaufnahme.
2. **Moduliertes Signal** — der AM- oder FM-Träger mit seinen Seitenbändern.
3. **Wiedergewonnenes Audio** — die vom jeweiligen Empfänger rekonstruierte
   Nachricht.

Jede Visualisierung ist ein Spektrogramm: Die Zeit verläuft von links nach
rechts, die Frequenz steigt von unten nach oben, und eine hellere Farbe bedeutet
mehr Energie. Die Ansichten der Nachricht und des wiedergewonnenen Audios
reichen von 0 bis 8 kHz. Das modulierte Signal zeigt den gesamten Bereich von
0 bis 24 kHz, der bei einer Abtastrate von 48 kHz verfügbar ist.

Ausführliche Theorie und Hinweise zur Umsetzung:

- [Amplitudenmodulation](docs/de/am.md)
- [Frequenzmodulation und RDS](docs/de/fm.md)

## Einzelsender und Frequenzband

Der Modus **Einzelsender** stellt den charakteristischen Parameter der
gewählten Modulationsart bereit. Bei AM lässt sich der Modulationsgrad von 0%
bis 150% einstellen, einschließlich absichtlicher Übermodulation. Bei FM lassen
sich Frequenzhub sowie optional skalierte PS- oder RadioText-Daten einstellen.

Der Modus **Frequenzband** kombiniert drei unabhängige Sender bei 5, 12 und
19 kHz in einer Audiodatei. Jeder Sender kann ein anderes Programm und einen
anderen Signalpegel verwenden. Während das gemeinsame Frequenzband weiterläuft,
kann der Empfänger stufenlos abgestimmt werden. Das Verschieben des Reglers
wechselt den Sender deshalb in Echtzeit.

Das wiedergewonnene Spektrogramm und die herunterladbare WAV-Datei sind
Momentaufnahmen der zuletzt analysierten Frequenz. Das Live-Audio folgt dem
Abstimmregler sofort; die Oberfläche kennzeichnet ein älteres Spektrum, bis
**Spektrum und WAV aktualisieren** ausgeführt wird.

Die Programme müssen nicht gleich lang sein. Der gemeinsame Kanal folgt der
längsten Aufnahme. Nach dem Ende einer kürzeren AM- oder FM-Aufnahme läuft deren
Sender als unmodulierter Träger weiter.

## Warum dies eine Analogie ist

Ein Rundfunkträger breitet sich als elektromagnetische Welle bei
Radiofrequenzen aus. Dieses Experiment verwendet Luftdruckschwankungen und
Audiofrequenzen, damit ein gewöhnlicher Browser das Signal erzeugen, darstellen
und teilweise wiedergeben kann.

| Rundfunkübertragung | Akustisches Labor |
| --- | --- |
| Elektromagnetischer Träger | Schalldruckträger |
| HF-Oszillator | Vom Browser erzeugter Oszillator |
| Antenne und freier Raum | Audiodatei oder Lautsprecher und Luft |
| Radioempfänger | AM- oder FM-Demodulator im Browser |

Hier wird keine Radiowelle in Schall umgewandelt. Dieselbe
Modulationsmathematik wird auf eine andere Wellenart angewendet.

## Experiment ausprobieren

Verwende eine mitgelieferte Aufnahme, lege eine Audiodatei ab oder nimm deine
Stimme auf. Browser unterstützen üblicherweise WAV, MP3, M4A/AAC, OGG/Vorbis
und WebM/Opus; die genaue Unterstützung hängt jedoch vom Browser ab. Die
Eingabedauer ist auf 120 Sekunden begrenzt.

Erzeugte hochfrequente Signale werden mit verringerter Lautstärke wiedergegeben
und starten niemals automatisch. Lautsprecher, Mikrofone, Klangverbesserungen
und Filter eines Geräts können Träger nahe der oberen Grenze des hörbaren
Spektrums entfernen.

Das Labor lässt sich lokal auf einem beliebigen freien Port starten:

```bash
npm start -- 8080
```

Anschließend `http://localhost:8080` öffnen.

AM und FM verändern die Darstellung der Information. Sie verschlüsseln,
komprimieren oder verbergen die ursprüngliche Aufnahme nicht.
