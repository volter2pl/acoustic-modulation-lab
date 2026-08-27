import assert from "node:assert/strict";
import test from "node:test";

import { demodulateFM } from "../src/fm-demodulator.js";
import { AUDIO_EXAMPLES } from "../src/examples.js";
import { modulateFM } from "../src/fm-modulator.js";
import { encodeWav } from "../src/wav.js";
import { WaveformPlayer } from "../src/waveform.js";

function correlation(first, second, offset = 0, lag = 0) {
  const length = Math.min(first.length, second.length) - offset - Math.abs(lag);
  const firstStart = offset + Math.max(0, -lag);
  const secondStart = offset + Math.max(0, lag);
  let sumA = 0;
  let sumB = 0;
  for (let index = 0; index < length; index += 1) {
    sumA += first[firstStart + index];
    sumB += second[secondStart + index];
  }
  const meanA = sumA / length;
  const meanB = sumB / length;

  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;
  for (let index = 0; index < length; index += 1) {
    const a = first[firstStart + index] - meanA;
    const b = second[secondStart + index] - meanB;
    numerator += a * b;
    denominatorA += a * a;
    denominatorB += b * b;
  }
  return numerator / Math.sqrt(denominatorA * denominatorB);
}

test("the modulator and demodulator recover a sinusoidal message", () => {
  const sampleRate = 48000;
  const duration = 1;
  const message = new Float32Array(sampleRate * duration);
  for (let index = 0; index < message.length; index += 1) {
    message[index] = 0.72 * Math.sin((2 * Math.PI * 440 * index) / sampleRate);
  }

  const encoded = modulateFM(message, sampleRate, 18000, 1000);
  const decoded = demodulateFM(encoded, sampleRate, 18000, 1000);
  let score = -1;
  for (let lag = -160; lag <= 160; lag += 1) {
    score = Math.max(score, correlation(message, decoded, Math.floor(sampleRate * 0.05), lag));
  }
  assert.ok(score > 0.97, `expected correlation > 0.97, received ${score}`);
});

test("the modulator keeps its output amplitude bounded", () => {
  const input = Float32Array.from([0, 0.5, 1, -0.5, -1]);
  const encoded = modulateFM(input, 48000, 10000, 1000, 0.72);
  assert.equal(encoded.length, input.length);
  assert.ok(encoded.every((sample) => Math.abs(sample) <= 0.720001));
});

test("the WAV encoder creates a valid mono 16-bit PCM header", () => {
  const wav = encodeWav(Float32Array.from([0, 1, -1]), 48000);
  const view = new DataView(wav);
  const ascii = (offset, length) =>
    String.fromCharCode(...new Uint8Array(wav, offset, length));

  assert.equal(ascii(0, 4), "RIFF");
  assert.equal(ascii(8, 4), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 6);
});

test("the sample manifest has unique IDs and references existing files", async () => {
  const ids = AUDIO_EXAMPLES.map((example) => example.id);
  assert.equal(new Set(ids).size, ids.length);

  const { access } = await import("node:fs/promises");
  await Promise.all(AUDIO_EXAMPLES.map((example) => access(new URL(example.src))));
});

test("reloading a waveform preserves the new audio source", async () => {
  const originalAudio = globalThis.Audio;
  const originalWindow = globalThis.window;
  const createdSources = [];

  class FakeAudio {
    constructor() {
      this.src = "";
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.duration = 1;
    }

    addEventListener() {}
    load() {}
    pause() {}
  }

  globalThis.Audio = FakeAudio;
  globalThis.window = {
    WaveSurfer: {
      create(options) {
        createdSources.push(options.media.src);
        return {
          destroy() {
            options.media.src = "";
          },
        };
      },
    },
  };

  try {
    const player = new WaveformPlayer({
      container: { replaceChildren() {}, innerHTML: "" },
      playButton: { addEventListener() {}, setAttribute() {}, textContent: "" },
      timeElement: { textContent: "" },
      waveColor: "#000",
      progressColor: "#fff",
    });

    await player.load(new Blob(["first"]));
    await player.load(new Blob(["second"]));

    assert.equal(createdSources.length, 2);
    assert.ok(createdSources.every(Boolean));
    assert.equal(player.audio.src, createdSources[1]);
  } finally {
    globalThis.Audio = originalAudio;
    globalThis.window = originalWindow;
  }
});

test("DSP modules stay independent from browser UI APIs", async () => {
  const { readFile } = await import("node:fs/promises");
  const dspFiles = ["filters.js", "fm-modulator.js", "fm-demodulator.js", "wav.js"];

  for (const file of dspFiles) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(document|window|navigator|WaveSurfer)\b/);
  }
});

test("source code and interface copy are English", async () => {
  const { readFile } = await import("node:fs/promises");
  const interfaceHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(interfaceHtml, /<html lang="en">/);

  const sourceFiles = [
    "app.js",
    "audio.js",
    "examples.js",
    "filters.js",
    "fm-demodulator.js",
    "fm-modulator.js",
    "main.js",
    "recorder.js",
    "ui.js",
    "wav.js",
    "waveform.js",
  ];
  const contents = await Promise.all(
    sourceFiles.map((file) => readFile(new URL(`../src/${file}`, import.meta.url), "utf8")),
  );
  const polishDiacritics = /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/;
  assert.doesNotMatch(`${interfaceHtml}\n${contents.join("\n")}`, polishDiacritics);
});
