import { beforeEach, describe, expect, test } from "bun:test";
import { useState } from "react";

const batches: unknown[][][] = [];
(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};

import { render, unmount, View, Text, TextInput } from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

beforeEach(() => {
  unmount();
  batches.length = 0;
});

describe("reconciler host config", () => {
  test("initial mount emits create/setProps/append ops ending at the root", () => {
    render(
      <View className="p-4">
        <Text>hi</Text>
      </View>,
    );

    const ops = allOps();
    const creates = opsNamed("create");

    // view + text + rawtext
    expect(creates.length).toBe(3);
    const viewId = (creates.find((op: any) => op[2] === "view") as any)[1];
    const textId = (creates.find((op: any) => op[2] === "text") as any)[1];
    const rawId = (creates.find((op: any) => op[2] === "rawtext") as any)[1];

    const viewProps: any = opsNamed("setProps").find((op: any) => op[1] === viewId);
    expect(viewProps[2].style.padding).toBe(16);

    expect(opsNamed("setText")).toContainEqual(["setText", rawId, "hi"]);
    expect(opsNamed("appendChild")).toContainEqual(["appendChild", textId, rawId]);
    expect(opsNamed("appendChild")).toContainEqual(["appendChild", viewId, textId]);
    expect(opsNamed("appendChild")).toContainEqual(["appendChild", 0, viewId]);

    // root attach comes after the subtree is assembled
    const opNames = ops.map((op: any) => op.join(":"));
    expect(opNames.indexOf(`appendChild:0:${viewId}`)).toBeGreaterThan(
      opNames.indexOf(`appendChild:${viewId}:${textId}`),
    );
  });

  test("click handlers register as listeners and receive dispatches", () => {
    let clicks = 0;

    render(<View onClick={() => clicks++} className="w-4" />);

    const create: any = opsNamed("create")[0];
    const props: any = opsNamed("setProps").find((op: any) => op[1] === create[1]);
    expect(props[2].listeners).toEqual(["click"]);

    dispatch({ kind: "event", nodeId: create[1], type: "click" });
    expect(clicks).toBe(1);
  });

  test("state updates emit new setProps and setText", () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <View onClick={() => setCount((c) => c + 1)}>
          <Text>{`count:${count}`}</Text>
        </View>
      );
    }

    render(<Counter />);

    const viewId = (opsNamed("create").find((op: any) => op[2] === "view") as any)[1];
    batches.length = 0;

    dispatch({ kind: "event", nodeId: viewId, type: "click" });

    expect(opsNamed("setText").some((op: any) => op[2] === "count:1")).toBe(true);
  });

  test("TextInput onChange receives the plain string value", () => {
    const seen: string[] = [];

    render(<TextInput onChange={(v) => seen.push(v)} />);

    const inputId = (opsNamed("create").find((op: any) => op[2] === "textinput") as any)[1];
    dispatch({ kind: "event", nodeId: inputId, type: "change", payload: { value: "abc" } });

    expect(seen).toEqual(["abc"]);
  });

  test("conditional removal emits removeChild", () => {
    function Toggle({ on }: { on: boolean }) {
      return <View>{on ? <View className="w-2" /> : null}</View>;
    }

    render(<Toggle on={true} />);
    // React creates instances bottom-up: the inner view is created first.
    const childId = (opsNamed("create")[0] as any)[1];
    batches.length = 0;

    render(<Toggle on={false} />);
    expect(opsNamed("removeChild").some((op: any) => op[2] === childId)).toBe(true);
  });

  test("unmount clears the container", () => {
    render(<View />);
    batches.length = 0;
    unmount();
    const ops = allOps();
    expect(ops.some((op: any) => op[0] === "removeChild" || op[0] === "clearContainer")).toBe(
      true,
    );
  });
});
