// Value formatting for parameter readouts — the strings DAW users
// expect next to a knob. Pure functions; pair them with NumberBox's
// `format` prop or any Text.

const trim = (value: number, decimals: number) => String(parseFloat(value.toFixed(decimals)));

/** Linear interpolation of `value` from [inMin, inMax] to [outMin, outMax].
    `clampOut` pins the result inside the output range. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clampOut = false,
): number {
  const t = inMax === inMin ? 0 : (value - inMin) / (inMax - inMin);
  const out = outMin + t * (outMax - outMin);
  if (!clampOut) return out;
  const lo = Math.min(outMin, outMax);
  const hi = Math.max(outMin, outMax);
  return Math.min(hi, Math.max(lo, out));
}

/** Decibels with an explicit sign: "+6.0 dB", "0.0 dB", "-12.5 dB".
    -Infinity (a gain fader on the floor) reads "-inf dB". */
export function formatDb(db: number, decimals = 1): string {
  if (db === Number.NEGATIVE_INFINITY) return "-inf dB";
  const text = db.toFixed(decimals);
  return `${db > 0 && !text.startsWith("+") ? "+" : ""}${text} dB`;
}

/** Frequency with automatic kHz: "440 Hz", "1.2 kHz". */
export function formatHz(hz: number, decimals = 1): string {
  if (Math.abs(hz) >= 1000) return `${trim(hz / 1000, Math.max(decimals, 1))} kHz`;
  return `${trim(hz, decimals)} Hz`;
}

/** Time with automatic seconds: "350 ms", "1.25 s". */
export function formatMs(ms: number, decimals = 0): string {
  if (Math.abs(ms) >= 1000) return `${trim(ms / 1000, Math.max(decimals, 2))} s`;
  return `${trim(ms, decimals)} ms`;
}

/** A 0..1 value as "42%". */
export function formatPercent(value01: number, decimals = 0): string {
  return `${trim(value01 * 100, decimals)}%`;
}

/** Semitones with an explicit sign: "+7 st", "0 st", "-12 st". */
export function formatSemitones(semitones: number, decimals = 0): string {
  const text = trim(semitones, decimals);
  return `${semitones > 0 && !text.startsWith("+") ? "+" : ""}${text} st`;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** A MIDI note number as scientific pitch: 60 → "C4", 69 → "A4". */
export function midiNoteName(note: number): string {
  const n = Math.round(note);
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

/** A MIDI note as a frequency (equal temperament): 69 → 440. Feed your
    oscillator straight from PianoKeyboard's onNoteOn. */
export function midiNoteToHz(note: number, a4 = 440): number {
  return a4 * Math.pow(2, (note - 69) / 12);
}

/** The nearest MIDI note for a frequency: 440 → 69. */
export function hzToMidiNote(hz: number, a4 = 440): number {
  return Math.round(69 + 12 * Math.log2(hz / a4));
}
