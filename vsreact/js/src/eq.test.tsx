import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
(globalThis as Record<string, any>).__vsreact_nativeCall = () => "null";

import {
  render,
  unmount,
  EQCurve,
  RingMeter,
  biquadMagnitudeDb,
  eqResponseDb,
  eqXToHz,
  eqHzToX,
  type EQBand,
} from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

const nodesWithListener = (type: string): number[] => {
  const seen = new Set<number>();
  for (const op of opsNamed("setProps") as any[]) {
    if (op[2]?.listeners?.includes(type)) seen.add(op[1]);
  }
  return [...seen];
};

beforeEach(() => {
  unmount();
  batches.length = 0;
});

describe("biquad math", () => {
  test("a peak band boosts by its gain at the center frequency", () => {
    const band: EQBand = { type: "peak", freq: 1000, gainDb: 6, q: 1 };
    expect(biquadMagnitudeDb(band, 1000)).toBeCloseTo(6, 1);
    expect(Math.abs(biquadMagnitudeDb(band, 40))).toBeLessThan(0.5); // far away ≈ flat
  });

  test("zero gain is flat; a lowpass rolls off the highs", () => {
    expect(biquadMagnitudeDb({ type: "peak", freq: 1000, gainDb: 0, q: 1 }, 500)).toBeCloseTo(0, 3);

    const lp: EQBand = { type: "lowpass", freq: 1000, q: 0.71 };
    expect(biquadMagnitudeDb(lp, 100)).toBeCloseTo(0, 1);
    expect(biquadMagnitudeDb(lp, 10000)).toBeLessThan(-30);
  });

  test("eqResponseDb sums bands; the log scale maps both ways", () => {
    const bands: EQBand[] = [
      { type: "peak", freq: 1000, gainDb: 6, q: 1 },
      { type: "peak", freq: 1000, gainDb: -2, q: 1 },
    ];
    expect(eqResponseDb(bands, 1000)).toBeCloseTo(4, 1);

    expect(eqXToHz(0)).toBeCloseTo(20);
    expect(eqXToHz(1)).toBeCloseTo(20000);
    expect(eqHzToX(eqXToHz(0.5))).toBeCloseTo(0.5);
  });
});

describe("EQCurve", () => {
  const bands: EQBand[] = [
    { type: "lowshelf", freq: 120, gainDb: 3, q: 0.71 },
    { type: "peak", freq: 1800, gainDb: -4, q: 1.2 },
  ];

  test("dragging a node reports new freq and gain", () => {
    const seen: Array<[number, EQBand]> = [];
    render(
      <EQCurve bands={bands} width={200} height={100} dbRange={18} onChange={(i, b) => seen.push([i, b])} />,
    );

    const nodes = nodesWithListener("drag");
    expect(nodes).toHaveLength(2);

    dispatch({ kind: "event", nodeId: nodes[1], type: "dragstart", payload: { dx: 0, dy: 0 } });
    dispatch({ kind: "event", nodeId: nodes[1], type: "drag", payload: { dx: 0, dy: -23 } });

    const [index, band] = seen.at(-1)!;
    expect(index).toBe(1);
    expect(band.freq).toBe(1800); // no horizontal movement
    // dy -23 over (mid-4)=46 → +9 dB from -4 → +5
    expect(band.gainDb).toBeCloseTo(5, 1);
  });

  test("the wheel adjusts Q inside a begin/end pair", () => {
    const seen: EQBand[] = [];
    const gestures: string[] = [];
    render(
      <EQCurve
        bands={bands}
        onChange={(_i, b) => seen.push(b)}
        onBegin={() => gestures.push("begin")}
        onEnd={() => gestures.push("end")}
      />,
    );

    const nodes = nodesWithListener("wheel");
    dispatch({ kind: "event", nodeId: nodes[0], type: "wheel", payload: { dy: 0.1 } });

    expect(seen.at(-1)?.q).toBeCloseTo(0.71 * Math.exp(0.14), 3);
    expect(gestures).toEqual(["begin", "end"]);
  });
});

describe("RingMeter", () => {
  test("the value arc sweeps to the level; hot overlay appears above hotFrom", () => {
    render(<RingMeter value={0.95} hotFrom={0.85} />);

    const arcs = (opsNamed("setProps") as any[])
      .map((op) => op[2]?.style)
      .filter((s) => s && typeof s.arcValueEnd === "number");
    expect(arcs.length).toBeGreaterThanOrEqual(2);

    const base = arcs.find((s) => s.arcValueEnd === -135 + 270 * 0.85);
    const hot = arcs.find((s) => Math.abs(s.arcValueEnd - (-135 + 270 * 0.95)) < 0.001);
    expect(base).toBeDefined();
    expect(hot).toBeDefined();
  });
});
