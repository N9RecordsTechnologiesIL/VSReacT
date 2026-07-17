import { beforeEach, describe, expect, test } from "bun:test";

const nativeCalls: Array<{ name: string; args: any }> = [];

(globalThis as Record<string, any>).__vsreact_flush = () => {};
(globalThis as Record<string, any>).__vsreact_nativeCall = (name: string, argsJson: string) => {
  const args = JSON.parse(argsJson);
  nativeCalls.push({ name, args });
  if (name === "posthog:config")
    return JSON.stringify({ distinctId: "anon-123", host: "https://eu.i.posthog.com" });
  return "null";
};

import { render, unmount, View } from "@vsreact/core";
import { posthog, useCaptureOnMount, usePostHogParameters } from "./index";

const sends = () => nativeCalls.filter((c) => c.name === "posthog:send");
const dispatch = (msg: unknown) =>
  (globalThis as Record<string, any>).__vsreact_dispatch(JSON.stringify(msg));

beforeEach(() => {
  unmount();
  nativeCalls.length = 0;
  posthog.flush(); // drain anything from the previous test
  nativeCalls.length = 0;
  posthog.init({ flushAt: 10, flushIntervalMs: 60_000 });
  nativeCalls.length = 0;
});

describe("posthog client", () => {
  test("capture enriches events with identity, session, and lib fields", () => {
    posthog.capture("plugin_opened", { preset: "Init" });
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch).toHaveLength(1);
    const event = batch[0];
    expect(event.event).toBe("plugin_opened");
    expect(event.properties.preset).toBe("Init");
    expect(event.properties.distinct_id).toBe("anon-123");
    expect(event.properties.$lib).toBe("@vsreact/posthog");
    expect(typeof event.properties.$session_id).toBe("string");
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("flushAt batches: nothing sends early, everything sends together", () => {
    posthog.init({ flushAt: 3, flushIntervalMs: 60_000 });
    nativeCalls.length = 0;

    posthog.capture("a");
    posthog.capture("b");
    expect(sends()).toHaveLength(0);

    posthog.capture("c");
    expect(sends()).toHaveLength(1);
    expect(sends()[0].args.batch).toHaveLength(3);
  });

  test("the interval timer flushes small queues", async () => {
    posthog.init({ flushAt: 100, flushIntervalMs: 20 });
    nativeCalls.length = 0;

    posthog.capture("slow_burn");
    expect(sends()).toHaveLength(0);

    await new Promise((r) => setTimeout(r, 50));
    expect(sends()).toHaveLength(1);
  });

  test("register stamps super properties; identify swaps identity", () => {
    posthog.register({ plugin_version: "1.2.0" });
    posthog.capture("x");
    posthog.identify("user-9", { plan: "pro" });
    posthog.capture("y");
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch[0].properties.plugin_version).toBe("1.2.0");
    expect(batch[1].event).toBe("$identify");
    expect(batch[1].properties.$anon_distinct_id).toBe("anon-123");
    expect(batch[1].properties.$set).toEqual({ plan: "pro" });
    expect(batch[2].properties.distinct_id).toBe("user-9");
  });
});

describe("posthog hooks", () => {
  test("useCaptureOnMount fires once", async () => {
    function Panel() {
      useCaptureOnMount("settings_opened", { tab: "eq" });
      return <View />;
    }

    render(<Panel />);
    await new Promise((r) => setTimeout(r, 0));
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch.filter((e: any) => e.event === "settings_opened")).toHaveLength(1);
    expect(batch[0].properties.tab).toBe("eq");
  });

  test("usePostHogParameters debounces per parameter", async () => {
    function App() {
      usePostHogParameters({ debounceMs: 15 });
      return <View />;
    }

    render(<App />);
    await new Promise((r) => setTimeout(r, 0));

    // three rapid tweaks of gain + one of pan
    dispatch({ kind: "native", name: "param", payload: { id: "gain", value: 0.2, text: "-20 dB" } });
    dispatch({ kind: "native", name: "param", payload: { id: "gain", value: 0.4, text: "-10 dB" } });
    dispatch({ kind: "native", name: "param", payload: { id: "gain", value: 0.6, text: "-2 dB" } });
    dispatch({ kind: "native", name: "param", payload: { id: "pan", value: 0.5, text: "C" } });

    await new Promise((r) => setTimeout(r, 50));
    posthog.flush();

    const events = sends()
      .flatMap((s) => s.args.batch)
      .filter((e: any) => e.event === "parameter_changed");
    expect(events).toHaveLength(2); // one per parameter, not per tweak
    const gain = events.find((e: any) => e.properties.parameter_id === "gain");
    expect(gain.properties.value).toBeCloseTo(0.6); // the settled value
    expect(events.some((e: any) => e.properties.parameter_id === "pan")).toBe(true);
  });
});
