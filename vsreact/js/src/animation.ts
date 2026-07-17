// Frame-driven animation for VSReacT. Tweens run on the host timer (16ms
// ticks through the C++ Scheduler) and re-render by setting React state, so
// every animated style flows through the normal setProps → repaint path.

import { useEffect, useRef, useState } from "react";

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: ((t) => t) as EasingFn,
  outCubic: ((t) => 1 - Math.pow(1 - t, 3)) as EasingFn,
  inOutCubic: ((t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) as EasingFn,
  outExpo: ((t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))) as EasingFn,
  outBack: ((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as EasingFn,
  outQuint: ((t) => 1 - Math.pow(1 - t, 5)) as EasingFn,
};

export interface TweenOptions {
  /** Milliseconds the tween runs for (after the delay). */
  duration: number;
  delay?: number;
  easing?: EasingFn;
  onComplete?: () => void;
}

const FRAME_MS = 16;

/** Eased progress 0→1 that starts when the component mounts. */
export function useTween({ duration, delay = 0, easing = Easing.outCubic, onComplete }: TweenOptions): number {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let elapsed = -delay;

    const id = setInterval(() => {
      elapsed += FRAME_MS;

      if (elapsed <= 0) return;

      const t = Math.min(1, elapsed / duration);
      setProgress(easing(t));

      if (t >= 1) {
        clearInterval(id);

        if (!doneRef.current) {
          doneRef.current = true;
          completeRef.current?.();
        }
      }
    }, FRAME_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return progress;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// ── springs ────────────────────────────────────────────────────────────

export interface SpringOptions {
  /** Spring constant — higher snaps faster. Default 170. */
  stiffness?: number;
  /** Velocity drag — higher settles with less bounce. Default 24. */
  damping?: number;
  mass?: number;
  /** Distance from target below which the spring snaps and stops. */
  restDelta?: number;
}

/** One semi-implicit Euler integration step; exported for tests and for
    driving springs from your own loops. Returns [position, velocity]. */
export function springStep(
  position: number,
  velocity: number,
  target: number,
  { stiffness = 170, damping = 24, mass = 1 }: SpringOptions,
  dtMs: number,
): [number, number] {
  const dt = dtMs / 1000;
  const acceleration = (-stiffness * (position - target) - damping * velocity) / mass;
  const v = velocity + acceleration * dt;
  return [position + v * dt, v];
}

/**
 * A value that springs toward `target` whenever it changes — for
 * interactive motion where a fixed-duration tween feels wrong (toggle
 * thumbs, drawers, meters chasing levels). Runs on the host timer like
 * useTween; starts at rest on the initial target.
 */
export function useSpring(target: number, options: SpringOptions = {}): number {
  const [value, setValue] = useState(target);
  const state = useRef({ position: target, velocity: 0 });
  const targetRef = useRef(target);
  targetRef.current = target;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const restDelta = optionsRef.current.restDelta ?? 0.001;
    if (
      Math.abs(state.current.position - targetRef.current) <= restDelta &&
      Math.abs(state.current.velocity) <= restDelta
    ) {
      return;
    }

    const id = setInterval(() => {
      const s = state.current;
      const [p, v] = springStep(s.position, s.velocity, targetRef.current, optionsRef.current, FRAME_MS);
      s.position = p;
      s.velocity = v;

      if (Math.abs(p - targetRef.current) <= restDelta && Math.abs(v) <= restDelta) {
        s.position = targetRef.current;
        s.velocity = 0;
        clearInterval(id);
      }

      setValue(s.position);
    }, FRAME_MS);

    return () => clearInterval(id);
  }, [target]);

  return value;
}
