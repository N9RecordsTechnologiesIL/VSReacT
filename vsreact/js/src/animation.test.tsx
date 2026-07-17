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
