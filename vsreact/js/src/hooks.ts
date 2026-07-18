// Convenience hooks over the native bridge.

import { useEffect, useRef, useState } from "react";
import { native } from "./native";
import type { LayoutRect } from "./primitives";

/**
 * Captures a node's root-space rect from its onLayout prop:
 *
 *   const [rect, onLayout] = useLayoutRect();
 *   <View onLayout={onLayout} />   // rect updates whenever layout moves it
 */
export function useLayoutRect(): [LayoutRect | null, (rect: LayoutRect) => void] {
  const [rect, setRect] = useState<LayoutRect | null>(null);
  return [rect, setRect];
}

/**
 * Subscribes to a C++ event (RootView::sendNativeEvent) for the lifetime
 * of the component. The handler can close over fresh state — it is kept
 * current without resubscribing.
 *
 *   useNativeEvent("download:progress", (p) => setProgress(p.ratio));
 */
export function useNativeEvent(name: string, handler: (payload: any) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => native.on(name, (payload) => handlerRef.current(payload)), [name]);
}

/**
 * The latest payload of a C++ event, held as state — the one-liner for
 * native → UI data feeds:
 *
 *   const meter = useNativeValue("meter", { level: 0 });
 *   <Meter value={meter.level} />
 */
export function useNativeValue<T = any>(name: string, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useNativeEvent(name, setValue);
  return value;
}

export interface RootSize {
  width: number;
  height: number;
}

/**
 * The editor's current size. The native side sends a "resize" event at
 * mount (so this resolves on the first committed frame) and on every
 * host resize — the foundation for resizable editors.
 */
export function useRootSize(): RootSize {
  const [size, setSize] = useState<RootSize>({ width: 0, height: 0 });

  useNativeEvent("resize", (payload) => {
    const width = Number(payload?.width);
    const height = Number(payload?.height);

    if (Number.isFinite(width) && Number.isFinite(height))
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
  });

  return size;
}

/**
 * The value, but only after it has stopped changing for `delayMs` —
 * classic input debouncing for expensive native calls:
 *
 *   const query = useDebounced(text, 250);
 *   useEffect(() => { native.call("library:search", { query }); }, [query]);
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

/** The value, updated at most once per `intervalMs` (leading + trailing). */
export function useThrottled<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRun = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastRun.current;

    if (elapsed >= intervalMs) {
      lastRun.current = now;
      setThrottled(value);
      return;
    }

    const id = setTimeout(() => {
      lastRun.current = Date.now();
      setThrottled(value);
    }, intervalMs - elapsed);
    return () => clearTimeout(id);
  }, [value, intervalMs]);

  return throttled;
}

/** The value from the previous render — undefined on the first one. */
export function usePrevious<T>(value: T): T | undefined {
  const previous = useRef<T | undefined>(undefined);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  return previous.current;
}

/** Boolean state with a stable toggle — bypass buttons, panels, A/B. */
export function useToggle(initial = false): [boolean, () => void, (next: boolean) => void] {
  const [on, setOn] = useState(initial);
  const toggle = useRef(() => setOn((v) => !v)).current;
  return [on, toggle, setOn];
}

/** A declarative interval on the host scheduler; null pauses it. The
    callback stays fresh without restarting the timer. */
export function useInterval(callback: () => void, intervalMs: number | null): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (intervalMs === null) return;
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

/** Hover state + the props that drive it:
    `const [hovered, hoverProps] = useHover(); <View {...hoverProps}>` */
export function useHover(): [
  boolean,
  { onMouseEnter: () => void; onMouseLeave: () => void },
] {
  const [hovered, setHovered] = useState(false);
  const props = useRef({
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }).current;

  return [hovered, props];
}
