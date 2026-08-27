import assert from "node:assert/strict";
import test from "node:test";

import { demodulateFM, demodulateFMComposite } from "../src/fm-demodulator.js";
import { AUDIO_EXAMPLES } from "../src/examples.js";
import { modulateFM } from "../src/fm-modulator.js";
import {
  createRdsComposite,
  decodeRdsComposite,
  RDS_BASEBAND_BANDWIDTH,
  RDS_MODES,
  RDS_PILOT,
  recoverAudioFromRdsComposite,
} from "../src/rds.js";
import { encodeWav } from "../src/wav.js";
import { SpectrumPlayer } from "../src/spectrum.js";

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

function toneAmplitude(signal, sampleRate, frequency, startSeconds, endSeconds) {
  const start = Math.floor(startSeconds * sampleRate);
  const end = Math.min(signal.length, Math.floor(endSeconds * sampleRate));
  let sine = 0;
  let cosine = 0;
  for (let index = start; index < end; index += 1) {
    const phase = (2 * Math.PI * frequency * index) / sampleRate;
    sine += signal[index] * Math.sin(phase);
    cosine += signal[index] * Math.cos(phase);
  }
  return (2 * Math.hypot(sine, cosine)) / Math.max(1, end - start);
}

function peakBetween(signal, sampleRate, startSeconds, endSeconds) {
  const start = Math.floor(startSeconds * sampleRate);
  const end = Math.min(signal.length, Math.floor(endSeconds * sampleRate));
  let peak = 0;
  for (let index = start; index < end; index += 1) {
    peak = Math.max(peak, Math.abs(signal[index]));
  }
  return peak;
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

test("scaled RDS recovers an eight-character Programme Service name", () => {
  const sampleRate = 48000;
  const composite = createRdsComposite(new Float32Array(sampleRate), sampleRate, {
    mode: RDS_MODES.PS,
    text: "ACOUSTIC",
  });
  const decoded = decodeRdsComposite(composite, sampleRate, RDS_MODES.PS);

  assert.equal(decoded?.text, "ACOUSTIC");
  assert.ok(decoded.validGroups >= 4);
});

test("scaled RDS recovers RadioText", () => {
  const sampleRate = 48000;
  const composite = createRdsComposite(new Float32Array(sampleRate), sampleRate, {
    mode: RDS_MODES.RADIOTEXT,
    text: "FM carries audio and data together.",
  });
  const decoded = decodeRdsComposite(composite, sampleRate, RDS_MODES.RADIOTEXT);

  assert.equal(decoded?.text, "FM carries audio and data together.");
});

test("scaled RDS survives the complete FM transmitter and receiver", () => {
  const sampleRate = 48000;
  const composite = createRdsComposite(new Float32Array(sampleRate), sampleRate, {
    mode: RDS_MODES.PS,
    text: "ACOUSTIC",
  });
  const fm = modulateFM(composite, sampleRate, 12000, 1000);
  const receivedComposite = demodulateFMComposite(
    fm,
    sampleRate,
    12000,
    1000,
    RDS_BASEBAND_BANDWIDTH,
  );
  const decoded = decodeRdsComposite(receivedComposite, sampleRate, RDS_MODES.PS);

  assert.equal(decoded?.text, "ACOUSTIC");
});

test("the RDS receiver separates programme audio from pilot and data", () => {
  const sampleRate = 48000;
  const message = new Float32Array(sampleRate * 3);
  for (let index = 0; index < message.length; index += 1) {
    message[index] = 0.6 * Math.sin((2 * Math.PI * 440 * index) / sampleRate);
  }
  const transmittedComposite = createRdsComposite(message, sampleRate, {
    mode: RDS_MODES.PS,
    text: "ACOUSTIC",
  });
  const fm = modulateFM(transmittedComposite, sampleRate, 12000, 1000);
  const receivedComposite = demodulateFMComposite(
    fm,
    sampleRate,
    12000,
    1000,
    RDS_BASEBAND_BANDWIDTH,
  );
  const audio = recoverAudioFromRdsComposite(receivedComposite, sampleRate);
  const programmeLevel = toneAmplitude(audio, sampleRate, 440, 0.2, 2.8);
  const pilotLeakage = toneAmplitude(audio, sampleRate, RDS_PILOT, 0.2, 2.8);

  assert.ok(programmeLevel > 0.59 && programmeLevel < 0.61);
  assert.ok(
    pilotLeakage < programmeLevel * 0.00001,
    `pilot leakage ${pilotLeakage} is too high for programme level ${programmeLevel}`,
  );
});

test("silent RDS transmission remains silent after programme extraction", () => {
  const sampleRate = 48000;
  const transmittedComposite = createRdsComposite(
    new Float32Array(sampleRate * 3),
    sampleRate,
    { mode: RDS_MODES.PS, text: "ACOUSTIC" },
  );
  const fm = modulateFM(transmittedComposite, sampleRate, 12000, 1000);
  const receivedComposite = demodulateFMComposite(
    fm,
    sampleRate,
    12000,
    1000,
    RDS_BASEBAND_BANDWIDTH,
  );
  const audio = recoverAudioFromRdsComposite(receivedComposite, sampleRate);

  assert.ok(peakBetween(audio, sampleRate, 0.2, 2.8) < 0.00001);
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

test("reloading a spectrum preserves the new audio source", async () => {
  const originalAudio = globalThis.Audio;
  const originalWindow = globalThis.window;
  const createdMedia = [];
  const decodedBlobs = [];

  class FakeAudio {
    constructor() {
      this.src = "";
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.duration = 1;
    }

    addEventListener() {}
    pause() {}
  }

  globalThis.Audio = FakeAudio;
  globalThis.window = {
    WaveSurfer: {
      Spectrogram: {
        create() {
          return {};
        },
      },
      create(options) {
        createdMedia.push(options.media);
        return {
          destroy() {
            options.media.src = "";
          },
          async loadBlob(blob) {
            decodedBlobs.push(blob);
            options.media.src = `blob:test-${decodedBlobs.length}`;
          },
        };
      },
    },
  };

  try {
    const player = new SpectrumPlayer({
      container: {
        replaceChildren() {},
        addEventListener() {},
        innerHTML: "",
        clientHeight: 190,
      },
      engineContainer: { replaceChildren() {} },
      playhead: { style: {} },
      playButton: { addEventListener() {}, setAttribute() {}, textContent: "" },
      timeElement: { textContent: "" },
      accentColor: [169, 157, 255],
      frequencyMax: 8000,
      height: 190,
    });

    await player.load(new Blob(["first"]));
    await player.load(new Blob(["second"]));

    assert.equal(createdMedia.length, 2);
    assert.notEqual(createdMedia[0], createdMedia[1]);
    assert.equal(decodedBlobs.length, 2);
    assert.equal(player.audio, createdMedia[1]);
    assert.equal(player.audio.src, "blob:test-2");
  } finally {
    globalThis.Audio = originalAudio;
    globalThis.window = originalWindow;
  }
});

test("the interface uses spectrograms instead of amplitude waveforms", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /plugins\/spectrogram\.min\.js/);
  assert.match(html, /id="source-spectrum"/);
  assert.match(html, /id="fm-spectrum"/);
  assert.match(html, /id="result-spectrum"/);
  assert.doesNotMatch(html, /id="[^"]*waveform/);
});

test("DSP modules stay independent from browser UI APIs", async () => {
  const { readFile } = await import("node:fs/promises");
  const dspFiles = ["filters.js", "fm-modulator.js", "fm-demodulator.js", "rds.js", "wav.js"];

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
    "rds.js",
    "ui.js",
    "wav.js",
    "spectrum.js",
  ];
  const contents = await Promise.all(
    sourceFiles.map((file) => readFile(new URL(`../src/${file}`, import.meta.url), "utf8")),
  );
  const polishDiacritics = /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/;
  assert.doesNotMatch(`${interfaceHtml}\n${contents.join("\n")}`, polishDiacritics);
});
