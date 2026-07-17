import Reconciler from "react-reconciler";
import { LegacyRoot } from "react-reconciler/constants";
import type { ReactNode } from "react";
import { hostConfig } from "./hostConfig";
import { flushOps } from "./bridge";
import { OverlayLayer } from "./overlay";

const reconciler = Reconciler(hostConfig as any);

let container: ReturnType<typeof reconciler.createContainer> | null = null;

/** Mounts (or re-renders) the app into the plugin window. The overlay
    layer (menus, tooltips) mounts after the app so it paints on top. */
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

  reconciler.updateContainer(
    <>
      {element}
      <OverlayLayer />
    </>,
    container,
    null,
    null,
  );
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
