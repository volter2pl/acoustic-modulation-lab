import { BiquadLowpass, lowpass, normalize, removeDc } from "./filters.js";

const DEFAULT_MESSAGE_BANDWIDTH = 2400;

/**
 * Recover the message from a real-valued FM waveform with an I/Q discriminator.
 *
 * 1. Mix the waveform with sine and cosine oscillators at the carrier frequency.
 * 2. Low-pass both branches to remove the image around twice the carrier.
 * 3. Measure the phase change of the resulting complex baseband signal.
 * 4. Convert phase change to frequency deviation and divide by Δf.
 *
 * For z[n] = I[n] + jQ[n], arg(z[n] * conjugate(z[n-1])) gives the phase
 * increment directly and avoids a separate phase-unwrapping step.
 */
export function demodulateFM(
  signal,
  sampleRate,
  carrier,
  deviation,
  messageBandwidth = DEFAULT_MESSAGE_BANDWIDTH,
) {
  const composite = demodulateFMComposite(
    signal,
    sampleRate,
    carrier,
    deviation,
    messageBandwidth,
  );
  return normalize(lowpass(composite, sampleRate, messageBandwidth, 2), 0.92);
}

/**
 * Recover the complete signal that originally modulated the FM carrier.
 * Keeping this stage separate lets an RDS receiver inspect the wide multiplex
 * before the audible programme is extracted from it.
 */
export function demodulateFMComposite(
  signal,
  sampleRate,
  carrier,
  deviation,
  basebandBandwidth,
) {
  if (!(signal instanceof Float32Array)) {
    throw new TypeError("The FM signal must be a Float32Array.");
  }
  if (sampleRate <= 0 || carrier <= 0 || deviation <= 0) {
    throw new RangeError("Demodulation parameters must be positive.");
  }

  const basebandCutoff = Math.min(
    (deviation + basebandBandwidth) * 1.15,
    carrier * 0.9,
    sampleRate * 0.4,
  );
  const iFilters = [
    new BiquadLowpass(sampleRate, basebandCutoff),
    new BiquadLowpass(sampleRate, basebandCutoff),
  ];
  const qFilters = [
    new BiquadLowpass(sampleRate, basebandCutoff),
    new BiquadLowpass(sampleRate, basebandCutoff),
  ];

  const recovered = new Float32Array(signal.length);
  const carrierStep = (2 * Math.PI * carrier) / sampleRate;
  const frequencyScale = sampleRate / (2 * Math.PI * deviation);
  let oscillatorPhase = 0;
  let previousI = 0;
  let previousQ = 0;

  for (let index = 0; index < signal.length; index += 1) {
    oscillatorPhase += carrierStep;
    if (oscillatorPhase > Math.PI * 2) oscillatorPhase %= Math.PI * 2;

    let i = 2 * signal[index] * Math.sin(oscillatorPhase);
    let q = 2 * signal[index] * Math.cos(oscillatorPhase);
    for (const filter of iFilters) i = filter.process(i);
    for (const filter of qFilters) q = filter.process(q);

    if (index > 0) {
      const magnitudeProduct = Math.hypot(i, q) * Math.hypot(previousI, previousQ);
      if (magnitudeProduct > 1e-7) {
        // Imaginary and real parts of z[n] * conjugate(z[n - 1]).
        const cross = q * previousI - i * previousQ;
        const dot = i * previousI + q * previousQ;
        const phaseDelta = Math.atan2(cross, dot);
        recovered[index] = phaseDelta * frequencyScale;
      }
    }

    previousI = i;
    previousQ = q;
  }

  const withoutDc = removeDc(recovered);
  const transientLength = Math.min(Math.floor(sampleRate * 0.012), withoutDc.length);
  for (let index = 0; index < transientLength; index += 1) {
    withoutDc[index] *= index / Math.max(1, transientLength - 1);
  }
  return withoutDc;
}

export { DEFAULT_MESSAGE_BANDWIDTH };
