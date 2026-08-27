import { formatDuration } from "./audio.js";

function createColorMap([red, green, blue]) {
  return Array.from({ length: 256 }, (_, index) => {
    const amount = index / 255;
    const glow = Math.pow(amount, 0.72);
    const highlight = Math.max(0, (amount - 0.72) / 0.28);
    return [
      (13 + (red - 13) * glow + (255 - red) * highlight * 0.45) / 255,
      (15 + (green - 15) * glow + (255 - green) * highlight * 0.45) / 255,
      (18 + (blue - 18) * glow + (255 - blue) * highlight * 0.45) / 255,
      1,
    ];
  });
}

/**
 * Audio playback paired with a time-frequency spectrogram.
 *
 * WaveSurfer remains the media and decoding engine, while its Spectrogram
 * plugin renders frequency vertically, time horizontally, and energy as color.
 * The ordinary amplitude waveform is intentionally hidden because frequency is
 * the most informative view for this FM experiment.
 */
export class SpectrumPlayer {
  constructor({
    container,
    engineContainer,
    playhead,
    playButton,
    timeElement,
    accentColor,
    frequencyMax,
    height,
    volume = 0.8,
  }) {
    this.container = container;
    this.engineContainer = engineContainer;
    this.playhead = playhead;
    this.playButton = playButton;
    this.timeElement = timeElement;
    this.colorMap = createColorMap(accentColor);
    this.frequencyMax = frequencyMax;
    this.height = height;
    this.waveSurfer = null;
    this.volume = volume;
    this.externalPlayback = null;
    this.audio = this.createAudio();

    this.container.addEventListener("click", (event) => this.seek(event));
    this.playButton.addEventListener("click", () => {
      if (this.externalPlayback) {
        this.externalPlayback.toggle();
      } else {
        this.toggle();
      }
    });
  }

  createAudio() {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = this.volume;
    audio.addEventListener("play", () => this.renderPlaybackState());
    audio.addEventListener("pause", () => this.renderPlaybackState());
    audio.addEventListener("ended", () => this.renderPlaybackState());
    audio.addEventListener("timeupdate", () => this.renderTime());
    audio.addEventListener("durationchange", () => this.renderTime());
    return audio;
  }

  async load(blob) {
    this.stop();

    if (this.waveSurfer) {
      this.waveSurfer.destroy();
      this.waveSurfer = null;
    }

    this.container.replaceChildren();
    this.engineContainer.replaceChildren();
    this.audio = this.createAudio();

    const Spectrogram = window.WaveSurfer?.Spectrogram;
    if (window.WaveSurfer && Spectrogram) {
      this.waveSurfer = window.WaveSurfer.create({
        container: this.engineContainer,
        media: this.audio,
        height: 1,
        waveColor: "transparent",
        progressColor: "transparent",
        cursorWidth: 0,
        normalize: true,
        dragToSeek: true,
        plugins: [
          Spectrogram.create({
            container: this.container,
            colorMap: this.colorMap,
            fftSamples: 1024,
            frequencyMin: 0,
            frequencyMax: this.frequencyMax,
            height: this.container.clientHeight || this.height,
            labels: true,
            labelsBackground: "rgba(13, 15, 18, 0.78)",
            labelsColor: "#b7bec7",
            labelsHzColor: "#8e97a4",
            noverlap: 768,
            scale: "linear",
            windowFunc: "hann",
          }),
        ],
      });
      // Explicit loading is essential on every render. Reading a URL from a
      // reused media element can skip WaveSurfer's decode event, leaving the
      // Spectrogram plugin with no AudioBuffer to draw.
      await this.waveSurfer.loadBlob(blob);
    } else {
      this.container.innerHTML = '<p class="spectrum-error">Spectrum preview is unavailable.</p>';
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

  seek(event) {
    const bounds = this.container.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    const progress = Math.max(0, Math.min(1, position));
    if (this.externalPlayback) {
      this.externalPlayback.seek(progress);
      return;
    }
    if (!Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
    this.audio.currentTime = progress * this.audio.duration;
    this.renderTime();
  }

  setExternalPlayback(handlers = null) {
    this.audio.pause();
    this.externalPlayback = handlers;
    if (!handlers) {
      this.renderPlaybackState();
      this.renderTime();
    }
  }

  renderExternalPlayback({ playing, currentTime, duration }) {
    if (!this.externalPlayback) return;
    this.playButton.textContent = playing ? "Ⅱ" : "▶";
    this.playButton.setAttribute("aria-label", playing ? "Pause live receiver" : "Play live receiver");
    this.timeElement.textContent = `${formatDuration(currentTime)} / ${formatDuration(duration)}`;
    const progress = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0;
    this.playhead.style.left = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.renderPlaybackState();
  }

  renderPlaybackState() {
    if (this.externalPlayback) return;
    const playing = !this.audio.paused && !this.audio.ended;
    this.playButton.textContent = playing ? "Ⅱ" : "▶";
    this.playButton.setAttribute("aria-label", playing ? "Pause playback" : "Play");
  }

  renderTime() {
    if (this.externalPlayback) return;
    this.timeElement.textContent = `${formatDuration(this.audio.currentTime)} / ${formatDuration(
      this.audio.duration,
    )}`;
    const progress = Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.currentTime / this.audio.duration
      : 0;
    this.playhead.style.left = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }
}
