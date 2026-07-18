// 0.0.19 hardening: malformed param traffic must never poison good state.
import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const nativeCalls: Array<{ name: string; args: any }> = [];
let paramGetResult: any = { value: 0.5, text: "320 ms", name: "Time", label: "ms", defaultValue: 0.5 };

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
const defaultNativeCall = (name: string, argsJson: string) => {
  const args = JSON.parse(argsJson);
  nativeCalls.push({ name, args });
  if (name === "param:get") return JSON.stringify(paramGetResult);
  return "null";
};
(globalThis as Record<string, any>).__vsreact_nativeCall = defaultNativeCall;

import { render, unmount, useParameter, View } from "./index";
import type { ParameterHandle } from "./index";

const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

let handle: ParameterHandle | null = null;

function Probe({ id }: { id: string }) {
  handle = useParameter(id);
  return <View />;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  unmount();
  batches.length = 0;
  nativeCalls.length = 0;
  handle = null;
  paramGetResult = { value: 0.5, text: "320 ms", name: "Time", label: "ms", defaultValue: 0.5 };
  (globalThis as Record<string, any>).__vsreact_nativeCall = defaultNativeCall;
});

describe("useParameter hardening", () => {
  test("initial state is the synchronous param:get snapshot", () => {
    render(<Probe id="time" />);
    expect(handle!.value).toBe(0.5);
    expect(handle!.text).toBe("320 ms");
  });

  test("event with missing text keeps the previous text", async () => {
    render(<Probe id="time" />);
    await settle();

    dispatch({ kind: "native", name: "param", payload: { id: "time", value: 0.75 } });
    expect(handle!.value).toBe(0.75);
    expect(handle!.text).toBe("320 ms");
  });

  test("event with a non-finite value keeps the previous value", async () => {
    render(<Probe id="time" />);
    await settle();

    dispatch({ kind: "native", name: "param", payload: { id: "time", value: "wat", text: "junk" } });
    expect(handle!.value).toBe(0.5);
    expect(handle!.text).toBe("junk");
  });

  test("set(NaN) is dropped before it reaches the native side", async () => {
    render(<Probe id="time" />);
    await settle();
    nativeCalls.length = 0;

    handle!.set(Number.NaN);
    expect(nativeCalls.filter((c) => c.name === "param:set")).toHaveLength(0);
    expect(handle!.value).toBe(0.5);

    handle!.set(0.25);
    expect(nativeCalls.filter((c) => c.name === "param:set")).toHaveLength(1);
  });

  test("healthy events still update both fields", async () => {
    render(<Probe id="time" />);
    await settle();

    dispatch({ kind: "native", name: "param", payload: { id: "time", value: 0.9, text: "901 ms" } });
    expect(handle!.value).toBe(0.9);
    expect(handle!.text).toBe("901 ms");
  });
});
