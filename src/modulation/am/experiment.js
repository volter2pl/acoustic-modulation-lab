import { prepareMessage } from "../../audio.js";
import { LiveRadioReceiver } from "../../live-receiver.js";
import { DEFAULT_AM_MESSAGE_BANDWIDTH, demodulateAM } from "./demodulator.js";
import { modulateAM } from "./modulator.js";
import {
  AM_BAND_MESSAGE_BANDWIDTH,
  AM_BAND_MODULATION_DEPTH,
  AM_STATION_CARRIERS,
  createAmRadioBand,
  getAmBandReceiverGain,
  receiveAmStation,
} from "./radio-band.js";

export const AM_EXPERIMENT = Object.freeze({
  id: "am",
  label: "AM",
  supportsRds: false,
  defaultCarrier: 12000,
  stationCarriers: AM_STATION_CARRIERS,
  bandMessageBandwidth: AM_BAND_MESSAGE_BANDWIDTH,

  getCarrierLimits({ sampleRate }) {
    const guard = 500;
    return {
      min: 5000,
      max: Math.min(
        20000,
        Math.floor((sampleRate / 2 - DEFAULT_AM_MESSAGE_BANDWIDTH - guard) / 100) * 100,
      ),
    };
  },

  validateSingle({ sampleRate, parameters }) {
    const guard = 500;
    if (parameters.carrier - DEFAULT_AM_MESSAGE_BANDWIDTH < 150) {
      return "validation.amLowerSideband";
    }
    if (
      parameters.carrier + DEFAULT_AM_MESSAGE_BANDWIDTH >
      sampleRate / 2 - guard
    ) {
      return "validation.amUpperSideband";
    }
    return null;
  },

  validateBand({ sampleRate, tunedCarrier }) {
    if (
      tunedCarrier - AM_BAND_MESSAGE_BANDWIDTH < 150 ||
      tunedCarrier + AM_BAND_MESSAGE_BANDWIDTH > sampleRate / 2 - 500
    ) {
      return "validation.amReceiverRange";
    }
    return null;
  },

  getOccupiedBandwidth() {
    return 2 * DEFAULT_AM_MESSAGE_BANDWIDTH;
  },

  getSingleSnapshot(parameters) {
    return {
      carrier: parameters.carrier,
      modulationDepth: parameters.modulationDepth,
    };
  },

  encodeSingle(audioBuffer, parameters) {
    const message = prepareMessage(audioBuffer, DEFAULT_AM_MESSAGE_BANDWIDTH, 4);
    return modulateAM(
      message,
      audioBuffer.sampleRate,
      parameters.carrier,
      parameters.modulationDepth / 100,
    );
  },

  decodeSingle(signal, sampleRate, parameters) {
    const samples =
      parameters.modulationDepth === 0
        ? new Float32Array(signal.length)
        : demodulateAM(
            signal,
            sampleRate,
            parameters.carrier,
            DEFAULT_AM_MESSAGE_BANDWIDTH,
          );
    return { samples, data: null, dataExpected: false };
  },

  prepareBandMessage(audioBuffer) {
    return prepareMessage(audioBuffer, AM_BAND_MESSAGE_BANDWIDTH, 8);
  },

  createBand(messages, sampleRate, levels) {
    return createAmRadioBand(messages, sampleRate, { levels });
  },

  receiveBand(signal, sampleRate, tunedCarrier) {
    return receiveAmStation(signal, sampleRate, tunedCarrier);
  },

  createLiveReceiver(onStateChanged) {
    return new LiveRadioReceiver({
      workletUrl: new URL("./receiver-worklet.js", import.meta.url),
      processorName: "acoustic-am-live-receiver",
      processorOptions: {
        messageBandwidth: AM_BAND_MESSAGE_BANDWIDTH,
        modulationDepth: AM_BAND_MODULATION_DEPTH,
        receiverGain: getAmBandReceiverGain(),
      },
      outputGain: 0.82,
      onStateChanged,
    });
  },
});
