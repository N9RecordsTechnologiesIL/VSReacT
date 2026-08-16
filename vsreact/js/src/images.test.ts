import { afterEach, describe, expect, test } from "bun:test";

const g = globalThis as Record<string, any>;

afterEach(() => {
  delete g.__vsreact_registerImage;
});

describe("registerImage", () => {
  test("interns through the binding and dedupes repeat calls", async () => {
    let calls = 0;
    g.__vsreact_registerImage = (_src: string) => {
      calls += 1;
      return `img:${calls}`;
    };

    // Fresh module instance so the memo map starts empty.
    const { registerImage } = await import(`./images.ts?dedupe-${Date.now()}`);

    const uri = "data:image/webp;base64," + "Q".repeat(64);
    expect(registerImage(uri)).toBe("img:1");
    expect(registerImage(uri)).toBe("img:1"); // memoised — no second bridge call
    expect(calls).toBe(1);

    expect(registerImage("other.webp")).toBe("img:2");
  });

  test("falls back to the raw src on an old native side, and memoises that too", async () => {
    const { registerImage } = await import(`./images.ts?fallback-${Date.now()}`);

    const uri = "data:image/png;base64,AAAA";
    expect(registerImage(uri)).toBe(uri); // no binding → the URI still paints

    // A failed native decode (empty handle) also degrades to the raw src.
    g.__vsreact_registerImage = () => "";
    expect(registerImage("bad.webp")).toBe("bad.webp");
  });

  test("rejects an empty source", async () => {
    const { registerImage } = await import(`./images.ts?reject-${Date.now()}`);
    expect(() => registerImage("")).toThrow();
  });
});
