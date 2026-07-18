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
