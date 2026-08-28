/**
 * Frequency-modulate a normalized message signal.
 *
 * For each sample m[n], the instantaneous frequency is
 *
 *   f_i[n] = carrier + deviation * m[n]
 *
 * Frequency is the derivative of phase, so discrete FM must accumulate phase.
 * Computing sin(2π * f_i[n] * time) independently for every sample would create
 * phase discontinuities and would not be a correct FM modulator.
 */
export class FmOscillator {
  constructor(
    sampleRate,
    carrier,
    deviation,
    amplitude = 0.72,
    initialPhase = 0,
  ) {
    if (sampleRate <= 0 || carrier <= 0 || deviation <= 0) {
      throw new RangeError("Modulation parameters must be positive.");
    }
    if (!Number.isFinite(initialPhase)) {
      throw new RangeError("The initial phase must be finite.");
    }
    if (carrier + deviation >= sampleRate / 2) {
      throw new RangeError("The instantaneous frequency exceeds the Nyquist limit.");
    }

    this.carrier = carrier;
    this.deviation = deviation;
    this.amplitude = amplitude;
    this.phaseScale = (2 * Math.PI) / sampleRate;
    this.phase = ((initialPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }

  process(messageSample) {
    const sample = Math.max(-1, Math.min(1, messageSample));
    const instantaneousFrequency = this.carrier + this.deviation * sample;
    this.phase += this.phaseScale * instantaneousFrequency;
    if (this.phase > Math.PI * 2) this.phase %= Math.PI * 2;
    return this.amplitude * Math.sin(this.phase);
  }
}

export function modulateFM(
  message,
  sampleRate,
  carrier,
  deviation,
  amplitude = 0.72,
  initialPhase = 0,
) {
  if (!(message instanceof Float32Array)) {
    throw new TypeError("The message must be a Float32Array.");
  }

  const output = new Float32Array(message.length);
  const oscillator = new FmOscillator(
    sampleRate,
    carrier,
    deviation,
    amplitude,
    initialPhase,
  );

  for (let index = 0; index < message.length; index += 1) {
    output[index] = oscillator.process(message[index]);
  }

  return output;
}
