// App-level messaging with the C++ host.

import { addNativeListener, type EventHandler } from "./bridge";

export const native = {
  /** Synchronously invokes a C++ handler registered in RootOptions.onNativeCall. */
  call(name: string, args?: unknown): any {
    const fn = (globalThis as Record<string, any>).__vsreact_nativeCall;
    if (typeof fn !== "function") return undefined;
    const json = fn(name, JSON.stringify(args ?? null));
    return json ? JSON.parse(json) : undefined;
  },

  /** Subscribes to events pushed from C++ via RootView::sendNativeEvent. */
  on(name: string, cb: (payload: any) => void): () => void {
    return addNativeListener(name, cb as EventHandler);
  },
};
