import { demodulateFM } from "./demodulator.js";
import { FmOscillator } from "./modulator.js";

export const RADIO_STATION_CARRIERS = Object.freeze([5000, 12000, 19000]);
export const RADIO_BAND_DEVIATION = 750;
export const RADIO_BAND_MESSAGE_BANDWIDTH = 2000;
export const RADIO_BAND_OUTPUT_LEVEL = 0.78;
export const RADIO_BAND_STATION_LEVEL =
  RADIO_BAND_OUTPUT_LEVEL / RADIO_STATION_CARRIERS.length;

/**
 * Combine independent FM stations into one real-valued acoustic radio band.
 * Shorter programmes become zero-valued messages after they finish, so their
 * unmodulated carriers remain present until the longest programme ends.
 */
export function createRadioBand(
  messages,
  sampleRate,
  {
    carriers = RADIO_STATION_CARRIERS,
    deviation = RADIO_BAND_DEVIATION,
    levels = messages.map(() => 1),
  } = {},
) {
  if (!messages.length || messages.length !== carriers.length) {
    throw new RangeError("Each radio station must have one message and one carrier.");
  }
  if (messages.some((message) => !(message instanceof Float32Array))) {
    throw new TypeError("Every station message must be a Float32Array.");
  }

  const length = Math.max(...messages.map((message) => message.length));
  const stationLevel = RADIO_BAND_OUTPUT_LEVEL / messages.length;
  const oscillators = carriers.map(
    (carrier, index) =>
      new FmOscillator(
        sampleRate,
        carrier,
        deviation,
        stationLevel * Math.max(0, Math.min(1, levels[index] ?? 1)),
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

export function receiveRadioStation(
  channel,
  sampleRate,
  tunedCarrier,
  deviation = RADIO_BAND_DEVIATION,
  selectionReferenceLevel = RADIO_BAND_STATION_LEVEL,
) {
  return demodulateFM(
    channel,
    sampleRate,
    tunedCarrier,
    deviation,
    RADIO_BAND_MESSAGE_BANDWIDTH,
    { selectionReferenceLevel },
  );
}
