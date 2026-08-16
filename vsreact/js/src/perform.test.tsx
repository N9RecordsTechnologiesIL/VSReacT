import { beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];

(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};
(globalThis as Record<string, any>).__vsreact_nativeCall = () => "null";

import {
  render,
  unmount,
  VERSION,
  PianoKeyboard,
  StepSequencer,
  ProgressBar,
  mapRange,
  formatDb,
  formatHz,
  formatMs,
  formatPercent,
  formatSemitones,
  midiNoteName,
} from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
// A node's first props arrive as setProps; re-renders and animation frames
// arrive as key-granular patchProps. Update assertions look at both.
const propsOps = () => allOps().filter((op: any) => op[0] === "setProps" || op[0] === "patchProps");
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

/** Node ids whose registered listeners include `type`, in creation order. */
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
});

describe("VERSION", () => {
  test("matches the package version", () => {
    expect(VERSION).toBe(require("../package.json").version);
  });
});

describe("format", () => {
  test("formatDb signs and floors", () => {
    expect(formatDb(6)).toBe("+6.0 dB");
    expect(formatDb(0)).toBe("0.0 dB");
    expect(formatDb(-12.53)).toBe("-12.5 dB");
    expect(formatDb(Number.NEGATIVE_INFINITY)).toBe("-inf dB");
  });

  test("formatHz switches to kHz at 1000", () => {
    expect(formatHz(440)).toBe("440 Hz");
    expect(formatHz(1200)).toBe("1.2 kHz");
    expect(formatHz(18500, 2)).toBe("18.5 kHz");
  });

  test("formatMs switches to seconds at 1000", () => {
    expect(formatMs(350)).toBe("350 ms");
    expect(formatMs(1250)).toBe("1.25 s");
  });

  test("formatPercent and formatSemitones", () => {
    expect(formatPercent(0.42)).toBe("42%");
    expect(formatSemitones(7)).toBe("+7 st");
    expect(formatSemitones(-12)).toBe("-12 st");
    expect(formatSemitones(0)).toBe("0 st");
  });

  test("midiNoteName uses scientific pitch", () => {
    expect(midiNoteName(60)).toBe("C4");
    expect(midiNoteName(69)).toBe("A4");
    expect(midiNoteName(48)).toBe("C3");
    expect(midiNoteName(61)).toBe("C#4");
  });

  test("mapRange maps and optionally clamps", () => {
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
    expect(mapRange(2, 0, 1, 0, 100)).toBe(200);
    expect(mapRange(2, 0, 1, 0, 100, true)).toBe(100);
  });
});

describe("PianoKeyboard", () => {
  test("one octave renders 8 whites + 5 blacks, all pressable", () => {
    render(<PianoKeyboard startNote={48} octaves={1} onNoteOn={() => {}} />);
    expect(nodesWithListener("mousedown")).toHaveLength(13);
  });

  test("press fires note-on, release fires note-off", () => {
    const on: number[] = [];
    const off: number[] = [];
    render(
      <PianoKeyboard startNote={48} octaves={1} onNoteOn={(n) => on.push(n)} onNoteOff={(n) => off.push(n)} />,
    );

    // Whites render first: the first pressable node is the low C (48).
    const keys = nodesWithListener("mousedown");
    dispatch({ kind: "event", nodeId: keys[0], type: "mousedown" });
    expect(on).toEqual([48]);
    dispatch({ kind: "event", nodeId: keys[0], type: "mouseup" });
    expect(off).toEqual([48]);
  });

  test("glissando: dragging one key-width retargets to the next white", () => {
    const on: number[] = [];
    const off: number[] = [];
    render(
      <PianoKeyboard
        startNote={48}
        octaves={1}
        whiteKeyWidth={24}
        onNoteOn={(n) => on.push(n)}
        onNoteOff={(n) => off.push(n)}
      />,
    );

    const keys = nodesWithListener("mousedown");
    dispatch({ kind: "event", nodeId: keys[0], type: "mousedown" });
    dispatch({ kind: "event", nodeId: keys[0], type: "drag", payload: { dx: 24, dy: 0 } });
    expect(on).toEqual([48, 50]);
    expect(off).toEqual([48]);

    dispatch({ kind: "event", nodeId: keys[0], type: "dragend", payload: { dx: 24, dy: 0 } });
    expect(off).toEqual([48, 50]);
  });

  test("blacks sit above whites: dragging into the black zone hits C#", () => {
    const on: number[] = [];
    render(<PianoKeyboard startNote={48} octaves={1} whiteKeyWidth={24} onNoteOn={(n) => on.push(n)} />);

    const keys = nodesWithListener("mousedown");
    // From the low C's center (x=12, y in the white zone) up-right into
    // the C# head: C# spans x 16.56..31.44, y 0..57.6.
    dispatch({ kind: "event", nodeId: keys[0], type: "mousedown" });
    dispatch({ kind: "event", nodeId: keys[0], type: "drag", payload: { dx: 8, dy: -60 } });
    expect(on).toEqual([48, 49]);
  });

  test("disabled keyboard registers no handlers", () => {
    render(<PianoKeyboard disabled onNoteOn={() => {}} />);
    expect(nodesWithListener("mousedown")).toHaveLength(0);
  });
});

describe("StepSequencer", () => {
  test("clicking a cell reports row, step, and the flipped state", () => {
    const seen: Array<[number, number, boolean]> = [];
    const pattern = [
      [true, false, false, false],
      [false, false, true, false],
    ];
    render(<StepSequencer pattern={pattern} onToggle={(r, s, next) => seen.push([r, s, next])} />);

    const cells = nodesWithListener("click");
    expect(cells).toHaveLength(8);

    dispatch({ kind: "event", nodeId: cells[2], type: "click" }); // row 0, step 2 — off → on
    dispatch({ kind: "event", nodeId: cells[6], type: "click" }); // row 1, step 2 — on → off
    expect(seen).toEqual([
      [0, 2, true],
      [1, 2, false],
    ]);
  });

  test("disabled grid registers no click handlers", () => {
    render(<StepSequencer pattern={[[false, false]]} disabled onToggle={() => {}} />);
    expect(nodesWithListener("click")).toHaveLength(0);
  });
});

describe("ProgressBar indeterminate", () => {
  test("renders a sweeping segment that moves over time", async () => {
    render(<ProgressBar value={0} indeterminate width={200} />);

    const lefts = () =>
      (propsOps() as any[])
        .map((op) => op[2]?.style?.left)
        .filter((left) => typeof left === "number");

    const before = lefts().length;
    expect(before).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 60));
    const all = lefts();
    expect(new Set(all).size).toBeGreaterThan(1); // the segment moved
  });
});
