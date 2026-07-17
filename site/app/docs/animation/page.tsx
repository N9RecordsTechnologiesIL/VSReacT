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
