// Convenience hooks over the native bridge.

import { useEffect, useRef } from "react";
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
