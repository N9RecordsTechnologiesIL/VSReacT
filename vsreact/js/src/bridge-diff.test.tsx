// Key-granular prop sending: a node's first props cross the bridge whole
// (setProps); after that only the top-level keys that changed cross
// (patchProps), a dropped key travels as null, and a re-render that changed
// nothing sends nothing. The point: a style tweak on an <Image> must never
// re-ship its multi-megabyte src.

import { beforeEach, describe, expect, test } from "bun:test";
import { useState } from "react";

const batches: unknown[][][] = [];
(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};

import { render, unmount, View, Image } from "./index";
import { diffPayload, payloadValueEquals } from "./transitions";
import { resetProtocolWarnings } from "./protocol";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);

beforeEach(() => {
  unmount();
  batches.length = 0;
});

const BIG_SRC = "data:image/png;base64," + "A".repeat(4096);

describe("payloadValueEquals / diffPayload", () => {
  test("equality is structural for style objects and arrays", () => {
    expect(payloadValueEquals({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toBe(true);
    expect(payloadValueEquals({ a: 1 }, { a: 2 })).toBe(false);
    expect(payloadValueEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(payloadValueEquals([{ color: "#fff", radius: 3 }], [{ color: "#fff", radius: 3 }])).toBe(true);
    expect(payloadValueEquals([1, 2], [2, 1])).toBe(false);
    expect(payloadValueEquals(null, {})).toBe(false);
  });

  test("diffPayload returns only changed keys, null for dropped ones, undefined for no change", () => {
    const prev = { src: BIG_SRC, cursor: "pointer", style: { width: 10 } };

    expect(diffPayload(prev, { ...prev })).toBeUndefined();
    expect(diffPayload(prev, { src: BIG_SRC, cursor: "pointer", style: { width: 20 } })).toEqual({
      style: { width: 20 },
    });
    expect(diffPayload(prev, { src: BIG_SRC, style: { width: 10 } })).toEqual({ cursor: null });
  });
});

describe("bridge sends", () => {
  test("first commit is a full setProps; a style re-render patches style only", () => {
    function Panel() {
      const [w, setW] = useState(100);
      return (
        <View onClick={() => setW(120)}>
          <Image src={BIG_SRC} style={{ width: w, height: 50 }} />
        </View>
      );
    }

    render(<Panel />);

    const initial: any = opsNamed("setProps").find((op: any) => op[2]?.src === BIG_SRC);
    expect(initial).toBeDefined();

    const clickable: any = opsNamed("setProps").find((op: any) =>
      op[2]?.listeners?.includes("click"),
    );
    batches.length = 0;

    (globalThis as Record<string, any>).__vsreact_dispatch(
      JSON.stringify({ kind: "event", nodeId: clickable[1], type: "click" }),
    );

    const patches = opsNamed("patchProps");
    const imagePatch: any = patches.find((op: any) => op[1] === initial[1]);
    expect(imagePatch).toBeDefined();
    expect(imagePatch[2].style.width).toBe(120);
    // The whole point: the unchanged big src does not ride along.
    expect("src" in imagePatch[2]).toBe(false);
    // And nothing re-sends full props for this node.
    expect(opsNamed("setProps").filter((op: any) => op[1] === initial[1]).length).toBe(0);
  });

  test("a re-render that changes nothing sends nothing for that node", () => {
    function Panel() {
      const [, bump] = useState(0);
      return (
        <View onClick={() => bump((n) => n + 1)}>
          <Image src={BIG_SRC} style={{ width: 64, height: 64 }} />
        </View>
      );
    }

    render(<Panel />);
    const image: any = opsNamed("setProps").find((op: any) => op[2]?.src === BIG_SRC);
    const clickable: any = opsNamed("setProps").find((op: any) =>
      op[2]?.listeners?.includes("click"),
    );
    batches.length = 0;

    (globalThis as Record<string, any>).__vsreact_dispatch(
      JSON.stringify({ kind: "event", nodeId: clickable[1], type: "click" }),
    );

    const forImage = allOps().filter(
      (op: any) => (op[0] === "setProps" || op[0] === "patchProps") && op[1] === image[1],
    );
    expect(forImage.length).toBe(0);
  });

  test("a node that unmounts and a new one at the same position starts with full setProps", () => {
    function Swap() {
      const [on, setOn] = useState(true);
      return (
        <View onClick={() => setOn(false)}>
          {on ? <View style={{ width: 1 }} /> : <Image src={BIG_SRC} style={{ width: 2 }} />}
        </View>
      );
    }

    render(<Swap />);
    const clickable: any = opsNamed("setProps").find((op: any) =>
      op[2]?.listeners?.includes("click"),
    );
    batches.length = 0;

    (globalThis as Record<string, any>).__vsreact_dispatch(
      JSON.stringify({ kind: "event", nodeId: clickable[1], type: "click" }),
    );

    const fresh: any = opsNamed("setProps").find((op: any) => op[2]?.src === BIG_SRC);
    expect(fresh).toBeDefined(); // full props, not a patch against a dead node
  });

  test("against a pre-2 module, updates fall back to complete setProps", () => {
    // A module that predates patchProps drops it silently in Release, which
    // would freeze the UI after frame one. The fallback costs bandwidth (the
    // big src rides along again) and keeps the UI live — the right trade.
    const g = globalThis as Record<string, any>;
    g.__vsreact_protocol = 1;
    resetProtocolWarnings();
    const realWarn = console.warn;
    console.warn = () => {};

    try {
      function Panel() {
        const [w, setW] = useState(100);
        return (
          <View onClick={() => setW(120)}>
            <Image src={BIG_SRC} style={{ width: w, height: 50 }} />
          </View>
        );
      }

      render(<Panel />);
      const initial: any = opsNamed("setProps").find((op: any) => op[2]?.src === BIG_SRC);
      const clickable: any = opsNamed("setProps").find((op: any) =>
        op[2]?.listeners?.includes("click"),
      );
      batches.length = 0;

      g.__vsreact_dispatch(JSON.stringify({ kind: "event", nodeId: clickable[1], type: "click" }));

      expect(opsNamed("patchProps")).toHaveLength(0);

      const replaced: any = opsNamed("setProps").find((op: any) => op[1] === initial[1]);
      expect(replaced).toBeDefined();
      expect(replaced[2].style.width).toBe(120);
      // Complete, because setProps replaces rather than merges on the C++ side.
      expect(replaced[2].src).toBe(BIG_SRC);
    } finally {
      console.warn = realWarn;
      delete g.__vsreact_protocol;
      resetProtocolWarnings();
    }
  });
});
