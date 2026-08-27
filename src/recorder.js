import { MAX_DURATION_SECONDS } from "./audio.js";

const ENCODER_STOP_GUARD_MS = 500;

/**
 * Small adapter around MediaRecorder.
 *
 * The application controller receives a finished Blob and never needs to know
 * about microphone streams, recorder events, or timer cleanup.
 */
export class MicrophoneRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.startedAt = 0;
    this.timer = null;
    this.limitTimer = null;
  }

  get isRecording() {
    return this.mediaRecorder?.state === "recording";
  }

  async start({ onProgress, onComplete }) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      const error = new Error("This browser does not support microphone recording.");
      error.code = "errors.recordingUnsupported";
      throw error;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.chunks = [];
    this.mediaRecorder = new window.MediaRecorder(this.stream);
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) this.chunks.push(event.data);
    });
    this.mediaRecorder.addEventListener("stop", async () => {
      this.cleanupStream();
      const blob = new Blob(this.chunks, {
        type: this.mediaRecorder.mimeType || "audio/webm",
      });
      await onComplete(blob);
    });

    this.mediaRecorder.start();
    this.startedAt = Date.now();
    onProgress(0);
    this.timer = setInterval(() => onProgress((Date.now() - this.startedAt) / 1000), 250);
    // Compressed recorders finish on codec-frame boundaries. Stop just before
    // the public limit so the decoded result does not exceed it by one frame.
    this.limitTimer = setTimeout(
      () => this.stop(),
      MAX_DURATION_SECONDS * 1000 - ENCODER_STOP_GUARD_MS,
    );
  }

  stop() {
    if (this.isRecording) this.mediaRecorder.stop();
  }

  cleanupStream() {
    clearInterval(this.timer);
    this.timer = null;
    clearTimeout(this.limitTimer);
    this.limitTimer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
