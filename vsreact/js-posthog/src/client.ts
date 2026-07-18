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
}

export interface PostHogEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

const LIB = "@vsreact/posthog";
const LIB_VERSION = "0.0.2";

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

  /** Pulls the persistent distinct id from the native PostHogBridge and
      starts a session. Safe to call once at app start. */
  init(options: PostHogInitOptions = {}): void {
    this.flushAt = options.flushAt ?? 10;
    this.flushIntervalMs = options.flushIntervalMs ?? 10_000;
    this.isOptedOut = options.optOut ?? false;
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

  capture(event: string, properties: Record<string, unknown> = {}): void {
    if (this.isOptedOut) return;
    if (!this.initialised) this.init();

    this.queue.push({
      event,
      properties: {
        ...this.superProperties,
        ...properties,
        distinct_id: this.distinctId,
        $session_id: this.sessionId,
        $lib: LIB,
        $lib_version: LIB_VERSION,
      },
      timestamp: new Date().toISOString(),
    });

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

  /** Sets person properties. */
  set(properties: Record<string, unknown>): void {
    this.capture("$set", { $set: properties });
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

  /** New anonymous identity + fresh session; clears super properties. */
  reset(): void {
    this.flush();
    this.distinctId = uuid();
    this.sessionId = uuid();
    this.superProperties = {};
  }

  /** Hands everything queued to the native bridge immediately. */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
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
