import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
(globalThis as Record<string, any>).__vsreact_nativeCall = () => "null";

import { render, unmount, View, Text, Tabs, Disclosure, Meter, useNativeValue } from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

const nodesWithListener = (type: string): number[] => {
  const seen = new Set<number>();
  for (const op of opsNamed("setProps") as any[]) {
    if (op[2]?.listeners?.includes(type)) seen.add(op[1]);
  }
  return [...seen];
};

const textsSet = (): string[] =>
  (opsNamed("setText") as any[]).map((op) => op[2]).filter((t) => typeof t === "string");

beforeEach(() => {
  unmount();
  batches.length = 0;
});

describe("Tabs", () => {
  test("uncontrolled: clicking a tab switches the panel", async () => {
    render(
      <Tabs labels={["MAIN", "FX"]}>
        <Text>main-panel</Text>
        <Text>fx-panel</Text>
      </Tabs>,
    );

    expect(textsSet()).toContain("main-panel");
    expect(textsSet()).not.toContain("fx-panel");

    const tabs = nodesWithListener("click");
    expect(tabs).toHaveLength(2);
    dispatch({ kind: "event", nodeId: tabs[1], type: "click" });
    await new Promise((r) => setTimeout(r, 0));

    expect(textsSet()).toContain("fx-panel");
  });

  test("controlled: reports the click, renders the given index", () => {
    const seen: number[] = [];
    render(
      <Tabs labels={["A", "B", "C"]} index={2} onChange={(i) => seen.push(i)}>
        <Text>a</Text>
        <Text>b</Text>
        <Text>c</Text>
      </Tabs>,
    );

    expect(textsSet()).toContain("c");
    const tabs = nodesWithListener("click");
    dispatch({ kind: "event", nodeId: tabs[0], type: "click" });
    expect(seen).toEqual([0]);
  });
});

describe("Disclosure", () => {
  test("closed by default; clicking the header reveals the content", async () => {
    render(
      <Disclosure title="ADVANCED">
        <Text>secret-settings</Text>
      </Disclosure>,
    );

    expect(textsSet()).not.toContain("secret-settings");

    const header = nodesWithListener("click")[0];
    dispatch({ kind: "event", nodeId: header, type: "click" });
    await new Promise((r) => setTimeout(r, 0));

    expect(textsSet()).toContain("secret-settings");
  });
});

describe("Meter reverse", () => {
  test("reverse anchors the vertical fill to the top", () => {
    render(<Meter value={0.5} length={100} peak={false} reverse />);

    const fill: any = (opsNamed("setProps") as any[]).find(
      (op) => op[2]?.style?.height === 42.5 || op[2]?.style?.height === 50,
    );
    expect(fill).toBeDefined();
    expect(fill[2].style.top).toBe(0);
    expect(fill[2].style.bottom).toBeUndefined();
  });

  test("default still fills from the bottom", () => {
    render(<Meter value={0.5} length={100} peak={false} />);

    const fill: any = (opsNamed("setProps") as any[]).find(
      (op) => (op[2]?.style?.height === 42.5 || op[2]?.style?.height === 50) && op[2]?.style?.bottom === 0,
    );
    expect(fill).toBeDefined();
  });
});

describe("useNativeValue", () => {
  test("holds the latest payload of a native event", async () => {
    const seen: number[] = [];
    function App() {
      const meter = useNativeValue("meter", { level: 0 });
      seen.push(meter.level);
      return <View />;
    }

    render(<App />);
    await new Promise((r) => setTimeout(r, 0));

    dispatch({ kind: "native", name: "meter", payload: { level: 0.8 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(seen.at(-1)).toBe(0.8);
  });
});

describe("Svg primitives (0.0.24)", () => {
  test("Svg + SvgPath create their node types with data props", async () => {
    const { Svg, SvgPath } = require("./index");
    render(
      <Svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }}>
        <SvgPath d="M12 2 L22 22 L2 22 Z" fill="#ff0000" />
        <SvgPath d="M2 12 H22" fill="none" stroke="#00ff00" strokeWidth={2} strokeDash="4 2" />
      </Svg>,
    );

    const creates = allOps().filter((op: any) => op[0] === "create");
    expect(creates.some((op: any) => op[2] === "svg")).toBe(true);
    expect(creates.filter((op: any) => op[2] === "svgpath")).toHaveLength(2);

    const propOps = allOps().filter((op: any) => op[0] === "setProps");
    const svgProps: any = propOps.find((op: any) => op[2]?.viewBox);
    expect(svgProps[2].viewBox).toBe("0 0 24 24");

    const pathProps: any = propOps.find((op: any) => op[2]?.strokeDash);
    expect(pathProps[2]).toMatchObject({ d: "M2 12 H22", fill: "none", stroke: "#00ff00", strokeWidth: 2 });
  });
});

describe("SvgPath gradient typing (0.0.27)", () => {
  // Types-only widening: SvgPathProps.fill/stroke now accept a GradientSpec.
  // The bridge forwards fill/stroke through props (see the string cases in the
  // "Svg primitives" suite above); the C++ painter reads the gradient shape.
  test("fill/stroke accept a GradientSpec value (compile-time contract)", () => {
    const { SvgPath } = require("./index");
    const fill: import("./index").GradientSpec = {
      gradientType: "linear",
      gradientFrom: "#ff0000",
      gradientVia: "#00ff00",
      gradientTo: "#0000ff",
      gradientAngle: 90,
    };
    const stroke: import("./index").GradientSpec = {
      gradientType: "radial",
      gradientStops: [{ offset: 0, color: "#ffffff" }, { color: "#000000" }],
    };

    // A string still satisfies the union, and so does a GradientSpec.
    const stringEl = <SvgPath d="M0 0 H1" fill="#ff0000" stroke="none" />;
    const gradientEl = <SvgPath d="M0 0 H1" fill={fill} stroke={stroke} />;

    expect(stringEl.props.fill).toBe("#ff0000");
    expect(gradientEl.props.fill).toEqual(fill);
    expect(gradientEl.props.stroke).toEqual(stroke);
  });
});

describe("useRootSize (0.0.25)", () => {
  test("tracks resize events, ignores junk", async () => {
    const { useRootSize } = require("./index");
    let seen: any = null;
    function Probe() {
      seen = useRootSize();
      return <View />;
    }
    render(<Probe />);
    await new Promise((r) => setTimeout(r, 0));

    expect(seen).toEqual({ width: 0, height: 0 });
    dispatch({ kind: "native", name: "resize", payload: { width: 793, height: 496 } });
    expect(seen).toEqual({ width: 793, height: 496 });
    dispatch({ kind: "native", name: "resize", payload: { width: "nope" } });
    expect(seen).toEqual({ width: 793, height: 496 });
  });
});
