import { decodeAudioBlob, describeAudio, formatDuration, mixToMono, prepareMessage } from "./audio.js";
import { AUDIO_EXAMPLES } from "./examples.js";
import {
  DEFAULT_MESSAGE_BANDWIDTH,
  demodulateFM,
  demodulateFMComposite,
} from "./fm-demodulator.js";
import { modulateFM } from "./fm-modulator.js";
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
      rdsMode: RDS_MODES.NONE,
      carrierWithoutRds: 18000,
      rdsTexts: {
        [RDS_MODES.PS]: "ACOUSTIC",
        [RDS_MODES.RADIOTEXT]: "FM carries audio and data together.",
      },
    };
    this.recorder = new MicrophoneRecorder();
    this.ui = new AppUI(AUDIO_EXAMPLES, {
      onSourceFile: (file) => this.loadSource(file, file.name),
      onExample: (example) => this.loadExample(example),
      onFmFile: (file) => this.loadExternalFm(file, file.name),
      onEncode: () => this.encodeSource(),
      onDecode: () => this.decodeFm(),
      onParametersChanged: () => this.parametersChanged(),
      onRdsModeChanged: (mode) => this.rdsModeChanged(mode),
      onRdsTextChanged: (text) => this.rdsTextChanged(text),
      onToggleRecording: () => this.toggleRecording(),
      onShowSourceChooser: () => this.ui.showSourceChooser(Boolean(this.state.source)),
      onCancelSourceChooser: () => this.ui.hideSourceChooser(),
      onInvalidDrop: () => this.ui.setStatus("The dropped file is not a supported audio file."),
      onDownloadFm: () => downloadBlob(this.state.fmBlob, "acoustic-fm.wav"),
      onDownloadResult: () =>
        downloadBlob(this.state.decodedBlob, "acoustic-fm-decoded.wav"),
    });
  }

  start() {
    this.updateCarrierLimits();
    this.renderControls();
  }

  getParameters() {
    return this.ui.getParameters();
  }

  getCurrentSampleRate() {
    return this.state.fm?.sampleRate || this.state.source?.sampleRate || 48000;
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
    if (this.state.fmOrigin !== "generated" || !this.state.fmParameters) return false;
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
      warning: this.validateParameters(),
      sourceReady: Boolean(this.state.source),
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
    this.state.decodedBlob = null;
    this.ui.clearResult();
  }

  clearGeneratedFm() {
    if (this.state.fmOrigin !== "generated") return;
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
      this.state.fmOrigin = "generated";
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
      if (rds.mode === RDS_MODES.NONE) {
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
      await this.ui.showResult({
        blob,
        meta: this.describeMonoSignal({
          duration: samples.length / this.state.fm.sampleRate,
          sampleRate: this.state.fm.sampleRate,
        }),
        rds: decodedRds,
        rdsExpected: rds.mode !== RDS_MODES.NONE,
      });
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
