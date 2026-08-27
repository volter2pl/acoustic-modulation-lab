import { decodeAudioBlob, describeAudio, formatDuration, mixToMono, prepareMessage } from "./audio.js";
import { AUDIO_EXAMPLES } from "./examples.js";
import {
  DEFAULT_MESSAGE_BANDWIDTH,
  demodulateFM,
  demodulateFMComposite,
} from "./fm-demodulator.js";
import { modulateFM } from "./fm-modulator.js";
import { LiveRadioReceiver } from "./live-radio-receiver.js";
import {
  createRadioBand,
  RADIO_BAND_DEVIATION,
  RADIO_BAND_MESSAGE_BANDWIDTH,
  RADIO_STATION_CARRIERS,
  receiveRadioStation,
} from "./radio-channel.js";
import { MicrophoneRecorder } from "./recorder.js";
import {
  createRdsComposite,
  decodeRdsComposite,
  RDS_AUDIO_BANDWIDTH,
  RDS_AUDIO_FILTER_ORDER,
  RDS_BASEBAND_BANDWIDTH,
  RDS_MODES,
  recoverAudioFromRdsComposite,
} from "./rds.js";
import { AppUI, downloadBlob } from "./ui.js";
import { createWavBlob } from "./wav.js";

/**
 * Application controller.
 *
 * It owns the experiment state and connects the pure DSP modules to the UI.
 * It deliberately contains no DOM queries and no signal-processing math.
 */
export class AcousticFmApp {
  constructor() {
    this.state = {
      source: null,
      fm: null,
      fmBlob: null,
      fmOrigin: null,
      fmParameters: null,
      decodedBlob: null,
      busy: false,
      operation: null,
      experimentMode: "single",
      bandStations: RADIO_STATION_CARRIERS.map(() => null),
      bandRevision: 0,
      receiverSnapshotCarrier: null,
      rdsMode: RDS_MODES.NONE,
      carrierWithoutRds: 18000,
      rdsTexts: {
        [RDS_MODES.PS]: "ACOUSTIC",
        [RDS_MODES.RADIOTEXT]: "FM carries audio and data together.",
      },
    };
    this.recorder = new MicrophoneRecorder();
    this.ui = new AppUI(
      AUDIO_EXAMPLES,
      {
        onSourceFile: (file) => this.loadSource(file, file.name),
        onExample: (example) => this.loadExample(example),
        onFmFile: (file) => this.loadExternalFm(file, file.name),
        onEncode: () => this.encodeSource(),
        onDecode: () => this.decodeFm(),
        onParametersChanged: () => this.parametersChanged(),
        onModeChanged: (mode) => this.modeChanged(mode),
        onBandExample: (index, example) => this.loadBandExample(index, example),
        onBandFile: (index, file) =>
          this.loadBandStation(index, file, file.name, "custom"),
        onBandLevelChanged: () => this.bandParametersChanged(),
        onReceiverTuningChanged: () => this.receiverTuningChanged(),
        onToggleLiveReceiver: () => this.toggleLiveReceiver(),
        onSeekLiveReceiver: (progress) => this.seekLiveReceiver(progress),
        onRdsModeChanged: (mode) => this.rdsModeChanged(mode),
        onRdsTextChanged: (text) => this.rdsTextChanged(text),
        onToggleRecording: () => this.toggleRecording(),
        onShowSourceChooser: () => this.ui.showSourceChooser(Boolean(this.state.source)),
        onCancelSourceChooser: () => this.ui.hideSourceChooser(),
        onInvalidDrop: () =>
          this.ui.setStatus("The dropped file is not a supported audio file."),
        onDownloadFm: () => downloadBlob(this.state.fmBlob, "acoustic-fm.wav"),
        onDownloadResult: () =>
          downloadBlob(this.state.decodedBlob, "acoustic-fm-decoded.wav"),
      },
      { carriers: RADIO_STATION_CARRIERS },
    );
    this.liveReceiver = new LiveRadioReceiver({
      onStateChanged: (receiverState) => this.ui.renderLiveReceiver(receiverState),
    });
  }

  start() {
    this.ui.setExperimentMode(this.state.experimentMode);
    this.updateCarrierLimits();
    this.renderControls();
  }

  getParameters() {
    return this.ui.getParameters();
  }

  isBandMode() {
    return this.state.experimentMode === "band";
  }

  getCurrentSampleRate() {
    return (
      this.state.fm?.sampleRate ||
      (this.isBandMode()
        ? this.state.bandStations.find(Boolean)?.audioBuffer.sampleRate
        : this.state.source?.sampleRate) ||
      48000
    );
  }

  getRdsConfig() {
    return this.ui.getRdsConfig();
  }

  getMessageBandwidth() {
    return this.getRdsConfig().mode === RDS_MODES.NONE
      ? DEFAULT_MESSAGE_BANDWIDTH
      : RDS_BASEBAND_BANDWIDTH;
  }

  getCarrierLimits(sampleRate = this.getCurrentSampleRate()) {
    if (this.getRdsConfig().mode === RDS_MODES.NONE) {
      return { min: 5000, max: Math.min(20000, sampleRate / 2 - 1000) };
    }

    const { deviation } = this.getParameters();
    const guard = 500;
    const min = Math.ceil((RDS_BASEBAND_BANDWIDTH + deviation + guard) / 100) * 100;
    const max =
      Math.floor((sampleRate / 2 - RDS_BASEBAND_BANDWIDTH - deviation - guard) / 100) * 100;
    return { min, max };
  }

  updateCarrierLimits(preferredValue) {
    const limits = this.getCarrierLimits();
    this.ui.setCarrierLimits(limits, preferredValue);
  }

  validateParameters(sampleRate = this.getCurrentSampleRate()) {
    if (this.isBandMode()) {
      const tunedCarrier = this.ui.getReceiverCarrier();
      const occupiedHalfBandwidth =
        RADIO_BAND_DEVIATION + RADIO_BAND_MESSAGE_BANDWIDTH;
      if (
        tunedCarrier - occupiedHalfBandwidth < 150 ||
        tunedCarrier + occupiedHalfBandwidth > sampleRate / 2 - 500
      ) {
        return "The receiver bandwidth extends outside the valid frequency range.";
      }
      return null;
    }

    const { carrier, deviation } = this.getParameters();
    const nyquist = sampleRate / 2;
    const occupiedHalfBandwidth = deviation + this.getMessageBandwidth();

    if (carrier + deviation >= nyquist) {
      return "The instantaneous-frequency range exceeds the Nyquist limit.";
    }
    if (carrier + occupiedHalfBandwidth > nyquist - 500) {
      return "The estimated FM bandwidth is too close to the Nyquist limit.";
    }
    if (carrier - occupiedHalfBandwidth < 150) {
      return "The estimated FM bandwidth extends below the valid frequency range.";
    }
    return null;
  }

  isGeneratedSignalStale() {
    if (!this.state.fmOrigin?.startsWith("generated") || !this.state.fmParameters) {
      return false;
    }
    if (this.isBandMode()) {
      const levels = this.ui.getBandLevels();
      return (
        this.state.fmOrigin !== "generated-band" ||
        this.state.fmParameters.bandRevision !== this.state.bandRevision ||
        levels.some((level, index) => this.state.fmParameters.levels[index] !== level)
      );
    }
    if (this.state.fmOrigin !== "generated-single") return true;
    const { carrier, deviation } = this.getParameters();
    const { mode, text } = this.getRdsConfig();
    return (
      this.state.fmParameters.carrier !== carrier ||
      this.state.fmParameters.deviation !== deviation ||
      this.state.fmParameters.rdsMode !== mode ||
      this.state.fmParameters.rdsText !== text
    );
  }

  renderControls() {
    this.ui.renderControls({
      mode: this.state.experimentMode,
      warning: this.validateParameters(),
      sourceReady: this.isBandMode()
        ? this.state.bandStations.every(Boolean)
        : Boolean(this.state.source),
      fmReady: Boolean(this.state.fm),
      stale: this.isGeneratedSignalStale(),
      busy: this.state.busy,
      operation: this.state.operation,
      occupiedBandwidth: 2 * (this.getParameters().deviation + this.getMessageBandwidth()),
    });
  }

  setBusy(busy, operation = null) {
    this.state.busy = busy;
    this.state.operation = operation;
    this.ui.setDocumentBusy(busy);
    this.renderControls();
  }

  clearDecoded() {
    this.liveReceiver?.stop();
    this.state.decodedBlob = null;
    this.state.receiverSnapshotCarrier = null;
    this.ui.clearResult();
  }

  clearGeneratedFm() {
    if (!this.state.fmOrigin?.startsWith("generated")) return;
    this.clearFm();
  }

  clearFm() {
    this.liveReceiver?.clear();
    this.state.fm = null;
    this.state.fmBlob = null;
    this.state.fmOrigin = null;
    this.state.fmParameters = null;
    this.ui.clearFm();
    this.clearDecoded();
  }

  async loadSource(blob, name) {
    this.ui.setStatus();
    this.setBusy(true, "load");

    try {
      const audioBuffer = await decodeAudioBlob(blob);
      this.clearGeneratedFm();
      this.state.source = audioBuffer;
      await this.ui.showSource({ blob, name, meta: describeAudio(audioBuffer) });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not read the audio file.");
    } finally {
      this.setBusy(false);
    }
  }

  async loadExample(example) {
    if (this.state.busy) return;
    this.ui.setStatus("Loading sample recording…", "info");
    this.setBusy(true, "load");

    try {
      const response = await fetch(example.src);
      if (!response.ok) throw new Error(`Could not load the sample (${response.status}).`);
      await this.loadSource(await response.blob(), example.title);
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not load the sample recording.");
      this.setBusy(false);
    }
  }

  async modeChanged(mode) {
    if (mode === this.state.experimentMode || this.state.busy) return;
    this.state.experimentMode = mode;
    this.clearFm();
    this.ui.setExperimentMode(mode);
    this.updateCarrierLimits();
    this.renderControls();

    if (mode === "band" && !this.state.bandStations.every(Boolean)) {
      await this.loadBandDefaults();
    }
  }

  async loadBandDefaults() {
    this.ui.setStatus("Loading radio stations…", "info");
    this.setBusy(true, "load");

    try {
      const stations = await Promise.all(
        RADIO_STATION_CARRIERS.map(async (_, index) => {
          const example = AUDIO_EXAMPLES[index % AUDIO_EXAMPLES.length];
          const response = await fetch(example.src);
          if (!response.ok) {
            throw new Error(`Could not load ${example.title} (${response.status}).`);
          }
          const blob = await response.blob();
          const audioBuffer = await decodeAudioBlob(blob);
          return { audioBuffer, blob, name: example.title, sourceId: example.id };
        }),
      );
      this.state.bandStations = stations;
      stations.forEach((station, index) => {
        this.ui.setBandStation(index, {
          name: station.name,
          meta: describeAudio(station.audioBuffer),
          sourceId: station.sourceId,
        });
      });
      this.ui.setStatus();
    } catch (error) {
      this.ui.setStatus(
        error instanceof Error ? error.message : "Could not load the radio stations.",
      );
    } finally {
      this.setBusy(false);
    }
  }

  async loadBandExample(index, example) {
    if (this.state.busy) return;
    this.ui.setStatus(`Loading ${example.title}…`, "info");
    this.setBusy(true, "load");

    try {
      const response = await fetch(example.src);
      if (!response.ok) throw new Error(`Could not load the sample (${response.status}).`);
      await this.storeBandStation(index, await response.blob(), example.title, example.id);
      this.ui.setStatus();
    } catch (error) {
      this.restoreBandStationControl(index);
      this.ui.setStatus(
        error instanceof Error ? error.message : "Could not load the station programme.",
      );
    } finally {
      this.setBusy(false);
    }
  }

  async loadBandStation(index, blob, name, sourceId) {
    if (this.state.busy) return;
    this.ui.setStatus(`Loading ${name}…`, "info");
    this.setBusy(true, "load");
    try {
      await this.storeBandStation(index, blob, name, sourceId);
      this.ui.setStatus();
    } catch (error) {
      this.restoreBandStationControl(index);
      this.ui.setStatus(
        error instanceof Error ? error.message : "Could not load the station programme.",
      );
    } finally {
      this.setBusy(false);
    }
  }

  async storeBandStation(index, blob, name, sourceId) {
    const audioBuffer = await decodeAudioBlob(blob);
    this.clearGeneratedFm();
    this.state.bandStations[index] = { audioBuffer, blob, name, sourceId };
    this.state.bandRevision += 1;
    this.ui.setBandStation(index, {
      name,
      meta: describeAudio(audioBuffer),
      sourceId,
    });
  }

  restoreBandStationControl(index) {
    const station = this.state.bandStations[index];
    if (!station) return;
    this.ui.setBandStation(index, {
      name: station.name,
      meta: describeAudio(station.audioBuffer),
      sourceId: station.sourceId,
    });
  }

  async loadExternalFm(blob, name) {
    this.ui.setStatus();
    this.setBusy(true, "load");

    try {
      const audioBuffer = await decodeAudioBlob(blob);
      this.state.fm = {
        samples: mixToMono(audioBuffer),
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
      };
      this.state.fmBlob = blob;
      this.state.fmOrigin = "uploaded";
      this.state.fmParameters = null;
      this.clearDecoded();
      if (this.isBandMode()) {
        this.liveReceiver.setSignal(this.state.fm.samples, this.state.fm.sampleRate);
        this.liveReceiver.setCarrier(this.ui.getReceiverCarrier());
      }
      await this.ui.showFm({
        blob,
        name,
        meta: describeAudio(audioBuffer),
        origin: "Uploaded",
      });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not read the FM signal.");
    } finally {
      this.setBusy(false);
    }
  }

  async encodeSource() {
    if (this.isBandMode()) return this.encodeRadioBand();
    if (!this.state.source || this.state.busy) return;
    const { carrier, deviation } = this.getParameters();
    const rds = this.getRdsConfig();
    const warning = this.validateParameters(this.state.source.sampleRate);
    if (warning) return this.ui.setStatus(warning);

    this.ui.setStatus();
    this.setBusy(true, "encode");
    await this.yieldToBrowser();

    try {
      // Source preparation is part of the channel model: it limits the message
      // bandwidth before FM modulation, preventing avoidable aliasing.
      const audioBandwidth =
        rds.mode === RDS_MODES.NONE ? DEFAULT_MESSAGE_BANDWIDTH : RDS_AUDIO_BANDWIDTH;
      const filterOrder =
        rds.mode === RDS_MODES.NONE ? 4 : RDS_AUDIO_FILTER_ORDER;
      const message = prepareMessage(this.state.source, audioBandwidth, filterOrder);
      const composite = createRdsComposite(message, this.state.source.sampleRate, rds);
      const samples = modulateFM(composite, this.state.source.sampleRate, carrier, deviation);
      const blob = createWavBlob(samples, this.state.source.sampleRate);

      this.state.fm = {
        samples,
        sampleRate: this.state.source.sampleRate,
        duration: samples.length / this.state.source.sampleRate,
      };
      this.state.fmBlob = blob;
      this.state.fmOrigin = "generated-single";
      this.state.fmParameters = {
        carrier,
        deviation,
        rdsMode: rds.mode,
        rdsText: rds.text,
      };
      this.clearDecoded();

      await this.ui.showFm({
        blob,
        name: "Encoded message",
        meta: this.describeMonoSignal(this.state.fm),
        origin: "Generated",
      });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not encode the message.");
    } finally {
      this.setBusy(false);
    }
  }

  async encodeRadioBand() {
    if (!this.state.bandStations.every(Boolean) || this.state.busy) return;
    const sampleRate = this.state.bandStations[0].audioBuffer.sampleRate;
    if (
      this.state.bandStations.some(
        ({ audioBuffer }) => audioBuffer.sampleRate !== sampleRate,
      )
    ) {
      return this.ui.setStatus("All station programmes must use the same sample rate.");
    }

    this.ui.setStatus();
    this.setBusy(true, "encode");
    await this.yieldToBrowser();

    try {
      const messages = this.state.bandStations.map(({ audioBuffer }) =>
        prepareMessage(audioBuffer, RADIO_BAND_MESSAGE_BANDWIDTH, 8),
      );
      const levels = this.ui.getBandLevels();
      const samples = createRadioBand(messages, sampleRate, { levels });
      const blob = createWavBlob(samples, sampleRate);
      this.state.fm = {
        samples,
        sampleRate,
        duration: samples.length / sampleRate,
      };
      this.state.fmBlob = blob;
      this.state.fmOrigin = "generated-band";
      this.state.fmParameters = {
        bandRevision: this.state.bandRevision,
        levels: [...levels],
      };
      this.clearDecoded();
      this.liveReceiver.setSignal(samples, sampleRate);
      this.liveReceiver.setCarrier(this.ui.getReceiverCarrier());

      await this.ui.showFm({
        blob,
        name: "Three-station radio band",
        meta: `${this.describeMonoSignal(this.state.fm)} · 3 stations`,
        origin: "Generated",
      });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not build the radio band.");
    } finally {
      this.setBusy(false);
    }
  }

  async decodeFm() {
    if (!this.state.fm || this.state.busy) return;
    const { carrier, deviation } = this.getParameters();
    const rds = this.getRdsConfig();
    const warning = this.validateParameters(this.state.fm.sampleRate);
    if (warning) return this.ui.setStatus(warning);

    this.ui.setStatus();
    this.setBusy(true, "decode");
    await this.yieldToBrowser();

    try {
      let samples;
      let decodedRds = null;
      let resultName = "Recovered message";
      let snapshotCarrier = null;
      if (this.isBandMode()) {
        const tunedCarrier = this.ui.getReceiverCarrier();
        samples = receiveRadioStation(
          this.state.fm.samples,
          this.state.fm.sampleRate,
          tunedCarrier,
        );
        resultName = this.describeTunedStation(tunedCarrier);
        snapshotCarrier = tunedCarrier;
      } else if (rds.mode === RDS_MODES.NONE) {
        samples = demodulateFM(
          this.state.fm.samples,
          this.state.fm.sampleRate,
          carrier,
          deviation,
          DEFAULT_MESSAGE_BANDWIDTH,
        );
      } else {
        const composite = demodulateFMComposite(
          this.state.fm.samples,
          this.state.fm.sampleRate,
          carrier,
          deviation,
          RDS_BASEBAND_BANDWIDTH,
        );
        samples = recoverAudioFromRdsComposite(composite, this.state.fm.sampleRate);
        decodedRds = decodeRdsComposite(composite, this.state.fm.sampleRate, rds.mode);
      }
      const blob = createWavBlob(samples, this.state.fm.sampleRate);
      this.state.decodedBlob = blob;
      this.state.receiverSnapshotCarrier = snapshotCarrier;
      await this.ui.showResult({
        blob,
        meta: this.describeMonoSignal({
          duration: samples.length / this.state.fm.sampleRate,
          sampleRate: this.state.fm.sampleRate,
        }),
        rds: decodedRds,
        rdsExpected: !this.isBandMode() && rds.mode !== RDS_MODES.NONE,
        name: resultName,
        snapshotCarrier,
      });
      if (this.isBandMode()) this.ui.renderLiveReceiver(this.liveReceiver.getState());
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not decode the FM signal.");
    } finally {
      this.setBusy(false);
    }
  }

  parametersChanged() {
    this.clearDecoded();
    this.updateCarrierLimits();
    this.renderControls();
  }

  bandParametersChanged() {
    this.clearDecoded();
    this.renderControls();
  }

  receiverTuningChanged() {
    const carrier = this.ui.getReceiverCarrier();
    this.liveReceiver.setCarrier(carrier);
    this.ui.updateResultName(this.describeTunedStation(carrier));
    this.ui.renderResultSnapshot(this.state.receiverSnapshotCarrier, carrier);
    this.renderControls();
  }

  async toggleLiveReceiver() {
    if (!this.isBandMode() || !this.state.fm || this.state.busy) return;
    this.ui.setStatus();
    try {
      this.liveReceiver.setCarrier(this.ui.getReceiverCarrier());
      await this.liveReceiver.toggle();
    } catch (error) {
      this.ui.setStatus(
        error instanceof Error ? error.message : "Could not start the live receiver.",
      );
    }
  }

  async seekLiveReceiver(progress) {
    if (!this.isBandMode() || !this.state.fm) return;
    try {
      await this.liveReceiver.seek(progress);
    } catch (error) {
      this.ui.setStatus(
        error instanceof Error ? error.message : "Could not seek the live receiver.",
      );
    }
  }

  describeTunedStation(tunedCarrier) {
    const nearestIndex = RADIO_STATION_CARRIERS.reduce(
      (bestIndex, stationCarrier, index) =>
        Math.abs(stationCarrier - tunedCarrier) <
        Math.abs(RADIO_STATION_CARRIERS[bestIndex] - tunedCarrier)
          ? index
          : bestIndex,
      0,
    );
    const distance = Math.abs(RADIO_STATION_CARRIERS[nearestIndex] - tunedCarrier);
    if (this.state.fmOrigin === "generated-band" && distance <= 500) {
      return `${this.state.bandStations[nearestIndex]?.name ?? "Station"} · ${(
        tunedCarrier / 1000
      ).toFixed(1)} kHz`;
    }
    return `${distance <= 500 ? "Tuned frequency" : "Between stations"} · ${(
      tunedCarrier / 1000
    ).toFixed(1)} kHz`;
  }

  rdsModeChanged(mode) {
    const previousMode = this.state.rdsMode;
    const currentCarrier = this.getParameters().carrier;
    if (previousMode === RDS_MODES.NONE && mode !== RDS_MODES.NONE) {
      this.state.carrierWithoutRds = currentCarrier;
    }

    this.state.rdsMode = mode;
    this.ui.configureRds(mode, this.state.rdsTexts[mode] ?? "");
    const preferredCarrier =
      mode === RDS_MODES.NONE
        ? this.state.carrierWithoutRds
        : previousMode === RDS_MODES.NONE
          ? 12000
          : currentCarrier;
    this.updateCarrierLimits(preferredCarrier);
    this.clearDecoded();
    this.renderControls();
  }

  rdsTextChanged(text) {
    const { mode } = this.getRdsConfig();
    this.state.rdsTexts[mode] = text;
    this.clearDecoded();
    this.renderControls();
  }

  async toggleRecording() {
    if (this.recorder.isRecording) {
      this.recorder.stop();
      return;
    }

    this.ui.setStatus();
    try {
      await this.recorder.start({
        onProgress: (elapsed) => this.ui.setRecording(true, elapsed),
        onComplete: async (blob) => {
          this.ui.setRecording(false);
          await this.loadSource(blob, "Microphone recording");
        },
      });
    } catch (error) {
      this.ui.setRecording(false);
      this.ui.setStatus(error instanceof Error ? error.message : "Could not start the microphone.");
    }
  }

  describeMonoSignal({ duration, sampleRate }) {
    return `${formatDuration(duration)} · ${(sampleRate / 1000).toFixed(0)} kHz · mono`;
  }

  yieldToBrowser() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
}
