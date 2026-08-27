import { AM_EXPERIMENT } from "./am/experiment.js";
import { FM_EXPERIMENT } from "./fm/experiment.js";

export const MODULATION_TYPES = Object.freeze({ FM: "fm", AM: "am" });

export const MODULATION_EXPERIMENTS = Object.freeze({
  [MODULATION_TYPES.FM]: FM_EXPERIMENT,
  [MODULATION_TYPES.AM]: AM_EXPERIMENT,
});
