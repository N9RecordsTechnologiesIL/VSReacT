// The EQ curve — a real biquad response display with draggable band
// nodes. Views only: the response is a center-anchored column fill
// (boost up, cut down), one node per band; drag moves freq/gain, the
// wheel adjusts Q. RBJ cookbook math, exported pure for reuse.

import { useRef } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type FilterType =
  | "peak"
  | "lowshelf"
  | "highshelf"
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "notch";

export interface EQBand {
  type: FilterType;
  /** Center/corner frequency in Hz (20..20000). */
  freq: number;
  /** Boost/cut in dB (peak & shelves). Default 0. */
  gainDb?: number;
  /** Resonance. Default 0.71. */
  q?: number;
}

/** RBJ cookbook biquad magnitude at `atHz`, in dB. */
export function biquadMagnitudeDb(band: EQBand, atHz: number, sampleRate = 48000): number {
  const { type, freq } = band;
  const gainDb = band.gainDb ?? 0;
  const q = Math.max(0.05, band.q ?? 0.71);

  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * clamp(freq, 1, sampleRate / 2 - 1)) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const rootA2Alpha = 2 * Math.sqrt(A) * alpha;

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  switch (type) {
    case "peak":
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
      break;
    case "lowpass":
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "highpass":
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "bandpass":
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "notch":
      b0 = 1; b1 = -2 * cos; b2 = 1;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case "lowshelf":
      b0 = A * (A + 1 - (A - 1) * cos + rootA2Alpha);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - rootA2Alpha);
      a0 = A + 1 + (A - 1) * cos + rootA2Alpha;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - rootA2Alpha;
      break;
    case "highshelf":
      b0 = A * (A + 1 + (A - 1) * cos + rootA2Alpha);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - rootA2Alpha);
      a0 = A + 1 - (A - 1) * cos + rootA2Alpha;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - rootA2Alpha;
      break;
  }

  const w = (2 * Math.PI * clamp(atHz, 1, sampleRate / 2 - 1)) / sampleRate;
  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);
  const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * (b0 * b1 + b1 * b2) * cw + 2 * b0 * b2 * c2w;
  const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * (a0 * a1 + a1 * a2) * cw + 2 * a0 * a2 * c2w;
  return 10 * Math.log10(Math.max(1e-12, num / Math.max(1e-12, den)));
}

/** The summed response of all bands at `atHz`, in dB. */
export function eqResponseDb(bands: EQBand[], atHz: number, sampleRate = 48000): number {
  let db = 0;
  for (const band of bands) db += biquadMagnitudeDb(band, atHz, sampleRate);
  return db;
}

const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const logSpan = Math.log(FREQ_MAX / FREQ_MIN);

/** 0..1 position ↔ 20..20k Hz on a log scale. */
export const eqXToHz = (x01: number) => FREQ_MIN * Math.exp(clamp(x01, 0, 1) * logSpan);
export const eqHzToX = (hz: number) => Math.log(clamp(hz, FREQ_MIN, FREQ_MAX) / FREQ_MIN) / logSpan;

export interface EQCurveProps {
  bands: EQBand[];
  width?: number;
  height?: number;
  /** Vertical range: ±dbRange dB. Default 18. */
  dbRange?: number;
  /** Fill resolution. Default 48 columns. */
  columns?: number;
  disabled?: boolean;
  trackColor?: string;
  /** The response fill. */
  color?: string;
  handleColor?: string;
  label?: string;
  /** A node was dragged (freq/gain) or wheeled (q). */
  onChange?: (index: number, band: EQBand) => void;
  onBegin?: (index: number) => void;
  onEnd?: (index: number) => void;
}

/** The EQ display every plugin wants: the real summed biquad response,
    with one draggable node per band (x = freq on a log scale, y = gain)
    and the wheel adjusting Q. */
export function EQCurve({
  bands,
  width = 220,
  height = 96,
  dbRange = 18,
  columns = 48,
  disabled,
  trackColor = "#141714",
  color = themeAccent("60"),
  handleColor = "#ECF2E8",
  label,
  onChange,
  onBegin,
  onEnd,
}: EQCurveProps) {
  const start = useRef<{ freq: number; gainDb: number }>({ freq: 1000, gainDb: 0 });
  const mid = height / 2;
  const HANDLE = 18;

  const yOfDb = (db: number) => mid - (clamp(db, -dbRange, dbRange) / dbRange) * (mid - 4);

  const node = (band: EQBand, index: number) => {
    const x = eqHzToX(band.freq) * width;
    const y = yOfDb(band.gainDb ?? 0);
    const handlers = disabled
      ? {}
      : {
          onDragStart: () => {
            start.current = { freq: band.freq, gainDb: band.gainDb ?? 0 };
            onBegin?.(index);
          },
          onDrag: (e: { dx: number; dy: number }) => {
            const x01 = clamp(eqHzToX(start.current.freq) + e.dx / width, 0, 1);
            onChange?.(index, {
              ...band,
              freq: Math.round(eqXToHz(x01)),
              gainDb: clamp(start.current.gainDb - (e.dy / (mid - 4)) * dbRange, -dbRange, dbRange),
            });
          },
          onDragEnd: () => onEnd?.(index),
          onWheel: (e: { dy: number }) => {
            const q = Math.max(0.05, band.q ?? 0.71);
            onBegin?.(index);
            onChange?.(index, { ...band, q: clamp(q * Math.exp(e.dy * 1.4), 0.1, 18) });
            onEnd?.(index);
          },
        };

    return (
      <View
        key={index}
        className={`absolute items-center justify-center ${disabled ? "" : "cursor-pointer"}`}
        style={{ left: x - HANDLE / 2, top: y - HANDLE / 2, width: HANDLE, height: HANDLE }}
        {...handlers}
      >
        <View
          className="rounded-full border"
          style={{ width: 10, height: 10, backgroundColor: handleColor, borderColor: "#00000088" }}
        />
      </View>
    );
  };

  const body = (
    <View
      className={`relative rounded overflow-hidden ${disabled ? "opacity-40" : ""}`}
      style={{ width, height, backgroundColor: trackColor }}
    >
      <View
        className="absolute left-0 right-0 h-[1]"
        style={{ top: mid, backgroundColor: "#FFFFFF24" }}
      />
      {Array.from({ length: columns }, (_, i) => {
        const hz = eqXToHz((i + 0.5) / columns);
        const db = eqResponseDb(bands, hz);
        const columnHeight = Math.abs(yOfDb(db) - mid);
        return (
          <View
            key={i}
            className="absolute"
            style={{
              left: (i / columns) * width + 0.5,
              width: width / columns - 1,
              top: db >= 0 ? mid - columnHeight : mid,
              height: Math.max(1, columnHeight),
              backgroundColor: color,
            }}
          />
        );
      })}
      {bands.map(node)}
    </View>
  );

  if (label === undefined) return body;

  return (
    <View className="items-center gap-2">
      {body}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}
