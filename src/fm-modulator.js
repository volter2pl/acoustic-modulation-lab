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
export function modulateFM(message, sampleRate, carrier, deviation, amplitude = 0.72) {
  if (!(message instanceof Float32Array)) {
    throw new TypeError("The message must be a Float32Array.");
  }
  if (sampleRate <= 0 || carrier <= 0 || deviation <= 0) {
    throw new RangeError("Modulation parameters must be positive.");
  }
  if (carrier + deviation >= sampleRate / 2) {
    throw new RangeError("The instantaneous frequency exceeds the Nyquist limit.");
  }

  const output = new Float32Array(message.length);
  const phaseScale = (2 * Math.PI) / sampleRate;
  let phase = 0;

  for (let index = 0; index < message.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, message[index]));
    const instantaneousFrequency = carrier + deviation * sample;
    phase += phaseScale * instantaneousFrequency;

    if (phase > Math.PI * 2) phase %= Math.PI * 2;
    output[index] = amplitude * Math.sin(phase);
  }

  return output;
}
