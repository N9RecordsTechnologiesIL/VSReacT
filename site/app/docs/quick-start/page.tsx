import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Quick start',
  description:
    'Build and run the gain example: a working gain/pan VST3 whose entire UI is fourteen lines of TSX.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="quick-start" />
      <h1>Quick start</h1>
      <p className={styles.lead}>
        The fastest tour is <code>vsreact/examples/gain</code>: a working gain/pan VST3 and
        standalone app whose entire UI is fourteen lines of TSX — the exact tree running in
        the demo on the landing page.
      </p>

      <h2 id="ui">1. Build the UI bundle</h2>
      <Code title="shell">{`cd vsreact/examples/gain/ui
bun install
bun run build        # emits build/main.js`}</Code>

      <h2 id="plugin">2. Build the plugin</h2>
      <Code title="shell">{`cd vsreact/examples/gain
cmake -S . -B build -DJUCE_SOURCE_DIR=path/to/JUCE
#   on Windows add: -G "Visual Studio 17 2022" -A x64
cmake --build build --target GainExample_Standalone --config Release`}</Code>

      <h2 id="run">3. Run it</h2>
      <p>
        Launch the standalone target (or load the VST3 in your DAW) and you get two knobs —{' '}
        <code>gain</code> and <code>pan</code> — bound to real{' '}
        <code>AudioProcessorValueTreeState</code> parameters with automation-safe gestures.
        Drag them, wheel them, automate them from the host: the UI and the DAW stay in sync
        both ways. This is the complete UI source:
      </p>
      <Code title="ui/src/main.tsx">{`import { render, View, ParamKnob } from "vsreact";

function App() {
  return (
    <View className="flex-1 items-center justify-center
                     bg-zinc-950 gap-10 flex-row">
      <ParamKnob paramId="gain" size={88} />
      <ParamKnob paramId="pan" size={88} />
    </View>
  );
}

render(<App />);`}</Code>

      <h2 id="tour">What just happened</h2>
      <ul>
        <li>
          <code>render(&lt;App /&gt;)</code> mounted your tree into the plugin’s{' '}
          <code>RootView</code> — no HTML, no DOM.
        </li>
        <li>
          The <code>className</code> strings were resolved to style objects in JS and painted
          by C++ — see <Link href="/docs/styling">Styling</Link>.
        </li>
        <li>
          <code>&lt;ParamKnob paramId="gain"&gt;</code> found the APVTS parameter through the{' '}
          <code>ParameterBridge</code> — see <Link href="/docs/parameters">Audio parameters</Link>.
        </li>
        <li>
          The knob arc is a natively painted stroke driven by drag gestures — see{' '}
          <Link href="/docs/events">Events &amp; gestures</Link>.
        </li>
      </ul>
      <p>
        Now wire it into your own project:{' '}
        <Link href="/docs/integration">Your plugin, in React</Link>.
      </p>

      <Pager current="quick-start" />
    </article>
  )
}
