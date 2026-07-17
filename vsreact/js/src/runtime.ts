// Environment shims for QuickJS. This module MUST be imported before react —
// it provides the timer/console/microtask facilities react and the scheduler
// expect. The __vsreact_* natives are registered by the C++ host; when absent
// (e.g. under `bun test`) the shims fall back to the platform implementations.

export type NativeFns = {
  __vsreact_flush(json: string): void;
  __vsreact_nativeCall(name: string, argsJson: string): string;
  __vsreact_log(level: string, msg: string): void;
  __vsreact_setTimer(id: number, ms: number): void;
  __vsreact_clearTimer(id: number): void;
};

const g = globalThis as typeof globalThis & Partial<NativeFns> & Record<string, unknown>;

export const isHosted = typeof g.__vsreact_setTimer === "function";

interface TimerEntry {
  cb: (...args: unknown[]) => void;
  args: unknown[];
  intervalMs?: number;
}

let nextTimerId = 1;
const timers = new Map<number, TimerEntry>();

/** Called by bridge.ts when C++ dispatches {kind:"timer",id}. */
export function fireTimer(id: number): void {
  const entry = timers.get(id);
  if (!entry) return;

  if (entry.intervalMs !== undefined) g.__vsreact_setTimer!(id, entry.intervalMs);
  else timers.delete(id);

  entry.cb(...entry.args);
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.message}\n${value.stack ?? ""}`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

if (isHosted) {
  g.setTimeout = ((cb: TimerEntry["cb"], ms = 0, ...args: unknown[]) => {
    const id = nextTimerId++;
    timers.set(id, { cb, args });
    g.__vsreact_setTimer!(id, Math.max(0, ms | 0));
    return id;
  }) as typeof setTimeout;

  g.setInterval = ((cb: TimerEntry["cb"], ms = 0, ...args: unknown[]) => {
    const id = nextTimerId++;
    const intervalMs = Math.max(1, ms | 0);
    timers.set(id, { cb, args, intervalMs });
    g.__vsreact_setTimer!(id, intervalMs);
    return id;
  }) as typeof setInterval;

  g.clearTimeout = g.clearInterval = ((id?: number) => {
    if (id !== undefined && timers.delete(id)) g.__vsreact_clearTimer!(id);
  }) as typeof clearTimeout;

  const makeLog =
    (level: string) =>
    (...args: unknown[]) =>
      g.__vsreact_log!(level, args.map(stringify).join(" "));

  g.console = {
    log: makeLog("log"),
    info: makeLog("info"),
    debug: makeLog("debug"),
    warn: makeLog("warn"),
    error: makeLog("error"),
  } as Console;

  g.queueMicrotask ??= (cb: VoidFunction) => {
    Promise.resolve().then(cb);
  };

  g.performance ??= { now: () => Date.now() } as Performance;
  // Typed loosely on purpose: the dist build has no Node/Bun types, and the
  // shim only exists for libraries that probe NODE_ENV.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  g.process ??= { env: { NODE_ENV: "production" } } as any;
  g.self ??= g as unknown as Window & typeof globalThis;
  g.global ??= g;
}
