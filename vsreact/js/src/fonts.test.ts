import { beforeEach, describe, expect, test } from "bun:test";

const calls: Array<[string, string, number]> = [];
(globalThis as Record<string, any>).__vsreact_registerFont = (
  family: string,
  src: string,
  weight: number,
) => calls.push([family, src, weight]);

import { registerFont } from "./index";

beforeEach(() => {
  calls.length = 0;
});

describe("registerFont", () => {
  test("forwards family, src and a numeric weight to the native binding", () => {
    registerFont({ family: "DrumDeck Narrow", src: "data:font/otf;base64,AAAA" });
    expect(calls).toEqual([["DrumDeck Narrow", "data:font/otf;base64,AAAA", 400]]);
  });

  test("maps 'bold' to 700 and passes a numeric weight through", () => {
    registerFont({ family: "F", src: "p.otf", weight: "bold" });
    registerFont({ family: "F", src: "p.otf", weight: 300 });
    expect(calls[0][2]).toBe(700);
    expect(calls[1][2]).toBe(300);
  });

  test("rejects an empty family or src", () => {
    expect(() => registerFont({ family: "", src: "x" })).toThrow();
    expect(() => registerFont({ family: "X", src: "" })).toThrow();
  });
});
