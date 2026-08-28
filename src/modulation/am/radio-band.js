import { demodulateAM } from "./demodulator.js";
import { AmOscillator } from "./modulator.js";

export const AM_STATION_CARRIERS = Object.freeze([5000, 12000, 19000]);
export const AM_BAND_MESSAGE_BANDWIDTH = 2000;
export const AM_BAND_MODULATION_DEPTH = 0.8;
export const AM_BAND_OUTPUT_LEVEL = 0.78;

/** Combine conventional AM stations into one frequency-division channel. */
export function createAmRadioBand(
  messages,
  sampleRate,
  {
    carriers = AM_STATION_CARRIERS,
    modulationDepth = AM_BAND_MODULATION_DEPTH,
    levels = messages.map(() => 1),
    phases = messages.map(() => 0),
  } = {},
) {
  if (!messages.length || messages.length !== carriers.length) {
    throw new RangeError("Each AM station must have one message and one carrier.");
  }
  if (messages.some((message) => !(message instanceof Float32Array))) {
    throw new TypeError("Every AM station message must be a Float32Array.");
  }

  const length = Math.max(...messages.map((message) => message.length));
  const carrierAmplitude =
    AM_BAND_OUTPUT_LEVEL / messages.length / (1 + modulationDepth);
  const oscillators = carriers.map(
    (carrier, index) =>
      new AmOscillator(
        sampleRate,
        carrier,
        modulationDepth,
        carrierAmplitude * Math.max(0, Math.min(1, levels[index] ?? 1)),
        phases[index] ?? 0,
      ),
  );
  const channel = new Float32Array(length);

  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    let mixedSample = 0;
    for (let stationIndex = 0; stationIndex < messages.length; stationIndex += 1) {
      mixedSample += oscillators[stationIndex].process(
        messages[stationIndex][sampleIndex] ?? 0,
      );
    }
    channel[sampleIndex] = mixedSample;
  }
  return channel;
}

export function receiveAmStation(channel, sampleRate, tunedCarrier) {
  return demodulateAM(
    channel,
    sampleRate,
    tunedCarrier,
    AM_BAND_MESSAGE_BANDWIDTH,
    { outputGain: getAmBandReceiverGain() },
  );
}

export function getAmBandReceiverGain(stationCount = AM_STATION_CARRIERS.length) {
  const carrierAmplitude =
    AM_BAND_OUTPUT_LEVEL / stationCount / (1 + AM_BAND_MODULATION_DEPTH);
  const programmeAmplitude = carrierAmplitude * AM_BAND_MODULATION_DEPTH;
  return 0.92 / programmeAmplitude;
}
