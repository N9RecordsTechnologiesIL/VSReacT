import { describe, expect, test } from "bun:test";
import { frameForRotation, type KnobStrip } from "./filmstrip";

const strip: KnobStrip = { size: 120, frames: 181, sweepDegrees: 270, dataUri: "" };

describe("frameForRotation", () => {
  test("maps the sweep endpoints to the first and last frame", () => {
    expect(frameForRotation(-135, strip)).toBe(0);
    expect(frameForRotation(135, strip)).toBe(180);
  });

  test("maps centre to the middle frame", () => {
    expect(frameForRotation(0, strip)).toBe(90);
  });

  test("clamps out-of-range rotation instead of indexing past the strip", () => {
    expect(frameForRotation(-999, strip)).toBe(0);
    expect(frameForRotation(999, strip)).toBe(180);
  });

  test("never returns a fractional or out-of-bounds index", () => {
    for (let deg = -200; deg <= 200; deg += 7) {
      const f = frameForRotation(deg, strip);
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(strip.frames - 1);
    }
  });
});
