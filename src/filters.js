/**
 * One second-order Butterworth-style low-pass section using the RBJ cookbook
 * coefficients. Cascading two sections gives the steeper fourth-order response
 * used for message band-limiting and I/Q image rejection.
 */
export class BiquadLowpass {
  constructor(sampleRate, cutoff, q = Math.SQRT1_2) {
    const clampedCutoff = Math.max(20, Math.min(cutoff, sampleRate * 0.49));
    const omega = (2 * Math.PI * clampedCutoff) / sampleRate;
    const cosine = Math.cos(omega);
    const alpha = Math.sin(omega) / (2 * q);
    const a0 = 1 + alpha;

    this.b0 = ((1 - cosine) / 2) / a0;
    this.b1 = (1 - cosine) / a0;
    this.b2 = this.b0;
    this.a1 = (-2 * cosine) / a0;
    this.a2 = (1 - alpha) / a0;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  process(sample) {
    const output =
      this.b0 * sample +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;

    this.x2 = this.x1;
    this.x1 = sample;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }
}

export function lowpass(signal, sampleRate, cutoff, stages = 2) {
  let output = Float32Array.from(signal);

  for (let stage = 0; stage < stages; stage += 1) {
    const filter = new BiquadLowpass(sampleRate, cutoff);
    const filtered = new Float32Array(output.length);
    for (let index = 0; index < output.length; index += 1) {
      filtered[index] = filter.process(output[index]);
    }
    output = filtered;
  }

  return output;
}

export function removeDc(signal) {
  if (!signal.length) return new Float32Array();

  let mean = 0;
  for (const sample of signal) mean += sample;
  mean /= signal.length;

  const output = new Float32Array(signal.length);
  for (let index = 0; index < signal.length; index += 1) {
    output[index] = signal[index] - mean;
  }
  return output;
}

export function normalize(signal, peakTarget = 0.95) {
  let peak = 0;
  for (const sample of signal) peak = Math.max(peak, Math.abs(sample));
  if (peak < 1e-8) return Float32Array.from(signal);

  const gain = peakTarget / peak;
  const output = new Float32Array(signal.length);
  for (let index = 0; index < signal.length; index += 1) {
    output[index] = signal[index] * gain;
  }
  return output;
}

export function fadeEdges(signal, sampleRate, durationSeconds = 0.008) {
  const output = Float32Array.from(signal);
  const fadeLength = Math.min(Math.floor(sampleRate * durationSeconds), Math.floor(output.length / 2));

  for (let index = 0; index < fadeLength; index += 1) {
    const gain = index / Math.max(1, fadeLength - 1);
    output[index] *= gain;
    output[output.length - 1 - index] *= gain;
  }
  return output;
}
