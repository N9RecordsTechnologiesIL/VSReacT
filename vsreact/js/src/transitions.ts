// CSS transitions and keyframe presets, driven from JS. When a commit changes
// a node whose style carries transitionDuration, the changed animatable keys
// tween from their *currently displayed* values instead of jumping; animate-*
// classes run keyframe loops. Every frame re-sends the node's full payload
// (setProps replaces wholesale) with the animated keys patched — the same
// traffic a useTween re-render produces, without the component code.
//
// Honest limit: native-side hover/active/focus style merges don't transition
// (they never round-trip through JS). Animate those with onMouseEnter state.

import { queueOp, flushOps } from "./bridge";
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
  queueOp(["setProps", nodeId, { ...payload, style: { ...payload.style, ...patch } }]);
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
    queueOp(["setProps", nodeId, payload]);
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
      const easingName = String(next.transitionEasing ?? "ease-in-out") as TransitionEasingName;

      activeTransitions.set(nodeId, {
        payload,
        from,
        keys,
        start: Date.now() + delay,
        duration,
        easing: easings[easingName] ?? easings["ease-in-out"],
      });
      ensureDriver();

      // Land this commit at the old values so nothing jumps before frame 1.
      send(nodeId, payload, from);
      return;
    }
  }

  activeTransitions.delete(nodeId);
  queueOp(["setProps", nodeId, payload]);
}

/** Unmount cleanup — hostConfig.detachDeletedInstance. */
export function releaseNode(nodeId: number): void {
  lastStyles.delete(nodeId);
  activeTransitions.delete(nodeId);
  activeAnimations.delete(nodeId);
  stopDriverIfIdle();
}
