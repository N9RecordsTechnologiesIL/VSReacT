// Convenience hooks over the native bridge.

import { useEffect, useRef, useState } from "react";
import { native } from "./native";

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
