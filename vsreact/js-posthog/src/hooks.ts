// React sugar for plugin analytics.

import { useEffect } from "react";
import { native } from "@vsreact/core";
import { posthog } from "./client";

/** The client, for components. */
export function usePostHog() {
  return posthog;
}

/** Captures once when the component mounts — screen/panel views:
    `useCaptureOnMount("settings_opened")`. */
export function useCaptureOnMount(event: string, properties?: Record<string, unknown>): void {
  useEffect(() => {
    posthog.capture(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export interface PostHogParametersOptions {
  /** Quiet time after the last touch before one event fires. Default 800ms. */
  debounceMs?: number;
  eventName?: string;
}

/**
 * The one-liner for plugin usage analytics: subscribes to every host
 * parameter change and captures a debounced event per parameter —
 * which knobs your users actually touch, and where they leave them.
 *
 *   usePostHogParameters();   // in App — that's it
 *
 * Events: `parameter_changed { parameter_id, value, text }`.
 */
export function usePostHogParameters({
  debounceMs = 800,
  eventName = "parameter_changed",
}: PostHogParametersOptions = {}): void {
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = native.on("param", (payload: any) => {
      const id = String(payload?.id ?? "");
      if (id === "") return;

      const pending = timers.get(id);
      if (pending !== undefined) clearTimeout(pending);

      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          posthog.capture(eventName, {
            parameter_id: id,
            value: Number(payload?.value ?? 0),
            text: String(payload?.text ?? ""),
          });
        }, debounceMs),
      );
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, [debounceMs, eventName]);
}
