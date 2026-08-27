import {
  BiquadLowpass,
  createButterworthLowpassSections,
} from "../../filters.js";

const CHANNEL_FILTER_ORDER = 12;
const CHANNEL_CUTOFF_MARGIN = 1.05;
// Full programme level is retained for a normally received station. Below
// that level the discriminator is weighted continuously, never hard-muted.
const FULL_CONFIDENCE_RATIO = 0.75;
const DISCRIMINATOR_LIMIT = 0.9;

/**
 * A sample-by-sample FM receiver suitable for an AudioWorklet.
 *
 * Unlike the file-oriented demodulator, this receiver keeps its oscillator and
 * filter state between audio blocks. Changing the tuned carrier therefore acts
 * like turning a radio dial while the shared channel continues to play.
 */
export class StreamingFmReceiver {
  constructor(
    sampleRate,
    carrier,
    deviation,
    messageBandwidth,
    { outputGain = 0.92, selectionReferenceLevel = null } = {},
  ) {
    if (sampleRate <= 0 || carrier <= 0 || deviation <= 0 || messageBandwidth <= 0) {
      throw new RangeError("Receiver parameters must be positive.");
    }

    this.sampleRate = sampleRate;
    this.deviation = deviation;
    this.outputGain = outputGain;
    this.selectionReferenceLevel = selectionReferenceLevel;
    this.phaseScale = (2 * Math.PI) / sampleRate;
    this.frequencyScale = sampleRate / (2 * Math.PI * deviation);
    this.oscillatorPhase = 0;
    this.previousI = 0;
    this.previousQ = 0;
    this.previousInput = 0;
    this.previousDcOutput = 0;
    this.dcCoefficient = Math.exp((-2 * Math.PI * 20) / sampleRate);
    this.hasPreviousIq = false;
    this.setCarrier(carrier);

    const basebandCutoff = Math.min(
      (deviation + messageBandwidth) * CHANNEL_CUTOFF_MARGIN,
      sampleRate * 0.4,
    );
    this.iFilters = createButterworthLowpassSections(
      sampleRate,
      basebandCutoff,
      CHANNEL_FILTER_ORDER,
    );
    this.qFilters = createButterworthLowpassSections(
      sampleRate,
      basebandCutoff,
      CHANNEL_FILTER_ORDER,
    );
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

    let i = 2 * sample * Math.sin(this.oscillatorPhase);
    let q = 2 * sample * Math.cos(this.oscillatorPhase);
    for (const filter of this.iFilters) i = filter.process(i);
    for (const filter of this.qFilters) q = filter.process(q);

    const magnitude = Math.hypot(i, q);
    let recovered = 0;
    if (this.hasPreviousIq) {
      const magnitudeProduct =
        magnitude * Math.hypot(this.previousI, this.previousQ);
      if (magnitudeProduct > 1e-7) {
        const cross = q * this.previousI - i * this.previousQ;
        const dot = i * this.previousI + q * this.previousQ;
        recovered = Math.atan2(cross, dot) * this.frequencyScale;
      }
    }

    this.previousI = i;
    this.previousQ = q;
    this.hasPreviousIq = true;

    // A causal DC blocker replaces the whole-file mean subtraction used by
    // offline decoding. It removes the tuning offset without looking ahead.
    const withoutDc =
      recovered - this.previousInput + this.dcCoefficient * this.previousDcOutput;
    this.previousInput = recovered;
    this.previousDcOutput = withoutDc;

    // An ideal phase discriminator can decode an arbitrarily attenuated FM
    // residue in a noiseless simulation. Magnitude weighting gives the channel
    // filter meaningful selectivity while preserving audible off-channel
    // interference instead of implementing a squelch.
    const selectionConfidence = this.selectionReferenceLevel > 0
      ? Math.min(
          1,
          magnitude /
            (this.selectionReferenceLevel * FULL_CONFIDENCE_RATIO),
        )
      : 1;
    let output = Math.max(
      -DISCRIMINATOR_LIMIT,
      Math.min(DISCRIMINATOR_LIMIT, withoutDc),
    ) * selectionConfidence;
    for (const filter of this.audioFilters) output = filter.process(output);
    return Math.max(-1, Math.min(1, output * this.outputGain));
  }
}
