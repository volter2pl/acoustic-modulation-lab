import { formatDuration } from "./audio.js";

export class WaveformPlayer {
  constructor({ container, playButton, timeElement, waveColor, progressColor, volume = 0.8 }) {
    this.container = container;
    this.playButton = playButton;
    this.timeElement = timeElement;
    this.waveColor = waveColor;
    this.progressColor = progressColor;
    this.volume = volume;
    this.objectUrl = null;
    this.waveSurfer = null;
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.volume = volume;

    this.playButton.addEventListener("click", () => this.toggle());
    this.audio.addEventListener("play", () => this.renderPlaybackState());
    this.audio.addEventListener("pause", () => this.renderPlaybackState());
    this.audio.addEventListener("ended", () => this.renderPlaybackState());
    this.audio.addEventListener("timeupdate", () => this.renderTime());
    this.audio.addEventListener("durationchange", () => this.renderTime());
  }

  async load(blob) {
    this.stop();

    if (this.waveSurfer) {
      this.waveSurfer.destroy();
      this.waveSurfer = null;
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(blob);
    this.audio.src = this.objectUrl;
    this.audio.load();

    this.container.replaceChildren();

    if (window.WaveSurfer) {
      this.waveSurfer = window.WaveSurfer.create({
        container: this.container,
        media: this.audio,
        height: "auto",
        waveColor: this.waveColor,
        progressColor: this.progressColor,
        cursorColor: "rgba(255,255,255,.68)",
        cursorWidth: 1,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
      });
    } else {
      this.container.innerHTML = '<p class="wave-error">Waveform preview is unavailable.</p>';
    }

    this.renderTime();
  }

  async toggle() {
    if (!this.audio.src) return;
    if (this.audio.paused) {
      await this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.renderPlaybackState();
  }

  renderPlaybackState() {
    const playing = !this.audio.paused && !this.audio.ended;
    this.playButton.textContent = playing ? "Ⅱ" : "▶";
    this.playButton.setAttribute("aria-label", playing ? "Pause playback" : "Play");
  }

  renderTime() {
    this.timeElement.textContent = `${formatDuration(this.audio.currentTime)} / ${formatDuration(
      this.audio.duration,
    )}`;
  }
}
