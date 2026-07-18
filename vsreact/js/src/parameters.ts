// useParameter — two-way binding to a juce::AudioProcessorValueTreeState
// parameter through vsreact::ParameterBridge. Values are normalized 0..1.

import { useCallback, useEffect, useState } from "react";
import { native } from "./native";

export interface ParameterState {
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

export interface ParameterInfo {
  id: string;
  name: string;
  label: string;
  /** Normalized 0..1 snapshot at mount — use useParameter(id) for live values. */
  value: number;
  text: string;
  defaultValue: number;
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
        }
      : { value: 0, text: "", name: id, label: "", defaultValue: 0 };
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
