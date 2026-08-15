import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Animation',
  description:
    'useTween, Easing curves, and lerp — frame-driven animation on the host timer, flowing through the normal setProps → repaint path.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="animation" />
      <h1>Animation</h1>
      <p className={styles.lead}>
        Tweens run on the host timer (16ms ticks through the C++ scheduler) and set React
        state, so every animated style flows through the normal setProps → repaint path — no
        separate animation system to learn.
      </p>

      <h2 id="transitions">CSS-style transitions (since 0.0.26)</h2>
      <p>
        The declarative path: put <code>transition</code> classes on a node and its style
        changes tween from the currently displayed values instead of jumping — mid-flight
        re-renders retarget smoothly, exactly like the web.
      </p>
      <Code title="TSX">{`<View
  className={cx(
    "h-2 rounded-full transition-colors duration-300 ease-out",
    hot ? "bg-red-500" : "bg-zinc-700",
  )}
/>`}</Code>
      <ul>
        <li>
          <code>transition</code> animates opacity, colors, transforms, and blur;{' '}
          <code>transition-all/colors/opacity/transform/none</code> scope it.
        </li>
        <li>
          <code>duration-*</code> and <code>delay-*</code> are literal milliseconds;{' '}
          <code>ease-linear/in/out/in-out</code> pick the curve.
        </li>
        <li>
          Since 0.0.27, <code>transitionEasing</code> also accepts any CSS{' '}
          <code>cubic-bezier(x1,y1,x2,y2)</code> spec alongside the four named curves —
          set it via the <code>style</code> prop, e.g.{' '}
          <code>{`style={{ transitionEasing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}`}</code>.
          Parsed curves are cached by their string; malformed specs fall back to
          ease-in-out.
        </li>
        <li>
          Keyframe presets: <code>animate-spin</code>, <code>animate-pulse</code>, and{' '}
          <code>animate-bounce</code> loop until the class comes off.
        </li>
        <li>
          Honest limit: native <code>hover:</code>/<code>active:</code>/<code>focus:</code>{' '}
          merges apply in C++ without a JS round-trip, so they can&apos;t transition —
          animate hover with <code>onMouseEnter</code> state when you need it smooth.
        </li>
      </ul>

      <h2 id="usetween">useTween</h2>
      <Code title="a splash entrance">{`import { useTween, lerp, Easing } from "@vsreact/core";

function Splash() {
  const t = useTween({ duration: 600, delay: 150, easing: Easing.outExpo });

  return (
    <View
      className="items-center justify-center"
      style={{ opacity: t, marginTop: lerp(24, 0, t) }}
    >
      <Text className="text-2xl font-bold">STASHTRACK</Text>
    </View>
  );
}`}</Code>
      <ul>
        <li>
          <code>useTween({'{duration, delay?, easing?, onComplete?}'})</code> — eased
          progress 0→1, starting on mount. Remount (via <code>key</code>) to replay.
        </li>
        <li>
          <code>Easing</code> — <code>linear</code>, <code>outCubic</code>,{' '}
          <code>inOutCubic</code>, <code>outExpo</code>, <code>outBack</code>,{' '}
          <code>outQuint</code>, or any <code>(t) =&gt; t</code> function.
        </li>
        <li>
          <code>lerp(from, to, t)</code> — map progress onto any numeric style value.
        </li>
      </ul>

      <h2 id="usespring">useSpring</h2>
      <p>
        For interactive motion where a fixed-duration tween feels wrong — toggle thumbs,
        drawers, meters chasing levels — <code>useSpring</code> gives you a value that
        physically springs toward its target whenever the target changes:
      </p>
      <Code title="TSX">{`import { useSpring } from "@vsreact/core";

function Drawer({ open }: { open: boolean }) {
  const x = useSpring(open ? 0 : -240, { stiffness: 220, damping: 26 });

  return <View className="absolute inset-y-0 w-[240]" style={{ left: x }} />;
}`}</Code>
      <ul>
        <li>
          <code>useSpring(target, {'{stiffness?, damping?, mass?, restDelta?}'})</code> —
          defaults 170 / 24 / 1. Lower damping bounces; higher snaps.
        </li>
        <li>
          Retargeting mid-flight keeps the current velocity — motion stays continuous when
          the user toggles quickly. The built-in <code>Toggle</code> animates its thumb this
          way.
        </li>
        <li>
          <code>springStep(position, velocity, target, options, dtMs)</code> — the pure
          integrator, exported for driving springs from your own loops.
        </li>
      </ul>

      <h2 id="stagger">Staggered sequences</h2>
      <p>
        Compose entrances by giving each element its own <code>delay</code> — the StashTrack
        splash staggers logo, wordmark, and status line this way:
      </p>
      <Code title="TSX">{`const logo = useTween({ duration: 500, easing: Easing.outBack });
const word = useTween({ duration: 500, delay: 120, easing: Easing.outCubic });
const line = useTween({ duration: 400, delay: 260 });`}</Code>

      <h2 id="timers">Timers</h2>
      <p>
        <code>setTimeout</code> and <code>setInterval</code> work inside the engine — they
        are backed by the same native scheduler, so a polling loop or a debounce behaves
        exactly like on the web. <code>useTween</code> is built on them.
      </p>

      <Pager current="animation" />
    </article>
  )
}
