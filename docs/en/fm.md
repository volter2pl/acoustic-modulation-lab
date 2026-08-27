# Frequency modulation and RDS

**Language:** English | [Polski](../pl/fm.md) | [Deutsch](../de/fm.md) |
[Español](../es/fm.md)

[Back to the laboratory overview](../../README.md)

Frequency modulation stores a message in the instantaneous frequency of a
constant-amplitude carrier. Unlike AM, the carrier envelope does not directly
follow the programme.

## How FM stores a message

Let `m(t)` be the normalized message, `fc` the carrier, and `Δf` the maximum
frequency deviation:

```text
fi(t) = fc + Δf · m(t)
```

For an 18 kHz carrier and ±1 kHz deviation:

```text
m(t) = -1.0  →  fi(t) = 17 kHz
m(t) =  0.0  →  fi(t) = 18 kHz
m(t) = +1.0  →  fi(t) = 19 kHz
```

Frequency is the derivative of phase, so correct discrete FM accumulates
oscillator phase continuously:

```text
phase += 2π · instantaneousFrequency / sampleRate
fmSample = sin(phase)
```

Calculating a new independent sine from frequency and absolute time would create
phase discontinuities and would not produce correct FM.

## How the FM receiver works

The receiver mixes the signal with sine and cosine oscillators at the selected
carrier. After filtering, the components form a complex baseband signal:

```text
z[n] = I[n] + jQ[n]
```

The receiver measures phase change between adjacent samples:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
m[n] ≈ Δφ[n] · sampleRate / (2π · Δf)
```

This I/Q discriminator recovers the frequency deviation without a separate
phase-unwrapping step. A programme low-pass leaves the original recording.

## FM bandwidth

The instantaneous range is only the carrier plus or minus deviation. An FM
signal also has sidebands, so the experiment uses Carson's useful estimate:

```text
occupied FM bandwidth ≈ 2 · (deviation + message bandwidth)
```

Single-station audio is limited to a 2.4 kHz speech band. The interface rejects
carrier and deviation combinations whose estimated sidebands cross the lower
spectrum boundary or the 24 kHz Nyquist limit.

## Scaled RDS

RDS demonstrates that programme audio and digital information can modulate the
same FM carrier simultaneously. In a real stereo FM multiplex, RDS uses a
suppressed 57 kHz subcarrier, exactly three times the 19 kHz stereo pilot, and a
1187.5 bit/s data rate.

A 48 kHz audio file cannot represent 57 kHz, so every RDS clock is divided by
eight while preserving its relationship:

| Component | Broadcast RDS | Acoustic model |
| --- | ---: | ---: |
| Pilot | 19 kHz | 2.375 kHz |
| RDS subcarrier | 57 kHz | 7.125 kHz |
| Data rate | 1187.5 bit/s | 148.4375 bit/s |

The available modes are:

- **None** — programme audio only;
- **PS** — an eight-character Programme Service name in 0A groups;
- **RadioText** — up to 64 characters in 2A groups.

The model generates RDS blocks, checkwords, differential coding, and biphase
symbols. The receiver recovers valid groups from the demodulated waveform; text
is not stored as WAV metadata. If the source is too short for one complete data
cycle, silent programme audio extends the transmission.

After demodulation, the full multiplex feeds the data decoder. A separate
listening path removes the scaled pilot and applies a steep programme low-pass,
so the recovered-audio player contains programme audio rather than RDS tones.

RDS requires a much wider baseband and consequently narrows the safe acoustic
carrier range. This is a scaled educational waveform, not one a commercial RDS
receiver can decode.

## Several FM stations

Radio-band mode combines carriers at 5, 12, and 19 kHz. Each station uses
±0.75 kHz deviation and a 2 kHz programme band:

```text
5 kHz FM  ─┐
12 kHz FM ─┼─→ one acoustic radio band
19 kHz FM ─┘
```

The estimated channel width is about 5.5 kHz, leaving separation between
stations. The live receiver continuously changes its local oscillator while
the common band keeps playing, so tuning behaves like turning a radio dial.

RDS is disabled in radio-band mode. In the 1:8 model, one RDS station occupies
approximately 17.2 kHz; several honest RDS channels would not fit in the
available 0–24 kHz audio spectrum.

When a programme ends, its message becomes zero and the station continues as an
unmodulated carrier. Signal-level controls alter station strength, while the
mixer reserves headroom for all three transmitters.

## What to observe

- Lower carriers are easier to hear as a varying whistle.
- Greater deviation spreads energy farther from the carrier.
- The carrier stays at constant amplitude while its cycle rate changes.
- RDS creates visible high-frequency multiplex components before FM modulation.
- Between stations, the receiver rejects carriers outside its baseband filter.

FM is not a quiet copy of the source hidden beneath a tone. It is one continuous
waveform whose accumulated phase carries the recording.
