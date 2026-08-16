// Pure parameter math, ported from the DirtyDelay web UI. APVTS parameters
// arrive normalized 0..1 through useParameter, and their real-unit ranges ride
// along as host metadata (min/max on the handle — see normalizedToNatural), so
// nothing here mirrors the C++ layout.

export type ParamId = "time" | "feedback" | "tone" | "mix";

export function clampParameter(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** DirtyDelay's ±135° / 270° sweep, ported verbatim, from a normalized 0..1
    value (what FilmStripKnob wants). */
export function knobRotationFromNorm(norm: number) {
  return -135 + clampParameter(norm, 0, 1) * 270;
}

/** The delay time as an integer string of milliseconds (drives the display). */
export function formatDelayTime(value: number) {
  return Math.round(value).toString();
}
