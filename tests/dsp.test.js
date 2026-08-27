import assert from "node:assert/strict";
import test from "node:test";

import { demodulateAM } from "../src/modulation/am/demodulator.js";
import { modulateAM } from "../src/modulation/am/modulator.js";
import {
  AM_STATION_CARRIERS,
  createAmRadioBand,
  getAmBandReceiverGain,
  receiveAmStation,
} from "../src/modulation/am/radio-band.js";
import { StreamingAmReceiver } from "../src/modulation/am/streaming-receiver.js";
import { MODULATION_EXPERIMENTS } from "../src/modulation/index.js";
import {
  demodulateFM,
  demodulateFMComposite,
} from "../src/modulation/fm/demodulator.js";
import { AUDIO_EXAMPLES } from "../src/examples.js";
import { modulateFM } from "../src/modulation/fm/modulator.js";
import {
  createRadioBand,
  RADIO_STATION_CARRIERS,
  receiveRadioStation,
} from "../src/modulation/fm/radio-band.js";
import {
  createRdsComposite,
  decodeRdsComposite,
  RDS_BASEBAND_BANDWIDTH,
  RDS_MODES,
  RDS_PILOT,
  recoverAudioFromRdsComposite,
} from "../src/modulation/fm/rds.js";
import { encodeWav } from "../src/wav.js";
import { SpectrumPlayer } from "../src/spectrum.js";
import { StreamingFmReceiver } from "../src/modulation/fm/streaming-receiver.js";
import {
  createI18n,
  getLanguage,
  TRANSLATIONS,
} from "../src/i18n.js";

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

test("conventional AM and its envelope receiver recover a sinusoidal message", () => {
  const sampleRate = 48000;
  const message = Float32Array.from(
    { length: sampleRate * 2 },
    (_, index) => 0.72 * Math.sin((2 * Math.PI * 440 * index) / sampleRate),
  );
  const encoded = modulateAM(message, sampleRate, 12000, 0.8);
  const decoded = demodulateAM(encoded, sampleRate, 12000);
  let score = -1;
  for (let lag = -160; lag <= 160; lag += 1) {
    score = Math.max(score, correlation(message, decoded, sampleRate * 0.08, lag));
  }
  assert.ok(score > 0.99, `expected AM correlation > 0.99, received ${score}`);
});

test("AM remains bounded through the complete 0–150% depth range", () => {
  const input = Float32Array.from([0, 0.5, 1, -0.5, -1]);
  const encoded = modulateAM(input, 48000, 12000, 1.5);
  assert.ok(encoded.every((sample) => Math.abs(sample) <= 0.950001));
});

test("AM overmodulation visibly distorts an envelope-detector result", () => {
  const sampleRate = 48000;
  const message = Float32Array.from(
    { length: sampleRate * 2 },
    (_, index) => Math.sin((2 * Math.PI * 440 * index) / sampleRate),
  );
  const normal = demodulateAM(modulateAM(message, sampleRate, 12000, 1), sampleRate, 12000);
  const overmodulated = demodulateAM(
    modulateAM(message, sampleRate, 12000, 1.5),
    sampleRate,
    12000,
  );
  let normalScore = -1;
  let overmodulatedScore = -1;
  for (let lag = -160; lag <= 160; lag += 1) {
    normalScore = Math.max(normalScore, correlation(message, normal, sampleRate * 0.08, lag));
    overmodulatedScore = Math.max(
      overmodulatedScore,
      correlation(message, overmodulated, sampleRate * 0.08, lag),
    );
  }
  assert.ok(normalScore > 0.99);
  assert.ok(overmodulatedScore < 0.98);
});

test("one radio band carries three independently tunable FM stations", () => {
  const sampleRate = 48000;
  const frequencies = [300, 700, 1300];
  const messages = frequencies.map((frequency) =>
    Float32Array.from(
      { length: sampleRate * 2 },
      (_, index) => 0.7 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    ),
  );
  const band = createRadioBand(messages, sampleRate);

  frequencies.forEach((frequency, stationIndex) => {
    const received = receiveRadioStation(
      band,
      sampleRate,
      RADIO_STATION_CARRIERS[stationIndex],
    );
    const wanted = toneAmplitude(received, sampleRate, frequency, 0.1, 1.9);
    const unwanted = frequencies
      .filter((_, index) => index !== stationIndex)
      .map((otherFrequency) =>
        toneAmplitude(received, sampleRate, otherFrequency, 0.1, 1.9),
      );

    assert.ok(wanted > 0.9);
    assert.ok(unwanted.every((level) => level < 0.001));
  });
});

test("a streaming receiver changes stations without restarting the radio band", () => {
  const sampleRate = 48000;
  const frequencies = [300, 700, 1300];
  const messages = frequencies.map((frequency) =>
    Float32Array.from(
      { length: sampleRate * 2 },
      (_, index) => 0.7 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    ),
  );
  const band = createRadioBand(messages, sampleRate);
  const receiver = new StreamingFmReceiver(
    sampleRate,
    RADIO_STATION_CARRIERS[0],
    750,
    2000,
  );
  const output = new Float32Array(band.length);

  for (let index = 0; index < band.length; index += 1) {
    if (index === sampleRate) receiver.setCarrier(RADIO_STATION_CARRIERS[1]);
    output[index] = receiver.process(band[index]);
  }

  assert.ok(toneAmplitude(output, sampleRate, frequencies[0], 0.15, 0.85) > 0.6);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[1], 0.15, 0.85) < 0.001);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[1], 1.15, 1.85) > 0.6);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[0], 1.15, 1.85) < 0.001);
});

test("a radio band follows the longest programme and remains below clipping", () => {
  const messages = [
    new Float32Array(12000).fill(0.5),
    new Float32Array(24000).fill(-0.5),
    new Float32Array(36000),
  ];
  const band = createRadioBand(messages, 48000);

  assert.equal(band.length, 36000);
  assert.ok(band.every((sample) => Math.abs(sample) <= 0.780001));
});

test("one AM radio band carries three independently tunable stations", () => {
  const sampleRate = 48000;
  const frequencies = [300, 700, 1300];
  const messages = frequencies.map((frequency) =>
    Float32Array.from(
      { length: sampleRate * 2 },
      (_, index) => 0.7 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    ),
  );
  const band = createAmRadioBand(messages, sampleRate);

  frequencies.forEach((frequency, stationIndex) => {
    const received = receiveAmStation(
      band,
      sampleRate,
      AM_STATION_CARRIERS[stationIndex],
    );
    const wanted = toneAmplitude(received, sampleRate, frequency, 0.2, 1.8);
    const unwanted = frequencies
      .filter((_, index) => index !== stationIndex)
      .map((otherFrequency) =>
        toneAmplitude(received, sampleRate, otherFrequency, 0.2, 1.8),
      );
    assert.ok(wanted > 0.25);
    assert.ok(unwanted.every((level) => level < 0.001));
  });
  assert.ok(band.every((sample) => Math.abs(sample) <= 0.780001));
});

test("a streaming AM receiver retunes without restarting the shared band", () => {
  const sampleRate = 48000;
  const frequencies = [300, 700, 1300];
  const messages = frequencies.map((frequency) =>
    Float32Array.from(
      { length: sampleRate * 2 },
      (_, index) => 0.7 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    ),
  );
  const band = createAmRadioBand(messages, sampleRate);
  const receiver = new StreamingAmReceiver(
    sampleRate,
    AM_STATION_CARRIERS[0],
    2000,
    { outputGain: getAmBandReceiverGain() },
  );
  const output = new Float32Array(band.length);
  for (let index = 0; index < band.length; index += 1) {
    if (index === sampleRate) receiver.setCarrier(AM_STATION_CARRIERS[1]);
    output[index] = receiver.process(band[index]);
  }
  assert.ok(toneAmplitude(output, sampleRate, frequencies[0], 0.2, 0.8) > 0.6);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[1], 0.2, 0.8) < 0.001);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[1], 1.2, 1.8) > 0.6);
  assert.ok(toneAmplitude(output, sampleRate, frequencies[0], 1.2, 1.8) < 0.001);
});

test("AM and FM expose the same application experiment contract", () => {
  const methods = [
    "getCarrierLimits",
    "validateSingle",
    "validateBand",
    "getOccupiedBandwidth",
    "getSingleSnapshot",
    "encodeSingle",
    "decodeSingle",
    "prepareBandMessage",
    "createBand",
    "receiveBand",
    "createLiveReceiver",
  ];
  for (const experiment of Object.values(MODULATION_EXPERIMENTS)) {
    assert.ok(experiment.id === "am" || experiment.id === "fm");
    assert.ok(experiment.stationCarriers.length === 3);
    for (const method of methods) assert.equal(typeof experiment[method], "function");
  }
  assert.equal(MODULATION_EXPERIMENTS.fm.supportsRds, true);
  assert.equal(MODULATION_EXPERIMENTS.am.supportsRds, false);
});

test("both live receiver worklets register and process finite audio blocks", async () => {
  const previousProcessor = globalThis.AudioWorkletProcessor;
  const previousSampleRate = globalThis.sampleRate;
  const previousRegister = globalThis.registerProcessor;
  const processors = new Map();
  globalThis.AudioWorkletProcessor = class {};
  globalThis.sampleRate = 48000;
  globalThis.registerProcessor = (name, Processor) => processors.set(name, Processor);

  try {
    await import("../src/modulation/fm/receiver-worklet.js?test");
    await import("../src/modulation/am/receiver-worklet.js?test");
    const cases = [
      [
        "acoustic-fm-live-receiver",
        { carrier: 12000, deviation: 750, messageBandwidth: 2000 },
      ],
      [
        "acoustic-am-live-receiver",
        { carrier: 12000, messageBandwidth: 2000, receiverGain: 7.96 },
      ],
    ];
    for (const [name, processorOptions] of cases) {
      const Processor = processors.get(name);
      assert.equal(typeof Processor, "function");
      const processor = new Processor({ processorOptions });
      const output = new Float32Array(128);
      const keepAlive = processor.process(
        [[new Float32Array(128)]],
        [[output]],
        { tunedCarrier: new Float32Array([12000]) },
      );
      assert.equal(keepAlive, true);
      assert.ok(output.every(Number.isFinite));
    }
  } finally {
    globalThis.AudioWorkletProcessor = previousProcessor;
    globalThis.sampleRate = previousSampleRate;
    globalThis.registerProcessor = previousRegister;
  }
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

test("a spectrum player can delegate playback and seeking to a live receiver", () => {
  const originalAudio = globalThis.Audio;
  const buttonListeners = {};
  const containerListeners = {};
  const calls = { toggles: 0, seeks: [] };

  class FakeAudio {
    constructor() {
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.duration = 1;
    }

    addEventListener() {}
    pause() {}
  }

  globalThis.Audio = FakeAudio;
  try {
    const playButton = {
      textContent: "",
      addEventListener(name, listener) {
        buttonListeners[name] = listener;
      },
      setAttribute() {},
    };
    const timeElement = { textContent: "" };
    const playhead = { style: {} };
    const player = new SpectrumPlayer({
      container: {
        addEventListener(name, listener) {
          containerListeners[name] = listener;
        },
        getBoundingClientRect() {
          return { left: 10, width: 100 };
        },
      },
      engineContainer: {},
      playhead,
      playButton,
      timeElement,
      accentColor: [97, 213, 167],
      frequencyMax: 8000,
      height: 300,
    });
    player.setExternalPlayback({
      toggle: () => {
        calls.toggles += 1;
      },
      seek: (progress) => calls.seeks.push(progress),
    });

    buttonListeners.click();
    containerListeners.click({ clientX: 85 });
    player.renderExternalPlayback({ playing: true, currentTime: 15, duration: 60 });

    assert.equal(calls.toggles, 1);
    assert.deepEqual(calls.seeks, [0.75]);
    assert.equal(playButton.textContent, "Ⅱ");
    assert.equal(timeElement.textContent, "0:15 / 1:00");
    assert.equal(playhead.style.left, "25%");
  } finally {
    globalThis.Audio = originalAudio;
  }
});

test("the interface uses spectrograms instead of amplitude waveforms", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /plugins\/spectrogram\.min\.js/);
  assert.match(html, /id="source-spectrum"/);
  assert.match(html, /id="signal-spectrum"/);
  assert.match(html, /id="result-spectrum"/);
  assert.match(html, /id="result-spectrum-state"/);
  assert.match(html, /id="modulation-fm"/);
  assert.match(html, /id="modulation-am"/);
  assert.match(html, /href="https:\/\/github\.com\/volter2pl\/acoustic-modulation-lab"/);
  assert.doesNotMatch(html, /Runs locally/);
  assert.doesNotMatch(html, /Play high-frequency signals at a low volume/);
  assert.doesNotMatch(html, /id="[^"]*waveform/);
});

test("DSP modules stay independent from browser UI APIs", async () => {
  const { readFile } = await import("node:fs/promises");
  const dspFiles = [
    "filters.js",
    "modulation/fm/modulator.js",
    "modulation/fm/demodulator.js",
    "modulation/fm/radio-band.js",
    "modulation/fm/streaming-receiver.js",
    "modulation/fm/rds.js",
    "modulation/am/modulator.js",
    "modulation/am/demodulator.js",
    "modulation/am/radio-band.js",
    "modulation/am/streaming-receiver.js",
    "wav.js",
  ];

  for (const file of dspFiles) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(document|window|navigator|WaveSurfer)\b/);
  }
});

test("English remains the default interface and translations stay isolated", async () => {
  const { readFile } = await import("node:fs/promises");
  const interfaceHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(interfaceHtml, /<html lang="en">/);

  const sourceFiles = [
    "app.js",
    "audio.js",
    "examples.js",
    "filters.js",
    "live-receiver.js",
    "main.js",
    "recorder.js",
    "modulation/index.js",
    "modulation/fm/demodulator.js",
    "modulation/fm/experiment.js",
    "modulation/fm/modulator.js",
    "modulation/fm/radio-band.js",
    "modulation/fm/receiver-worklet.js",
    "modulation/fm/rds.js",
    "modulation/fm/streaming-receiver.js",
    "modulation/am/demodulator.js",
    "modulation/am/experiment.js",
    "modulation/am/modulator.js",
    "modulation/am/radio-band.js",
    "modulation/am/receiver-worklet.js",
    "modulation/am/streaming-receiver.js",
    "ui.js",
    "wav.js",
    "spectrum.js",
  ];
  const contents = await Promise.all(
    sourceFiles.map((file) => readFile(new URL(`../src/${file}`, import.meta.url), "utf8")),
  );
  const localizedCharacters = /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017bäöüßÄÖÜáéíñúÁÉÍÑÚãõçâêôÃÕÇÂÊÔàèùœÀÈÙŒ\u3040-\u30ff\u4e00-\u9fff]/;
  assert.doesNotMatch(`${interfaceHtml}\n${contents.join("\n")}`, localizedCharacters);
});

test("the lang query selects every complete localized interface", async () => {
  assert.equal(getLanguage("?lang=pl"), "pl");
  assert.equal(getLanguage("?mode=band&lang=pl"), "pl");
  assert.equal(getLanguage("?lang=en"), "en");
  assert.equal(getLanguage("?lang=de"), "de");
  assert.equal(getLanguage("?mode=band&lang=de"), "de");
  assert.equal(getLanguage("?lang=es"), "es");
  assert.equal(getLanguage("?mode=band&lang=es"), "es");
  assert.equal(getLanguage("?lang=pt-BR"), "pt-BR");
  assert.equal(getLanguage("?lang=pt-br"), "pt-BR");
  assert.equal(getLanguage("?lang=zh-CN"), "zh-CN");
  assert.equal(getLanguage("?lang=zh-cn"), "zh-CN");
  assert.equal(getLanguage("?lang=ja"), "ja");
  assert.equal(getLanguage("?lang=fr"), "fr");
  assert.equal(getLanguage(""), "en");

  assert.deepEqual(
    Object.keys(TRANSLATIONS.pl).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS.de).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS.es).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS["pt-BR"]).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS["zh-CN"]).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS.ja).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  assert.deepEqual(
    Object.keys(TRANSLATIONS.fr).sort(),
    Object.keys(TRANSLATIONS.en).sort(),
  );
  const polish = createI18n("pl");
  assert.equal(polish.t("ui.singleStation"), "Jedna stacja");
  assert.equal(
    polish.t("ui.prepareSignal", { modulation: "FM" }),
    "Najpierw przygotuj sygnał FM",
  );
  assert.equal(polish.number(12), "12,0");
  const german = createI18n("de");
  assert.equal(german.t("ui.singleStation"), "Einzelsender");
  assert.equal(
    german.t("ui.prepareSignal", { modulation: "FM" }),
    "Zuerst ein FM-Signal erzeugen",
  );
  assert.equal(german.number(12), "12,0");
  const spanish = createI18n("es");
  assert.equal(spanish.t("ui.singleStation"), "Una emisora");
  assert.equal(
    spanish.t("ui.prepareSignal", { modulation: "FM" }),
    "Prepara primero una señal FM",
  );
  assert.equal(spanish.number(12), "12,0");
  const brazilianPortuguese = createI18n("pt-BR");
  assert.equal(createI18n("pt-br").language, "pt-BR");
  assert.equal(brazilianPortuguese.t("ui.singleStation"), "Uma estação");
  assert.equal(
    brazilianPortuguese.t("ui.prepareSignal", { modulation: "FM" }),
    "Primeiro prepare um sinal FM",
  );
  assert.equal(brazilianPortuguese.number(12), "12,0");
  const simplifiedChinese = createI18n("zh-CN");
  assert.equal(createI18n("zh-cn").language, "zh-CN");
  assert.equal(simplifiedChinese.t("ui.singleStation"), "单个电台");
  assert.equal(
    simplifiedChinese.t("ui.prepareSignal", { modulation: "FM" }),
    "请先生成 FM 信号",
  );
  assert.equal(simplifiedChinese.number(12), "12.0");
  const japanese = createI18n("ja");
  assert.equal(japanese.t("ui.singleStation"), "単一局");
  assert.equal(
    japanese.t("ui.prepareSignal", { modulation: "FM" }),
    "先に FM 信号を生成してください",
  );
  assert.equal(japanese.number(12), "12.0");
  const french = createI18n("fr");
  assert.equal(french.t("ui.singleStation"), "Une station");
  assert.equal(
    french.t("ui.prepareSignal", { modulation: "FM" }),
    "Préparez d’abord un signal FM",
  );
  assert.equal(french.number(12), "12,0");
  for (const translations of Object.values(TRANSLATIONS)) {
    assert.match(translations["rds.defaultPs"], /^[\x20-\x7e]*$/);
    assert.match(translations["rds.defaultRadioText"], /^[\x20-\x7e]*$/);
  }

  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /href="\?lang=pl" data-language="pl"/);
  assert.match(html, /href="\?lang=de" data-language="de"/);
  assert.match(html, /href="\?lang=es" data-language="es"/);
  assert.match(html, /href="\?lang=pt-BR" data-language="pt-BR"/);
  assert.match(html, /href="\?lang=zh-CN" data-language="zh-CN"/);
  assert.match(html, /href="\?lang=ja" data-language="ja"/);
  assert.match(html, /href="\?lang=fr" data-language="fr"/);
  assert.match(html, /data-home-link/);
  assert.match(html, /data-i18n="ui\.singleStation"/);
  assert.match(html, /data-i18n-aria-label="aria\.signalFlow"/);
});

test("educational documentation covers AM and FM as separate concepts", async () => {
  const { readFile } = await import("node:fs/promises");
  const [
    overview,
    polishOverview,
    germanOverview,
    spanishOverview,
    brazilianOverview,
    chineseOverview,
    japaneseOverview,
    frenchOverview,
    amGuide,
    fmGuide,
    polishAmGuide,
    polishFmGuide,
    germanAmGuide,
    germanFmGuide,
    spanishAmGuide,
    spanishFmGuide,
    brazilianAmGuide,
    brazilianFmGuide,
    chineseAmGuide,
    chineseFmGuide,
    japaneseAmGuide,
    japaneseFmGuide,
    frenchAmGuide,
    frenchFmGuide,
  ] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../README.pl.md", import.meta.url), "utf8"),
    readFile(new URL("../README.de.md", import.meta.url), "utf8"),
    readFile(new URL("../README.es.md", import.meta.url), "utf8"),
    readFile(new URL("../README.pt-BR.md", import.meta.url), "utf8"),
    readFile(new URL("../README.zh-CN.md", import.meta.url), "utf8"),
    readFile(new URL("../README.ja.md", import.meta.url), "utf8"),
    readFile(new URL("../README.fr.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/en/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/en/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/pl/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/pl/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/de/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/de/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/es/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/es/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/pt-BR/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/pt-BR/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/zh-CN/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/zh-CN/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/ja/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/ja/fm.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/fr/am.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/fr/fm.md", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /Acoustic Modulation Lab/);
  assert.match(overview, /\[Polski\]\(README\.pl\.md\)/);
  assert.match(overview, /volter2pl\.github\.io\/acoustic-modulation-lab/);
  assert.match(overview, /acoustic-modulation-lab\/\?lang=de/);
  assert.match(polishOverview, /\[English\]\(README\.md\)/);
  assert.match(polishOverview, /Co pokazuje laboratorium/);
  assert.match(polishOverview, /acoustic-modulation-lab\/\?lang=pl/);
  assert.match(germanOverview, /Was das Labor zeigt/);
  assert.match(germanOverview, /acoustic-modulation-lab\/\?lang=de/);
  assert.match(spanishOverview, /Qué demuestra el laboratorio/);
  assert.match(spanishOverview, /acoustic-modulation-lab\/\?lang=es/);
  assert.match(brazilianOverview, /O que o laboratório demonstra/);
  assert.match(brazilianOverview, /acoustic-modulation-lab\/\?lang=pt-BR/);
  assert.match(chineseOverview, /实验室展示什么/);
  assert.match(chineseOverview, /acoustic-modulation-lab\/\?lang=zh-CN/);
  assert.match(japaneseOverview, /このラボで学べること/);
  assert.match(japaneseOverview, /acoustic-modulation-lab\/\?lang=ja/);
  assert.match(frenchOverview, /Ce que démontre le laboratoire/);
  assert.match(frenchOverview, /acoustic-modulation-lab\/\?lang=fr/);
  assert.match(amGuide, /s\(t\) = A · \[1 \+ μm\(t\)\]/);
  assert.match(amGuide, /Overmodulation/);
  assert.match(fmGuide, /fi\(t\) = fc \+ Δf · m\(t\)/);
  assert.match(fmGuide, /Scaled RDS/);
  assert.match(polishAmGuide, /Przemodulowanie/);
  assert.match(polishAmGuide, /\[English\]\(\.\.\/en\/am\.md\)/);
  assert.match(polishFmGuide, /Skalowany RDS/);
  assert.match(polishFmGuide, /\[English\]\(\.\.\/en\/fm\.md\)/);
  assert.match(germanAmGuide, /Übermodulation/);
  assert.match(germanAmGuide, /\[Polski\]\(\.\.\/pl\/am\.md\)/);
  assert.match(germanFmGuide, /Skaliertes RDS/);
  assert.match(germanFmGuide, /\[Polski\]\(\.\.\/pl\/fm\.md\)/);
  assert.match(spanishAmGuide, /Sobremodulación/);
  assert.match(spanishAmGuide, /\[Deutsch\]\(\.\.\/de\/am\.md\)/);
  assert.match(spanishFmGuide, /RDS a escala/);
  assert.match(spanishFmGuide, /\[Deutsch\]\(\.\.\/de\/fm\.md\)/);
  assert.match(brazilianAmGuide, /Sobremodulação/);
  assert.match(brazilianAmGuide, /\[Español\]\(\.\.\/es\/am\.md\)/);
  assert.match(brazilianFmGuide, /RDS em escala/);
  assert.match(brazilianFmGuide, /\[Español\]\(\.\.\/es\/fm\.md\)/);
  assert.match(chineseAmGuide, /过调制/);
  assert.match(chineseAmGuide, /\[Português \(Brasil\)\]\(\.\.\/pt-BR\/am\.md\)/);
  assert.match(chineseFmGuide, /缩放 RDS/);
  assert.match(chineseFmGuide, /\[Português \(Brasil\)\]\(\.\.\/pt-BR\/fm\.md\)/);
  assert.match(japaneseAmGuide, /過変調/);
  assert.match(japaneseAmGuide, /\[简体中文\]\(\.\.\/zh-CN\/am\.md\)/);
  assert.match(japaneseFmGuide, /スケール変換した RDS/);
  assert.match(japaneseFmGuide, /\[简体中文\]\(\.\.\/zh-CN\/fm\.md\)/);
  assert.match(frenchAmGuide, /Surmodulation/);
  assert.match(frenchAmGuide, /\[日本語\]\(\.\.\/ja\/am\.md\)/);
  assert.match(frenchFmGuide, /RDS mis à l’échelle/);
  assert.match(frenchFmGuide, /\[日本語\]\(\.\.\/ja\/fm\.md\)/);
});

test("all relative documentation links point to existing files", async () => {
  const { access, readFile } = await import("node:fs/promises");
  const documents = [
    new URL("../README.md", import.meta.url),
    new URL("../README.pl.md", import.meta.url),
    new URL("../README.de.md", import.meta.url),
    new URL("../README.es.md", import.meta.url),
    new URL("../README.pt-BR.md", import.meta.url),
    new URL("../README.zh-CN.md", import.meta.url),
    new URL("../README.ja.md", import.meta.url),
    new URL("../README.fr.md", import.meta.url),
    new URL("../docs/en/am.md", import.meta.url),
    new URL("../docs/en/fm.md", import.meta.url),
    new URL("../docs/pl/am.md", import.meta.url),
    new URL("../docs/pl/fm.md", import.meta.url),
    new URL("../docs/de/am.md", import.meta.url),
    new URL("../docs/de/fm.md", import.meta.url),
    new URL("../docs/es/am.md", import.meta.url),
    new URL("../docs/es/fm.md", import.meta.url),
    new URL("../docs/pt-BR/am.md", import.meta.url),
    new URL("../docs/pt-BR/fm.md", import.meta.url),
    new URL("../docs/zh-CN/am.md", import.meta.url),
    new URL("../docs/zh-CN/fm.md", import.meta.url),
    new URL("../docs/ja/am.md", import.meta.url),
    new URL("../docs/ja/fm.md", import.meta.url),
    new URL("../docs/fr/am.md", import.meta.url),
    new URL("../docs/fr/fm.md", import.meta.url),
  ];
  for (const documentUrl of documents) {
    const markdown = await readFile(documentUrl, "utf8");
    const relativeLinks = [...markdown.matchAll(/\[[^\]]+\]\((?!https?:)([^)#]+)(?:#[^)]+)?\)/g)];
    for (const [, target] of relativeLinks) {
      await access(new URL(target, documentUrl));
    }
  }
});
