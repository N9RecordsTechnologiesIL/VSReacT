import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const nativeCalls: Array<{ name: string; args: any }> = [];
let paramGetResult: any = { value: 0.5, text: "0.5", name: "Mod", label: "" };

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
(globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, argsJson: string) => {
  const args = JSON.parse(argsJson);
  nativeCalls.push({ name, args });
  if (name === "param:get") return JSON.stringify(paramGetResult);
  return "null";
};

import {
  render,
  unmount,
  ADSREnvelope,
  ModWheel,
  ParamModWheel,
  PitchBend,
  adsrLevelAt,
  midiNoteToHz,
  hzToMidiNote,
} from "./index";

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

beforeEach(() => {
  unmount();
  batches.length = 0;
  nativeCalls.length = 0;
  paramGetResult = { value: 0.5, text: "0.5", name: "Mod", label: "" };
});

describe("pitch math", () => {
  test("midiNoteToHz and hzToMidiNote agree at the anchors", () => {
    expect(midiNoteToHz(69)).toBe(440);
    expect(midiNoteToHz(57)).toBeCloseTo(220);
    expect(midiNoteToHz(60)).toBeCloseTo(261.626, 2);
    expect(hzToMidiNote(440)).toBe(69);
    expect(hzToMidiNote(262)).toBe(60);
  });
});

describe("adsrLevelAt", () => {
  // width 100, segW 27
  test("traces the four stages", () => {
    const at = (x: number) => adsrLevelAt(x, 100, 0.5, 0.5, 0.5, 0.5);
    expect(at(0)).toBe(0);
    expect(at(13.5)).toBeCloseTo(1); // attack peak at 0.5*27
    expect(at(27)).toBeCloseTo(0.5); // decay bottom
    expect(at(50)).toBe(0.5); // sustain plateau
    expect(at(100)).toBeCloseTo(0); // release floor
  });

  test("zero attack jumps straight to the peak", () => {
    expect(adsrLevelAt(0, 100, 0, 0.5, 0.5, 0.5)).toBe(1);
  });
});

describe("ADSREnvelope", () => {
  test("dragging the attack handle reports a new attack", () => {
    const seen: Array<[string, number]> = [];
    render(
      <ADSREnvelope
        attack={0.5}
        decay={0.5}
        sustain={0.5}
        release={0.5}
        width={200}
        onChange={(k, v) => seen.push([k, v])}
      />,
    );

    // Handles render in order: attack, decay/sustain, release.
    const handles = nodesWithListener("drag");
    expect(handles).toHaveLength(3);

    dispatch({ kind: "event", nodeId: handles[0], type: "dragstart", payload: { dx: 0, dy: 0 } });
    dispatch({ kind: "event", nodeId: handles[0], type: "drag", payload: { dx: 27, dy: 0 } });
    // segW = 200*0.27 = 54; +27px = +0.5 → clamped at 1
    expect(seen.at(-1)).toEqual(["attack", 1]);
  });

  test("the corner handle drives decay and sustain together", () => {
    const seen: Array<[string, number]> = [];
    const begins: string[] = [];
    render(
      <ADSREnvelope
        attack={0.5}
        decay={0.5}
        sustain={0.5}
        release={0.5}
        width={200}
        height={104}
        onChange={(k, v) => seen.push([k, v])}
        onBegin={(k) => begins.push(k)}
      />,
    );

    const handles = nodesWithListener("drag");
    dispatch({ kind: "event", nodeId: handles[1], type: "dragstart", payload: { dx: 0, dy: 0 } });
    expect(begins).toEqual(["decay", "sustain"]);

    dispatch({ kind: "event", nodeId: handles[1], type: "drag", payload: { dx: -27, dy: -48 } });
    const decay = seen.find(([k]) => k === "decay");
    const sustain = seen.find(([k]) => k === "sustain");
    expect(decay?.[1]).toBeCloseTo(0); // -27/54 from 0.5
    expect(sustain?.[1]).toBeCloseTo(1); // -48/(104-8) up from 0.5
  });
});

describe("ModWheel", () => {
  test("dragging up raises the value from its start", () => {
    const seen: number[] = [];
    render(<ModWheel value={0.5} height={120} onChange={(v) => seen.push(v)} />);

    const id = nodesWithListener("drag")[0];
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: -50 } });
    expect(seen.at(-1)).toBeCloseTo(1); // 0.5 + 50/100
  });

  test("ParamModWheel opens a gesture and writes the parameter", () => {
    render(<ParamModWheel paramId="mod" />);

    const id = nodesWithListener("drag")[0];
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: 30 } });
    dispatch({ kind: "event", nodeId: id, type: "dragend", payload: { dx: 0, dy: 30 } });

    const names = nativeCalls.map((c) => c.name);
    expect(names).toContain("param:begin");
    expect(names).toContain("param:set");
    expect(names).toContain("param:end");
  });
});

describe("PitchBend", () => {
  test("drag bends, release springs back toward center", async () => {
    const seen: number[] = [];
    render(<PitchBend height={120} onChange={(v) => seen.push(v)} />);

    const id = nodesWithListener("drag")[0];
    dispatch({ kind: "event", nodeId: id, type: "dragstart", payload: { dx: 0, dy: 0 } });
    dispatch({ kind: "event", nodeId: id, type: "drag", payload: { dx: 0, dy: -30 } });
    await new Promise((r) => setTimeout(r, 0));
    expect(seen.at(-1)).toBeCloseTo(0.5); // 30/(120/2)

    dispatch({ kind: "event", nodeId: id, type: "dragend", payload: { dx: 0, dy: -30 } });
    await new Promise((r) => setTimeout(r, 400));
    expect(seen.at(-1)).toBe(0); // spring settled at dead center
  });
});
