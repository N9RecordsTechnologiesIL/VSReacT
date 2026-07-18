// Meter — the level meter every plugin needs: painted bar with a hot zone
// and a peak-hold line that holds, then falls. Feed it any 0..1 value
// (typically pushed from C++ via useNativeEvent).

import { useEffect, useRef, useState } from "react";
import { View, Text } from "./primitives";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface PeakHoldOptions {
  /** How long a peak is held before it starts falling. Default 600ms. */
  holdMs?: number;
  /** Fall rate once the hold expires, in value/second. Default 1.5. */
  decayPerSecond?: number;
}

export interface PeakHoldState {
  peak: number;
  heldForMs: number;
}

/** One peak-hold step (pure, testable): new peaks latch instantly and
    reset the hold timer; after holdMs the peak decays toward the value. */
export function peakHoldStep(
  state: PeakHoldState,
  value: number,
  dtMs: number,
  { holdMs = 600, decayPerSecond = 1.5 }: PeakHoldOptions = {},
): PeakHoldState {
  if (value >= state.peak) return { peak: value, heldForMs: 0 };

  const heldForMs = state.heldForMs + dtMs;
  if (heldForMs < holdMs) return { peak: state.peak, heldForMs };

  return { peak: Math.max(value, state.peak - decayPerSecond * (dtMs / 1000)), heldForMs };
}

const FRAME_MS = 33; // meters read fine at ~30fps

/** The held peak for a live value — drives the Meter's peak line. */
export function usePeakHold(value: number, options: PeakHoldOptions = {}): number {
  const [peak, setPeak] = useState(value);
  const state = useRef<PeakHoldState>({ peak: value, heldForMs: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const id = setInterval(() => {
      state.current = peakHoldStep(state.current, valueRef.current, FRAME_MS, optionsRef.current);
      setPeak(state.current.peak);
    }, FRAME_MS);

    return () => clearInterval(id);
  }, []);

  return Math.max(peak, value);
}

export interface MeterProps {
  /** Level 0..1. */
  value: number;
  /** Long-axis length. Default 120. */
  length?: number;
  /** Short-axis thickness. Default 10. */
  thickness?: number;
  /** Horizontal bar instead of the vertical default. */
  horizontal?: boolean;
  /** Fill from the top (vertical) / right (horizontal) — gain-reduction
      meters. Default false. */
  reverse?: boolean;
  /** Show the peak-hold line. Default true. */
  peak?: boolean;
  holdMs?: number;
  decayPerSecond?: number;
  /** Where the fill turns hot, 0..1. Default 0.85. */
  hotFrom?: number;
  trackColor?: string;
  color?: string;
  hotColor?: string;
  label?: string;
}

/** A natively painted level meter with hot zone + peak hold. */
export function Meter({
  value,
  length = 120,
  thickness = 10,
  horizontal,
  reverse = false,
  peak = true,
  holdMs,
  decayPerSecond,
  hotFrom = 0.85,
  trackColor = "#141714",
  color = "#C6F135",
  hotColor = "#FF4545",
  label,
}: MeterProps) {
  const level = clamp01(value);
  const held = usePeakHold(level, { holdMs, decayPerSecond });
  const hot = clamp01(hotFrom);

  const fill = Math.min(level, hot) * length;
  const hotFill = level > hot ? (level - hot) * length : 0;
  const peakAt = clamp01(held) * length;

  const bar = horizontal ? (
    <View
      className="relative rounded overflow-hidden"
      style={{ width: length, height: thickness, backgroundColor: trackColor }}
    >
      <View
        className="absolute top-0 bottom-0"
        style={reverse ? { right: 0, width: fill, backgroundColor: color } : { left: 0, width: fill, backgroundColor: color }}
      />
      {hotFill > 0 ? (
        <View
          className="absolute top-0 bottom-0"
          style={
            reverse
              ? { right: hot * length, width: hotFill, backgroundColor: hotColor }
              : { left: hot * length, width: hotFill, backgroundColor: hotColor }
          }
        />
      ) : null}
      {peak && peakAt > 2 ? (
        <View
          className="absolute top-0 bottom-0 w-[2]"
          style={
            reverse
              ? { right: peakAt - 2, backgroundColor: held >= hot ? hotColor : color }
              : { left: peakAt - 2, backgroundColor: held >= hot ? hotColor : color }
          }
        />
      ) : null}
    </View>
  ) : (
    <View
      className="relative rounded overflow-hidden"
      style={{ width: thickness, height: length, backgroundColor: trackColor }}
    >
      <View
        className="absolute left-0 right-0"
        style={reverse ? { top: 0, height: fill, backgroundColor: color } : { bottom: 0, height: fill, backgroundColor: color }}
      />
      {hotFill > 0 ? (
        <View
          className="absolute left-0 right-0"
          style={
            reverse
              ? { top: hot * length, height: hotFill, backgroundColor: hotColor }
              : { bottom: hot * length, height: hotFill, backgroundColor: hotColor }
          }
        />
      ) : null}
      {peak && peakAt > 2 ? (
        <View
          className="absolute left-0 right-0 h-[2]"
          style={
            reverse
              ? { top: peakAt - 2, backgroundColor: held >= hot ? hotColor : color }
              : { bottom: peakAt - 2, backgroundColor: held >= hot ? hotColor : color }
          }
        />
      ) : null}
    </View>
  );

  if (label === undefined) return bar;

  return (
    <View className="items-center gap-2">
      {bar}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}

export interface RingMeterProps {
  /** Level 0..1. */
  value: number;
  /** Diameter. Default 64. */
  size?: number;
  thickness?: number;
  /** Where the arc turns hot, 0..1. Default 0.85; 1 disables. */
  hotFrom?: number;
  trackColor?: string;
  color?: string;
  hotColor?: string;
  /** Center readout. Default: none. */
  format?: (value: number) => string;
  label?: string;
}

/** A circular level meter on the native arc keys — channel-strip level
    rings, macro amounts, gain-reduction dials. */
export function RingMeter({
  value,
  size = 64,
  thickness,
  hotFrom = 0.85,
  trackColor = "#FFFFFF14",
  color = "#C6F135",
  hotColor = "#FF4545",
  format,
  label,
}: RingMeterProps) {
  const level = clamp01(value);
  const hot = clamp01(hotFrom);
  const arcThickness = thickness ?? Math.max(3, size * 0.09);
  const START = -135;
  const SWEEP = 270;

  const ring = (
    <View className="relative items-center justify-center" style={{ width: size, height: size }}>
      <View
        className="absolute inset-0"
        style={{
          arcTrackColor: trackColor,
          arcColor: color,
          arcStart: START,
          arcEnd: START + SWEEP,
          arcValueStart: START,
          arcValueEnd: START + SWEEP * Math.min(level, hot),
          arcThickness,
        }}
      />
      {level > hot ? (
        <View
          className="absolute inset-0"
          style={{
            arcTrackColor: "#00000000",
            arcColor: hotColor,
            arcStart: START,
            arcEnd: START + SWEEP,
            arcValueStart: START + SWEEP * hot,
            arcValueEnd: START + SWEEP * level,
            arcThickness,
          }}
        />
      ) : null}
      {format !== undefined ? (
        <Text className="text-[11] font-bold" style={{ color: level > hot ? hotColor : color }}>
          {format(level)}
        </Text>
      ) : null}
    </View>
  );

  if (label === undefined) return ring;

  return (
    <View className="items-center gap-2">
      {ring}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}
