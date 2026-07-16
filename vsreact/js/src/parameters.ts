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
