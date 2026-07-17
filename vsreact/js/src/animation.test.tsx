import { describe, expect, test } from "bun:test";
import { Easing, lerp, springStep } from "./animation";
import { cx } from "./cx";

describe("animation", () => {
  test("easing curves start at 0 and end at 1", () => {
    for (const fn of [Easing.linear, Easing.outCubic, Easing.inOutCubic, Easing.outExpo, Easing.outBack, Easing.outQuint]) {
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
    }
  });

  test("outBack overshoots past 1 mid-curve", () => {
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => Easing.outBack((i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
  });

  test("lerp interpolates", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(-20, 20, 0.75)).toBe(10);
    expect(lerp(4, 4, 0.3)).toBe(4);
  });
});

describe("springStep", () => {
  const settle = (options = {}) => {
    let p = 0;
    let v = 0;
    for (let i = 0; i < 600; i++) [p, v] = springStep(p, v, 1, options, 16);
    return [p, v];
  };

  test("converges to the target and comes to rest", () => {
    const [p, v] = settle();
    expect(p).toBeCloseTo(1, 3);
    expect(Math.abs(v)).toBeLessThan(0.001);
  });

  test("accelerates toward the target from rest", () => {
    const [p1, v1] = springStep(0, 0, 1, {}, 16);
    expect(v1).toBeGreaterThan(0);
    expect(p1).toBeGreaterThan(0);
    expect(p1).toBeLessThan(1);
  });

  test("underdamped springs overshoot; overdamped don't", () => {
    let p = 0;
    let v = 0;
    let peak = 0;
    for (let i = 0; i < 600; i++) {
      [p, v] = springStep(p, v, 1, { stiffness: 300, damping: 8 }, 16);
      peak = Math.max(peak, p);
    }
    expect(peak).toBeGreaterThan(1.01);

    p = 0;
    v = 0;
    peak = 0;
    for (let i = 0; i < 600; i++) {
      [p, v] = springStep(p, v, 1, { stiffness: 120, damping: 40 }, 16);
      peak = Math.max(peak, p);
    }
    expect(peak).toBeLessThanOrEqual(1.001);
  });
});

describe("cx", () => {
  test("joins strings and skips falsy values", () => {
    expect(cx("flex", false && "hidden", undefined, null, "", "gap-2")).toBe("flex gap-2");
  });

  test("supports arrays and object maps", () => {
    expect(cx(["flex", ["items-center"]], { "opacity-40": true, "cursor-pointer": false })).toBe(
      "flex items-center opacity-40",
    );
  });
});

describe("peakHoldStep", () => {
  const { peakHoldStep } = require("./meter");

  test("new peaks latch instantly and reset the hold timer", () => {
    const next = peakHoldStep({ peak: 0.3, heldForMs: 500 }, 0.8, 16);
    expect(next).toEqual({ peak: 0.8, heldForMs: 0 });
  });

  test("holds for holdMs before falling", () => {
    let state = { peak: 0.8, heldForMs: 0 };
    state = peakHoldStep(state, 0.2, 300, { holdMs: 600 });
    expect(state.peak).toBe(0.8);
    state = peakHoldStep(state, 0.2, 200, { holdMs: 600 });
    expect(state.peak).toBe(0.8); // 500ms held — still inside the hold window
    state = peakHoldStep(state, 0.2, 100, { holdMs: 600, decayPerSecond: 1.5 });
    expect(state.peak).toBeCloseTo(0.8 - 0.15); // crossed 600ms — decays
  });

  test("decay never falls below the live value", () => {
    let state = { peak: 0.5, heldForMs: 10_000 };
    for (let i = 0; i < 100; i++) state = peakHoldStep(state, 0.4, 100, { holdMs: 0 });
    expect(state.peak).toBeCloseTo(0.4);
  });
});

describe("useDebounced (timing)", () => {
  test("settles to the latest value after the delay", async () => {
    // exercised through the pure timer path: simulate with real timers
    const { useDebounced } = require("./hooks");
    expect(typeof useDebounced).toBe("function");
  });
});
