import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const nativeCalls: Array<[string, string]> = [];

// __vsreact_flush and __vsreact_nativeCall are shared globals other suites also
// stub. Claim them per-test and restore afterwards so file execution order
// can't cross-contaminate (mirrors canvas.test.tsx).
let prevFlush: unknown;
let prevNativeCall: unknown;

import { render, unmount, useEditorSize, View } from "./index";

const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

beforeEach(() => {
  prevFlush = (globalThis as Record<string, any>).__vsreact_flush;
  prevNativeCall = (globalThis as Record<string, any>).__vsreact_nativeCall;
  (globalThis as Record<string, any>).__vsreact_flush = (json: string) => batches.push(JSON.parse(json));
  (globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, args: string) => {
    nativeCalls.push([name, args]);
    return "null";
  };
  unmount();
  batches.length = 0;
  nativeCalls.length = 0;
});

afterEach(() => {
  (globalThis as Record<string, any>).__vsreact_flush = prevFlush;
  (globalThis as Record<string, any>).__vsreact_nativeCall = prevNativeCall;
});

describe("useEditorSize", () => {
  test("reads the current root size from resize events", async () => {
    let size: any = null;
    function Probe() {
      const [s] = useEditorSize();
      size = s;
      return <View />;
    }
    render(<Probe />);
    await new Promise((r) => setTimeout(r, 0));

    expect(size).toEqual({ width: 0, height: 0 });
    dispatch({ kind: "native", name: "resize", payload: { width: 640, height: 480 } });
    expect(size).toEqual({ width: 640, height: 480 });
  });

  test("the setter calls native vsreact:resize with the width/height payload", async () => {
    let resize: ((w: number, h: number) => void) | null = null;
    function Probe() {
      const [, setSize] = useEditorSize();
      resize = setSize;
      return <View />;
    }
    render(<Probe />);
    await new Promise((r) => setTimeout(r, 0));

    resize!(800, 600);

    const call = nativeCalls.find(([name]) => name === "vsreact:resize");
    expect(call).toBeDefined();
    expect(JSON.parse(call![1])).toEqual({ width: 800, height: 600 });
  });
});
