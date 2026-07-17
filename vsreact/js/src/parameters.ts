// useParameter — two-way binding to a juce::AudioProcessorValueTreeState
// parameter through vsreact::ParameterBridge. Values are normalized 0..1.

import { useCallback, useEffect, useState } from "react";
import { native } from "./native";

export interface ParameterState {
  value: number;
  text: string;
  name: string;
  label: string;
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
        }
      : { value: 0, text: "", name: id, label: "" };
  });

  useEffect(
    () =>
      native.on("param", (p) => {
        if (p?.id === id)
          setState((s) => ({ ...s, value: Number(p.value), text: String(p.text ?? "") }));
      }),
    [id],
  );

  const set = useCallback(
    (normalized: number) => {
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
