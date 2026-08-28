import { prepareMessage } from "../../audio.js";
import { LiveRadioReceiver } from "../../live-receiver.js";
import {
  DEFAULT_MESSAGE_BANDWIDTH,
  demodulateFM,
  demodulateFMComposite,
} from "./demodulator.js";
import { modulateFM } from "./modulator.js";
import {
  createRadioBand,
  RADIO_BAND_DEVIATION,
  RADIO_BAND_MESSAGE_BANDWIDTH,
  RADIO_BAND_STATION_LEVEL,
  RADIO_STATION_CARRIERS,
  receiveRadioStation,
} from "./radio-band.js";
import {
  createRdsComposite,
  decodeRdsComposite,
  isSupportedRdsText,
  RDS_AUDIO_BANDWIDTH,
  RDS_AUDIO_FILTER_ORDER,
  RDS_BASEBAND_BANDWIDTH,
  RDS_MODES,
  recoverAudioFromRdsComposite,
} from "./rds.js";

export const FM_EXPERIMENT = Object.freeze({
  id: "fm",
  label: "FM",
  supportsRds: true,
  defaultCarrier: 18000,
  stationCarriers: RADIO_STATION_CARRIERS,
  bandMessageBandwidth: RADIO_BAND_MESSAGE_BANDWIDTH,

  getCarrierLimits({ sampleRate, parameters, rds }) {
    if (rds.mode === RDS_MODES.NONE) {
      return { min: 5000, max: Math.min(20000, sampleRate / 2 - 1000) };
    }
    const guard = 500;
    const min =
      Math.ceil((RDS_BASEBAND_BANDWIDTH + parameters.deviation + guard) / 100) * 100;
    const max =
      Math.floor(
        (sampleRate / 2 - RDS_BASEBAND_BANDWIDTH - parameters.deviation - guard) /
          100,
      ) * 100;
    return { min, max };
  },

  validateSingle({ sampleRate, parameters, rds }) {
    const nyquist = sampleRate / 2;
    const messageBandwidth =
      rds.mode === RDS_MODES.NONE
        ? DEFAULT_MESSAGE_BANDWIDTH
        : RDS_BASEBAND_BANDWIDTH;
    const occupiedHalfBandwidth = parameters.deviation + messageBandwidth;
    if (rds.mode !== RDS_MODES.NONE && !isSupportedRdsText(rds.text)) {
      return "validation.rdsTextCharacters";
    }
    if (parameters.carrier + parameters.deviation >= nyquist) {
      return "validation.fmInstantaneousNyquist";
    }
    if (parameters.carrier + occupiedHalfBandwidth > nyquist - 500) {
      return "validation.fmBandwidthNyquist";
    }
    if (parameters.carrier - occupiedHalfBandwidth < 150) {
      return "validation.fmBandwidthLower";
    }
    return null;
  },

  validateBand({ sampleRate, tunedCarrier }) {
    const occupiedHalfBandwidth =
      RADIO_BAND_DEVIATION + RADIO_BAND_MESSAGE_BANDWIDTH;
    if (
      tunedCarrier - occupiedHalfBandwidth < 150 ||
      tunedCarrier + occupiedHalfBandwidth > sampleRate / 2 - 500
    ) {
      return "validation.fmReceiverRange";
    }
    return null;
  },

  getOccupiedBandwidth(parameters, rds) {
    const messageBandwidth =
      rds.mode === RDS_MODES.NONE
        ? DEFAULT_MESSAGE_BANDWIDTH
        : RDS_BASEBAND_BANDWIDTH;
    return 2 * (parameters.deviation + messageBandwidth);
  },

  getSingleSnapshot(parameters, rds) {
    return {
      carrier: parameters.carrier,
      deviation: parameters.deviation,
      rdsMode: rds.mode,
      rdsText: rds.text,
    };
  },

  encodeSingle(audioBuffer, parameters, rds) {
    const audioBandwidth =
      rds.mode === RDS_MODES.NONE ? DEFAULT_MESSAGE_BANDWIDTH : RDS_AUDIO_BANDWIDTH;
    const filterOrder =
      rds.mode === RDS_MODES.NONE ? 4 : RDS_AUDIO_FILTER_ORDER;
    const message = prepareMessage(audioBuffer, audioBandwidth, filterOrder);
    const composite = createRdsComposite(message, audioBuffer.sampleRate, rds);
    return modulateFM(
      composite,
      audioBuffer.sampleRate,
      parameters.carrier,
      parameters.deviation,
    );
  },

  decodeSingle(signal, sampleRate, parameters, rds) {
    if (rds.mode === RDS_MODES.NONE) {
      return {
        samples: demodulateFM(
          signal,
          sampleRate,
          parameters.carrier,
          parameters.deviation,
          DEFAULT_MESSAGE_BANDWIDTH,
        ),
        data: null,
        dataExpected: false,
      };
    }
    const composite = demodulateFMComposite(
      signal,
      sampleRate,
      parameters.carrier,
      parameters.deviation,
      RDS_BASEBAND_BANDWIDTH,
    );
    return {
      samples: recoverAudioFromRdsComposite(composite, sampleRate),
      data: decodeRdsComposite(composite, sampleRate, rds.mode),
      dataExpected: true,
    };
  },

  prepareBandMessage(audioBuffer) {
    return prepareMessage(audioBuffer, RADIO_BAND_MESSAGE_BANDWIDTH, 8);
  },

  createBand(
    messages,
    sampleRate,
    levels,
    carriers,
    phasesDegrees = messages.map(() => 0),
  ) {
    const phases = phasesDegrees.map((phase) => (phase * Math.PI) / 180);
    return createRadioBand(messages, sampleRate, { levels, carriers, phases });
  },

  receiveBand(signal, sampleRate, tunedCarrier) {
    return receiveRadioStation(signal, sampleRate, tunedCarrier);
  },

  createLiveReceiver(onStateChanged) {
    return new LiveRadioReceiver({
      workletUrl: new URL("./receiver-worklet.js", import.meta.url),
      processorName: "acoustic-fm-live-receiver",
      processorOptions: {
        deviation: RADIO_BAND_DEVIATION,
        messageBandwidth: RADIO_BAND_MESSAGE_BANDWIDTH,
        selectionReferenceLevel: RADIO_BAND_STATION_LEVEL,
      },
      onStateChanged,
    });
  },
});
