// The gain computer is the one piece of this example that exists twice — here
// and in Source/CompressorPlugin.cpp. These tests pin the behaviour the two
// have to agree on, so a change to either side that drifts from the shape
// below shows up as a failure rather than as a curve that quietly stops
// describing what you hear.

import { describe, expect, test } from "bun:test";
import { curvePath, gainComputerDb, outputDb, type CompressorSettings } from "./compressor";

const THRESHOLD = -18;
const RATIO = 4;
const KNEE = 6;

const gc = (input: number) => gainComputerDb(input, THRESHOLD, RATIO, KNEE);

const settings = (over: Partial<CompressorSettings> = {}): CompressorSettings => ({
  threshold: THRESHOLD,
  ratio: RATIO,
  knee: KNEE,
  makeup: 0,
  mix: 1,
  ...over,
});

describe("gain computer", () => {
  test("passes signal below the knee through untouched", () => {
    expect(gc(-40)).toBeCloseTo(-40, 6);
    expect(gc(-60)).toBeCloseTo(-60, 6);
  });

  test("applies the ratio above the knee", () => {
    // 18dB over threshold at 4:1 → 4.5dB over.
    expect(gc(0)).toBeCloseTo(THRESHOLD + 18 / RATIO, 6);
  });

  test("the knee joins both straight sections without a step", () => {
    const lower = THRESHOLD - KNEE / 2;
    const upper = THRESHOLD + KNEE / 2;

    // At the lower edge the curve must still be unity, at the upper edge it
    // must already be the hard-knee line — a discontinuity here is audible.
    expect(gc(lower)).toBeCloseTo(lower, 6);
    expect(gc(upper)).toBeCloseTo(THRESHOLD + (upper - THRESHOLD) / RATIO, 6);
  });

  test("is monotonic — louder in is never quieter out", () => {
    let previous = -Infinity;
    for (let db = -60; db <= 0; db += 0.5) {
      const out = gc(db);
      expect(out).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = out;
    }
  });

  test("a ratio of 1:1 is a bypass at any knee", () => {
    for (const knee of [0, 6, 24])
      for (const db of [-50, -18, -6, 0]) expect(gainComputerDb(db, THRESHOLD, 1, knee)).toBeCloseTo(db, 6);
  });

  test("a zero knee switches at the threshold exactly", () => {
    expect(gainComputerDb(THRESHOLD - 0.01, THRESHOLD, RATIO, 0)).toBeCloseTo(THRESHOLD - 0.01, 6);
    expect(gainComputerDb(THRESHOLD + 4, THRESHOLD, RATIO, 0)).toBeCloseTo(THRESHOLD + 1, 6);
  });
});

describe("what actually leaves the plugin", () => {
  test("makeup lifts the whole curve", () => {
    expect(outputDb(-40, settings({ makeup: 6 }))).toBeCloseTo(-34, 6);
    expect(outputDb(0, settings({ makeup: 6 }))).toBeCloseTo(gc(0) + 6, 6);
  });

  test("fully dry is a bypass, whatever the other settings say", () => {
    for (const db of [-50, -10, 0])
      expect(outputDb(db, settings({ mix: 0, makeup: 12 }))).toBeCloseTo(db, 6);
  });

  test("half mix lands between dry and fully compressed", () => {
    const dry = 0;
    const wet = outputDb(0, settings());
    const half = outputDb(0, settings({ mix: 0.5 }));

    expect(half).toBeGreaterThan(wet);
    expect(half).toBeLessThan(dry);
  });
});

describe("curvePath", () => {
  test("starts at the bottom-left corner and stays inside the box", () => {
    const options = { minDb: -60, maxDb: 0, size: 100 };
    const path = curvePath(settings(), options);

    expect(path.startsWith("M0.00 100.00")).toBe(true);

    for (const [, x, y] of path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)) {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(x)).toBeLessThanOrEqual(100);
      expect(Number(y)).toBeGreaterThanOrEqual(0);
      expect(Number(y)).toBeLessThanOrEqual(100);
    }
  });

  test("an extreme makeup bends the line instead of escaping the frame", () => {
    const options = { minDb: -60, maxDb: 0, size: 100 };
    const path = curvePath(settings({ makeup: 24 }), options);

    for (const [, , y] of path.matchAll(/[ML]([\d.]+) ([\d.]+)/g))
      expect(Number(y)).toBeGreaterThanOrEqual(0);
  });
});
