// Pure pattern + geometry math ported from the DrumDeck web UI. The plate is
// 1672×941; every coordinate here is in that plate space and gets multiplied
// by SCALE at render time. The native C++ speaks a row-indexed model
// (row 0 = KICK, 1 = SNARE, 2 = HAT), so the pattern is a boolean[3][16].

export const ROWS = 3;
export const STEPS = 16;

export const ROW_LABELS = ["KICK", "SNARE", "HAT"] as const;

// DrumDeck's DEFAULT_PATTERN, expanded to the boolean[row][step] the C++ uses.
// This is ALSO the state baked into plate.webp, so `changedPads` diffs against
// it to draw the minimal set of sprite overrides.
const KICK = [0, 4, 8, 10, 12];
const SNARE = [4, 12];
const HAT = [1, 3, 5, 7, 9, 11, 13, 15];

export function makeDefaultPattern(): boolean[][] {
  const has = (arr: number[], s: number) => arr.includes(s);
  return [
    Array.from({ length: STEPS }, (_, s) => has(KICK, s)),
    Array.from({ length: STEPS }, (_, s) => has(SNARE, s)),
    Array.from({ length: STEPS }, (_, s) => has(HAT, s)),
  ];
}

export const DEFAULT_PATTERN = makeDefaultPattern();

// Tempo range — matches DrumDeck's clampTempo (40..240) and the widened APVTS
// NormalisableRange in DrumsPlugin.cpp.
export const TEMPO_MIN = 40;
export const TEMPO_MAX = 240;
export const clampTempo = (v: number) => Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(v)));
export const tempoToNorm = (bpm: number) => (clampTempo(bpm) - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN);
export const normToTempo = (n: number) => TEMPO_MIN + n * (TEMPO_MAX - TEMPO_MIN);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ── Plate-space geometry (1672×941), taken verbatim from the DrumDeck source ──

// Pad geometry MEASURED from plate.webp rather than copied from the web source:
// the lit-pad cores were located by scanning the KICK/SNARE/HAT rows for orange
// runs, and the web's PAD_X drifted up to ~10px right-of-true by step 13 (the
// grid sits in four groups of four with a wider gap between groups, so a single
// uniform stride doesn't fit). Centres, then top-left origins.
//   groups: 230,315,400,484 | 596,679,763,847 | 949,1033,1116,1198 | 1303,1388,1470,1552
export const STEP_CENTERS = [230, 315, 400, 484, 596, 679, 763, 847, 949, 1033, 1116, 1198, 1303, 1388, 1470, 1552];
export const ROW_CENTERS = [425, 542, 658];

// Hit zone 68×78; the sprite art is 74×80 and sits at (x-3, y-2).
export const PAD_X = STEP_CENTERS.map((c) => c - 34);
export const PAD_Y = ROW_CENTERS.map((c) => c - 39);
export const PAD_W = 68;
export const PAD_H = 78;
export const PAD_ART_W = 74;
export const PAD_ART_H = 80;
export const PAD_ART_DX = -3;
export const PAD_ART_DY = -2;

// The baked playhead outline around step 11, measured from the plate: it spans
// x 1080..1155 and y 375..712, i.e. 75×337 centred on the step-11 pad column.
// PlayheadCover hides it and PlayheadBox redraws the live one to match.
export const BAKED_PLAYHEAD_STEP = 10;
export const PH_BOX_W = 75;
export const PH_BOX_TOP = 375;
export const PH_BOX_H = 337;

// meterBars: DrumDeck's lit-bar count. Kept for parity even though the native
// clock.level also feeds a live meter.
export function activeVoicesAtStep(pattern: boolean[][], step: number) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) if (pattern[r]?.[step]) n++;
  return n;
}
export function meterBars(level: number, playing: boolean, activeVoices: number, step: number) {
  if (!playing) return 0;
  return Math.min(18, Math.max(0, Math.round(clamp01(level) * 14 + activeVoices * 2 + (step % 3))));
}
