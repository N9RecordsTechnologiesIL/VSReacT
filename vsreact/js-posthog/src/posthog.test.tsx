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

import { render, unmount, View, Text } from "@vsreact/core";
import {
  posthog,
  useCaptureOnMount,
  useCaptureOnUnmount,
  useEditorSession,
  useScreen,
  usePostHogParameters,
  PostHogErrorBoundary,
} from "./index";

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

  test("unregister removes one super property", () => {
    posthog.register({ plugin_version: "1.2.0", host: "Ableton" });
    posthog.unregister("host");
    posthog.capture("x");
    posthog.flush();

    const event = sends()[0].args.batch[0];
    expect(event.properties.plugin_version).toBe("1.2.0");
    expect("host" in event.properties).toBe(false);
  });

  test("optOut drops new events and discards the queue; optIn resumes", () => {
    posthog.capture("queued_before");
    posthog.optOut();
    expect(posthog.optedOut).toBe(true);

    posthog.capture("while_out");
    posthog.flush();
    expect(sends()).toHaveLength(0); // queue was discarded, capture dropped

    posthog.optIn();
    posthog.capture("after_optin");
    posthog.flush();
    const events = sends().flatMap((s) => s.args.batch);
    expect(events.map((e: any) => e.event)).toEqual(["after_optin"]);
  });

  test("captureException shapes a $exception event for error tracking", () => {
    const boom = new TypeError("cannot read tone of undefined");
    posthog.captureException(boom, { panel: "eq" });
    posthog.captureException("string failure");
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch[0].event).toBe("$exception");
    const first = batch[0].properties.$exception_list[0];
    expect(first.type).toBe("TypeError");
    expect(first.value).toBe("cannot read tone of undefined");
    expect(first.mechanism).toEqual({ handled: true, synthetic: false });
    expect(batch[0].properties.panel).toBe("eq");
    expect(batch[0].properties.$exception_level).toBe("error");

    const second = batch[1].properties.$exception_list[0];
    expect(second.type).toBe("Error");
    expect(second.value).toBe("string failure");
  });

  test("alias links the current identity", () => {
    posthog.alias("licence-XYZ");
    posthog.flush();

    const event = sends()[0].args.batch[0];
    expect(event.event).toBe("$create_alias");
    expect(event.properties.alias).toBe("licence-XYZ");
    expect(event.properties.distinct_id).toBe("anon-123");
  });

  test("setOnce writes $set_once person properties", () => {
    posthog.setOnce({ first_seen_version: "1.2.0" });
    posthog.flush();

    const event = sends()[0].args.batch[0];
    expect(event.event).toBe("$set_once");
    expect(event.properties.$set_once).toEqual({ first_seen_version: "1.2.0" });
  });

  test("group stamps $groups on later events and fires $groupidentify", () => {
    posthog.group("studio", "abbey-road", { seats: 4 });
    posthog.capture("mixdown");
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch[0].event).toBe("$groupidentify");
    expect(batch[0].properties.$group_type).toBe("studio");
    expect(batch[0].properties.$group_key).toBe("abbey-road");
    expect(batch[0].properties.$group_set).toEqual({ seats: 4 });
    expect(batch[1].properties.$groups).toEqual({ studio: "abbey-road" });

    posthog.reset();
    posthog.capture("after_reset");
    posthog.flush();
    const after = sends().flatMap((s) => s.args.batch).find((e: any) => e.event === "after_reset");
    expect(after.properties.$groups).toBeUndefined();
  });

  test("beforeSend can scrub and veto events", () => {
    posthog.init({
      flushAt: 10,
      flushIntervalMs: 60_000,
      beforeSend: (event) => {
        if (event.event === "secret") return null;
        delete event.properties.password;
        return event;
      },
    });
    nativeCalls.length = 0;

    posthog.capture("secret");
    posthog.capture("kept", { password: "hunter2", ok: true });
    posthog.flush();

    const batch = sends()[0].args.batch;
    expect(batch).toHaveLength(1);
    expect(batch[0].event).toBe("kept");
    expect("password" in batch[0].properties).toBe(false);
    expect(batch[0].properties.ok).toBe(true);
  });

  test("time/timeEnd capture a duration; unmatched timeEnd is a no-op", async () => {
    posthog.time("preset_load");
    await new Promise((r) => setTimeout(r, 15));
    posthog.timeEnd("preset_load", { preset: "Init" });
    posthog.timeEnd("never_started");
    posthog.flush();

    const events = sends().flatMap((s) => s.args.batch);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("preset_load");
    expect(events[0].properties.duration_ms).toBeGreaterThanOrEqual(10);
    expect(events[0].properties.preset).toBe("Init");
  });

  test("sampleRate 0 silences the client; kept sessions stamp $sample_rate", () => {
    posthog.init({ flushAt: 10, flushIntervalMs: 60_000, sampleRate: 0 });
    nativeCalls.length = 0;
    posthog.capture("dropped");
    posthog.flush();
    expect(sends()).toHaveLength(0);

    posthog.init({ flushAt: 10, flushIntervalMs: 60_000, sampleRate: 0.999999 });
    nativeCalls.length = 0;
    posthog.capture("kept");
    posthog.flush();
    const kept = sends().flatMap((s) => s.args.batch);
    expect(kept).toHaveLength(1);
    expect(kept[0].properties.$sample_rate).toBeCloseTo(0.999999);
  });

  test("maxQueueSize drops the oldest events first", () => {
    posthog.init({ flushAt: 100, flushIntervalMs: 60_000, maxQueueSize: 3 });
    nativeCalls.length = 0;

    posthog.capture("one");
    posthog.capture("two");
    posthog.capture("three");
    posthog.capture("four");
    posthog.flush();

    const events = sends().flatMap((s) => s.args.batch);
    expect(events.map((e: any) => e.event)).toEqual(["two", "three", "four"]);
  });

  test("screen captures $screen with the panel name", () => {
    posthog.screen("Settings", { tab: "eq" });
    posthog.flush();

    const event = sends()[0].args.batch[0];
    expect(event.event).toBe("$screen");
    expect(event.properties.$screen_name).toBe("Settings");
    expect(event.properties.tab).toBe("eq");
  });

  test("propertyDenylist strips keys before beforeSend sees them", () => {
    const seenByBeforeSend: string[] = [];
    posthog.init({
      flushAt: 10,
      flushIntervalMs: 60_000,
      propertyDenylist: ["project_path"],
      beforeSend: (event) => {
        seenByBeforeSend.push(...Object.keys(event.properties));
        return event;
      },
    });
    nativeCalls.length = 0;

    posthog.capture("saved", { project_path: "C:/secret/mix.flp", ok: true });
    posthog.flush();

    const event = sends()[0].args.batch[0];
    expect("project_path" in event.properties).toBe(false);
    expect(event.properties.ok).toBe(true);
    expect(seenByBeforeSend).not.toContain("project_path");
  });

  test("shutdown flushes, then drops all later captures", () => {
    posthog.capture("last_words");
    posthog.shutdown();
    expect(sends()).toHaveLength(1); // the shutdown flush

    posthog.capture("from_beyond");
    posthog.flush();
    const events = sends().flatMap((s) => s.args.batch);
    expect(events.map((e: any) => e.event)).toEqual(["last_words"]);
  });

  test("getSessionId is stable within a session", () => {
    const a = posthog.getSessionId();
    posthog.capture("x");
    expect(posthog.getSessionId()).toBe(a);
    expect(a.length).toBeGreaterThan(0);
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

  test("useCaptureOnUnmount fires once with the mounted duration", async () => {
    function Panel() {
      useCaptureOnUnmount("settings_closed", { tab: "eq" });
      return <View />;
    }

    render(<Panel />);
    await new Promise((r) => setTimeout(r, 10));
    unmount();
    await new Promise((r) => setTimeout(r, 10));
    posthog.flush();

    const events = sends()
      .flatMap((s) => s.args.batch)
      .filter((e: any) => e.event === "settings_closed");
    expect(events).toHaveLength(1);
    expect(events[0].properties.tab).toBe("eq");
    expect(events[0].properties.duration_ms).toBeGreaterThanOrEqual(0);
  });

  test("useEditorSession brackets the editor lifetime and self-flushes", async () => {
    function App() {
      useEditorSession({ properties: { preset: "Init" } });
      return <View />;
    }

    render(<App />);
    await new Promise((r) => setTimeout(r, 10));
    unmount();
    await new Promise((r) => setTimeout(r, 10));
    // No manual flush — the end event must flush itself.

    const events = sends().flatMap((s) => s.args.batch);
    const start = events.find((e: any) => e.event === "editor_session_start");
    const end = events.find((e: any) => e.event === "editor_session_end");
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    expect(end.properties.duration_ms).toBeGreaterThanOrEqual(0);
    expect(end.properties.preset).toBe("Init");
  });

  test("PostHogErrorBoundary captures render crashes and shows the fallback", async () => {
    function Bomb(): never {
      throw new Error("render exploded");
    }

    render(
      <PostHogErrorBoundary fallback={<Text>recovered</Text>} properties={{ area: "main" }}>
        <Bomb />
      </PostHogErrorBoundary>,
    );
    await new Promise((r) => setTimeout(r, 10));

    const events = sends().flatMap((s) => s.args.batch);
    const exception = events.find((e: any) => e.event === "$exception");
    expect(exception).toBeDefined();
    expect(exception.properties.$exception_list[0].value).toBe("render exploded");
    expect(exception.properties.area).toBe("main");
  });

  test("useScreen registers the panel on mount", async () => {
    function Panel() {
      useScreen("Compressor", { variant: "pro" });
      return <View />;
    }

    render(<Panel />);
    await new Promise((r) => setTimeout(r, 0));
    posthog.flush();

    const screens = sends()
      .flatMap((s) => s.args.batch)
      .filter((e: any) => e.event === "$screen");
    expect(screens).toHaveLength(1);
    expect(screens[0].properties.$screen_name).toBe("Compressor");
    expect(screens[0].properties.variant).toBe("pro");
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
