// Audio visualizers — bar-based displays fed by arrays of values
// (typically pushed from C++ via useNativeEvent). For audio-rate scopes,
// host a juce::Component with <NativeView>; these cover the JS-rate
// cases: spectrum bars, envelope history, waveform overviews.

import { useEffect, useState } from "react";
import { View, Text } from "./primitives";
import { accentColor as themeAccent } from "./theme";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pure rolling-window step (exported for tests): drop the oldest, push
    the newest, pad with zeros to `length`. */
export function pushRolling(previous: number[], value: number, length: number): number[] {
  const next = previous.slice(Math.max(0, previous.length - length + 1));
  next.push(value);
  while (next.length < length) next.unshift(0);
  return next;
}

/** A rolling window of the last `length` values — turns a live scalar
    (meter level, envelope) into data for <Waveform>/<Bars> history. */
export function useRollingBuffer(value: number, length = 64): number[] {
  const [buffer, setBuffer] = useState<number[]>(() => Array(length).fill(0));

  useEffect(() => {
    setBuffer((previous) => pushRolling(previous, value, length));
  }, [value, length]);

  return buffer;
}

export interface BarsProps {
  /** One bar per entry, 0..1. */
  values: number[];
  width?: number;
  height?: number;
  /** Gap between bars. Default 2. */
  gap?: number;
  /** Bars at or above this turn hot. Default 0.85; 1 disables. */
  hotFrom?: number;
  trackColor?: string;
  color?: string;
  hotColor?: string;
  label?: string;
}

/** Bottom-anchored bars — spectrum analyzers, band meters. */
export function Bars({
  values,
  width = 160,
  height = 60,
  gap = 2,
  hotFrom = 0.85,
  trackColor = "#141714",
  color = themeAccent(),
  hotColor = "#FF4545",
  label,
}: BarsProps) {
  const bars = (
    <View
      className="flex-row items-end rounded overflow-hidden px-[2]"
      style={{ width, height, backgroundColor: trackColor, columnGap: gap }}
    >
      {values.map((value, index) => {
        const level = clamp01(value);
        return (
          <View
            key={index}
            className="flex-1 rounded-[1]"
            style={{
              height: Math.max(1, level * (height - 4)),
              backgroundColor: level >= hotFrom ? hotColor : color,
            }}
          />
        );
      })}
    </View>
  );

  if (label === undefined) return bars;

  return (
    <View className="items-center gap-2">
      {bars}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}

export interface WaveformProps {
  /** One bar per entry, −1..1 (or 0..1 — bars mirror around the centre). */
  values: number[];
  width?: number;
  height?: number;
  gap?: number;
  trackColor?: string;
  color?: string;
  /** Draw the centre line. Default true. */
  centerLine?: boolean;
  centerLineColor?: string;
  label?: string;
}

/** Centre-mirrored bars — waveform overviews, envelope history. */
export function Waveform({
  values,
  width = 160,
  height = 60,
  gap = 2,
  trackColor = "#141714",
  color = themeAccent(),
  centerLine = true,
  centerLineColor = "#FFFFFF22",
  label,
}: WaveformProps) {
  const wave = (
    <View
      className="relative flex-row items-center rounded overflow-hidden px-[2]"
      style={{ width, height, backgroundColor: trackColor, columnGap: gap }}
    >
      {centerLine ? (
        <View
          className="absolute left-0 right-0 h-[1]"
          style={{ top: height / 2, backgroundColor: centerLineColor }}
        />
      ) : null}
      {values.map((value, index) => (
        <View
          key={index}
          className="flex-1 rounded-[1]"
          style={{
            height: Math.max(1, Math.min(1, Math.abs(value)) * (height - 4)),
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );

  if (label === undefined) return wave;

  return (
    <View className="items-center gap-2">
      {wave}
      <Text className="text-faint text-[10] font-bold tracking-widest">{label}</Text>
    </View>
  );
}
