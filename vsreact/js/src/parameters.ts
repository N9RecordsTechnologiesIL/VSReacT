// useParameter — two-way binding to a juce::AudioProcessorValueTreeState
// parameter through vsreact::ParameterBridge. Values are normalized 0..1.

import { useCallback, useEffect, useState } from "react";
import { native } from "./native";

/** The parameter's natural range, mirrored from the C++ NormalisableRange so
    UI code never has to re-declare APVTS ranges in TS (mirrored constants
    drift — that's how a reset lands on the wrong value). */
export interface ParameterRange {
  /** Natural-unit bounds (e.g. 1..1000 for a ms delay). */
  min: number;
  max: number;
  /** Snap interval in natural units; 0 = continuous. */
  interval: number;
  /** NormalisableRange skew; 1 = linear. */
  skew: number;
  /** JUCE's symmetric-skew flag. The conversion helpers below implement the
      standard skew only and fall back to linear when this is set. */
  symmetricSkew: boolean;
}

/** JUCE NormalisableRange::convertFrom0to1 — normalized 0..1 to natural units. */
export function normalizedToNatural(normalized: number, range: ParameterRange): number {
  let proportion = Math.min(1, Math.max(0, normalized));

  if (!range.symmetricSkew && range.skew !== 1 && proportion > 0)
    proportion = Math.exp(Math.log(proportion) / range.skew);

  return range.min + (range.max - range.min) * proportion;
}

/** JUCE NormalisableRange::convertTo0to1 — natural units to normalized 0..1. */
export function naturalToNormalized(natural: number, range: ParameterRange): number {
  const span = range.max - range.min;
  if (span === 0) return 0;

  let proportion = Math.min(1, Math.max(0, (natural - range.min) / span));

  if (!range.symmetricSkew && range.skew !== 1 && proportion > 0)
    proportion = Math.pow(proportion, range.skew);

  return proportion;
}

export interface ParameterState extends ParameterRange {
  value: number;
  text: string;
  name: string;
  label: string;
  /** The host's normalized default — double-click-reset target. */
  defaultValue: number;
}

export interface ParameterHandle extends ParameterState {
  set: (normalized: number) => void;
  begin: () => void;
  end: () => void;
}

export interface ParameterInfo extends ParameterRange {
  id: string;
  name: string;
  label: string;
  /** Normalized 0..1 snapshot at mount — use useParameter(id) for live values. */
  value: number;
  text: string;
  defaultValue: number;
}

/** The identity range — what an old native side (no metadata) degrades to:
    natural units equal normalized units, exactly the previous behaviour. */
const IDENTITY_RANGE: ParameterRange = { min: 0, max: 1, interval: 0, skew: 1, symmetricSkew: false };

function rangeFrom(entry: any): ParameterRange {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    min: num(entry?.min, IDENTITY_RANGE.min),
    max: num(entry?.max, IDENTITY_RANGE.max),
    interval: num(entry?.interval, IDENTITY_RANGE.interval),
    skew: num(entry?.skew, IDENTITY_RANGE.skew),
    symmetricSkew: Boolean(entry?.symmetricSkew),
  };
}

/**
 * Enumerates every APVTS parameter (via param:list) once at mount — the
 * host's parameter set is fixed for the plugin's lifetime. Powers
 * <GenericEditor/> and any auto-generated UI.
 */
export function useParameterList(): ParameterInfo[] {
  const [list] = useState<ParameterInfo[]>(() => {
    const result = native.call("param:list");
    if (!Array.isArray(result)) return [];
    return result.map((entry) => ({
      id: String(entry?.id ?? ""),
      name: String(entry?.name ?? entry?.id ?? ""),
      label: String(entry?.label ?? ""),
      value: Number(entry?.value ?? 0),
      text: String(entry?.text ?? ""),
      defaultValue: Number(entry?.defaultValue ?? 0),
      ...rangeFrom(entry),
    }));
  });

  return list;
}

export function useParameter(id: string): ParameterHandle {
  const [state, setState] = useState<ParameterState>(() => {
    const initial = native.call("param:get", { id });
    return initial && typeof initial.value === "number"
      ? {
          value: initial.value,
          text: String(initial.text ?? ""),
          name: String(initial.name ?? id),
          label: String(initial.label ?? ""),
          defaultValue: Number(initial.defaultValue ?? 0),
          ...rangeFrom(initial),
        }
      : { value: 0, text: "", name: id, label: "", defaultValue: 0, ...IDENTITY_RANGE };
  });

  useEffect(
    () =>
      native.on("param", (p) => {
        if (p?.id !== id) return;
        // A malformed event must never poison good state: keep the previous
        // value on non-finite numbers and the previous text when absent.
        setState((s) => {
          const value = Number(p.value);
          return {
            ...s,
            value: Number.isFinite(value) ? value : s.value,
            text: p.text == null ? s.text : String(p.text),
          };
        });
      }),
    [id],
  );

  const set = useCallback(
    (normalized: number) => {
      // NaN would round-trip into the APVTS as garbage — drop it here too.
      if (!Number.isFinite(normalized)) return;
      const value = Math.min(1, Math.max(0, normalized));
      setState((s) => ({ ...s, value }));
      native.call("param:set", { id, value });
    },
    [id],
  );

  const begin = useCallback(() => {
    native.call("param:begin", { id });
  }, [id]);

  const end = useCallback(() => {
    native.call("param:end", { id });
  }, [id]);

  return { ...state, set, begin, end };
}
