import { butterworthLowpass, lowpass, notch, removeDc } from "../../filters.js";

/**
 * The real RDS physical layer uses a 57 kHz subcarrier and 1187.5 bit/s.
 * Dividing every RDS clock by eight preserves the important 48-carrier-cycles
 * per bit relationship while fitting the experiment into a 48 kHz audio file.
 */
export const RDS_SCALE = 8;
export const RDS_SUBCARRIER = 57000 / RDS_SCALE;
export const RDS_PILOT = 19000 / RDS_SCALE;
export const RDS_BIT_RATE = 1187.5 / RDS_SCALE;
export const RDS_AUDIO_BANDWIDTH = 1800;
export const RDS_AUDIO_FILTER_ORDER = 12;
export const RDS_BASEBAND_BANDWIDTH = 7600;

const AUDIO_LEVEL = 0.78;
const PILOT_LEVEL = 0.04;
const RDS_LEVEL = 0.11;
const PI_CODE = 0xa0f1;
const CRC_POLYNOMIAL = 0x5b9;
const BLOCK_BITS = 26;
const PREAMBLE_BITS = Array.from({ length: 32 }, (_, index) => index % 2);
const OFFSETS = Object.freeze({
  A: 0x0fc,
  B: 0x198,
  C: 0x168,
  D: 0x1b4,
});

export const RDS_MODES = Object.freeze({
  NONE: "none",
  PS: "ps",
  RADIOTEXT: "radiotext",
});

function polynomialRemainder(value) {
  let remainder = value;
  for (let bit = 25; bit >= 10; bit -= 1) {
    if (remainder & (1 << bit)) {
      remainder ^= CRC_POLYNOMIAL << (bit - 10);
    }
  }
  return remainder & 0x3ff;
}

export function encodeRdsBlock(data, offset) {
  const shiftedData = (data & 0xffff) << 10;
  const checkword = polynomialRemainder(shiftedData) ^ offset;
  return shiftedData | checkword;
}

function blockToBits(block) {
  return Array.from({ length: BLOCK_BITS }, (_, index) => (block >>> (25 - index)) & 1);
}

function bitsToBlock(bits, start) {
  let block = 0;
  for (let index = 0; index < BLOCK_BITS; index += 1) {
    block = block * 2 + bits[start + index];
  }
  return block;
}

function bytePair(first, second) {
  return ((first & 0xff) << 8) | (second & 0xff);
}

function textBytes(text, length) {
  const bytes = [];
  for (const character of text.slice(0, length)) {
    const code = character.charCodeAt(0);
    bytes.push(code >= 0x20 && code <= 0x7e ? code : 0x3f);
  }
  return bytes;
}

function createPsGroups(text) {
  const bytes = textBytes(text, 8);
  while (bytes.length < 8) bytes.push(0x20);

  return Array.from({ length: 4 }, (_, segment) => [
    PI_CODE,
    segment,
    0,
    bytePair(bytes[segment * 2], bytes[segment * 2 + 1]),
  ]);
}

function createRadioTextGroups(text) {
  const bytes = textBytes(text, 64);
  if (bytes.length < 64) bytes.push(0x0d);
  while (bytes.length % 4) bytes.push(0x20);

  return Array.from({ length: Math.max(1, bytes.length / 4) }, (_, segment) => {
    const start = segment * 4;
    return [
      PI_CODE,
      0x2000 | segment,
      bytePair(bytes[start] ?? 0x20, bytes[start + 1] ?? 0x20),
      bytePair(bytes[start + 2] ?? 0x20, bytes[start + 3] ?? 0x20),
    ];
  });
}

export function createRdsGroupBits(mode, text) {
  const groups = mode === RDS_MODES.PS ? createPsGroups(text) : createRadioTextGroups(text);
  const offsetOrder = [OFFSETS.A, OFFSETS.B, OFFSETS.C, OFFSETS.D];

  return groups.flatMap((group) =>
    group.flatMap((data, index) => blockToBits(encodeRdsBlock(data, offsetOrder[index]))),
  );
}

/**
 * Build the scaled broadcast multiplex that will modulate the acoustic carrier.
 * The message, reference pilot, and RDS data exist at the same time, just as
 * audio and RDS coexist in a real FM multiplex.
 */
export function createRdsComposite(message, sampleRate, { mode, text }) {
  if (mode === RDS_MODES.NONE) return Float32Array.from(message);

  const groupBits = createRdsGroupBits(mode, text);
  const minimumBitCount = PREAMBLE_BITS.length + groupBits.length;
  const minimumSampleCount = Math.ceil((minimumBitCount * sampleRate) / RDS_BIT_RATE);
  const length = Math.max(message.length, minimumSampleCount);
  const biphase = new Float32Array(length);
  let differentialState = 1;
  let encodedBitIndex = -1;

  const bitAt = (index) => {
    if (index < PREAMBLE_BITS.length) return PREAMBLE_BITS[index];
    return groupBits[(index - PREAMBLE_BITS.length) % groupBits.length];
  };

  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    const bitTime = (sampleIndex * RDS_BIT_RATE) / sampleRate;
    const bitIndex = Math.floor(bitTime);
    while (encodedBitIndex < bitIndex) {
      encodedBitIndex += 1;
      if (bitAt(encodedBitIndex)) differentialState *= -1;
    }
    const halfBitPolarity = bitTime - bitIndex < 0.5 ? 1 : -1;
    biphase[sampleIndex] = differentialState * halfBitPolarity;
  }

  // Real RDS uses shaped biphase pulses. This low-pass stage limits the square
  // waveform before it is translated around the scaled 7.125 kHz subcarrier.
  const shapedBiphase = lowpass(biphase, sampleRate, RDS_BIT_RATE * 1.9, 2);
  const composite = new Float32Array(length);
  const rdsPhaseStep = (2 * Math.PI * RDS_SUBCARRIER) / sampleRate;
  const pilotPhaseStep = (2 * Math.PI * RDS_PILOT) / sampleRate;
  let rdsPhase = 0;
  let pilotPhase = 0;

  for (let index = 0; index < length; index += 1) {
    rdsPhase += rdsPhaseStep;
    pilotPhase += pilotPhaseStep;
    if (rdsPhase > Math.PI * 2) rdsPhase -= Math.PI * 2;
    if (pilotPhase > Math.PI * 2) pilotPhase -= Math.PI * 2;

    composite[index] =
      AUDIO_LEVEL * (message[index] ?? 0) +
      PILOT_LEVEL * Math.sin(pilotPhase) +
      RDS_LEVEL * shapedBiphase[index] * Math.sin(rdsPhase);
  }

  return composite;
}

function findValidGroups(bits, sampleOffset, samplesPerBit, sampleRate) {
  const groups = [];
  const requiredBits = BLOCK_BITS * 4;

  for (let start = 0; start + requiredBits <= bits.length; start += 1) {
    const blocks = Array.from({ length: 4 }, (_, index) =>
      bitsToBlock(bits, start + index * BLOCK_BITS),
    );
    if (
      polynomialRemainder(blocks[0]) !== OFFSETS.A ||
      polynomialRemainder(blocks[1]) !== OFFSETS.B ||
      polynomialRemainder(blocks[2]) !== OFFSETS.C ||
      polynomialRemainder(blocks[3]) !== OFFSETS.D
    ) {
      continue;
    }

    const data = blocks.map((block) => block >>> 10);
    const groupType = (data[1] >>> 12) & 0x0f;
    const versionB = Boolean(data[1] & 0x0800);
    groups.push({
      data,
      groupType,
      versionB,
      time: (sampleOffset + (start + requiredBits) * samplesPerBit) / sampleRate,
    });
    start += requiredBits - 1;
  }

  return groups;
}

function recoverBits(iPrefix, qPrefix, sampleOffset, samplesPerBit) {
  const vectors = [];

  for (let bit = 0; ; bit += 1) {
    const start = Math.round(sampleOffset + bit * samplesPerBit);
    const middle = Math.round(sampleOffset + (bit + 0.5) * samplesPerBit);
    const end = Math.round(sampleOffset + (bit + 1) * samplesPerBit);
    if (end >= iPrefix.length) break;

    const firstI = iPrefix[middle] - iPrefix[start];
    const secondI = iPrefix[end] - iPrefix[middle];
    const firstQ = qPrefix[middle] - qPrefix[start];
    const secondQ = qPrefix[end] - qPrefix[middle];
    vectors.push([firstI - secondI, firstQ - secondQ]);
  }

  const bits = [];
  for (let index = 1; index < vectors.length; index += 1) {
    const [i, q] = vectors[index];
    const [previousI, previousQ] = vectors[index - 1];
    bits.push(i * previousI + q * previousQ < 0 ? 1 : 0);
  }
  return bits;
}

function decodePs(groups) {
  const segments = new Map();
  let completedAt = null;

  for (const group of groups.filter(({ groupType, versionB }) => groupType === 0 && !versionB)) {
    const segment = group.data[1] & 0x03;
    const blockD = group.data[3];
    segments.set(segment, String.fromCharCode(blockD >>> 8, blockD & 0xff));
    if (completedAt === null && [0, 1, 2, 3].every((index) => segments.has(index))) {
      completedAt = group.time;
    }
  }

  if (segments.size < 4) return null;
  return {
    mode: RDS_MODES.PS,
    text: [0, 1, 2, 3].map((index) => segments.get(index)).join("").trimEnd(),
    completedAt,
  };
}

function decodeRadioText(groups) {
  const segments = new Map();
  let completedAt = null;
  let terminatorSegment = null;

  for (const group of groups.filter(({ groupType, versionB }) => groupType === 2 && !versionB)) {
    const segment = group.data[1] & 0x0f;
    const blockC = group.data[2];
    const blockD = group.data[3];
    const characters = String.fromCharCode(
      blockC >>> 8,
      blockC & 0xff,
      blockD >>> 8,
      blockD & 0xff,
    );
    segments.set(segment, characters);
    if (characters.includes("\r")) terminatorSegment = segment;

    const requiredSegments = terminatorSegment === null ? 16 : terminatorSegment + 1;
    if (
      completedAt === null &&
      requiredSegments > 0 &&
      Array.from({ length: requiredSegments }, (_, index) => index).every((index) =>
        segments.has(index),
      )
    ) {
      completedAt = group.time;
    }
  }

  if (!segments.size) return null;
  const finalSegment = terminatorSegment ?? 15;
  if (
    !Array.from({ length: finalSegment + 1 }, (_, index) => index).every((index) =>
      segments.has(index),
    )
  ) {
    return null;
  }
  const assembled = Array.from(
    { length: finalSegment + 1 },
    (_, index) => segments.get(index) ?? "",
  ).join("");
  const terminator = assembled.indexOf("\r");
  const text = (terminator >= 0 ? assembled.slice(0, terminator) : assembled).trimEnd();
  if (!text) return null;
  return { mode: RDS_MODES.RADIOTEXT, text, completedAt };
}

/**
 * Decode scaled RDS without assuming carrier phase or exact bit timing.
 * Complex correlation removes the unknown subcarrier phase, while a short
 * timing search chooses the candidate that yields the most CRC-valid groups.
 */
export function decodeRdsComposite(composite, sampleRate, expectedMode) {
  const samplesPerBit = sampleRate / RDS_BIT_RATE;
  const maximumSamples = Math.min(composite.length, Math.ceil(sampleRate * 30));
  const iPrefix = new Float64Array(maximumSamples + 1);
  const qPrefix = new Float64Array(maximumSamples + 1);
  const phaseStep = (2 * Math.PI * RDS_SUBCARRIER) / sampleRate;
  let phase = 0;

  for (let index = 0; index < maximumSamples; index += 1) {
    phase += phaseStep;
    if (phase > Math.PI * 2) phase -= Math.PI * 2;
    iPrefix[index + 1] = iPrefix[index] + composite[index] * Math.sin(phase);
    qPrefix[index + 1] = qPrefix[index] + composite[index] * Math.cos(phase);
  }

  let bestGroups = [];
  const timingStep = 8;
  for (let offset = 0; offset < samplesPerBit; offset += timingStep) {
    const bits = recoverBits(iPrefix, qPrefix, offset, samplesPerBit);
    const groups = findValidGroups(bits, offset, samplesPerBit, sampleRate);
    if (groups.length > bestGroups.length) bestGroups = groups;
  }

  const decoded =
    expectedMode === RDS_MODES.PS ? decodePs(bestGroups) : decodeRadioText(bestGroups);
  return decoded ? { ...decoded, validGroups: bestGroups.length } : null;
}

export function recoverAudioFromRdsComposite(composite, sampleRate) {
  // A real receiver splits the demodulated multiplex into separate audio and
  // data paths. In the 1:8 model the pilot is audible and close to the audio
  // band, so it is explicitly notched before a steep programme low-pass.
  const withoutPilot = notch(composite, sampleRate, RDS_PILOT, 12);
  const audio = butterworthLowpass(
    withoutPilot,
    sampleRate,
    RDS_AUDIO_BANDWIDTH,
    RDS_AUDIO_FILTER_ORDER,
  );
  const centered = removeDc(audio);
  const recovered = new Float32Array(centered.length);

  // Restore the transmitter's fixed programme injection level. Peak
  // normalization is deliberately avoided: otherwise a silent programme would
  // amplify tiny pilot or RDS remnants into a misleading audible signal.
  for (let index = 0; index < centered.length; index += 1) {
    recovered[index] = Math.max(-0.98, Math.min(0.98, centered[index] / AUDIO_LEVEL));
  }
  return recovered;
}
