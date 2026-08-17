// The JS half of presets: usePresets mirrors the native "preset" event, and
// PresetBrowser's strip drives the preset:* calls. The native side is mocked
// the way vsreact::PresetManager actually answers.

import { beforeEach, describe, expect, test } from "bun:test";

const batches: any[][] = [];
const calls: Array<[string, any]> = [];

const g = globalThis as Record<string, any>;
g.__vsreact_flush = (json: string) => batches.push(...JSON.parse(json));

let nativeState = {
  current: "",
  dirty: false,
  presets: [
    { name: "Default", factory: true },
    { name: "Bright", factory: true },
    { name: "Mine", factory: false },
  ],
};

g.__vsreact_nativeCall = (name: string, argsJson: string) => {
  const args = JSON.parse(argsJson || "{}");
  calls.push([name, args]);

  if (name === "preset:list") return JSON.stringify(nativeState);
  if (name === "preset:load") {
    nativeState = { ...nativeState, current: args.name, dirty: false };
    return JSON.stringify({ ok: true });
  }
  if (name === "preset:save") {
    nativeState = { ...nativeState, current: args.name, dirty: false };
    return JSON.stringify({ ok: true });
  }
  return JSON.stringify(null);
};

import { render, unmount, PresetBrowser } from "./index";

const allOps = () => batches;
const dispatch = (msg: unknown) => g.__vsreact_dispatch(JSON.stringify(msg));

/** The nodeId of the first setProps op whose rawtext child spells `text`. */
function nodeShowing(text: string): number | undefined {
  const textOp: any = allOps().find((op: any) => op[0] === "setText" && op[2] === text);
  if (!textOp) return undefined;

  // walk up: rawtext -> Text -> the clickable wrapper
  const parentOf = new Map<number, number>();
  for (const op of allOps() as any[]) {
    if (op[0] === "appendChild" || op[0] === "insertBefore") parentOf.set(op[2], op[1]);
  }
  return parentOf.get(parentOf.get(textOp[1])!)!;
}

const clickableAncestor = (id: number | undefined): number | undefined => {
  if (id === undefined) return undefined;
  const parentOf = new Map<number, number>();
  const listeners = new Map<number, string[]>();
  for (const op of allOps() as any[]) {
    if (op[0] === "appendChild" || op[0] === "insertBefore") parentOf.set(op[2], op[1]);
    if ((op[0] === "setProps" || op[0] === "patchProps") && op[2]?.listeners)
      listeners.set(op[1], op[2].listeners);
  }
  for (let node: number | undefined = id; node !== undefined; node = parentOf.get(node))
    if (listeners.get(node)?.includes("click")) return node;
  return undefined;
};

beforeEach(() => {
  unmount();
  batches.length = 0;
  calls.length = 0;
  nativeState = { ...nativeState, current: "", dirty: false };
});

describe("PresetBrowser", () => {
  test("shows the placeholder, then the current preset with a dirty asterisk", async () => {
    render(<PresetBrowser />);
    await new Promise((r) => setTimeout(r, 10));

    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "— no preset —")).toBe(true);

    dispatch({
      kind: "native",
      name: "preset",
      payload: { current: "Bright", dirty: true, presets: nativeState.presets },
    });
    await new Promise((r) => setTimeout(r, 10));

    expect(allOps().some((op: any) => op[0] === "setText" && op[2] === "Bright *")).toBe(true);
  });

  test("prev/next arrows call the native protocol", async () => {
    render(<PresetBrowser />);
    await new Promise((r) => setTimeout(r, 10));

    const prev = clickableAncestor(nodeShowing("◀"));
    const next = clickableAncestor(nodeShowing("▶"));
    expect(prev).toBeDefined();
    expect(next).toBeDefined();

    dispatch({ kind: "event", nodeId: prev, type: "click" });
    dispatch({ kind: "event", nodeId: next, type: "click" });

    const names = calls.map(([name]) => name);
    expect(names).toContain("preset:prev");
    expect(names).toContain("preset:next");
  });

  test("opening the menu lists factory and user presets; picking one loads it", async () => {
    render(<PresetBrowser />);
    await new Promise((r) => setTimeout(r, 10));

    const nameField = clickableAncestor(nodeShowing("— no preset —"));
    expect(nameField).toBeDefined();

    // the menu positions from the field's layout rect
    dispatch({ kind: "event", nodeId: nameField, type: "layout", payload: { x: 10, y: 10, width: 240, height: 26 } });
    await new Promise((r) => setTimeout(r, 10));
    dispatch({ kind: "event", nodeId: nameField, type: "click" });
    await new Promise((r) => setTimeout(r, 20));

    const mine = clickableAncestor(nodeShowing("Mine"));
    expect(mine).toBeDefined();

    dispatch({ kind: "event", nodeId: mine, type: "click" });
    await new Promise((r) => setTimeout(r, 10));

    expect(calls.some(([name, args]) => name === "preset:load" && args.name === "Mine")).toBe(true);
    // the mocked native answered with a "preset" event? No — the mock doesn't
    // push events; the UI must still show the menu closed without crashing.
  });
});
