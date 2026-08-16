import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const nativeCalls: Array<{ name: string; args: any }> = [];
let paramGetResult: any = { value: 0.5, text: "0.0 dB", name: "Gain", label: "dB" };

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
(globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, argsJson: string) => {
  const args = JSON.parse(argsJson);
  nativeCalls.push({ name, args });
  if (name === "param:get") return JSON.stringify(paramGetResult);
  return "null";
};

import { render, unmount, View, tw, dragToValue, ParamKnob } from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
// A node's first props arrive as setProps; re-renders and animation frames
// arrive as key-granular patchProps. Update assertions look at both.
const propsOps = () => allOps().filter((op: any) => op[0] === "setProps" || op[0] === "patchProps");
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

beforeEach(() => {
  unmount();
  batches.length = 0;
  nativeCalls.length = 0;
});

describe("phase 2", () => {
  test("overflow-y-scroll resolves", () => {
    expect(tw("overflow-y-scroll").style).toEqual({ overflow: "scroll" });
  });

  test("dragToValue clamps and follows dy", () => {
    expect(dragToValue(0.5, 0)).toBe(0.5);
    expect(dragToValue(0.5, -40)).toBeCloseTo(0.7);
    expect(dragToValue(0.5, 40)).toBeCloseTo(0.3);
    expect(dragToValue(0.9, -100)).toBe(1);
    expect(dragToValue(0.1, 100)).toBe(0);
  });

  test("drag props register listeners and receive payloads", () => {
    const seen: any[] = [];

    render(<View onDrag={(e) => seen.push(e)} className="w-4" />);

    const nodeId = (opsNamed("create")[0] as any)[1];
    const props: any = opsNamed("setProps").find((op: any) => op[1] === nodeId);
    expect(props[2].listeners).toEqual(["drag"]);

    dispatch({ kind: "event", nodeId, type: "drag", payload: { dx: 3, dy: -7, x: 10, y: 20 } });
    expect(seen).toEqual([{ dx: 3, dy: -7, x: 10, y: 20 }]);
  });

  test("ParamKnob fetches the param, renders arc styles, and sets on drag", () => {
    render(<ParamKnob paramId="gain" />);

    expect(nativeCalls.some((c) => c.name === "param:get" && c.args.id === "gain")).toBe(true);

    // The knob's arc view: find setProps carrying arcValueEnd for value 0.5 -> 0deg.
    const arcProps: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.arcValueEnd !== undefined,
    );
    expect(arcProps).toBeDefined();
    expect(arcProps[2].style.arcValueEnd).toBeCloseTo(0);
    expect(arcProps[2].listeners).toEqual(
      expect.arrayContaining(["dragstart", "drag", "dragend"]),
    );

    const knobId = arcProps[1];
    batches.length = 0;

    // Drag begins a gesture, moves the value, ends the gesture.
    dispatch({ kind: "event", nodeId: knobId, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: knobId, type: "drag", payload: { dx: 0, dy: -40, x: 0, y: -40 } });
    dispatch({ kind: "event", nodeId: knobId, type: "dragend", payload: { dx: 0, dy: -40, x: 0, y: -40 } });

    expect(nativeCalls.some((c) => c.name === "param:begin")).toBe(true);
    const setCall = nativeCalls.find((c) => c.name === "param:set");
    expect(setCall?.args.value).toBeCloseTo(0.7);
    expect(nativeCalls.some((c) => c.name === "param:end")).toBe(true);
  });

  test("param events from C++ update the knob", async () => {
    render(<ParamKnob paramId="gain" />);
    // Let passive effects flush so the native.on("param") subscription exists.
    await new Promise((resolve) => setTimeout(resolve, 0));
    batches.length = 0;

    dispatch({ kind: "native", name: "param", payload: { id: "gain", value: 0.25, text: "-12 dB" } });

    const arcProps: any = propsOps().find(
      (op: any) => op[2]?.style?.arcValueEnd !== undefined,
    );
    expect(arcProps).toBeDefined();
    // 0.25 -> -135 + 270*0.25 = -67.5
    expect(arcProps[2].style.arcValueEnd).toBeCloseTo(-67.5);
  });
});
