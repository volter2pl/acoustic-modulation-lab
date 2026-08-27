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
    this.mediaRecorder = new MediaRecorder(this.stream);
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
  }

  stop() {
    if (this.isRecording) this.mediaRecorder.stop();
  }

  cleanupStream() {
    clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
