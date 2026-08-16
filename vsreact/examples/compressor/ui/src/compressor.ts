// The compressor's maths, kept pure and away from the components — the same
// separation the other examples use, and the reason this file can be read
// (or unit-tested) without a plugin around it.
//
// `gainComputerDb` is the twin of `computeOutputDb` in
// Source/CompressorPlugin.cpp: identical formula, identical parameters. The
// curve on screen is therefore the curve the audio thread is applying, not a
// drawing that resembles it — and no curve points ever cross the bridge.

export interface CompressorSettings {
  /** dB, where compression begins. */
  threshold: number;
  /** :1. 1 is no compression. */
  ratio: number;
  /** Total knee width in dB, centred on the threshold. */
  knee: number;
  /** dB applied after the gain computer. */
  makeup: number;
  /** Dry/wet, 0..1. */
  mix: number;
}

/** The gain computer alone: output level in dB for an input level in dB,
    before makeup and mix. Soft-knee, per Reiss & McPherson fig. 6.6. */
export function gainComputerDb(inputDb: number, threshold: number, ratio: number, knee: number): number {
  const over = inputDb - threshold;

  if (knee > 0 && 2 * Math.abs(over) <= knee) {
    const bend = over + knee / 2;
    return inputDb + ((1 / ratio - 1) * bend * bend) / (2 * knee);
  }

  return 2 * over > knee ? threshold + over / ratio : inputDb;
}

/** What actually leaves the plugin for a steady input at `inputDb`, makeup
    and mix included — so the live dot sits *on* the drawn curve instead of
    beside it whenever either control is away from its default.

    Mix blends in the linear domain (out = dry·(1−m) + dry·g·m), which is not
    a blend in dB; doing it in dB would draw a curve the ear doesn't hear. */
export function outputDb(inputDb: number, settings: CompressorSettings): number {
  const { threshold, ratio, knee, makeup, mix } = settings;
  const reduction = inputDb - gainComputerDb(inputDb, threshold, ratio, knee);
  const wetGain = 10 ** ((makeup - reduction) / 20);
  const blended = 1 - mix + mix * wetGain;

  return inputDb + 20 * Math.log10(Math.max(blended, 1e-6));
}

export interface CurveOptions {
  /** Both axes span this range, in dB. */
  minDb: number;
  maxDb: number;
  /** Width and height of the square viewBox the path is drawn in. */
  size: number;
  /** Line segments. 48 is smooth at any panel size we draw this at. */
  steps?: number;
}

/** dB on either axis → viewBox units. y is flipped: loud is up. */
export function dbToX(db: number, { minDb, maxDb, size }: CurveOptions): number {
  return ((db - minDb) / (maxDb - minDb)) * size;
}

export function dbToY(db: number, options: CurveOptions): number {
  return options.size - dbToX(db, options);
}

/** The transfer curve as SVG path data. Clamped to the box so an extreme
    makeup setting bends the line rather than escaping the frame. */
export function curvePath(settings: CompressorSettings, options: CurveOptions): string {
  const { minDb, maxDb, size } = options;
  const steps = options.steps ?? 48;
  const parts: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const inputDb = minDb + ((maxDb - minDb) * i) / steps;
    const y = Math.min(size, Math.max(0, dbToY(outputDb(inputDb, settings), options)));
    parts.push(`${i === 0 ? "M" : "L"}${dbToX(inputDb, options).toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(" ");
}

/** Evenly spaced grid lines, in dB, excluding the two edges. */
export function gridLines(minDb: number, maxDb: number, stepDb: number): number[] {
  const lines: number[] = [];
  for (let db = minDb + stepDb; db < maxDb; db += stepDb) lines.push(db);
  return lines;
}
