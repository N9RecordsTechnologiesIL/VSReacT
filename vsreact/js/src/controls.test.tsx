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

import { render, unmount, Slider, Toggle, XYPad, Segmented, ParamSegmented, ParamToggle } from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

/** First node id whose registered listeners include `type`. */
const nodeWithListener = (type: string): number => {
  const props: any = opsNamed("setProps").find((op: any) => op[2]?.listeners?.includes(type));
  expect(props).toBeDefined();
  return props[1];
};

beforeEach(() => {
  unmount();
  batches.length = 0;
  nativeCalls.length = 0;
  paramGetResult = { value: 0.5, text: "0.0 dB", name: "Gain", label: "dB" };
});

describe("vertical Slider", () => {
  test("drag up increases the value; fill rises from the bottom", () => {
    const seen: number[] = [];
    render(<Slider vertical height={100} value={0.5} onChange={(v) => seen.push(v)} />);

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: -25, x: 0, y: -25 } });
    expect(seen.at(-1)).toBeCloseTo(0.75);

    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: 80, x: 0, y: 80 } });
    expect(seen.at(-1)).toBe(0); // clamped

    // Fill height reflects the (still-controlled) 0.5 value.
    const fill: any = opsNamed("setProps").find((op: any) => op[2]?.style?.height === 50);
    expect(fill).toBeDefined();
  });
});

describe("Toggle", () => {
  test("click flips; disabled ignores clicks", () => {
    const seen: boolean[] = [];
    render(<Toggle on={false} onChange={(v) => seen.push(v)} />);

    const id = nodeWithListener("click");
    dispatch({ kind: "event", nodeId: id, type: "click" });
    expect(seen).toEqual([true]);

    unmount();
    batches.length = 0;
    render(<Toggle on disabled onChange={(v) => seen.push(v)} />);
    expect(opsNamed("setProps").some((op: any) => op[2]?.listeners?.includes("click"))).toBe(false);
  });

  test("ParamToggle reads the param and writes a begin/set/end gesture", () => {
    paramGetResult = { value: 0, text: "Off", name: "Bypass", label: "" };
    render(<ParamToggle paramId="bypass" />);

    const id = nodeWithListener("click");
    dispatch({ kind: "event", nodeId: id, type: "click" });

    const names = nativeCalls.map((c) => c.name);
    expect(names).toContain("param:begin");
    expect(names).toContain("param:end");
    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args).toEqual({ id: "bypass", value: 1 });
  });
});

describe("XYPad", () => {
  test("drag maps both axes: right = +x, up = +y, clamped", () => {
    const seen: Array<[number, number]> = [];
    render(
      <XYPad x={0.5} y={0.5} width={100} height={100} onChange={(x, y) => seen.push([x, y])} />,
    );

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 25, dy: -25, x: 0, y: 0 } });
    expect(seen.at(-1)?.[0]).toBeCloseTo(0.75);
    expect(seen.at(-1)?.[1]).toBeCloseTo(0.75);

    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 999, dy: 999, x: 0, y: 0 } });
    expect(seen.at(-1)).toEqual([1, 0]);
  });
});

describe("Segmented", () => {
  test("clicking a segment reports its index", () => {
    const seen: number[] = [];
    render(<Segmented options={["SINE", "SAW", "SQR"]} index={0} onChange={(i) => seen.push(i)} />);

    const clickables = opsNamed("setProps").filter((op: any) =>
      op[2]?.listeners?.includes("click"),
    );
    expect(clickables.length).toBe(3);

    dispatch({ kind: "event", nodeId: (clickables[2] as any)[1], type: "click" });
    expect(seen).toEqual([2]);
  });

  test("ParamSegmented maps value→index and writes index/(n−1)", () => {
    paramGetResult = { value: 0.5, text: "Saw", name: "Shape", label: "" };
    render(<ParamSegmented paramId="shape" options={["SINE", "SAW", "SQR"]} />);

    const clickables = opsNamed("setProps").filter((op: any) =>
      op[2]?.listeners?.includes("click"),
    );
    dispatch({ kind: "event", nodeId: (clickables[0] as any)[1], type: "click" });

    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args).toEqual({ id: "shape", value: 0 });
  });
});
