import { describe, expect, test } from "bun:test";
import { resolveEasing } from "./transitions";

describe("resolveEasing", () => {
  test("keeps the named easings working", () => {
    expect(resolveEasing("linear")(0.5)).toBe(0.5);
    expect(resolveEasing("linear")(0)).toBe(0);
    expect(resolveEasing("linear")(1)).toBe(1);
    // ease-in is a cubic ramp (t^3): stays below the diagonal early.
    expect(resolveEasing("ease-in")(0.5)).toBeLessThan(0.5);
    // ease-out rises fast then flattens: above the diagonal early.
    expect(resolveEasing("ease-out")(0.5)).toBeGreaterThan(0.5);
    // ease-in-out is symmetric about 0.5.
    expect(resolveEasing("ease-in-out")(0.5)).toBeCloseTo(0.5, 5);
  });

  test("cubic-bezier(0,0,1,1) is the identity (linear)", () => {
    const e = resolveEasing("cubic-bezier(0,0,1,1)");
    expect(e(0)).toBeCloseTo(0, 5);
    expect(e(0.25)).toBeCloseTo(0.25, 3);
    expect(e(0.5)).toBeCloseTo(0.5, 3);
    expect(e(0.75)).toBeCloseTo(0.75, 3);
    expect(e(1)).toBeCloseTo(1, 5);
  });

  test("a fast-start ease sits below the diagonal early", () => {
    // cubic-bezier(0.42,0,1,1) == CSS "ease-in": slow start, so y < x for x<1.
    const e = resolveEasing("cubic-bezier(0.42,0,1,1)");
    expect(e(0.5)).toBeLessThan(0.5);
    expect(e(0.25)).toBeLessThan(0.25);
  });

  test("endpoints always map to 0 and 1", () => {
    for (const spec of [
      "cubic-bezier(0.42,0,0.58,1)",
      "cubic-bezier(0.25,0.1,0.25,1)",
      "cubic-bezier(0.42,0,1,1)",
      "cubic-bezier(0,0,1,1)",
    ]) {
      const e = resolveEasing(spec);
      expect(e(0)).toBeCloseTo(0, 6);
      expect(e(1)).toBeCloseTo(1, 6);
    }
  });

  test("standard ease is symmetric and monotonic across the range", () => {
    const e = resolveEasing("cubic-bezier(0.42,0,0.58,1)"); // CSS "ease-in-out"
    expect(e(0.5)).toBeCloseTo(0.5, 3);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const y = e(i / 20);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = y;
    }
  });

  test("garbage strings fall back to ease-in-out without throwing", () => {
    const fallback = resolveEasing("ease-in-out");
    for (const junk of ["", "nope", "cubic-bezier()", "cubic-bezier(0,0,1)", "cubic-bezier(a,b,c,d)"]) {
      let e: (t: number) => number;
      expect(() => (e = resolveEasing(junk))).not.toThrow();
      expect(e!(0)).toBeCloseTo(0, 5);
      expect(e!(1)).toBeCloseTo(1, 5);
      expect(e!(0.5)).toBeCloseTo(fallback(0.5), 5);
    }
  });

  test("returns the same cached function for a repeated spec", () => {
    const spec = "cubic-bezier(0.17,0.67,0.83,0.67)";
    expect(resolveEasing(spec)).toBe(resolveEasing(spec));
  });
});
