// The PostHog client for VSReacT plugins. QuickJS has no network, so the
// client captures + batches in JS and hands batches to the native
// PostHogBridge (posthog:send), which posts them over HTTPS off-thread.
// The API key lives in C++ — JS never sees it.

import { native } from "@vsreact/core";

export interface PostHogInitOptions {
  /** Send when this many events are queued. Default 10. */
  flushAt?: number;
  /** Send after this long even if the queue is small. Default 10s. */
  flushIntervalMs?: number;
  /** Extra properties stamped on every event (plugin version, host…). */
  defaultProperties?: Record<string, unknown>;
  /** Start with capturing disabled (a user privacy setting the plugin
      persists). Default false. */
  optOut?: boolean;
  /** Scrub or veto events before they queue: return the (edited) event
      to keep it, or null to drop it. */
  beforeSend?: (event: PostHogEvent) => PostHogEvent | null;
  /** Keep only this fraction of sessions (0..1): the whole client goes
      silent for the rest, and kept events carry $sample_rate so
      PostHog can weight counts. Default 1 (everyone). */
  sampleRate?: number;
  /** Queue cap — oldest events drop first if the bridge stops draining
      (a misconfigured native side shouldn't grow memory). Default 1000. */
  maxQueueSize?: number;
  /** Property keys stripped from every event before `beforeSend` runs —
      a mechanical denylist for paths, emails, project names. */
  propertyDenylist?: string[];
}

export interface PostHogEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

const LIB = "@vsreact/posthog";
const LIB_VERSION = "0.0.5";

function uuid(): string {
  // RFC4122-ish v4 — good enough for anonymous ids inside a plugin.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class PostHogClient {
  private distinctId = "";
  private sessionId = "";
  private superProperties: Record<string, unknown> = {};
  private queue: PostHogEvent[] = [];
  private flushAt = 10;
  private flushIntervalMs = 10_000;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private initialised = false;
  private isOptedOut = false;
  private isDebug = false;
  private groups: Record<string, string> = {};
  private beforeSend: ((event: PostHogEvent) => PostHogEvent | null) | null = null;
  private sampleRate = 1;
  private sampledOut = false;
  private maxQueueSize = 1000;
  private timings: Map<string, number> = new Map();
  private propertyDenylist: string[] = [];
  private isShutDown = false;

  /** Pulls the persistent distinct id from the native PostHogBridge and
      starts a session. Safe to call once at app start. */
  init(options: PostHogInitOptions = {}): void {
    this.flushAt = options.flushAt ?? 10;
    this.flushIntervalMs = options.flushIntervalMs ?? 10_000;
    this.isOptedOut = options.optOut ?? false;
    this.beforeSend = options.beforeSend ?? null;
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.propertyDenylist = options.propertyDenylist ?? [];
    this.isShutDown = false;
    this.sampleRate = Math.min(1, Math.max(0, options.sampleRate ?? 1));
    this.sampledOut = this.sampleRate < 1 && Math.random() >= this.sampleRate;
    if (this.isDebug && this.sampledOut) console.log("[posthog] session sampled out");
    if (options.defaultProperties) this.superProperties = { ...options.defaultProperties };

    const config = native.call("posthog:config");
    this.distinctId = String(config?.distinctId ?? "") || uuid();
    this.sessionId = uuid();
    this.initialised = true;
  }

  get ready(): boolean {
    return this.initialised;
  }

  getDistinctId(): string {
    return this.distinctId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /** Properties stamped on every subsequent event. */
  register(properties: Record<string, unknown>): void {
    this.superProperties = { ...this.superProperties, ...properties };
  }

  /** Removes one registered super property. */
  unregister(key: string): void {
    delete this.superProperties[key];
  }

  /** Stops capturing (a user privacy setting) — new events are dropped
      and anything queued is discarded unsent. */
  optOut(): void {
    this.isOptedOut = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue.length = 0;
  }

  /** Resumes capturing after optOut(). */
  optIn(): void {
    this.isOptedOut = false;
  }

  get optedOut(): boolean {
    return this.isOptedOut;
  }

  /** Logs every capture and flush to the console — dev builds only. */
  debug(on = true): void {
    this.isDebug = on;
  }

  /** Starts a named stopwatch; `timeEnd` captures the elapsed time. */
  time(name: string): void {
    this.timings.set(name, Date.now());
  }

  /** Captures `name { duration_ms }` since the matching `time(name)` —
      preset load times, render passes, analysis sweeps. */
  timeEnd(name: string, properties: Record<string, unknown> = {}): void {
    const startedAt = this.timings.get(name);
    if (startedAt === undefined) return;
    this.timings.delete(name);
    this.capture(name, { duration_ms: Date.now() - startedAt, ...properties });
  }

  /** Captures a `$screen` event — PostHog's screen analytics for the
      plugin's panels: `posthog.screen("Settings")`. */
  screen(name: string, properties: Record<string, unknown> = {}): void {
    this.capture("$screen", { $screen_name: name, ...properties });
  }

  /** Editor teardown: flushes everything queued, then goes silent —
      captures after shutdown are dropped (call from your unmount path
      after the last events are in). */
  shutdown(): void {
    this.flush();
    this.isShutDown = true;
    this.timings.clear();
  }

  capture(event: string, properties: Record<string, unknown> = {}): void {
    if (this.isOptedOut || this.sampledOut || this.isShutDown) return;
    if (!this.initialised) this.init();

    let entry: PostHogEvent | null = {
      event,
      properties: {
        ...this.superProperties,
        ...(Object.keys(this.groups).length > 0 ? { $groups: { ...this.groups } } : {}),
        ...properties,
        ...(this.sampleRate < 1 ? { $sample_rate: this.sampleRate } : {}),
        distinct_id: this.distinctId,
        $session_id: this.sessionId,
        $lib: LIB,
        $lib_version: LIB_VERSION,
      },
      timestamp: new Date().toISOString(),
    };

    for (const key of this.propertyDenylist) delete entry.properties[key];

    if (this.beforeSend !== null) {
      entry = this.beforeSend(entry);
      if (entry === null) {
        if (this.isDebug) console.log(`[posthog] beforeSend dropped "${event}"`);
        return;
      }
    }

    if (this.isDebug) console.log(`[posthog] capture "${entry.event}"`, entry.properties);
    this.queue.push(entry);
    while (this.queue.length > this.maxQueueSize) {
      const dropped = this.queue.shift();
      if (this.isDebug) console.log(`[posthog] queue full — dropped "${dropped?.event}"`);
    }

    if (this.queue.length >= this.flushAt) this.flush();
    else this.armTimer();
  }

  /** Ties the anonymous id to a known user. */
  identify(newDistinctId: string, setProperties?: Record<string, unknown>): void {
    const previous = this.distinctId;
    this.capture("$identify", {
      distinct_id: newDistinctId,
      $anon_distinct_id: previous,
      ...(setProperties ? { $set: setProperties } : {}),
    });
    this.distinctId = newDistinctId;
  }

  /** Links another id to this user (a licence key, an old install id). */
  alias(aliasId: string): void {
    this.capture("$create_alias", { alias: aliasId, distinct_id: this.distinctId });
  }

  /** Sets person properties. */
  set(properties: Record<string, unknown>): void {
    this.capture("$set", { $set: properties });
  }

  /** Sets person properties only if they are not already set. */
  setOnce(properties: Record<string, unknown>): void {
    this.capture("$set_once", { $set_once: properties });
  }

  /** Group analytics: every later event carries `$groups[type] = key`,
      and the group's own properties update via $groupidentify —
      `posthog.group("studio", "abbey-road", { seats: 4 })`. */
  group(type: string, key: string, groupProperties?: Record<string, unknown>): void {
    this.groups[type] = key;
    this.capture("$groupidentify", {
      $group_type: type,
      $group_key: key,
      ...(groupProperties ? { $group_set: groupProperties } : {}),
    });
  }

  /** Reports an error to PostHog error tracking as a `$exception`
      event. Accepts anything thrown; Errors keep their name, message,
      and (QuickJS) stack. */
  captureException(error: unknown, extraProperties: Record<string, unknown> = {}): void {
    const isError = error instanceof Error;
    const type = isError ? error.name || "Error" : "Error";
    const value = isError ? error.message : String(error);
    const stack = isError && typeof error.stack === "string" ? error.stack : undefined;

    this.capture("$exception", {
      $exception_list: [
        {
          type,
          value,
          mechanism: { handled: true, synthetic: false },
          ...(stack !== undefined ? { stacktrace: { type: "raw", value: stack } } : {}),
        },
      ],
      $exception_level: "error",
      ...extraProperties,
    });
  }

  /** New anonymous identity + fresh session; clears super properties
      and groups. */
  reset(): void {
    this.flush();
    this.distinctId = uuid();
    this.sessionId = uuid();
    this.superProperties = {};
    this.groups = {};
  }

  /** Hands everything queued to the native bridge immediately. */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    if (this.isDebug) console.log(`[posthog] flush ${batch.length} event(s)`);
    native.call("posthog:send", { batch });
  }

  private armTimer(): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.flushIntervalMs);
  }
}

/** The client — one per plugin instance, like posthog-js. */
export const posthog = new PostHogClient();
