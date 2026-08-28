# Amplitude modulation

**Language:** English | [Polski](../pl/am.md) | [Deutsch](../de/am.md) |
[Español](../es/am.md) | [Português (Brasil)](../pt-BR/am.md) |
[简体中文](../zh-CN/am.md) | [日本語](../ja/am.md) |
[Français](../fr/am.md)

[Back to the laboratory overview](../../README.md)

Amplitude modulation stores a message in the changing envelope of a carrier.
The experiment uses conventional double-sideband AM with a transmitted carrier,
the form historically associated with broadcast AM and simple envelope
receivers.

## How AM stores a message

Let `m(t)` be a message normalized to `[-1, 1]`, `fc` the carrier frequency,
and `μ` the modulation depth:

```text
s(t) = A · [1 + μm(t)] · cos(2πfc t)
```

The carrier continues oscillating at `fc`; only its amplitude changes. At 80%
depth, `μ = 0.8`:

```text
m(t) = -1.0  →  envelope = 0.2A
m(t) =  0.0  →  envelope = 1.0A
m(t) = +1.0  →  envelope = 1.8A
```

At 0%, the file contains an unmodulated carrier and no message. At 100%, the
envelope just reaches zero at the negative message peak.

## Carrier and sidebands

A sinusoidal message at frequency `fm` creates three clear spectral components:

```text
lower sideband   carrier   upper sideband
    fc - fm         fc         fc + fm
```

Real speech and music contain many frequencies, producing mirrored lower and
upper sidebands around the carrier. If the message is limited to bandwidth `B`,
ordinary AM occupies approximately:

```text
occupied AM bandwidth = 2B
```

The laboratory limits a single-station message to 2.4 kHz, producing an AM
channel about 4.8 kHz wide. This makes both sidebands fit honestly below the
24 kHz Nyquist frequency of a 48 kHz audio file.

## Overmodulation

When depth exceeds 100%, part of `1 + μm(t)` becomes negative. The mathematical
carrier changes phase by 180 degrees at each envelope zero crossing, but an
envelope detector measures magnitude and cannot preserve that sign:

```text
measured envelope = |1 + μm(t)|
```

The result is distortion. The interface deliberately allows values up to 150%
and marks them as **Overmodulated** rather than blocking them. This makes a
fundamental AM limit both visible in the modulated spectrum and audible in the
recovered recording.

## How the receiver works

The receiver first mixes the real AM waveform with cosine and sine oscillators
at the selected carrier. Low-pass filters leave the in-phase and quadrature
components:

```text
z[n] = I[n] + jQ[n]
```

Their magnitude is the envelope:

```text
envelope[n] = sqrt(I[n]² + Q[n]²)
```

A DC blocker removes the constant carrier level, and a programme low-pass
removes residual high-frequency terms. The quadrature front end behaves as an
ideal tuned envelope receiver: it selects one carrier before measuring its
amplitude and works even when oscillator phase is not aligned with the
transmitter.

## Several AM stations

Radio-band mode creates three conventional AM stations. Their default carriers
are shown below:

```text
5 kHz AM  ─┐
12 kHz AM ─┼─→ one acoustic radio band
19 kHz AM ─┘
```

Each programme is limited to 2 kHz and transmitted at 80% depth. A station
therefore occupies approximately 4 kHz. Each station exposes its signal level,
a 4–20 kHz carrier in 0.1 kHz steps, and its phase at the receiver from 0° to
345° in 15° steps. The three waveforms are reduced in level before addition so
their combined file remains below clipping.

The default carriers leave separation between neighboring channels. Moving
them closer makes their sidebands overlap. Stations on the same carrier cannot
be separated by tuning; their waveforms add directly. Equal co-channel signals
reinforce at 0° relative phase and can cancel at 180°. With different
programmes, cancellation is generally only partial.

The live receiver keeps the common file timeline running while its local
oscillator follows **Receiver tuning**. Mixing moves the selected station to
baseband; the I/Q low-pass rejects stations that remain outside the receiver
passband, and the envelope detector recovers the selected programme.

When a shorter programme ends, its message becomes zero. The corresponding
transmitter therefore continues as a pure carrier until the longest programme
finishes.

## What to observe

- At 0% depth, only the carrier remains.
- Increasing depth strengthens both sidebands without changing their distance
  from the carrier.
- Changing the message changes the sideband content, not the carrier frequency.
- Above 100%, envelope zero crossings create audible distortion.
- Between stations, the receiver progressively rejects both AM channels.

The acoustic carrier may be audible as a steady tone, but it is not the source
recording quietly mixed into the file. The message exists in the carrier's
envelope and must be recovered by a receiver.
