// CSS transitions and keyframe presets, driven from JS. When a commit changes
// a node whose style carries transitionDuration, the changed animatable keys
// tween from their *currently displayed* values instead of jumping; animate-*
// classes run keyframe loops.
//
// Every payload leaving this module goes through queueProps, which diffs
// against the node's last-sent props and emits a key-granular ["patchProps"]
// op — only the top-level keys that actually changed cross the bridge, and a
// removed key travels as null. A style-only change (one animation frame, one
// knob turn) therefore never re-ships an unchanged multi-megabyte image src,
// and a re-render that changed nothing sends nothing at all. The first send
// for a node is a full ["setProps"] (replace semantics on the C++ side), as
// is every send when the native module predates protocol 2 — see protocol.ts.
//
// Honest limit: native-side hover/active/focus style merges don't transition
// (they never round-trip through JS). Animate those with onMouseEnter state.

import { queueOp, flushOps } from "./bridge";
import { requireProtocol } from "./protocol";
import { Easing, type EasingFn } from "./animation";
import type { Style, StyleValue } from "./tw";

type Payload = Record<string, unknown> & { style?: Style };

export type TransitionEasingName = "linear" | "ease-in" | "ease-out" | "ease-in-out";

const easings: Record<TransitionEasingName, EasingFn> = {
  linear: Easing.linear,
  "ease-in": (t) => t * t * t,
  "ease-out": Easing.outCubic,
  "ease-in-out": Easing.inOutCubic,
};

const DEFAULT_EASING: TransitionEasingName = "ease-in-out";

// ── cubic-bezier(x1,y1,x2,y2) ──────────────────────────────────────────

const CUBIC_BEZIER =
  /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/;

/** One coordinate of the bezier with implicit P0=0, P3=1 at parameter t. */
function bezierAt(t: number, c1: number, c2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t;
}

/** dX/dt for Newton's step. */
function bezierSlope(t: number, c1: number, c2: number): number {
  const u = 1 - t;
  return 3 * u * u * c1 + 6 * u * t * (c2 - c1) + 3 * t * t * (1 - c2);
}

/** Build an EasingFn for the CSS cubic-bezier control points (P0=0,0 P3=1,1).
    Solves X(t)=x by Newton-Raphson seeded at x, with a bisection fallback when
    the slope is near zero or Newton escapes [0,1], then returns Y(t). */
function makeCubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const solveT = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i++) {
      const slope = bezierSlope(t, x1, x2);
      if (Math.abs(slope) < 1e-6) break;
      const err = bezierAt(t, x1, x2) - x;
      if (Math.abs(err) < 1e-7) return t;
      t -= err / slope;
      if (t < 0 || t > 1) break;
    }

    // Bisection fallback — X(t) is monotonic in t for valid CSS curves.
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 32; i++) {
      const err = bezierAt(t, x1, x2) - x;
      if (Math.abs(err) < 1e-7) return t;
      if (err > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return bezierAt(solveT(x), y1, y2);
  };
}

const easingCache = new Map<string, EasingFn>();

/** Resolve a `transitionEasing` string to an EasingFn. Accepts the four named
    easings and any CSS `cubic-bezier(x1,y1,x2,y2)` spec; anything else falls
    back to ease-in-out. Parsed curves are cached by their string. */
export function resolveEasing(name: string): EasingFn {
  const named = easings[name as TransitionEasingName];
  if (named !== undefined) return named;

  const cached = easingCache.get(name);
  if (cached !== undefined) return cached;

  const match = CUBIC_BEZIER.exec(name);
  const nums = match ? match.slice(1, 5).map(Number) : undefined;
  const easing =
    nums && nums.every(Number.isFinite)
      ? makeCubicBezier(nums[0], nums[1], nums[2], nums[3])
      : easings[DEFAULT_EASING];

  easingCache.set(name, easing);
  return easing;
}

/** Keys each transitionProperty group may animate. "colors" is any *Color/
    color key; "all" is every animatable difference. */
const transformKeys = ["rotate", "scale", "translateX", "translateY"];
const defaultKeys = [
  "color", "backgroundColor", "borderColor", "opacity",
  ...transformKeys, "blurRadius", "backdropBlurRadius",
];

function keysForProperty(property: string, candidates: string[]): string[] {
  switch (property) {
    case "all":
      return candidates;
    case "colors":
      return candidates.filter((k) => /color/i.test(k));
    case "opacity":
      return candidates.filter((k) => k === "opacity");
    case "transform":
      return candidates.filter((k) => transformKeys.includes(k));
    case "none":
      return [];
    default:
      return candidates.filter((k) => defaultKeys.includes(k));
  }
}

// ── value interpolation ────────────────────────────────────────────────

/** "#rrggbb" or "#rrggbbaa" → [r,g,b,a]; undefined for anything else. */
export function parseHexColor(value: unknown): [number, number, number, number] | undefined {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) return undefined;
  const n = (i: number) => parseInt(value.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), value.length === 9 ? n(7) : 255];
}

export function lerpHexColor(from: string, to: string, t: number): string {
  const a = parseHexColor(from)!;
  const b = parseHexColor(to)!;
  const hex = (i: number) =>
    Math.round(a[i] + (b[i] - a[i]) * t)
      .toString(16)
      .padStart(2, "0");
  const alpha = a[3] !== 255 || b[3] !== 255 ? hex(3) : "";
  return `#${hex(0)}${hex(1)}${hex(2)}${alpha}`;
}

function isAnimatablePair(from: StyleValue | undefined, to: StyleValue | undefined): boolean {
  if (typeof from === "number" && typeof to === "number") return Number.isFinite(from) && Number.isFinite(to);
  return parseHexColor(from) !== undefined && parseHexColor(to) !== undefined;
}

/** The animatable keys that differ between two styles, honoring the
    transitionProperty group. Exported for tests. */
export function transitionKeys(prev: Style, next: Style, property: string): string[] {
  const candidates = Object.keys(next).filter(
    (key) => prev[key] !== next[key] && isAnimatablePair(prev[key], next[key]),
  );
  return keysForProperty(property, candidates);
}

/** Interpolated patch for the animated keys at eased progress t. Exported
    for tests. */
export function interpolateStyle(from: Style, to: Style, keys: string[], t: number): Style {
  const patch: Style = {};
  for (const key of keys) {
    const a = from[key];
    const b = to[key];
    patch[key] =
      typeof a === "number" && typeof b === "number"
        ? a + (b - a) * t
        : lerpHexColor(String(a), String(b), t);
  }
  return patch;
}

// ── keyframe presets (animate-*) ───────────────────────────────────────

/** Style patch at loop phase t (0→1). Exported for tests. */
export const animationPresets: Record<string, (t: number) => Style> = {
  spin: (t) => ({ rotate: 360 * t }),
  pulse: (t) => ({ opacity: t < 0.5 ? 1 - t : t }), // 1 → 0.5 → 1
  bounce: (t) => {
    // dip up and settle, roughly the web's bounce
    const k = t < 0.5 ? Easing.outCubic(t * 2) : 1 - Easing.inOutCubic((t - 0.5) * 2);
    return { translateY: `${(-25 * k).toFixed(2)}%` };
  },
};

export const animationDurations: Record<string, number> = {
  spin: 1000,
  pulse: 2000,
  bounce: 1000,
};

// ── the shared frame driver ────────────────────────────────────────────

interface ActiveTransition {
  payload: Payload;
  from: Style;
  keys: string[];
  start: number;
  duration: number;
  easing: EasingFn;
}

interface ActiveAnimation {
  payload: Payload;
  name: string;
  start: number;
  duration: number;
}

const FRAME_MS = 16;
const lastStyles = new Map<number, Style>();
const activeTransitions = new Map<number, ActiveTransition>();
const activeAnimations = new Map<number, ActiveAnimation>();
let driver: ReturnType<typeof setInterval> | undefined;

// ── key-granular prop sending ──────────────────────────────────────────

const lastPayloads = new Map<number, Payload>();

/** Value equality for prop payloads: `===` first (module-const strings — the
    big data URIs — hit this), then structural for the JSON-ish objects and
    arrays styles are made of. */
export function payloadValueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== (b as unknown[]).length) return false;
    return a.every((item, i) => payloadValueEquals(item, (b as unknown[])[i]));
  }

  if (Array.isArray(b)) return false;

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    payloadValueEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/** The top-level keys of `next` that differ from `prev`, plus null for keys
    `prev` had and `next` dropped. Undefined when nothing changed. */
export function diffPayload(
  prev: Payload,
  next: Payload,
): Record<string, unknown> | undefined {
  let patch: Record<string, unknown> | undefined;

  for (const key of Object.keys(next)) {
    if (!payloadValueEquals(prev[key], next[key])) (patch ??= {})[key] = next[key];
  }

  for (const key of Object.keys(prev)) {
    if (!(key in next)) (patch ??= {})[key] = null;
  }

  return patch;
}

/** Every prop send funnels through here: full setProps the first time a node
    is seen, a diffed patchProps after — or nothing when nothing changed. */
function queueProps(nodeId: number, payload: Payload): void {
  const prev = lastPayloads.get(nodeId);
  lastPayloads.set(nodeId, payload);

  if (prev === undefined) {
    queueOp(["setProps", nodeId, payload]);
    return;
  }

  const patch = diffPayload(prev, payload);
  if (patch === undefined) return;

  // A module below protocol 2 drops patchProps on the floor — silently, in
  // Release — which would freeze the UI after its first frame. setProps is a
  // strict superset, so fall back to replacing the payload wholesale. Skipping
  // the send when nothing changed is safe at either level.
  if (requireProtocol(2, "prop diffing (patchProps)")) queueOp(["patchProps", nodeId, patch]);
  else queueOp(["setProps", nodeId, payload]);
}

function ensureDriver(): void {
  if (driver !== undefined) return;
  driver = setInterval(tick, FRAME_MS);
}

function stopDriverIfIdle(): void {
  if (driver !== undefined && activeTransitions.size === 0 && activeAnimations.size === 0) {
    clearInterval(driver);
    driver = undefined;
  }
}

function send(nodeId: number, payload: Payload, patch: Style): void {
  // Through the diffing funnel: a frame whose interpolated values didn't move
  // (a settled spring, a coarse easing plateau) costs nothing on the bridge.
  queueProps(nodeId, { ...payload, style: { ...payload.style, ...patch } });
}

function tick(): void {
  const now = Date.now();

  for (const [nodeId, tr] of [...activeTransitions]) {
    const t = Math.min(1, Math.max(0, (now - tr.start) / tr.duration));
    const target = tr.payload.style ?? {};
    send(nodeId, tr.payload, interpolateStyle(tr.from, target, tr.keys, tr.easing(t)));

    if (t >= 1) {
      activeTransitions.delete(nodeId);
      lastStyles.set(nodeId, target);
    }
  }

  for (const [nodeId, anim] of activeAnimations) {
    const phase = ((now - anim.start) % anim.duration) / anim.duration;
    send(nodeId, anim.payload, animationPresets[anim.name](phase));
  }

  flushOps();
  stopDriverIfIdle();
}

/** The currently displayed style for a node (mid-flight interpolation when a
    transition is running, else the last committed style). */
function displayedStyle(nodeId: number): Style | undefined {
  const tr = activeTransitions.get(nodeId);
  if (!tr) return lastStyles.get(nodeId);
  const t = Math.min(1, Math.max(0, (Date.now() - tr.start) / tr.duration));
  return { ...tr.payload.style, ...interpolateStyle(tr.from, tr.payload.style ?? {}, tr.keys, tr.easing(t)) };
}

/** hostConfig's single entry point: queue this commit's setProps, animated
    when the style asks for it. */
export function commitProps(nodeId: number, payload: Payload): void {
  const next = payload.style ?? {};
  const prev = displayedStyle(nodeId);
  lastStyles.set(nodeId, next);

  // Keyframe preset loops (animate-*).
  const name = typeof next.animationName === "string" ? next.animationName : undefined;

  if (name !== undefined && animationPresets[name] !== undefined) {
    const running = activeAnimations.get(nodeId);
    const duration =
      typeof next.animationDuration === "number" && next.animationDuration > 0
        ? next.animationDuration
        : animationDurations[name];

    activeAnimations.set(nodeId, {
      payload,
      name,
      duration,
      // A re-render mid-loop keeps the phase; a fresh class starts at 0.
      start: running !== undefined && running.name === name ? running.start : Date.now(),
    });
    ensureDriver();
    queueProps(nodeId, payload);
    return;
  }

  if (activeAnimations.delete(nodeId)) stopDriverIfIdle();

  // Property transitions.
  const duration = typeof next.transitionDuration === "number" ? next.transitionDuration : 0;
  const property = typeof next.transitionProperty === "string" ? next.transitionProperty : "default";

  if (prev !== undefined && duration > 0 && property !== "none") {
    const keys = transitionKeys(prev, next, property);

    if (keys.length > 0) {
      const from: Style = {};
      for (const key of keys) from[key] = prev[key];

      const delay = typeof next.transitionDelay === "number" ? next.transitionDelay : 0;

      activeTransitions.set(nodeId, {
        payload,
        from,
        keys,
        start: Date.now() + delay,
        duration,
        easing: resolveEasing(String(next.transitionEasing ?? DEFAULT_EASING)),
      });
      ensureDriver();

      // Land this commit at the old values so nothing jumps before frame 1.
      send(nodeId, payload, from);
      return;
    }
  }

  activeTransitions.delete(nodeId);
  queueProps(nodeId, payload);
}

/** Unmount cleanup — hostConfig.detachDeletedInstance. */
export function releaseNode(nodeId: number): void {
  lastStyles.delete(nodeId);
  lastPayloads.delete(nodeId);
  activeTransitions.delete(nodeId);
  activeAnimations.delete(nodeId);
  stopDriverIfIdle();
}
