import { BiquadLowpass } from "../../filters.js";

/**
 * A stateful AM envelope receiver for file and AudioWorklet processing.
 * Quadrature mixing first selects one station; the I/Q magnitude is then its
 * envelope. A causal DC blocker removes the carrier level without looking
 * ahead, leaving the programme audio.
 */
export class StreamingAmReceiver {
  constructor(
    sampleRate,
    carrier,
    messageBandwidth,
    { outputGain = 1 } = {},
  ) {
    if (sampleRate <= 0 || carrier <= 0 || messageBandwidth <= 0) {
      throw new RangeError("AM receiver parameters must be positive.");
    }

    this.sampleRate = sampleRate;
    this.phaseScale = (2 * Math.PI) / sampleRate;
    this.outputGain = outputGain;
    this.oscillatorPhase = 0;
    this.previousEnvelope = 0;
    this.previousDcOutput = 0;
    this.samplesProcessed = 0;
    this.dcCoefficient = Math.exp((-2 * Math.PI * 20) / sampleRate);
    this.setCarrier(carrier);

    const selectionCutoff = Math.min(messageBandwidth * 1.2, sampleRate * 0.4);
    this.iFilters = [
      new BiquadLowpass(sampleRate, selectionCutoff),
      new BiquadLowpass(sampleRate, selectionCutoff),
    ];
    this.qFilters = [
      new BiquadLowpass(sampleRate, selectionCutoff),
      new BiquadLowpass(sampleRate, selectionCutoff),
    ];
    this.audioFilters = [
      new BiquadLowpass(sampleRate, messageBandwidth),
      new BiquadLowpass(sampleRate, messageBandwidth),
    ];
  }

  setCarrier(carrier) {
    if (carrier <= 0 || carrier >= this.sampleRate / 2) {
      throw new RangeError("The tuned carrier must remain below the Nyquist limit.");
    }
    this.carrier = carrier;
  }

  process(sample, carrier = this.carrier) {
    if (carrier !== this.carrier) this.setCarrier(carrier);

    this.oscillatorPhase += this.phaseScale * this.carrier;
    if (this.oscillatorPhase > Math.PI * 2) {
      this.oscillatorPhase %= Math.PI * 2;
    }

    let i = 2 * sample * Math.cos(this.oscillatorPhase);
    let q = -2 * sample * Math.sin(this.oscillatorPhase);
    for (const filter of this.iFilters) i = filter.process(i);
    for (const filter of this.qFilters) q = filter.process(q);

    const envelope = Math.hypot(i, q);
    const withoutCarrier =
      envelope -
      this.previousEnvelope +
      this.dcCoefficient * this.previousDcOutput;
    this.previousEnvelope = envelope;
    this.previousDcOutput = withoutCarrier;

    let output = withoutCarrier;
    for (const filter of this.audioFilters) output = filter.process(output);
    this.samplesProcessed += 1;
    const startupGain = Math.min(
      1,
      this.samplesProcessed / (this.sampleRate * 0.03),
    );
    return Math.max(
      -1,
      Math.min(1, output * this.outputGain * startupGain),
    );
  }
}
