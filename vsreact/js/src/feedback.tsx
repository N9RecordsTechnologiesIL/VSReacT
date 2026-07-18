// Feedback components — determinate progress and the indeterminate
// spinner, both painted natively.

import { useState } from "react";
import { View, Text } from "./primitives";
import { useInterval } from "./hooks";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface ProgressBarProps {
  /** 0..1. */
  value: number;
  width?: number;
  height?: number;
  /** Renders "42%" alongside the bar. Default false. */
  showPercent?: boolean;
  /** Unknown duration — a segment sweeps the track and `value` is
      ignored. Default false. */
  indeterminate?: boolean;
  trackColor?: string;
  color?: string;
  label?: string;
}

/** A determinate progress bar — downloads, renders, analysis passes. */
export function ProgressBar({
  value,
  width = 200,
  height = 8,
  showPercent = false,
  indeterminate = false,
  trackColor = "#2A2F27",
  color = "#C6F135",
  label,
}: ProgressBarProps) {
  const level = clamp01(value);

  // The indeterminate sweep: a 30%-width segment marching left → right.
  const [sweep, setSweep] = useState(0);
  useInterval(() => setSweep((t) => (t + 0.018) % 1), indeterminate ? 16 : null);
  const segment = width * 0.3;

  const bar = (
    <View className="flex-row items-center gap-3">
      <View
        className="rounded-full overflow-hidden relative"
        style={{ width, height, backgroundColor: trackColor }}
      >
        {indeterminate ? (
          <View
            className="rounded-full absolute"
            style={{
              left: sweep * (width + segment) - segment,
              top: 0,
              width: segment,
              height,
              backgroundColor: color,
            }}
          />
        ) : (
          <View
            className="rounded-full"
            style={{ width: level * width, height, backgroundColor: color }}
          />
        )}
      </View>
      {showPercent && !indeterminate ? (
        <Text className="text-faint text-[11] font-bold" style={{ width: 34 }}>
          {`${Math.round(level * 100)}%`}
        </Text>
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

export interface SpinnerProps {
  /** Diameter. Default 28. */
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Degrees per 16ms tick. Default 9 (~ one turn / 0.64s). */
  speed?: number;
}

/** An indeterminate spinner — a 100° arc chasing its own tail. */
export function Spinner({
  size = 28,
  thickness,
  color = "#C6F135",
  trackColor = "#FFFFFF14",
  speed = 9,
}: SpinnerProps) {
  const [angle, setAngle] = useState(0);
  useInterval(() => setAngle((a) => (a + speed) % 360), 16);

  return (
    <View
      style={{
        width: size,
        height: size,
        arcTrackColor: trackColor,
        arcColor: color,
        arcStart: 0,
        arcEnd: 360,
        arcValueStart: angle,
        arcValueEnd: angle + 100,
        arcThickness: thickness ?? Math.max(2.5, size * 0.11),
      }}
    />
  );
}
