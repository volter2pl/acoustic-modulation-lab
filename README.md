# Acoustic FM

**Acoustic FM turns an ordinary audio recording into an audible version of the
same frequency-modulation principle used in radio.**

Instead of modulating an electromagnetic carrier that travels from a radio
transmitter to an antenna, the experiment modulates an acoustic carrier stored
as an audio waveform. The physical medium is different, but the modulation law
is the same.

[Open the live experiment](https://volter2pl.github.io/acoustic-fm/)

```text
voice or music
      ↓
frequency modulator
      ↓
one high-frequency acoustic waveform
      ↓
frequency demodulator
      ↓
recovered voice or music
```

## Making radio modulation visible and audible

A radio-frequency carrier oscillates millions of times per second and travels
as an electromagnetic wave. We cannot connect it directly to a browser audio
player or hear it through a speaker.

Acoustic FM brings the same idea into a range that ordinary audio tools can
generate, display, and sometimes hear. A carrier such as 5, 10, or 18 kHz is
represented by changing air pressure rather than by changing electric and
magnetic fields.

This is not a literal conversion of a radio wave into sound. It is a physical
analogy that applies the same FM mathematics to another kind of wave:

| Radio transmission | Acoustic experiment |
| --- | --- |
| Electromagnetic carrier | Sound-pressure carrier |
| RF oscillator | Browser-generated audio oscillator |
| Antenna and free space | Speaker, air, and microphone |
| Radio receiver | Browser FM demodulator |
| Frequency carries the message | Frequency carries the message |

## What to observe

The application presents the experiment as three consecutive signals:

1. **Message** — the original recording. Its spectrogram shows how speech or
   music energy changes across the audible frequencies over time.
2. **FM signal** — the message is concentrated around an acoustic carrier and
   its sidebands. Information is stored in frequency changes, not amplitude.
3. **Recovered audio** — the receiver removes the carrier and reconstructs the
   original low-frequency content.

Each visualization is a spectrogram: time runs from left to right, frequency
rises from bottom to top, and brighter color means more energy. The message and
recovered-audio views cover 0–8 kHz, while the FM view covers the complete
0–24 kHz range of a 48 kHz audio channel. This makes the carrier, occupied
bandwidth, and high-frequency RDS sidebands much easier to identify than in an
amplitude waveform containing thousands of cycles per second.

Try changing the controls and listen for these effects:

- A lower **carrier** makes the FM signal easier to hear as a varying whistle.
- A carrier near 18–19 kHz may be faint or inaudible to some people and devices.
- Greater **deviation** makes frequency move farther from the carrier and uses
  more bandwidth.
- The displayed instantaneous range is the carrier minus/plus the deviation.

## How frequency modulation stores a message

Let:

- `m(t)` be the message normalized to `[-1, 1]`;
- `fc` be the carrier frequency;
- `Δf` be the maximum frequency deviation.

The message controls instantaneous frequency:

```text
fi(t) = fc + Δf · m(t)
```

For a carrier of 18 kHz and a deviation of ±1 kHz:

```text
m(t) = -1.0  →  fi(t) = 17 kHz
m(t) =  0.0  →  fi(t) = 18 kHz
m(t) = +1.0  →  fi(t) = 19 kHz
```

The output is not `carrier + recording`, and it is not a quiet recording hidden
under a whistle. It is a single signal whose cycle rate changes continuously.

Frequency is the derivative of phase, so the oscillator phase must be
accumulated:

```text
φ(t) = 2π ∫ fi(t) dt
s(t) = sin(φ(t))
```

In discrete time:

```js
instantaneousFrequency = carrier + deviation * messageSample;
phase += 2 * Math.PI * instantaneousFrequency / sampleRate;
fmSample = Math.sin(phase);
```

Using `sin(2π · instantaneousFrequency · time)` independently for every sample
would introduce phase discontinuities and would not create correct FM.

## How the receiver recovers the message

Demodulation reverses the process. The receiver produces two baseband components
— in-phase (`I`) and quadrature (`Q`) — by mixing the received signal with sine
and cosine oscillators at the carrier frequency.

After filtering, they form a complex signal:

```text
z[n] = I[n] + jQ[n]
```

The receiver measures its phase change between adjacent samples:

```text
Δφ[n] = arg(z[n] · conjugate(z[n-1]))
```

That phase change is proportional to frequency deviation, so the normalized
message is approximately:

```text
m[n] ≈ Δφ[n] · sampleRate / (2π · Δf)
```

Filtering the result removes unwanted high-frequency components and leaves the
recovered recording.

## Bandwidth is more than the slider range

With a 48 kHz sample rate, the Nyquist frequency is 24 kHz. The instantaneous
frequency must remain below it:

```text
carrier + deviation < sampleRate / 2
```

However, an FM signal also develops sidebands. A useful estimate is Carson's
rule:

```text
occupied FM bandwidth ≈ 2 · (deviation + message bandwidth)
```

For this reason, the experiment limits the source to a 2.4 kHz speech band before
modulation and rejects unsafe carrier/deviation combinations. This favors a
clear educational speech experiment over music fidelity; it is a channel-design
choice, not an inherent limit of FM.

## Adding RDS to the transmission

RDS shows that an FM station can carry audio and digital information at the
same time. In a real stereo FM multiplex, RDS occupies a suppressed subcarrier
at 57 kHz, exactly three times the 19 kHz stereo pilot, and sends data at
1187.5 bit/s. It does not wait for a pause in the programme: its low-level data
signal is continuously added beside the audio before the complete multiplex
modulates the FM carrier.

A 48 kHz audio file cannot contain a 57 kHz signal, so this experiment scales
all RDS clocks by eight while preserving their relationships:

| Component | Broadcast RDS | Acoustic model |
| --- | ---: | ---: |
| Pilot | 19 kHz | 2.375 kHz |
| RDS subcarrier | 57 kHz | 7.125 kHz |
| Data rate | 1187.5 bit/s | 148.4375 bit/s |

Choose one of three modes in the interface:

- **None** transmits audio alone.
- **PS** sends an eight-character Programme Service name in four 0A groups.
- **RadioText** sends up to 64 characters in 2A groups.

The model includes RDS blocks, checkwords, differential coding, and biphase
symbols. The receiver has to recover valid groups from the demodulated waveform;
the text is not stored as file metadata. A PS cycle takes about three seconds,
while RadioText takes longer as more four-character segments are added. If the
recording is too short to carry one complete cycle, the generated signal is
extended with silent programme audio.

After FM demodulation, the receiver treats the result as a multiplex and splits
it into two paths. The full-band path feeds the RDS decoder. The listening path
removes the scaled 2.375 kHz pilot with a notch filter and then applies a steep
1.8 kHz programme low-pass. The recovered-audio player and spectrogram therefore
contain the programme only; decoded PS or RadioText appears separately in the
result card. This mirrors a radio receiver instead of relying on the data being
inaudible.

The audio path restores the transmitter's known programme level rather than
peak-normalizing its result. This distinction matters during silence: automatic
normalization would turn tiny filter remnants into a loud and misleading tone.

RDS uses more baseband bandwidth, so enabling it narrows the safe acoustic
carrier range. With a 48 kHz sample rate and ±1 kHz deviation, the carrier can
be adjusted from approximately 9.1 to 14.9 kHz. The carrier is still a user
control; the interface only prevents combinations that would cross the bottom
of the spectrum or the 24 kHz Nyquist limit.

This is a scaled educational implementation, not a waveform that a commercial
RDS radio can receive. The lower clock frequencies make the multiplex visible,
audible, and representable in an ordinary browser audio file.

## Several stations in one radio band

The **Radio band** mode demonstrates frequency-division multiplexing. Three
independent recordings frequency-modulate carriers at 5, 12, and 19 kHz. Their
FM waveforms are reduced in level and added into one audio file:

```text
5 kHz station  ─┐
12 kHz station ─┼─→ one acoustic radio band
19 kHz station ─┘
```

Each station uses ±0.75 kHz deviation and a 2 kHz programme band. The resulting
estimated channel width is about 5.5 kHz, leaving separation between adjacent
stations. A common 48 kHz file can therefore hold all three without crossing
the 24 kHz Nyquist limit.

The receiver has its own tuning control. Mixing the shared channel with the
selected carrier moves that station to baseband, while the receiver low-pass
rejects stations that remain several kilohertz away. Preset buttons tune to the
exact carriers, and the continuous slider also makes it possible to explore
what happens between stations.

The recovered-audio play button starts a live receiver implemented on the
browser's audio thread. While the common radio-band timeline keeps running,
moving **Receiver tuning** immediately changes the local oscillator and therefore
the station you hear. This is intentionally different from decoding a separate
file after every slider movement: it behaves like turning the dial of a radio.

The spectrogram and downloadable recovered WAV are still offline analysis
results, because rendering an entire time-frequency image requires a complete
signal. **Update spectrum & WAV** captures that result at the currently tuned
frequency. If the dial is moved afterward, the live audio follows it immediately
and the interface labels the existing spectrum with the frequency of its last
snapshot until it is updated.

Programmes do not need equal durations. The shared file follows the longest
recording. When a shorter programme ends, its modulating message becomes zero,
so that transmitter continues as an unmodulated carrier rather than vanishing
from the spectrum. Individual level controls change received station strength,
while the mixer reserves enough headroom to avoid clipping when all stations
peak together.

RDS is disabled in Radio band mode. In this 1:8 model, one RDS station occupies
approximately 17.2 kHz and multiple such stations would not fit honestly in a
48 kHz audio channel. RDS remains available in the Single station experiment.

## From a file experiment to a real channel

The file-to-file path proves that the modulator and receiver agree mathematically.
The more interesting experiment sends the generated signal through the room:

```text
message → FM → speaker → air → microphone → FM receiver → message
```

Now the result depends on the physical channel:

- background noise;
- reflections from walls;
- speaker and microphone frequency response;
- automatic gain control and noise suppression;
- distortion and clipping;
- hardware filters that remove frequencies near 18–22 kHz.

Many phones, laptops, speakers, and microphones cannot reproduce this range
reliably. A failed over-the-air experiment does not necessarily mean the FM
algorithm is wrong; the acoustic channel may have removed the carrier.

## Try the experiment

Use the included samples, drop an audio file, or record your voice. The browser
usually accepts WAV, MP3, M4A/AAC, OGG/Vorbis, and WebM/Opus, although exact
support varies. The maximum input length is currently 120 seconds.

You can listen to and download both the generated FM signal and the recovered
message as WAV files. The FM player starts at 12% volume and never plays
automatically.

To run the experiment locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Replace `8000` with another port if needed.

## Listening safety

Always use a low volume for high-frequency signals. A sound that is barely
audible or inaudible may still be emitted by the device and may still be loud at
the transducer.

## What FM does not provide

Frequency modulation changes how information is represented. It is not
encryption, compression, or steganography. Anyone who knows the carrier and
deviation and has a suitable receiver can recover the message.
