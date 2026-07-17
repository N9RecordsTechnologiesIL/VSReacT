import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const nativeCalls: Array<{ name: string; args: any }> = [];
let paramGetResult: any = { value: 0.5, text: "0.0 dB", name: "Gain", label: "dB" };

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
  (globalThis as Record<string, any>).__vsreact_nativeCall = defaultNativeCall;
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

describe("GenericEditor", () => {
  test("renders one knob per parameter from param:list", () => {
    (globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, argsJson: string) => {
      const args = JSON.parse(argsJson);
      nativeCalls.push({ name, args });
      if (name === "param:list")
        return JSON.stringify([
          { id: "gain", name: "Gain", label: "dB", value: 0.5, text: "0.0 dB" },
          { id: "pan", name: "Pan", label: "", value: 0.5, text: "C" },
          { id: "mix", name: "Mix", label: "%", value: 1, text: "100%" },
        ]);
      if (name === "param:get") return JSON.stringify(paramGetResult);
      return "null";
    };

    const { GenericEditor } = require("./index");
    render(<GenericEditor columns={2} size={64} />);

    expect(nativeCalls.some((c) => c.name === "param:list")).toBe(true);
    const arcs = opsNamed("setProps").filter((op: any) => op[2]?.style?.arcValueEnd !== undefined);
    expect(arcs.length).toBe(3);
    expect(nativeCalls.filter((c) => c.name === "param:get").length).toBe(3);
  });

  test("empty parameter list renders no knobs and doesn't crash", () => {
    (globalThis as Record<string, any>).__vsreact_nativeCall = (name: string) => {
      if (name === "param:list") return JSON.stringify([]);
      return "null";
    };

    const { GenericEditor } = require("./index");
    render(<GenericEditor />);
    const arcs = opsNamed("setProps").filter((op: any) => op[2]?.style?.arcValueEnd !== undefined);
    expect(arcs.length).toBe(0);
  });
});

describe("Meter", () => {
  test("fill splits at the hot zone and peak line renders", () => {
    const { Meter } = require("./index");
    render(<Meter value={0.95} length={100} hotFrom={0.85} peak />);

    // main fill capped at the hot boundary
    const fill = opsNamed("setProps").find((op: any) => op[2]?.style?.height === 85);
    expect(fill).toBeDefined();
    // hot overflow segment: ~(0.95 - 0.85) * 100 tall, anchored at 85
    const hot: any = opsNamed("setProps").find((op: any) => op[2]?.style?.bottom === 85);
    expect(hot).toBeDefined();
    expect(hot[2].style.height).toBeCloseTo(10);
  });

  test("below the hot zone there is no hot segment", () => {
    const { Meter } = require("./index");
    render(<Meter value={0.5} length={100} hotFrom={0.85} peak={false} />);

    const fill = opsNamed("setProps").find((op: any) => op[2]?.style?.height === 50);
    expect(fill).toBeDefined();
    const hot = opsNamed("setProps").find((op: any) => op[2]?.style?.bottom === 85);
    expect(hot).toBeUndefined();
  });
});

describe("onLayout + Select", () => {
  /** Map child → parent from appendChild ops, to find a row by its text. */
  const parentMap = () => {
    const map = new Map<number, number>();
    for (const op of allOps() as any[])
      if (op[0] === "appendChild" || op[0] === "insertBefore") map.set(op[2], op[1]);
    return map;
  };

  test("onLayout registers a layout listener and receives the rect", () => {
    const seen: any[] = [];
    render(<Slider value={0.5} onChange={() => {}} />); // warm-up unrelated tree
    unmount();
    batches.length = 0;

    const { View: V } = require("./index");
    render(<V onLayout={(r: any) => seen.push(r)} className="w-4" />);

    const props: any = opsNamed("setProps").find((op: any) =>
      op[2]?.listeners?.includes("layout"),
    );
    expect(props).toBeDefined();

    dispatch({
      kind: "event",
      nodeId: props[1],
      type: "layout",
      payload: { x: 5, y: 10, width: 160, height: 32 },
    });
    expect(seen).toEqual([{ x: 5, y: 10, width: 160, height: 32 }]);
  });

  test("Select opens a positioned overlay menu and selects on click", async () => {
    const { Select } = require("./index");
    const seen: number[] = [];
    render(
      <Select options={["SINE", "SAW", "SQR"]} index={0} width={160} onChange={(i: number) => seen.push(i)} />,
    );
    await new Promise((r) => setTimeout(r, 0)); // let effects flush

    // trigger has both layout + click listeners
    const trigger: any = opsNamed("setProps").find(
      (op: any) => op[2]?.listeners?.includes("layout") && op[2]?.listeners?.includes("click"),
    );
    expect(trigger).toBeDefined();

    // layout arrives, then the click opens the menu
    dispatch({
      kind: "event",
      nodeId: trigger[1],
      type: "layout",
      payload: { x: 20, y: 40, width: 160, height: 33 },
    });
    await new Promise((r) => setTimeout(r, 0));
    dispatch({ kind: "event", nodeId: trigger[1], type: "click" });
    await new Promise((r) => setTimeout(r, 0));

    // menu panel positioned under the trigger, same width
    const panel: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.top === 40 + 33 + 4 && op[2]?.style?.left === 20,
    );
    expect(panel).toBeDefined();
    expect(panel[2].style.width).toBe(160);

    // find the "SAW" row: rawtext -> Text -> row
    const sawText: any = allOps().find((op: any) => op[0] === "setText" && op[2] === "SAW");
    expect(sawText).toBeDefined();
    const parents = parentMap();
    const rowId = parents.get(parents.get(sawText[1])!)!;

    dispatch({ kind: "event", nodeId: rowId, type: "click" });
    await new Promise((r) => setTimeout(r, 0));

    expect(seen).toEqual([1]);
    // menu removed after selection
    expect(allOps().some((op: any) => op[0] === "removeChild")).toBe(true);
  });

  test("ParamSelect writes a begin/set/end gesture with the index mapping", async () => {
    paramGetResult = { value: 0, text: "Sine", name: "Shape", label: "" };
    const { ParamSelect } = require("./index");
    render(<ParamSelect paramId="shape" options={["SINE", "SAW", "SQR"]} />);
    await new Promise((r) => setTimeout(r, 0));

    const trigger: any = opsNamed("setProps").find(
      (op: any) => op[2]?.listeners?.includes("layout") && op[2]?.listeners?.includes("click"),
    );
    dispatch({
      kind: "event",
      nodeId: trigger[1],
      type: "layout",
      payload: { x: 0, y: 0, width: 160, height: 33 },
    });
    await new Promise((r) => setTimeout(r, 0));
    dispatch({ kind: "event", nodeId: trigger[1], type: "click" });
    await new Promise((r) => setTimeout(r, 0));

    const sqrText: any = allOps().find((op: any) => op[0] === "setText" && op[2] === "SQR");
    const parents = parentMap();
    const rowId = parents.get(parents.get(sqrText[1])!)!;
    dispatch({ kind: "event", nodeId: rowId, type: "click" });

    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args).toEqual({ id: "shape", value: 1 });
    expect(nativeCalls.some((c) => c.name === "param:begin")).toBe(true);
    expect(nativeCalls.some((c) => c.name === "param:end")).toBe(true);
  });
});

describe("DAW feel (0.0.6)", () => {
  test("Knob: double-click resets to defaultValue as a full gesture", () => {
    const { Knob } = require("./index");
    const calls: string[] = [];
    render(
      <Knob
        value={0.9}
        defaultValue={0.5}
        onChange={(v: number) => calls.push(`set:${v}`)}
        onBegin={() => calls.push("begin")}
        onEnd={() => calls.push("end")}
      />,
    );

    const id = nodeWithListener("dblclick");
    dispatch({ kind: "event", nodeId: id, type: "dblclick" });
    expect(calls).toEqual(["begin", "set:0.5", "end"]);
  });

  test("Knob: wheel nudges by dy * sensitivity, clamped", () => {
    const { Knob } = require("./index");
    const seen: number[] = [];
    render(<Knob value={0.5} wheelSensitivity={0.4} onChange={(v: number) => seen.push(v)} />);

    const id = nodeWithListener("wheel");
    dispatch({ kind: "event", nodeId: id, type: "wheel", payload: { dy: 0.1 } });
    expect(seen.at(-1)).toBeCloseTo(0.54);

    dispatch({ kind: "event", nodeId: id, type: "wheel", payload: { dy: 100 } });
    expect(seen.at(-1)).toBe(1);
  });

  test("Knob: bipolar arc sweeps from centre in both directions", () => {
    const { Knob } = require("./index");
    render(<Knob bipolar value={0.75} onChange={() => {}} />);
    let arc: any = opsNamed("setProps").find((op: any) => op[2]?.style?.arcValueEnd !== undefined);
    expect(arc[2].style.arcValueStart).toBe(0);
    expect(arc[2].style.arcValueEnd).toBeCloseTo(67.5);

    unmount();
    batches.length = 0;
    render(<Knob bipolar value={0.25} onChange={() => {}} />);
    arc = opsNamed("setProps").find((op: any) => op[2]?.style?.arcValueEnd !== undefined);
    expect(arc[2].style.arcValueStart).toBeCloseTo(-67.5);
    expect(arc[2].style.arcValueEnd).toBe(0);
  });

  test("ParamKnob: host default drives the double-click reset", () => {
    paramGetResult = { value: 0.9, text: "+5 dB", name: "Gain", label: "dB", defaultValue: 0.25 };
    const { ParamKnob } = require("./index");
    render(<ParamKnob paramId="gain" />);

    const id = nodeWithListener("dblclick");
    dispatch({ kind: "event", nodeId: id, type: "dblclick" });

    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args).toEqual({ id: "gain", value: 0.25 });
    expect(nativeCalls.some((c) => c.name === "param:begin")).toBe(true);
    expect(nativeCalls.some((c) => c.name === "param:end")).toBe(true);
  });

  test("Slider: double-click reset + wheel work in both orientations", () => {
    const { Slider } = require("./index");
    const seen: number[] = [];
    render(<Slider vertical value={0.8} defaultValue={0.5} onChange={(v: number) => seen.push(v)} />);

    dispatch({ kind: "event", nodeId: nodeWithListener("dblclick"), type: "dblclick" });
    expect(seen.at(-1)).toBe(0.5);

    dispatch({ kind: "event", nodeId: nodeWithListener("wheel"), type: "wheel", payload: { dy: -0.1 } });
    expect(seen.at(-1)).toBeCloseTo(0.76);
  });
});

describe("Tooltip + Modal", () => {
  test("Tooltip shows below its anchor after the hover delay, hides on leave", async () => {
    const { Tooltip } = require("./index");
    render(
      <Tooltip label="Resets to 0 dB" delayMs={15} offset={6}>
        <Slider value={0.5} onChange={() => {}} />
      </Tooltip>,
    );

    const anchor = nodeWithListener("mouseenter");
    dispatch({
      kind: "event",
      nodeId: anchor,
      type: "layout",
      payload: { x: 10, y: 20, width: 100, height: 30 },
    });
    dispatch({ kind: "event", nodeId: anchor, type: "mouseenter" });
    await new Promise((r) => setTimeout(r, 40));

    const tip: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.top === 20 + 30 + 6 && op[2]?.style?.left === 10,
    );
    expect(tip).toBeDefined();
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "Resets to 0 dB")).toBe(true);

    dispatch({ kind: "event", nodeId: anchor, type: "mouseleave" });
    await new Promise((r) => setTimeout(r, 5));
    expect(allOps().some((op: any) => op[0] === "removeChild")).toBe(true);
  });

  test("Modal renders a centered panel; backdrop closes, panel doesn't", async () => {
    const { Modal, Text: T } = require("./index");
    const closed: number[] = [];
    render(
      <Modal open onClose={() => closed.push(1)} title="ABOUT" width={280}>
        <T>VSReacT 0.0.6</T>
      </Modal>,
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "ABOUT")).toBe(true);
    const panel: any = opsNamed("setProps").find((op: any) => op[2]?.style?.width === 280);
    expect(panel).toBeDefined();

    // panel click swallows; backdrop click closes
    dispatch({ kind: "event", nodeId: panel[1], type: "click" });
    expect(closed.length).toBe(0);

    const backdrop: any = opsNamed("setProps").find(
      (op: any) => op[2]?.listeners?.includes("click") && op[2]?.style?.left === 0 && op[2]?.style?.right === 0,
    );
    expect(backdrop).toBeDefined();
    dispatch({ kind: "event", nodeId: backdrop[1], type: "click" });
    expect(closed).toEqual([1]);
  });
});

describe("0.0.7 — Button, visualizers, hooks", () => {
  test("Button: click fires; disabled renders no listener; variants style", () => {
    const { Button } = require("./index");
    const seen: number[] = [];
    render(<Button label="APPLY" onClick={() => seen.push(1)} accentColor="#FF2E2E" />);

    dispatch({ kind: "event", nodeId: nodeWithListener("click"), type: "click" });
    expect(seen).toEqual([1]);

    // solid: filled with the accent
    const solid: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.backgroundColor === "#FF2E2E",
    );
    expect(solid).toBeDefined();
    expect(solid[2].hoverStyle).toBeDefined();

    unmount();
    batches.length = 0;
    render(<Button label="X" disabled onClick={() => seen.push(2)} />);
    expect(opsNamed("setProps").some((op: any) => op[2]?.listeners?.includes("click"))).toBe(false);

    unmount();
    batches.length = 0;
    render(<Button label="Y" variant="outline" onClick={() => {}} accentColor="#FF2E2E" />);
    const outline: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.borderColor === "#FF2E2E",
    );
    expect(outline).toBeDefined();
    expect(outline[2].style.borderWidth).toBe(1);
  });

  test("Bars: one bar per value, hot bars switch color, heights scale", () => {
    const { Bars } = require("./index");
    render(<Bars values={[0.5, 0.9]} height={60} hotFrom={0.85} color="#AAA111" hotColor="#FF0000" />);

    const bars = opsNamed("setProps").filter(
      (op: any) => op[2]?.style?.backgroundColor === "#AAA111" || op[2]?.style?.backgroundColor === "#FF0000",
    );
    expect(bars.length).toBe(2);
    const cold: any = bars.find((op: any) => op[2].style.backgroundColor === "#AAA111");
    const hot: any = bars.find((op: any) => op[2].style.backgroundColor === "#FF0000");
    expect(cold[2].style.height).toBeCloseTo(0.5 * 56);
    expect(hot[2].style.height).toBeCloseTo(0.9 * 56);
  });

  test("Waveform: bars mirror around centre with |value| heights", () => {
    const { Waveform } = require("./index");
    render(<Waveform values={[-1, 0.5]} height={60} color="#AAA111" centerLine={false} />);

    const bars = opsNamed("setProps")
      .filter((op: any) => op[2]?.style?.backgroundColor === "#AAA111")
      .map((op: any) => op[2].style.height);
    expect(bars).toHaveLength(2);
    expect(Math.max(...bars)).toBeCloseTo(56);
    expect(Math.min(...bars)).toBeCloseTo(28);
  });

  test("pushRolling keeps a fixed window, newest last", () => {
    const { pushRolling } = require("./index");
    expect(pushRolling([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
    expect(pushRolling([], 7, 3)).toEqual([0, 0, 7]);
    expect(pushRolling([1, 2, 3, 4, 5], 6, 3)).toEqual([4, 5, 6]);
  });

  test("useToggle + useHover drive a probe component", () => {
    const { useToggle, useHover, View: V, Text: T } = require("./index");

    function Probe() {
      const [on, toggle] = useToggle(false);
      const [hovered, hoverProps] = useHover();
      return (
        <V onClick={toggle} {...hoverProps}>
          <T>{`${on ? "ON" : "OFF"}:${hovered ? "HOV" : "OUT"}`}</T>
        </V>
      );
    }

    render(<Probe />);
    const id = nodeWithListener("click");

    dispatch({ kind: "event", nodeId: id, type: "click" });
    dispatch({ kind: "event", nodeId: id, type: "mouseenter" });
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "ON:HOV")).toBe(true);

    dispatch({ kind: "event", nodeId: id, type: "mouseleave" });
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "ON:OUT")).toBe(true);
  });

  test("usePrevious reports the last-render value", () => {
    const { usePrevious, View: V, Text: T } = require("./index");
    const values: Array<string> = [];

    function Probe({ n }: { n: number }) {
      const prev = usePrevious(n);
      values.push(`${prev}->${n}`);
      return (
        <V>
          <T>{n}</T>
        </V>
      );
    }

    render(<Probe n={1} />);
    render(<Probe n={2} />);
    expect(values[0]).toBe("undefined->1");
    expect(values.at(-1)).toBe("1->2");
  });
});

describe("0.0.10 — fields & feedback", () => {
  test("snapToStep lands on the grid without float dust", () => {
    const { snapToStep } = require("./index");
    expect(snapToStep(0.3000000004, 0.1, 0)).toBe(0.3);
    expect(snapToStep(7.4, 5, 0)).toBe(5);
    expect(snapToStep(7.6, 5, 0)).toBe(10);
    expect(snapToStep(3.2, 0.5, 1)).toBe(3);
  });

  test("NumberBox: drag steps, wheel steps, double-click resets, clamps", () => {
    const { NumberBox } = require("./index");
    const seen: number[] = [];
    render(
      <NumberBox value={120} min={40} max={240} step={1} defaultValue={120} onChange={(v: number) => seen.push(v)} />,
    );

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: -40, x: 0, y: 0 } });
    expect(seen.at(-1)).toBe(130); // 40px up = +10 steps

    dispatch({ kind: "event", nodeId: id, type: "wheel", payload: { dy: 0.1 } });
    expect(seen.at(-1)).toBe(121); // wheel = one step from the controlled 120

    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: 9999, x: 0, y: 0 } });
    expect(seen.at(-1)).toBe(40); // clamped at min

    dispatch({ kind: "event", nodeId: id, type: "dblclick" });
    expect(seen.at(-1)).toBe(120);
  });

  test("ParamNumberBox shows host text and writes gestures", () => {
    paramGetResult = { value: 0.5, text: "440 Hz", name: "Freq", label: "Hz", defaultValue: 0.5 };
    const { ParamNumberBox } = require("./index");
    render(<ParamNumberBox paramId="freq" />);

    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "440 Hz")).toBe(true);

    const id = nodeWithListener("wheel");
    dispatch({ kind: "event", nodeId: id, type: "wheel", payload: { dy: 0.1 } });
    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args.value).toBeCloseTo(0.51);
    expect(nativeCalls.some((c) => c.name === "param:begin")).toBe(true);
    expect(nativeCalls.some((c) => c.name === "param:end")).toBe(true);
  });

  test("Checkbox toggles; RadioGroup selects; Param twins write gestures", () => {
    const { Checkbox, RadioGroup } = require("./index");
    const checks: boolean[] = [];
    render(<Checkbox checked={false} label="Oversample" onChange={(v: boolean) => checks.push(v)} />);
    dispatch({ kind: "event", nodeId: nodeWithListener("click"), type: "click" });
    expect(checks).toEqual([true]);

    unmount();
    batches.length = 0;
    const picks: number[] = [];
    render(<RadioGroup options={["OFF", "2X", "4X"]} index={0} onChange={(i: number) => picks.push(i)} />);
    const rows = opsNamed("setProps").filter((op: any) => op[2]?.listeners?.includes("click"));
    expect(rows.length).toBe(3);
    dispatch({ kind: "event", nodeId: (rows[2] as any)[1], type: "click" });
    expect(picks).toEqual([2]);

    unmount();
    batches.length = 0;
    nativeCalls.length = 0;
    paramGetResult = { value: 0, text: "Off", name: "OS", label: "", defaultValue: 0 };
    const { ParamRadioGroup } = require("./index");
    render(<ParamRadioGroup paramId="os" options={["OFF", "2X", "4X"]} />);
    const prows = opsNamed("setProps").filter((op: any) => op[2]?.listeners?.includes("click"));
    dispatch({ kind: "event", nodeId: (prows[1] as any)[1], type: "click" });
    const set = nativeCalls.find((c) => c.name === "param:set");
    expect(set?.args.value).toBeCloseTo(0.5);
  });

  test("ProgressBar fill scales; Spinner animates its arc", async () => {
    const { ProgressBar, Spinner } = require("./index");
    render(<ProgressBar value={0.42} width={200} height={8} />);
    const fill = opsNamed("setProps").find((op: any) => op[2]?.style?.width === 84);
    expect(fill).toBeDefined();

    unmount();
    batches.length = 0;
    render(<Spinner size={28} />);
    const first: any = opsNamed("setProps").find((op: any) => op[2]?.style?.arcValueStart !== undefined);
    expect(first).toBeDefined();
    await new Promise((r) => setTimeout(r, 60));
    const all = opsNamed("setProps").filter((op: any) => op[2]?.style?.arcValueStart !== undefined);
    const angles = all.map((op: any) => op[2].style.arcValueStart);
    expect(Math.max(...angles)).toBeGreaterThan(angles[0]); // it spins
  });

  test("GenericEditor renders a live value label under each knob", () => {
    (globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, argsJson: string) => {
      const args = JSON.parse(argsJson);
      nativeCalls.push({ name, args });
      if (name === "param:list")
        return JSON.stringify([
          { id: "gain", name: "Gain", label: "dB", value: 0.5, text: "0.0 dB", defaultValue: 0.5 },
          { id: "mix", name: "Mix", label: "%", value: 1, text: "100%", defaultValue: 0.5 },
        ]);
      if (name === "param:get") {
        const id = args.id;
        return JSON.stringify(
          id === "gain"
            ? { value: 0.5, text: "0.0 dB", name: "Gain", label: "dB", defaultValue: 0.5 }
            : { value: 1, text: "100%", name: "Mix", label: "%", defaultValue: 0.5 },
        );
      }
      return "null";
    };

    const { GenericEditor } = require("./index");
    render(<GenericEditor columns={2} />);

    // value labels present as text nodes
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "0.0 dB")).toBe(true);
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "100%")).toBe(true);
    // names too
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "GAIN")).toBe(true);
  });
});

describe("0.0.11 — flagship visuals", () => {
  test("MacroPad: drag maps both axes, double-click recenters, rings render", () => {
    const { MacroPad } = require("./index");
    const seen: Array<[number, number]> = [];
    render(
      <MacroPad x={0.5} y={0.5} size={200} animate={false} rings={6} onChange={(x: number, y: number) => seen.push([x, y])} />,
    );

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 50, dy: -50, x: 0, y: 0 } });
    expect(seen.at(-1)?.[0]).toBeCloseTo(0.75);
    expect(seen.at(-1)?.[1]).toBeCloseTo(0.75);

    dispatch({ kind: "event", nodeId: id, type: "dblclick" });
    expect(seen.at(-1)).toEqual([0.5, 0.5]);

    // six rings + thumb: ring views carry borderColor + opacity
    const rings = opsNamed("setProps").filter(
      (op: any) => op[2]?.style?.borderColor === "#C6F135" && op[2]?.style?.opacity !== undefined,
    );
    expect(rings.length).toBeGreaterThanOrEqual(6);
  });

  test("ParamMacroPad opens and closes both gestures", () => {
    const { ParamMacroPad } = require("./index");
    render(<ParamMacroPad paramX="cutoff" paramY="res" animate={false} />);

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 20, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "dragend", payload: { dx: 20, dy: 0, x: 0, y: 0 } });

    expect(nativeCalls.filter((c) => c.name === "param:begin").length).toBe(2);
    expect(nativeCalls.filter((c) => c.name === "param:end").length).toBe(2);
    expect(nativeCalls.filter((c) => c.name === "param:set").length).toBe(2);
  });

  test("HardwareKnob: pointer notch tracks the angle; DAW gestures work", () => {
    const { HardwareKnob } = require("./index");
    const seen: number[] = [];
    render(<HardwareKnob value={0.5} defaultValue={0.25} onChange={(v: number) => seen.push(v)} />);

    // value 0.5 -> angle 0 -> notch arc -4..+4
    const notch: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.arcValueStart === -4 && op[2]?.style?.arcValueEnd === 4,
    );
    expect(notch).toBeDefined();

    const id = nodeWithListener("dblclick");
    dispatch({ kind: "event", nodeId: id, type: "dblclick" });
    expect(seen.at(-1)).toBe(0.25);

    dispatch({ kind: "event", nodeId: id, type: "wheel", payload: { dy: 0.1 } });
    expect(seen.at(-1)).toBeCloseTo(0.54);
  });

  test("Crossfader: horizontal drag with travel compensation, labels render", () => {
    const { Crossfader } = require("./index");
    const seen: number[] = [];
    render(<Crossfader value={0.5} width={220} onChange={(v: number) => seen.push(v)} />);

    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "DRY")).toBe(true);
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "WET")).toBe(true);

    const id = nodeWithListener("drag");
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0, x: 0, y: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 94, dy: 0, x: 0, y: 0 } }); // travel = 220-26-6 = 188
    expect(seen.at(-1)).toBeCloseTo(1);

    dispatch({ kind: "event", nodeId: id, type: "dblclick" });
    expect(seen.at(-1)).toBe(0.5);
  });

  test("PulseOrb: echo rings advance with the phase", async () => {
    const { PulseOrb } = require("./index");
    render(<PulseOrb value={0.8} size={100} rings={3} />);

    const sizesAt = () =>
      opsNamed("setProps")
        .filter((op: any) => op[2]?.style?.borderColor === "#C6F135")
        .map((op: any) => op[2].style.width);
    const before = sizesAt().length;
    await new Promise((r) => setTimeout(r, 100));
    expect(sizesAt().length).toBeGreaterThan(before); // new frames landed

    // the core glows with the level
    const core: any = opsNamed("setProps").find((op: any) => op[2]?.style?.shadowColor === "#C6F135");
    expect(core).toBeDefined();
  });

  test("Toggle side labels highlight the active side; Slider barThumb renders a bar", () => {
    const { Toggle: T2, Slider: S2 } = require("./index");
    render(<T2 on={false} offLabel="OFF" onLabel="ON" onChange={() => {}} />);
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "OFF")).toBe(true);
    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "ON")).toBe(true);

    unmount();
    batches.length = 0;
    render(<S2 vertical barThumb height={100} value={0.5} onChange={() => {}} />);
    // bar thumb: 18 wide, 5 tall at the halfway point
    const bar: any = opsNamed("setProps").find(
      (op: any) => op[2]?.style?.width === 18 && op[2]?.style?.height === 5,
    );
    expect(bar).toBeDefined();
    expect(bar[2].style.top).toBeCloseTo(0.5 * 95);
  });
});
