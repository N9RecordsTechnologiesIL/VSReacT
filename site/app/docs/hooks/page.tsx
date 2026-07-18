import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Hooks & utilities',
  description:
    'The full hook toolbox: state and timing (useToggle, usePrevious, useDebounced, useThrottled, useInterval), pointer and layout (useHover, useLayoutRect, useOverlay), audio-data (useRollingBuffer, usePeakHold), and the native bridge hooks.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="hooks" />
      <h1>Hooks &amp; utilities</h1>
      <p className={styles.lead}>
        Everything ships in <code>@vsreact/core</code> — no utility grab-bag dependencies.
        Parameter and animation hooks have their own pages; this is the rest of the toolbox.
      </p>

      <h2 id="state">State &amp; timing</h2>
      <Code title="TSX">{`const [bypassed, toggleBypass] = useToggle(false);   // stable toggle fn

const previous = usePrevious(preset);                // last render's value

const query = useDebounced(text, 250);               // settles after silence
const level = useThrottled(rawLevel, 33);            // at most ~30fps

useInterval(() => setPhase((p) => p + 0.05), 16);    // null pauses it`}</Code>
      <ul>
        <li>
          <code>useToggle(initial?)</code> → <code>[on, toggle, set]</code> — the toggle
          function is stable, safe for <code>onClick</code>.
        </li>
        <li>
          <code>usePrevious(value)</code> — <code>undefined</code> on the first render.
        </li>
        <li>
          <code>useDebounced(value, delayMs)</code> — waits for quiet;{' '}
          <code>useThrottled(value, intervalMs)</code> — leading + trailing, never more than
          once per interval.
        </li>
        <li>
          <code>useInterval(callback, intervalMs | null)</code> — declarative interval on the
          host scheduler; the callback stays fresh without restarting the timer.
        </li>
      </ul>

      <h2 id="pointer">Pointer &amp; layout</h2>
      <Code title="TSX">{`const [hovered, hoverProps] = useHover();
<View {...hoverProps} style={{ opacity: hovered ? 1 : 0.7 }} />

const [rect, onLayout] = useLayoutRect();   // root-space rect from onLayout
const overlay = useOverlay();               // a slot in the top-most layer`}</Code>
      <ul>
        <li>
          <code>useHover()</code> — hover as state, for logic beyond what{' '}
          <code>hover:</code> class variants cover.
        </li>
        <li>
          <code>useLayoutRect()</code> / <code>useOverlay()</code> — the popover building
          blocks; see <Link href="/docs/events">Events &amp; gestures</Link>.
        </li>
      </ul>

      <h2 id="audio">Audio data</h2>
      <Code title="an envelope history, three lines">{`const [level, setLevel] = useState(0);
useNativeEvent("meter", (m) => setLevel(m.level));
const history = useRollingBuffer(level, 64);   // last 64 values

return <Waveform values={history} width={220} label="ENV" />;`}</Code>
      <ul>
        <li>
          <code>useRollingBuffer(value, length?)</code> — a fixed rolling window of a live
          scalar; feeds <code>&lt;Waveform&gt;</code>/<code>&lt;Bars&gt;</code>. The pure
          stepper <code>pushRolling</code> is exported too.
        </li>
        <li>
          <code>usePeakHold(value, {'{holdMs, decayPerSecond}'})</code> — the held peak that
          drives <code>&lt;Meter&gt;</code>’s peak line.
        </li>
      </ul>

      <h2 id="bridge">Native bridge</h2>
      <ul>
        <li>
          <code>useNativeEvent(name, handler)</code> — lifetime subscription with an
          always-fresh handler; see{' '}
          <Link href="/docs/native-messaging">Native messaging</Link>.
        </li>
        <li>
          <code>useParameter(id)</code> / <code>useParameterList()</code> — see{' '}
          <Link href="/docs/parameters">Audio parameters</Link>.
        </li>
        <li>
          <code>useTween</code> / <code>useSpring</code> — see{' '}
          <Link href="/docs/animation">Animation</Link>.
        </li>
      </ul>

      <h2 id="format">Value formatting</h2>
      <Code title="readouts DAW users expect">{`formatDb(-12.53)      // "-12.5 dB"   (-Infinity → "-inf dB")
formatHz(1200)        // "1.2 kHz"
formatMs(1250)        // "1.25 s"
formatPercent(0.42)   // "42%"
formatSemitones(7)    // "+7 st"
midiNoteName(60)      // "C4"
midiNoteToHz(69)      // 440 — feed your oscillator from PianoKeyboard
hzToMidiNote(440)     // 69
mapRange(v, 0, 1, -60, 6)   // linear remap, optional clamp`}</Code>
      <p>
        Pure functions, made for <code>NumberBox</code>’s <code>format</code> prop and value
        labels next to knobs.
      </p>

      <h2 id="cx">cx()</h2>
      <p>
        The className composer — strings, arrays, object maps, falsy values dropped. Details
        in <Link href="/docs/styling">Styling</Link>.
      </p>

      <Pager current="hooks" />
    </article>
  )
}
