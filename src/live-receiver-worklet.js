import { StreamingFmReceiver } from "./streaming-fm-receiver.js";

/** Process the acoustic radio band on the browser's real-time audio thread. */
class AcousticFmReceiverProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "tunedCarrier",
        defaultValue: 12000,
        minValue: 4000,
        maxValue: 20000,
        automationRate: "k-rate",
      },
    ];
  }

  constructor(options) {
    super();
    const { deviation, messageBandwidth, carrier = 12000 } =
      options.processorOptions ?? {};
    this.receiver = new StreamingFmReceiver(
      sampleRate,
      carrier,
      deviation,
      messageBandwidth,
    );
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;

    if (!input) {
      output.fill(0);
      return true;
    }

    const carrier = parameters.tunedCarrier[0];
    for (let index = 0; index < output.length; index += 1) {
      output[index] = this.receiver.process(input[index], carrier);
    }
    return true;
  }
}

registerProcessor("acoustic-fm-live-receiver", AcousticFmReceiverProcessor);
