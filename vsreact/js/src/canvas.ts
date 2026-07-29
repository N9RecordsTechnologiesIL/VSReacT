// A raster escape hatch. `draw` writes RGBA into a buffer that aliases
// C++-owned memory (no serialization), then the pixels are committed and the
// node repaints. The node is sized by className/style like any View; `width`
// and `height` are the pixel-buffer dimensions (set them to CSS size ×
// device-pixel-ratio for a crisp result).

import { createElement, useLayoutEffect, useRef } from "react";
import type { CommonProps } from "./primitives";

export function getCanvasBuffer(nodeId: number, width: number, height: number): Uint8ClampedArray | null {
  const fn = (globalThis as Record<string, any>).__vsreact_canvasBuffer;
  if (typeof fn !== "function") return null;
  const ab = fn(nodeId, width, height) as ArrayBuffer | null | undefined;
  return ab ? new Uint8ClampedArray(ab) : null;
}

export function commitCanvas(nodeId: number): void {
  (globalThis as Record<string, any>).__vsreact_canvasCommit?.(nodeId);
}

export interface CanvasProps extends CommonProps {
  /** Pixel-buffer width. */
  width: number;
  /** Pixel-buffer height. */
  height: number;
  /** Fills the RGBA buffer (4 bytes/pixel, row-major). */
  draw: (pixels: Uint8ClampedArray, width: number, height: number) => void;
  /** Redraw when any of these change (width/height are always included). */
  deps?: unknown[];
}

export function Canvas({ width, height, draw, deps = [], ...rest }: CanvasProps) {
  const ref = useRef<{ id: number } | null>(null);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  // Layout effect (not passive): runs synchronously after the host node's
  // create op has flushed, so the native node exists when we ask for its
  // buffer — and it's deterministic under bun test.
  useLayoutEffect(() => {
    const id = ref.current?.id;
    if (id == null) return;
    const pixels = getCanvasBuffer(id, w, h);
    if (!pixels) return;
    draw(pixels, w, h);
    commitCanvas(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, ...deps]);

  return createElement("vs-canvas", { ...rest, ref });
}
