export const AM_CARRIER_AMPLITUDE = 0.38;

/**
 * A conventional double-sideband AM transmitter with a visible carrier.
 *
 * The normalized message changes the carrier envelope:
 *
 *   s[n] = A · (1 + μm[n]) · cos(phase[n])
 *
 * At μ <= 1 the envelope never changes sign. Above 100% modulation it crosses
 * zero, allowing the experiment to demonstrate envelope-detector distortion.
 */
export class AmOscillator {
  constructor(sampleRate, carrier, modulationDepth, carrierAmplitude = AM_CARRIER_AMPLITUDE) {
    if (sampleRate <= 0 || carrier <= 0 || modulationDepth < 0 || carrierAmplitude <= 0) {
      throw new RangeError("AM transmitter parameters must be valid and non-negative.");
    }
    if (carrier >= sampleRate / 2) {
      throw new RangeError("The carrier exceeds the Nyquist limit.");
    }

    this.modulationDepth = modulationDepth;
    this.carrierAmplitude = carrierAmplitude;
    this.phaseStep = (2 * Math.PI * carrier) / sampleRate;
    this.phase = 0;
  }

  process(messageSample) {
    const message = Math.max(-1, Math.min(1, messageSample));
    this.phase += this.phaseStep;
    if (this.phase > Math.PI * 2) this.phase %= Math.PI * 2;
    const envelope = 1 + this.modulationDepth * message;
    return this.carrierAmplitude * envelope * Math.cos(this.phase);
  }
}

export function modulateAM(
  message,
  sampleRate,
  carrier,
  modulationDepth,
  carrierAmplitude = AM_CARRIER_AMPLITUDE,
) {
  if (!(message instanceof Float32Array)) {
    throw new TypeError("The message must be a Float32Array.");
  }

  const output = new Float32Array(message.length);
  const oscillator = new AmOscillator(
    sampleRate,
    carrier,
    modulationDepth,
    carrierAmplitude,
  );
  for (let index = 0; index < message.length; index += 1) {
    output[index] = oscillator.process(message[index]);
  }
  return output;
}
