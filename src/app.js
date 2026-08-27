import { decodeAudioBlob, describeAudio, formatDuration, mixToMono } from "./audio.js";
import { AUDIO_EXAMPLES } from "./examples.js";
import {
  MODULATION_EXPERIMENTS,
  MODULATION_TYPES,
} from "./modulation/index.js";
import { RDS_MODES } from "./modulation/fm/rds.js";
import { MicrophoneRecorder } from "./recorder.js";
import { AppUI, downloadBlob } from "./ui.js";
import { createWavBlob } from "./wav.js";

/**
 * Shared application controller for the AM and FM experiments.
 *
 * Modulation-specific mathematics lives behind the experiment objects. This
 * controller owns files, UI state, recording, and the common three-stage flow.
 */
export class AcousticModulationApp {
  constructor() {
    const stationCarriers = MODULATION_EXPERIMENTS.fm.stationCarriers;
    this.state = {
      source: null,
      signal: null,
      signalBlob: null,
      signalOrigin: null,
      signalParameters: null,
      signalModulation: null,
      decodedBlob: null,
      busy: false,
      operation: null,
      modulationType: MODULATION_TYPES.FM,
      experimentMode: "single",
      bandStations: stationCarriers.map(() => null),
      bandRevision: 0,
      receiverSnapshotCarrier: null,
      carrierByModulation: {
        [MODULATION_TYPES.FM]: MODULATION_EXPERIMENTS.fm.defaultCarrier,
        [MODULATION_TYPES.AM]: MODULATION_EXPERIMENTS.am.defaultCarrier,
      },
      rdsMode: RDS_MODES.NONE,
      carrierWithoutRds: MODULATION_EXPERIMENTS.fm.defaultCarrier,
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
        onSignalFile: (file) => this.loadExternalSignal(file, file.name),
        onEncode: () => this.encodeSource(),
        onDecode: () => this.decodeSignal(),
        onParametersChanged: () => this.parametersChanged(),
        onModulationChanged: (type) => this.modulationChanged(type),
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
        onDownloadSignal: () =>
          downloadBlob(
            this.state.signalBlob,
            `acoustic-${this.state.modulationType}.wav`,
          ),
        onDownloadResult: () =>
          downloadBlob(
            this.state.decodedBlob,
            `acoustic-${this.state.modulationType}-decoded.wav`,
          ),
      },
      { carriers: stationCarriers },
    );
    this.liveReceiver = this.createLiveReceiver();
  }

  start() {
    this.ui.setModulation(this.state.modulationType);
    this.ui.setExperimentMode(this.state.experimentMode, this.state.modulationType);
    this.updateCarrierLimits(this.getExperiment().defaultCarrier);
    this.renderControls();
  }

  getExperiment() {
    return MODULATION_EXPERIMENTS[this.state.modulationType];
  }

  createLiveReceiver() {
    return this.getExperiment().createLiveReceiver((receiverState) =>
      this.ui.renderLiveReceiver(receiverState),
    );
  }

  getParameters() {
    return this.ui.getParameters();
  }

  getRdsConfig() {
    if (!this.getExperiment().supportsRds) {
      return { mode: RDS_MODES.NONE, text: "" };
    }
    return this.ui.getRdsConfig();
  }

  isBandMode() {
    return this.state.experimentMode === "band";
  }

  getCurrentSampleRate() {
    return (
      this.state.signal?.sampleRate ||
      (this.isBandMode()
        ? this.state.bandStations.find(Boolean)?.audioBuffer.sampleRate
        : this.state.source?.sampleRate) ||
      48000
    );
  }

  getCarrierLimits(sampleRate = this.getCurrentSampleRate()) {
    return this.getExperiment().getCarrierLimits({
      sampleRate,
      parameters: this.getParameters(),
      rds: this.getRdsConfig(),
    });
  }

  updateCarrierLimits(preferredValue) {
    this.ui.setCarrierLimits(this.getCarrierLimits(), preferredValue);
  }

  validateParameters(sampleRate = this.getCurrentSampleRate()) {
    const experiment = this.getExperiment();
    if (this.isBandMode()) {
      return experiment.validateBand({
        sampleRate,
        tunedCarrier: this.ui.getReceiverCarrier(),
      });
    }
    return experiment.validateSingle({
      sampleRate,
      parameters: this.getParameters(),
      rds: this.getRdsConfig(),
    });
  }

  getCurrentSingleSnapshot() {
    return this.getExperiment().getSingleSnapshot(
      this.getParameters(),
      this.getRdsConfig(),
    );
  }

  isGeneratedSignalStale() {
    if (!this.state.signalOrigin?.startsWith("generated") || !this.state.signalParameters) {
      return false;
    }
    if (this.state.signalModulation !== this.state.modulationType) return true;
    if (this.isBandMode()) {
      const levels = this.ui.getBandLevels();
      return (
        this.state.signalOrigin !== "generated-band" ||
        this.state.signalParameters.bandRevision !== this.state.bandRevision ||
        levels.some(
          (level, index) => this.state.signalParameters.levels[index] !== level,
        )
      );
    }
    return (
      this.state.signalOrigin !== "generated-single" ||
      JSON.stringify(this.state.signalParameters) !==
        JSON.stringify(this.getCurrentSingleSnapshot())
    );
  }

  renderControls() {
    const parameters = this.getParameters();
    this.ui.renderControls({
      modulation: this.state.modulationType,
      mode: this.state.experimentMode,
      parameters,
      warning: this.validateParameters(),
      sourceReady: this.isBandMode()
        ? this.state.bandStations.every(Boolean)
        : Boolean(this.state.source),
      signalReady: Boolean(this.state.signal),
      stale: this.isGeneratedSignalStale(),
      busy: this.state.busy,
      operation: this.state.operation,
      occupiedBandwidth: this.getExperiment().getOccupiedBandwidth(
        parameters,
        this.getRdsConfig(),
      ),
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

  clearGeneratedSignal() {
    if (this.state.signalOrigin?.startsWith("generated")) this.clearSignal();
  }

  clearSignal() {
    this.liveReceiver?.clear();
    this.state.signal = null;
    this.state.signalBlob = null;
    this.state.signalOrigin = null;
    this.state.signalParameters = null;
    this.state.signalModulation = null;
    this.ui.clearSignal();
    this.clearDecoded();
  }

  async loadSource(blob, name) {
    this.ui.setStatus();
    this.setBusy(true, "load");
    try {
      const audioBuffer = await decodeAudioBlob(blob);
      this.clearGeneratedSignal();
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

  async modulationChanged(type) {
    if (
      type === this.state.modulationType ||
      !MODULATION_EXPERIMENTS[type] ||
      this.state.busy
    ) {
      return;
    }
    this.state.carrierByModulation[this.state.modulationType] =
      this.getParameters().carrier;
    this.clearSignal();
    this.liveReceiver.clear();
    this.state.modulationType = type;
    this.liveReceiver = this.createLiveReceiver();
    this.ui.setModulation(type);
    this.ui.setExperimentMode(this.state.experimentMode, type);
    this.updateCarrierLimits(this.state.carrierByModulation[type]);
    this.renderControls();
  }

  async modeChanged(mode) {
    if (mode === this.state.experimentMode || this.state.busy) return;
    this.state.experimentMode = mode;
    this.clearSignal();
    this.ui.setExperimentMode(mode, this.state.modulationType);
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
        this.getExperiment().stationCarriers.map(async (_, index) => {
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
      this.ui.setStatus(error instanceof Error ? error.message : "Could not load the radio stations.");
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
      this.ui.setStatus(error instanceof Error ? error.message : "Could not load the station programme.");
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
      this.ui.setStatus(error instanceof Error ? error.message : "Could not load the station programme.");
    } finally {
      this.setBusy(false);
    }
  }

  async storeBandStation(index, blob, name, sourceId) {
    const audioBuffer = await decodeAudioBlob(blob);
    this.clearGeneratedSignal();
    this.state.bandStations[index] = { audioBuffer, blob, name, sourceId };
    this.state.bandRevision += 1;
    this.ui.setBandStation(index, { name, meta: describeAudio(audioBuffer), sourceId });
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

  async loadExternalSignal(blob, name) {
    this.ui.setStatus();
    this.setBusy(true, "load");
    try {
      const audioBuffer = await decodeAudioBlob(blob);
      this.state.signal = {
        samples: mixToMono(audioBuffer),
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
      };
      this.state.signalBlob = blob;
      this.state.signalOrigin = "uploaded";
      this.state.signalParameters = null;
      this.state.signalModulation = this.state.modulationType;
      this.clearDecoded();
      if (this.isBandMode()) this.prepareLiveSignal();
      await this.ui.showSignal({
        blob,
        name,
        meta: describeAudio(audioBuffer),
        origin: "Uploaded",
      });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not read the modulated signal.");
    } finally {
      this.setBusy(false);
    }
  }

  async encodeSource() {
    if (this.isBandMode()) return this.encodeRadioBand();
    if (!this.state.source || this.state.busy) return;
    const warning = this.validateParameters(this.state.source.sampleRate);
    if (warning) return this.ui.setStatus(warning);

    this.ui.setStatus();
    this.setBusy(true, "encode");
    await this.yieldToBrowser();
    try {
      const experiment = this.getExperiment();
      const parameters = this.getParameters();
      const rds = this.getRdsConfig();
      const samples = experiment.encodeSingle(this.state.source, parameters, rds);
      const blob = createWavBlob(samples, this.state.source.sampleRate);
      this.state.signal = {
        samples,
        sampleRate: this.state.source.sampleRate,
        duration: samples.length / this.state.source.sampleRate,
      };
      this.state.signalBlob = blob;
      this.state.signalOrigin = "generated-single";
      this.state.signalParameters = experiment.getSingleSnapshot(parameters, rds);
      this.state.signalModulation = this.state.modulationType;
      this.clearDecoded();
      await this.ui.showSignal({
        blob,
        name: `${experiment.label}-modulated message`,
        meta: this.describeMonoSignal(this.state.signal),
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
    if (this.state.bandStations.some(({ audioBuffer }) => audioBuffer.sampleRate !== sampleRate)) {
      return this.ui.setStatus("All station programmes must use the same sample rate.");
    }

    this.ui.setStatus();
    this.setBusy(true, "encode");
    await this.yieldToBrowser();
    try {
      const experiment = this.getExperiment();
      const messages = this.state.bandStations.map(({ audioBuffer }) =>
        experiment.prepareBandMessage(audioBuffer),
      );
      const levels = this.ui.getBandLevels();
      const samples = experiment.createBand(messages, sampleRate, levels);
      const blob = createWavBlob(samples, sampleRate);
      this.state.signal = { samples, sampleRate, duration: samples.length / sampleRate };
      this.state.signalBlob = blob;
      this.state.signalOrigin = "generated-band";
      this.state.signalParameters = {
        bandRevision: this.state.bandRevision,
        levels: [...levels],
      };
      this.state.signalModulation = this.state.modulationType;
      this.clearDecoded();
      this.prepareLiveSignal();
      await this.ui.showSignal({
        blob,
        name: `Three-station ${experiment.label} radio band`,
        meta: `${this.describeMonoSignal(this.state.signal)} · 3 stations`,
        origin: "Generated",
      });
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not build the radio band.");
    } finally {
      this.setBusy(false);
    }
  }

  prepareLiveSignal() {
    this.liveReceiver.setSignal(this.state.signal.samples, this.state.signal.sampleRate);
    this.liveReceiver.setCarrier(this.ui.getReceiverCarrier());
  }

  async decodeSignal() {
    if (!this.state.signal || this.state.busy) return;
    const warning = this.validateParameters(this.state.signal.sampleRate);
    if (warning) return this.ui.setStatus(warning);

    this.ui.setStatus();
    this.setBusy(true, "decode");
    await this.yieldToBrowser();
    try {
      const experiment = this.getExperiment();
      let result;
      let resultName = "Recovered message";
      let snapshotCarrier = null;
      if (this.isBandMode()) {
        const tunedCarrier = this.ui.getReceiverCarrier();
        result = {
          samples: experiment.receiveBand(
            this.state.signal.samples,
            this.state.signal.sampleRate,
            tunedCarrier,
          ),
          data: null,
          dataExpected: false,
        };
        resultName = this.describeTunedStation(tunedCarrier);
        snapshotCarrier = tunedCarrier;
      } else {
        result = experiment.decodeSingle(
          this.state.signal.samples,
          this.state.signal.sampleRate,
          this.getParameters(),
          this.getRdsConfig(),
        );
      }
      const blob = createWavBlob(result.samples, this.state.signal.sampleRate);
      this.state.decodedBlob = blob;
      this.state.receiverSnapshotCarrier = snapshotCarrier;
      await this.ui.showResult({
        blob,
        meta: this.describeMonoSignal({
          duration: result.samples.length / this.state.signal.sampleRate,
          sampleRate: this.state.signal.sampleRate,
        }),
        data: result.data,
        dataExpected: result.dataExpected,
        name: resultName,
        snapshotCarrier,
      });
      if (this.isBandMode()) this.ui.renderLiveReceiver(this.liveReceiver.getState());
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not decode the modulated signal.");
    } finally {
      this.setBusy(false);
    }
  }

  parametersChanged() {
    this.state.carrierByModulation[this.state.modulationType] = this.getParameters().carrier;
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
    if (!this.isBandMode() || !this.state.signal || this.state.busy) return;
    this.ui.setStatus();
    try {
      this.liveReceiver.setCarrier(this.ui.getReceiverCarrier());
      await this.liveReceiver.toggle();
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not start the live receiver.");
    }
  }

  async seekLiveReceiver(progress) {
    if (!this.isBandMode() || !this.state.signal) return;
    try {
      await this.liveReceiver.seek(progress);
    } catch (error) {
      this.ui.setStatus(error instanceof Error ? error.message : "Could not seek the live receiver.");
    }
  }

  describeTunedStation(tunedCarrier) {
    const carriers = this.getExperiment().stationCarriers;
    const nearestIndex = carriers.reduce(
      (bestIndex, stationCarrier, index) =>
        Math.abs(stationCarrier - tunedCarrier) <
        Math.abs(carriers[bestIndex] - tunedCarrier)
          ? index
          : bestIndex,
      0,
    );
    const distance = Math.abs(carriers[nearestIndex] - tunedCarrier);
    if (this.state.signalOrigin === "generated-band" && distance <= 500) {
      return `${this.state.bandStations[nearestIndex]?.name ?? "Station"} · ${(
        tunedCarrier / 1000
      ).toFixed(1)} kHz`;
    }
    return `${distance <= 500 ? "Tuned frequency" : "Between stations"} · ${(
      tunedCarrier / 1000
    ).toFixed(1)} kHz`;
  }

  rdsModeChanged(mode) {
    if (!this.getExperiment().supportsRds) return;
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
    if (!this.getExperiment().supportsRds) return;
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
