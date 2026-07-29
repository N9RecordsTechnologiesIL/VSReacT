import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
const bufferCalls: Array<[number, number, number]> = [];
const commitCalls: number[] = [];

// __vsreact_flush is a shared global that other suites (hostConfig.test) also
// stub. Claim it per-test and restore afterwards so file execution order can't
// cross-contaminate. The canvas-only globals don't collide, so they're static.
(globalThis as Record<string, any>).__vsreact_canvasBuffer = (id: number, w: number, h: number) => {
  bufferCalls.push([id, w, h]);
  return new ArrayBuffer(w * h * 4);
};
(globalThis as Record<string, any>).__vsreact_canvasCommit = (id: number) => commitCalls.push(id);

import { render, unmount, Canvas } from "./index";

const allOps = () => batches.flat();
const opsNamed = (name: string) => allOps().filter((op: any) => op[0] === name);
const canvasId = () => (opsNamed("create").find((op: any) => op[2] === "canvas") as any)[1];

let prevFlush: unknown;

beforeEach(() => {
  prevFlush = (globalThis as Record<string, any>).__vsreact_flush;
  (globalThis as Record<string, any>).__vsreact_flush = (json: string) => batches.push(JSON.parse(json));
  unmount();
  batches.length = 0;
  bufferCalls.length = 0;
  commitCalls.length = 0;
});

afterEach(() => {
  (globalThis as Record<string, any>).__vsreact_flush = prevFlush;
});

describe("Canvas", () => {
  test("creates a vs-canvas host node", () => {
    render(<Canvas width={4} height={3} draw={() => {}} />);
    expect(opsNamed("create").some((op: any) => op[2] === "canvas")).toBe(true);
  });

  test("draw gets an RGBA buffer sized width*height*4, then commit fires", () => {
    let seen: Uint8ClampedArray | null = null;
    render(<Canvas width={4} height={3} draw={(px) => { seen = px; }} />);
    const id = canvasId();
    expect(bufferCalls).toEqual([[id, 4, 3]]);
    expect(seen).toBeInstanceOf(Uint8ClampedArray);
    expect(seen!.length).toBe(4 * 3 * 4);
    expect(commitCalls).toEqual([id]);
  });

  test("redraws only when deps change", () => {
    let draws = 0;
    const el = (dep: number) => <Canvas width={2} height={2} deps={[dep]} draw={() => { draws++; }} />;
    render(el(1));
    render(el(1));
    expect(draws).toBe(1);
    render(el(2));
    expect(draws).toBe(2);
  });
});
