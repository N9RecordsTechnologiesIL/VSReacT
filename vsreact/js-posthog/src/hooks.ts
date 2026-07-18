// React sugar for plugin analytics.

import { useEffect, useRef } from "react";
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

/** Captures once when the component unmounts, with how long it was
    mounted: `useCaptureOnUnmount("settings_closed")` →
    `settings_closed { duration_ms }`. */
export function useCaptureOnUnmount(event: string, properties?: Record<string, unknown>): void {
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  useEffect(() => {
    const mountedAt = Date.now();
    return () => {
      posthog.capture(event, {
        duration_ms: Date.now() - mountedAt,
        ...propertiesRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Registers a panel as a PostHog screen: captures `$screen
    { $screen_name: name }` on mount — panel navigation lights up in
    PostHog's screen analytics. */
export function useScreen(name: string, properties?: Record<string, unknown>): void {
  useEffect(() => {
    posthog.screen(name, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
}

export interface EditorSessionOptions {
  /** Default "editor_session_start". */
  startEvent?: string;
  /** Default "editor_session_end". */
  endEvent?: string;
  /** Stamped on both events. */
  properties?: Record<string, unknown>;
}

/**
 * One line in App for editor-lifetime analytics: captures
 * `editor_session_start` on mount and `editor_session_end
 * { duration_ms }` on unmount — how long users keep your UI open.
 * The end event is flushed immediately (the editor is closing; the
 * batch timer would never fire).
 */
export function useEditorSession({
  startEvent = "editor_session_start",
  endEvent = "editor_session_end",
  properties,
}: EditorSessionOptions = {}): void {
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  useEffect(() => {
    const openedAt = Date.now();
    posthog.capture(startEvent, propertiesRef.current);
    return () => {
      posthog.capture(endEvent, {
        duration_ms: Date.now() - openedAt,
        ...propertiesRef.current,
      });
      posthog.flush();
    };
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
