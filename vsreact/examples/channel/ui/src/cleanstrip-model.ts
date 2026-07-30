// Pure geometry/format math, ported nearly verbatim from the CleanStrip web
// UI (app/cleanstrip-model.ts). The plate is 1536×1024, the same viewBox the
// web SVG used, so every coordinate here is a plate coordinate and multiplies
// by SCALE (0.5) at paint time. APVTS parameters arrive normalized 0..1 through
// useParameter; the *-Norm/from-* helpers convert to the real units these
// formulas expect.

export type MeterState = {
  gainReduction: number;
  left: number;
  right: number;
};

// ---- Parameter ranges (the UI is the spec; C++ layout mirrors these) --------
export const RANGES = {
  low_gain: { min: -12, max: 12, def: 2.4 },
  mid_gain: { min: -12, max: 12, def: -1.8 },
  high_gain: { min: -12, max: 12, def: 1.5 },
  high_freq: { min: 200, max: 10000, def: 4000 },
  comp: { min: 0, max: 1, def: 0.42 },
  out_gain: { min: -12, max: 12, def: 0.6 },
} as const;

export type ParamId = keyof typeof RANGES;

/** normalized 0..1 -> real units for a given parameter. */
export const fromNorm = (id: ParamId, n: number) => {
  const { min, max } = RANGES[id];
  return min + n * (max - min);
};
/** real units -> normalized 0..1 for a given parameter. */
export const toNorm = (id: ParamId, v: number) => {
  const { min, max } = RANGES[id];
  return clamp((v - min) / (max - min), 0, 1);
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalize = (value: number, min: number, max: number) =>
  (clamp(value, min, max) - min) / (max - min);

export const valueToAngle = (value: number, min: number, max: number) =>
  -135 + normalize(value, min, max) * 270;

export const formatGain = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;

export const formatFrequency = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(2)} kHz`
    : `${Math.round(value)} Hz`;

// ---- EQ graph mapping (identical constants to the web) ----------------------
const graphX = (frequency: number) => {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  return 74 + ((Math.log10(clamp(frequency, 20, 20000)) - minLog) / (maxLog - minLog)) * 853;
};

const graphY = (gain: number) => 299 - clamp(gain, -12, 12) * 11.55;

export const eqPoint = (frequency: number, gain: number) => ({
  x: graphX(frequency),
  y: graphY(gain),
});

const bell = (frequency: number, center: number, gain: number, width: number) => {
  const octaves = Math.log2(frequency / center);
  return gain * Math.exp(-(octaves * octaves) / (2 * width * width));
};

export const buildEqPath = (
  lowGain: number,
  midGain: number,
  highGain: number,
  highFrequency: number,
) => {
  const points = Array.from({ length: 65 }, (_, index) => {
    const ratio = index / 64;
    const frequency = 20 * 1000 ** ratio;
    const gain =
      bell(frequency, 200, lowGain, 1.15) +
      bell(frequency, 1200, midGain, 0.95) +
      bell(frequency, highFrequency, highGain, 1.05);
    return { x: graphX(frequency), y: graphY(gain) };
  });

  return points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
};

// Meter state. In the native port `left`/`right`/`gainReduction` come from the
// C++ "meters" event instead of this synthetic model, but the shape matches so
// StripMeters is unchanged. Kept for parity / power-off zeroing.
export const deriveMeters = (
  powered: boolean,
  compression: number,
  level: number,
  phase: number,
  outputGain = 0,
): MeterState => {
  if (!powered) return { gainReduction: 0, left: 0, right: 0 };

  const motion = (Math.sin(phase) + 1) * 0.5;
  const gainScale = 10 ** (outputGain / 20);
  const base = clamp((0.42 + level * 0.42 + motion * 0.12) * gainScale, 0, 1);

  return {
    gainReduction: clamp(compression * (0.68 + motion * 0.12), 0, 1),
    left: base,
    right: clamp(base * (0.94 + Math.sin(phase * 0.73) * 0.05), 0, 1),
  };
};
