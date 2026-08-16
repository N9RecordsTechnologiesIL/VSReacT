// The knob faces are decoration around one shared gesture engine, and both
// halves are worth pinning: each variant must actually paint its signature
// geometry (a skin that silently renders nothing looks like a blank knob),
// and dragging any of them must still reach onChange.

import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};

import { render, unmount, Knob } from "./index";
import type { KnobVariant } from "./index";

const allOps = () => batches.flat() as any[];
const propsPayloads = () =>
  allOps()
    .filter((op) => op[0] === "setProps" || op[0] === "patchProps")
    .map((op) => op[2]);

beforeEach(() => {
  unmount();
  batches.length = 0;
});

/** True when any committed payload (or its style) satisfies the probe. */
const anyPayload = (probe: (payload: any) => boolean) => propsPayloads().some(probe);

describe("knob variants paint their signature geometry", () => {
  const signatures: Array<[KnobVariant, string, (p: any) => boolean]> = [
    [
      "instrument",
      "a rotating pointer over a radial cap",
      (p) => p?.style?.gradientType === "radial",
    ],
    [
      "gauge",
      "a fat butt-capped value stroke",
      (p) => p?.strokeWidth === 10 && p?.strokeCap === "butt",
    ],
    [
      "metal",
      "a knurled rim tiled with gradientRepeat",
      (p) => typeof p?.style?.gradientRepeat === "number" && p.style.gradientRepeat > 10,
    ],
    [
      "steel",
      "the 15-stop spun conic in backgroundLayers",
      (p) =>
        Array.isArray(p?.style?.backgroundLayers) &&
        p.style.backgroundLayers.some(
          (l: any) => l.gradientType === "conic" && l.gradientStops?.length === 15,
        ),
    ],
    [
      "glass",
      "a clipped wedge pointer",
      (p) => typeof p?.style?.clipPolygon === "string" && p.style.clipPolygon.includes("50% 100%"),
    ],
    [
      "chickenhead",
      "the pointer nose polygon",
      (p) => typeof p?.style?.clipPolygon === "string" && p.style.clipPolygon.includes("82%"),
    ],
    [
      "neon",
      "a ring of LED segments",
      (p) => typeof p?.style?.rotate === "number" && p?.style?.width === 3.5,
    ],
    [
      "blueprint",
      "the dashed construction circle",
      (p) => p?.strokeDash === "4 5",
    ],
  ];

  for (const [variant, what, probe] of signatures) {
    test(`${variant} paints ${what}`, () => {
      render(<Knob variant={variant} value={0.6} text="60%" size={64} onChange={() => {}} />);
      expect(anyPayload(probe)).toBe(true);
    });
  }

  test("the default stays the native arc — no face tree at all", () => {
    render(<Knob value={0.6} text="60%" size={64} onChange={() => {}} />);
    expect(anyPayload((p) => p?.style?.arcThickness !== undefined)).toBe(true);
    expect(anyPayload((p) => p?.style?.gradientType !== undefined)).toBe(false);
  });
});

describe("gestures are variant-independent", () => {
  test("dragging a steel knob writes onChange like the default", () => {
    const seen: number[] = [];
    render(<Knob variant="steel" value={0.5} size={64} onChange={(v) => seen.push(v)} />);

    const drag: any = allOps().find(
      (op) => op[0] === "setProps" && op[2]?.listeners?.includes("drag"),
    );
    expect(drag).toBeDefined();

    const dispatch = (globalThis as Record<string, any>).__vsreact_dispatch;
    dispatch(JSON.stringify({ kind: "event", nodeId: drag[1], type: "dragstart", payload: {} }));
    dispatch(
      JSON.stringify({ kind: "event", nodeId: drag[1], type: "drag", payload: { dx: 0, dy: -50 } }),
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBeGreaterThan(0.5);
  });

  test("the face itself takes no listeners — hits fall through to the knob", () => {
    render(<Knob variant="metal" value={0.5} size={64} onChange={() => {}} />);

    const withListeners = allOps().filter(
      (op) => op[0] === "setProps" && Array.isArray(op[2]?.listeners) && op[2].listeners.length > 0,
    );
    // Exactly one interactive node: the gesture container.
    expect(withListeners.length).toBe(1);
  });
});
