// The natural-range metadata the ParameterBridge ships (min/max/skew) and the
// TS twins of JUCE's NormalisableRange conversions. These exist so no UI ever
// mirrors an APVTS range in TS again — mirrored constants drift.

import { beforeEach, describe, expect, test } from "bun:test";

const g = globalThis as Record<string, any>;
const batches: unknown[][][] = [];
g.__vsreact_flush = (json: string) => batches.push(JSON.parse(json));

import { render, unmount, Text, useParameter } from "./index";
import { normalizedToNatural, naturalToNormalized, type ParameterRange } from "./parameters";

beforeEach(() => {
  unmount();
  batches.length = 0;
});

const linear = (min: number, max: number): ParameterRange => ({
  min, max, interval: 0, skew: 1, symmetricSkew: false,
});

describe("normalizedToNatural / naturalToNormalized", () => {
  test("linear ranges map proportionally (the delay's 1..1000 ms)", () => {
    const ms = linear(1, 1000);
    expect(normalizedToNatural(0, ms)).toBe(1);
    expect(normalizedToNatural(1, ms)).toBe(1000);
    expect(normalizedToNatural(0.5, ms)).toBeCloseTo(500.5, 4);
    expect(naturalToNormalized(347, ms)).toBeCloseTo((347 - 1) / 999, 6);
  });

  test("out-of-range input clamps instead of extrapolating", () => {
    const r = linear(0, 100);
    expect(normalizedToNatural(-0.5, r)).toBe(0);
    expect(normalizedToNatural(1.5, r)).toBe(100);
    expect(naturalToNormalized(-10, r)).toBe(0);
    expect(naturalToNormalized(500, r)).toBe(1);
  });

  test("skew matches JUCE's convertFrom0to1 (proportion^(1/skew))", () => {
    // NormalisableRange<float>(20, 20000, 1, 0.3): at norm 0.5 JUCE computes
    // 20 + 19980 * exp(log(0.5)/0.3).
    const freq: ParameterRange = { min: 20, max: 20000, interval: 1, skew: 0.3, symmetricSkew: false };
    const expected = 20 + 19980 * Math.exp(Math.log(0.5) / 0.3);

    expect(normalizedToNatural(0.5, freq)).toBeCloseTo(expected, 6);
    expect(normalizedToNatural(0, freq)).toBe(20);
    expect(normalizedToNatural(1, freq)).toBe(20000);
  });

  test("skewed conversions round-trip", () => {
    const freq: ParameterRange = { min: 20, max: 20000, interval: 0, skew: 0.3, symmetricSkew: false };

    for (const norm of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
      expect(naturalToNormalized(normalizedToNatural(norm, freq), freq)).toBeCloseTo(norm, 6);
    }
  });

  test("a degenerate range (min == max) never divides by zero", () => {
    const flat = linear(5, 5);
    expect(naturalToNormalized(5, flat)).toBe(0);
    expect(normalizedToNatural(0.5, flat)).toBe(5);
  });

  test("symmetricSkew is documented as unsupported: it degrades to linear", () => {
    const sym: ParameterRange = { min: -1, max: 1, interval: 0, skew: 0.5, symmetricSkew: true };
    expect(normalizedToNatural(0.5, sym)).toBeCloseTo(0, 6);
    expect(naturalToNormalized(0, sym)).toBeCloseTo(0.5, 6);
  });
});

describe("useParameter metadata plumbing", () => {
  test("param:get metadata lands on the handle; absence degrades to identity", () => {
    g.__vsreact_nativeCall = (name: string, argsJson: string) => {
      const args = JSON.parse(argsJson);
      if (name !== "param:get") return "null";
      if (args.id === "freq")
        return JSON.stringify({
          value: 0.5, text: "1 kHz", name: "Freq", label: "Hz", defaultValue: 0.25,
          min: 20, max: 20000, interval: 1, skew: 0.3, symmetricSkew: false,
        });
      // An old native side: no range keys at all.
      return JSON.stringify({ value: 0.5, text: "", name: "Old", label: "", defaultValue: 0 });
    };

    const seen: Record<string, any> = {};

    function Probe({ id }: { id: string }) {
      const p = useParameter(id);
      seen[id] = { min: p.min, max: p.max, skew: p.skew, interval: p.interval };
      return <Text>{p.text}</Text>;
    }

    render(<Probe id="freq" />);
    unmount();
    render(<Probe id="legacy" />);
    unmount();

    expect(seen.freq).toEqual({ min: 20, max: 20000, skew: 0.3, interval: 1 });
    expect(seen.legacy).toEqual({ min: 0, max: 1, skew: 1, interval: 0 });
  });
});
