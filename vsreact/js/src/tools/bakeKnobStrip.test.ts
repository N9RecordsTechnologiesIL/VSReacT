import { describe, expect, test } from "bun:test";
import { renderKnobFrames, frameAngle, ROTATION_SWEEP } from "./bakeKnobStrip";

describe("renderKnobFrames", () => {
  test("produces frames*size*size*4 RGBA bytes", () => {
    const px = renderKnobFrames(8, 3);
    expect(px.length).toBe(3 * 8 * 8 * 4);
  });

  test("disc centre is opaque, corner is transparent", () => {
    const size = 16;
    const px = renderKnobFrames(size, 1);
    const centre = ((size / 2) * size + size / 2) * 4;
    expect(px[centre + 3]).toBeGreaterThan(0);
    expect(px[0 * 4 + 3]).toBe(0); // top-left corner sits outside the r<=1 disc
  });

  test("different frames shade differently (rotation actually applied)", () => {
    const size = 24;
    const px = renderKnobFrames(size, 2);
    const frameBytes = size * size * 4;
    const a = px.slice(0, frameBytes);
    const b = px.slice(frameBytes, frameBytes * 2);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("frameAngle", () => {
  test("spans the sweep symmetrically about zero", () => {
    expect(frameAngle(0, 181)).toBeCloseTo(-ROTATION_SWEEP / 2, 6);
    expect(frameAngle(180, 181)).toBeCloseTo(ROTATION_SWEEP / 2, 6);
    expect(frameAngle(90, 181)).toBeCloseTo(0, 6);
  });

  test("a single frame is the centre of the sweep", () => {
    expect(frameAngle(0, 1)).toBe(0);
  });
});
