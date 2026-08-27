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

1. **Message** — the original recording. Its waveform visibly follows the
   changing amplitude of speech or music.
2. **FM signal** — one nearly constant-amplitude waveform. The message is now
   stored in the changing distance between its cycles, not in its height.
3. **Recovered audio** — the result of measuring those frequency changes and
   converting them back into sample values.

At a normal zoom level, a high-frequency FM waveform often looks like a solid
band. This is expected: thousands of cycles are compressed into a few pixels.
Zooming in reveals that the cycles become closer together when instantaneous
frequency rises and farther apart when it falls.

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

Use the included sample, drop an audio file, or record your voice. The browser
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
