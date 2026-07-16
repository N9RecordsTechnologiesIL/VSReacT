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
