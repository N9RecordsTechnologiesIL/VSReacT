// The bundle/module version handshake. The failure it guards against is
// invisible — a module below protocol 2 ignores patchProps in Release without
// a word, so the UI paints once and freezes — which is why the fallback path
// and its warning are both worth pinning down.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const batches: unknown[][][] = [];
(globalThis as Record<string, any>).__vsreact_flush = (json: string) => {
  batches.push(JSON.parse(json));
};

import { PROTOCOL_VERSION, nativeProtocol, requireProtocol, resetProtocolWarnings } from "./protocol";

const g = globalThis as Record<string, unknown>;

function setNativeProtocol(level: number | undefined): void {
  if (level === undefined) delete g.__vsreact_protocol;
  else g.__vsreact_protocol = level;
}

/** Run `body` with console.warn captured. */
function capturingWarnings(body: () => void): string[] {
  const lines: string[] = [];
  const previous = console.warn;
  console.warn = (...args: unknown[]) => void lines.push(args.join(" "));
  try {
    body();
  } finally {
    console.warn = previous;
  }
  return lines;
}

beforeEach(() => {
  resetProtocolWarnings();
  batches.length = 0;
});

afterEach(() => {
  setNativeProtocol(undefined);
  resetProtocolWarnings();
});

describe("nativeProtocol", () => {
  test("reads the level the module published", () => {
    setNativeProtocol(1);
    expect(nativeProtocol()).toBe(1);
    setNativeProtocol(7);
    expect(nativeProtocol()).toBe(7);
  });

  test("outside a plugin, assumes current rather than pessimising the wire", () => {
    // No __vsreact_setTimer here, so runtime.isHosted is false: there is no
    // native side to be too old, and nothing consuming the ops.
    setNativeProtocol(undefined);
    expect(nativeProtocol()).toBe(PROTOCOL_VERSION);
  });

  test("a non-numeric global is ignored", () => {
    g.__vsreact_protocol = "2";
    expect(nativeProtocol()).toBe(PROTOCOL_VERSION);
    g.__vsreact_protocol = Number.NaN;
    expect(nativeProtocol()).toBe(PROTOCOL_VERSION);
  });
});

describe("requireProtocol", () => {
  test("passes at or above the required level, fails below", () => {
    setNativeProtocol(2);
    expect(requireProtocol(2, "patchProps")).toBe(true);
    setNativeProtocol(3);
    expect(requireProtocol(2, "patchProps")).toBe(true);
    setNativeProtocol(1);
    capturingWarnings(() => expect(requireProtocol(2, "patchProps")).toBe(false));
  });

  test("warns once per feature, naming both levels and the fix", () => {
    setNativeProtocol(1);

    const lines = capturingWarnings(() => {
      requireProtocol(2, "patchProps");
      requireProtocol(2, "patchProps");
      requireProtocol(2, "patchProps");
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("protocol 1");
    expect(lines[0]).toContain(String(PROTOCOL_VERSION));
    expect(lines[0]).toContain("patchProps");
    expect(lines[0]).toContain("GIT_TAG");
  });

  test("a second feature gets its own warning", () => {
    setNativeProtocol(1);

    const lines = capturingWarnings(() => {
      requireProtocol(2, "patchProps");
      requireProtocol(2, "something else");
    });

    expect(lines).toHaveLength(2);
  });

  test("never warns when the module is new enough", () => {
    setNativeProtocol(2);
    expect(capturingWarnings(() => requireProtocol(2, "patchProps"))).toHaveLength(0);
  });
});
