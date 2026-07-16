import Reconciler from "react-reconciler";
import { LegacyRoot } from "react-reconciler/constants";
import type { ReactNode } from "react";
import { hostConfig } from "./hostConfig";
import { flushOps } from "./bridge";

const reconciler = Reconciler(hostConfig as any);

let container: ReturnType<typeof reconciler.createContainer> | null = null;

/** Mounts (or re-renders) the app into the plugin window. */
export function render(element: ReactNode): void {
  if (!container) {
    container = reconciler.createContainer(
      {},
      LegacyRoot,
      null,
      false,
      null,
      "vsreact",
      (error: unknown) => console.error("[vsreact] recoverable error:", error),
      null,
    );
  }

  reconciler.updateContainer(element, container, null, null);
  flushOps();
}

/** Unmounts the current app (used by hot reload teardown). */
export function unmount(): void {
  if (container) {
    reconciler.updateContainer(null, container, null, null);
    flushOps();
    container = null;
  }
}
