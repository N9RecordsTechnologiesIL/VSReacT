// Pure parameter math, ported from the DirtyDelay web UI. APVTS parameters
// arrive normalized 0..1 through useParameter; these helpers convert to the
// real units the reference art was designed around and drive the knobs and the
// 7-segment readout.

export function clampParameter(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The four continuous params and their real-unit ranges (match the APVTS). */
export const RANGES = {
  time: { min: 1, max: 1000 },
  feedback: { min: 0, max: 95 },
  tone: { min: 0, max: 100 },
  mix: { min: 0, max: 100 },
} as const;

export type ParamId = keyof typeof RANGES;

/** Normalized 0..1 → real units for a given param. */
export function toValue(id: ParamId, norm: number) {
  const { min, max } = RANGES[id];
  return min + clampParameter(norm, 0, 1) * (max - min);
}

/** Real units → normalized 0..1 for a given param. */
export function toNorm(id: ParamId, value: number) {
  const { min, max } = RANGES[id];
  return (clampParameter(value, min, max) - min) / (max - min);
}

/** DirtyDelay's ±135° / 270° sweep, ported verbatim. */
export function knobRotation(value: number, min: number, max: number) {
  const progress = (clampParameter(value, min, max) - min) / (max - min);
  return -135 + progress * 270;
}

/** Rotation straight from a normalized 0..1 value (what FilmStripKnob wants). */
export function knobRotationFromNorm(norm: number) {
  return -135 + clampParameter(norm, 0, 1) * 270;
}

/** The delay time as an integer string of milliseconds (drives the display). */
export function formatDelayTime(value: number) {
  return Math.round(value).toString();
}
