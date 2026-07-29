// Pure parameter math, ported from the PlainGain web UI. APVTS parameters
// arrive normalized 0..1 through useParameter; these helpers convert to the
// real units the reference art was designed around and drive the indicators.

export const GAIN_MIN = -60;
export const GAIN_MAX = 6;

export const gainToNorm = (db: number) => (db - GAIN_MIN) / (GAIN_MAX - GAIN_MIN);
export const normToGain = (n: number) => GAIN_MIN + n * (GAIN_MAX - GAIN_MIN);

export function clampParameter(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Generic ±135° / 270° sweep (used by pan: min -1, max 1). */
export function knobRotation(value: number, min: number, max: number) {
  const normalized = (clampParameter(value, min, max) - min) / (max - min);
  return -135 + normalized * 270;
}

/** Gain's asymmetric two-segment sweep: -60..0 → -135..0°, 0..6 → 0..135°. */
export function gainRotation(value: number) {
  const gain = clampParameter(value, GAIN_MIN, GAIN_MAX);
  return gain <= 0 ? (gain / 60) * 135 : (gain / 6) * 135;
}

export function formatGain(value: number) {
  const normalized = Math.abs(value) < 0.05 ? 0 : value;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${normalized.toFixed(1)} dB`;
}

export function formatPan(value: number) {
  if (Math.abs(value) < 0.005) return "Center";
  return `${Math.abs(value * 100).toFixed(0)}% ${value < 0 ? "Left" : "Right"}`;
}
