# Acoustic Modulation Lab

**Language:** English | [Polski](README.pl.md) | [Deutsch](README.de.md) |
[Español](README.es.md) | [Português (Brasil)](README.pt-BR.md) |
[简体中文](README.zh-CN.md)

**Acoustic Modulation Lab makes AM and FM radio principles visible and audible
inside an ordinary browser.**

Instead of modulating an electromagnetic carrier, the laboratory modulates an
acoustic carrier stored as a 48 kHz audio waveform. The physical medium is
different, but the AM and FM equations, sidebands, tuning, and demodulation
principles remain the same.

[Open the live laboratory](https://volter2pl.github.io/acoustic-modulation-lab/)
· [Polski](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pl)
· [Deutsch](https://volter2pl.github.io/acoustic-modulation-lab/?lang=de)
· [Español](https://volter2pl.github.io/acoustic-modulation-lab/?lang=es)
· [Português (Brasil)](https://volter2pl.github.io/acoustic-modulation-lab/?lang=pt-BR)
· [简体中文](https://volter2pl.github.io/acoustic-modulation-lab/?lang=zh-CN)

```text
voice or music
      ↓
AM or FM transmitter
      ↓
high-frequency acoustic waveform
      ↓
tuned AM or FM receiver
      ↓
recovered voice or music
```

## What the laboratory demonstrates

Choose a modulation and compare how each one stores the same recording:

| | AM | FM |
| --- | --- | --- |
| Information changes | Carrier amplitude | Instantaneous frequency |
| Main control | Modulation depth | Frequency deviation |
| Spectrum | Carrier with two sidebands | Carrier with multiple sidebands |
| Receiver measurement | I/Q envelope magnitude | I/Q phase change |
| Additional experiment | Overmodulation | Scaled RDS |

The application presents three consecutive signals:

1. **Message** — an included recording, your audio file, or microphone input.
2. **Modulated signal** — the AM or FM carrier and its sidebands.
3. **Recovered audio** — the message reconstructed by the corresponding
   receiver.

Every visualization is a spectrogram: time runs from left to right, frequency
rises from bottom to top, and brighter color means more energy. Message and
recovered-audio views cover 0–8 kHz. The modulated-signal view covers the full
0–24 kHz range available at a 48 kHz sample rate.

For the complete theory and implementation choices, continue with:

- [Amplitude modulation](docs/en/am.md)
- [Frequency modulation and RDS](docs/en/fm.md)

## Single station and radio band

**Single station** exposes the characteristic control of the selected
modulation. AM allows a depth from 0% to 150%, including intentional
overmodulation. FM exposes carrier deviation and optional scaled PS or
RadioText data.

**Radio band** combines three independent stations at 5, 12, and 19 kHz into
one audio file. Each station can use a different programme and signal level.
The receiver can be tuned continuously while the shared band keeps playing, so
moving the dial changes the station in real time.

The recovered spectrogram and downloadable WAV are snapshots made at the last
analyzed frequency. Live audio follows the tuning slider immediately; the
interface labels an older spectrum until **Update spectrum & WAV** is used.

Programmes do not need equal durations. The shared channel follows the longest
recording, while a shorter AM or FM programme continues as an unmodulated
carrier after its message ends.

## Why this is an analogy

A broadcast carrier travels as an electromagnetic wave at radio frequencies.
This experiment uses changing air pressure and audio frequencies so an ordinary
browser can generate, display, and sometimes reproduce it.

| Radio transmission | Acoustic laboratory |
| --- | --- |
| Electromagnetic carrier | Sound-pressure carrier |
| RF oscillator | Browser-generated oscillator |
| Antenna and free space | Audio file or speaker and air |
| Radio receiver | Browser AM or FM demodulator |

This is not a conversion of a radio wave into sound. It is the same modulation
mathematics applied to another kind of wave.

## Try the experiment

Use an included sample, drop an audio file, or record your voice. Browser audio
support commonly includes WAV, MP3, M4A/AAC, OGG/Vorbis, and WebM/Opus, though
exact support varies. Input length is limited to 120 seconds.

Generated high-frequency signals play at a reduced volume and never start
automatically. Device speakers, microphones, audio enhancements, and filters
may remove carriers near the upper end of the audible spectrum.

To run the laboratory locally on any free port:

```bash
npm start -- 8080
```

Then open `http://localhost:8080`.

AM and FM change how information is represented. They do not encrypt, compress,
or hide the source recording.
