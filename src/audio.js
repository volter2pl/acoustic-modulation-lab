import { butterworthLowpass, fadeEdges, normalize, removeDc } from "./filters.js";

export const TARGET_SAMPLE_RATE = 48000;
export const MAX_DURATION_SECONDS = 120;
export const DEFAULT_AUDIO_BANDWIDTH = 2400;

let sharedAudioContext;

function createAudioError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function getAudioContext() {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw createAudioError(
        "errors.webAudioUnsupported",
        "This browser does not support the Web Audio API.",
      );
    }
    sharedAudioContext = new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE });
  }
  return sharedAudioContext;
}

export async function decodeAudioBlob(blob) {
  const context = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  if (audioBuffer.duration > MAX_DURATION_SECONDS) {
    throw createAudioError(
      "errors.maxDuration",
      `The maximum recording length is ${MAX_DURATION_SECONDS} seconds.`,
      { seconds: MAX_DURATION_SECONDS },
    );
  }
  return audioBuffer;
}

export function mixToMono(audioBuffer) {
  const mono = new Float32Array(audioBuffer.length);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      mono[index] += data[index] / audioBuffer.numberOfChannels;
    }
  }
  return mono;
}

export function prepareMessage(
  audioBuffer,
  bandwidth = DEFAULT_AUDIO_BANDWIDTH,
  filterOrder = 4,
) {
  // A wideband message creates wide FM sidebands. Limiting the message to the
  // speech band keeps the occupied FM spectrum inside a 48 kHz audio channel.
  const mono = mixToMono(audioBuffer);
  const centered = removeDc(mono);
  const filtered = butterworthLowpass(
    centered,
    audioBuffer.sampleRate,
    bandwidth,
    filterOrder,
  );
  const normalized = normalize(filtered, 0.95);
  return fadeEdges(normalized, audioBuffer.sampleRate);
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function describeAudio(audioBuffer, translate = null) {
  const channelDescription = audioBuffer.numberOfChannels === 1
    ? translate?.("audio.mono") ?? "mono"
    : translate?.("audio.stereoToMono") ?? "stereo → mono";
  return `${formatDuration(audioBuffer.duration)} · ${(audioBuffer.sampleRate / 1000).toFixed(0)} kHz · ${
    channelDescription
  }`;
}
