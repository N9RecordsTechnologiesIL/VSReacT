import { describe, expect, test } from "bun:test";
import { Easing, lerp } from "./animation";

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
