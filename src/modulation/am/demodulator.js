import { fadeEdges, normalize } from "../../filters.js";
import { StreamingAmReceiver } from "./streaming-receiver.js";

export const DEFAULT_AM_MESSAGE_BANDWIDTH = 2400;

/** Recover conventional AM with a quadrature envelope detector. */
export function demodulateAM(
  signal,
  sampleRate,
  carrier,
  messageBandwidth = DEFAULT_AM_MESSAGE_BANDWIDTH,
) {
  if (!(signal instanceof Float32Array)) {
    throw new TypeError("The AM signal must be a Float32Array.");
  }
  const receiver = new StreamingAmReceiver(
    sampleRate,
    carrier,
    messageBandwidth,
  );
  const recovered = new Float32Array(signal.length);
  for (let index = 0; index < signal.length; index += 1) {
    recovered[index] = receiver.process(signal[index]);
  }
  return fadeEdges(normalize(recovered, 0.92), sampleRate, 0.015);
}
