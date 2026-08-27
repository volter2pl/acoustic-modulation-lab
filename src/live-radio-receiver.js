import { getAudioContext } from "./audio.js";
import {
  RADIO_BAND_DEVIATION,
  RADIO_BAND_MESSAGE_BANDWIDTH,
} from "./radio-channel.js";

const WORKLET_URL = new URL("./live-receiver-worklet.js", import.meta.url);
const loadedWorklets = new WeakMap();

async function loadReceiverWorklet(context) {
  let loading = loadedWorklets.get(context);
  if (!loading) {
    if (!context.audioWorklet || typeof AudioWorkletNode === "undefined") {
      throw new Error("This browser does not support live AudioWorklet reception.");
    }
    loading = context.audioWorklet.addModule(WORKLET_URL.href);
    loadedWorklets.set(context, loading);
  }
  await loading;
}

/**
 * Playback controller for the real-time radio receiver.
 *
 * The channel buffer plays at its original timeline position while an
 * AudioWorklet demodulates it. Updating the worklet's local-oscillator
 * frequency changes the audible station without rebuilding a WAV file.
 */
export class LiveRadioReceiver {
  constructor({ onStateChanged = () => {} } = {}) {
    this.onStateChanged = onStateChanged;
    this.samples = null;
    this.sampleRate = 0;
    this.duration = 0;
    this.carrier = 12000;
    this.offset = 0;
    this.startedAt = 0;
    this.playing = false;
    this.audioBuffer = null;
    this.bufferContext = null;
    this.source = null;
    this.receiverNode = null;
    this.outputGain = null;
    this.animationFrame = null;
    this.playbackToken = 0;
  }

  setSignal(samples, sampleRate) {
    if (!(samples instanceof Float32Array) || sampleRate <= 0) {
      throw new TypeError("A live receiver requires mono Float32Array samples.");
    }
    this.stop();
    this.samples = samples;
    this.sampleRate = sampleRate;
    this.duration = samples.length / sampleRate;
    this.audioBuffer = null;
    this.bufferContext = null;
    this.emitState();
  }

  clear() {
    this.stop();
    this.samples = null;
    this.sampleRate = 0;
    this.duration = 0;
    this.audioBuffer = null;
    this.bufferContext = null;
    this.emitState();
  }

  setCarrier(carrier) {
    this.carrier = carrier;
    if (this.receiverNode) {
      const context = this.receiverNode.context;
      const parameter = this.receiverNode.parameters.get("tunedCarrier");
      parameter.cancelScheduledValues(context.currentTime);
      parameter.setTargetAtTime(carrier, context.currentTime, 0.02);
    }
  }

  async toggle() {
    if (this.playing) {
      this.pause();
    } else {
      await this.play();
    }
  }

  async play() {
    if (!this.samples?.length || this.duration <= 0) return;
    const context = getAudioContext();
    if (context.sampleRate !== this.sampleRate) {
      throw new Error("The live receiver requires a 48 kHz radio-band signal.");
    }

    await context.resume();
    await loadReceiverWorklet(context);
    if (this.playing) return;

    if (!this.audioBuffer || this.bufferContext !== context) {
      this.audioBuffer = context.createBuffer(1, this.samples.length, this.sampleRate);
      this.audioBuffer.copyToChannel(this.samples, 0);
      this.bufferContext = context;
    }

    const source = context.createBufferSource();
    source.buffer = this.audioBuffer;
    const receiverNode = new AudioWorkletNode(context, "acoustic-fm-live-receiver", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      parameterData: { tunedCarrier: this.carrier },
      processorOptions: {
        carrier: this.carrier,
        deviation: RADIO_BAND_DEVIATION,
        messageBandwidth: RADIO_BAND_MESSAGE_BANDWIDTH,
      },
    });
    const outputGain = context.createGain();
    outputGain.gain.value = 0.82;
    source.connect(receiverNode).connect(outputGain).connect(context.destination);

    const token = ++this.playbackToken;
    source.addEventListener("ended", () => {
      if (token !== this.playbackToken || !this.playing) return;
      this.playing = false;
      this.offset = 0;
      this.disconnectNodes();
      this.stopClock();
      this.emitState();
    });

    this.source = source;
    this.receiverNode = receiverNode;
    this.outputGain = outputGain;
    this.startedAt = context.currentTime - this.offset;
    this.playing = true;
    source.start(0, Math.min(this.offset, Math.max(0, this.duration - 0.001)));
    this.startClock();
    this.emitState();
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.getCurrentTime();
    this.playing = false;
    this.stopSource();
    this.stopClock();
    this.emitState();
  }

  stop() {
    this.playing = false;
    this.offset = 0;
    this.stopSource();
    this.stopClock();
    this.emitState();
  }

  async seek(progress) {
    if (!this.duration) return;
    const wasPlaying = this.playing;
    this.offset = Math.max(0, Math.min(1, progress)) * this.duration;
    if (this.offset >= this.duration) this.offset = 0;
    if (wasPlaying) {
      this.playing = false;
      this.stopSource();
      await this.play();
    } else {
      this.emitState();
    }
  }

  getCurrentTime() {
    if (!this.playing || !this.receiverNode) return this.offset;
    return Math.min(
      this.duration,
      Math.max(0, this.receiverNode.context.currentTime - this.startedAt),
    );
  }

  getState() {
    return {
      playing: this.playing,
      currentTime: this.getCurrentTime(),
      duration: this.duration,
    };
  }

  stopSource() {
    this.playbackToken += 1;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // The source may already have ended naturally.
      }
    }
    this.disconnectNodes();
  }

  disconnectNodes() {
    this.source?.disconnect();
    this.receiverNode?.disconnect();
    this.outputGain?.disconnect();
    this.source = null;
    this.receiverNode = null;
    this.outputGain = null;
  }

  startClock() {
    this.stopClock();
    const tick = () => {
      if (!this.playing) return;
      this.emitState();
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  stopClock() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  emitState() {
    this.onStateChanged(this.getState());
  }
}
