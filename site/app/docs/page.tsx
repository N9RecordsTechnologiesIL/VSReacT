import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './docs.module.css'
import { Code, Crumbs, Pager } from './ui'
import { REPO, STASH } from '../variants/content'

export const metadata: Metadata = {
  title: 'Introduction — VSReacT Docs',
  description:
    'VSReacT is a React renderer for JUCE audio plugins — TSX in an embedded QuickJS engine, Yoga flexbox layout, every pixel painted by juce::Graphics. No webview.',
  alternates: { canonical: '/docs' },
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="" />
      <h1>VSReacT Documentation</h1>
      <p className={styles.lead}>
        VSReacT is a React renderer for JUCE audio plugins. Your TSX runs in an embedded
        QuickJS engine inside the plugin, a custom reconciler streams the tree to C++, Yoga
        computes flexbox, and <code>juce::Graphics</code> paints every pixel — identically in
        every DAW, on every OS. No webview.
      </p>

      <Code title="the whole UI of examples/gain">{`import { render, View, ParamKnob } from "vsreact-core";

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

      <h2 id="why">Why VSReacT exists</h2>
      <p>
        Plugin UIs deserve the modern component model — hooks, state, utility-class styling,
        hot reload — without embedding a browser or fighting <code>LookAndFeel</code>. VSReacT
        is the Flutter / React-Native-Skia approach applied to audio software: the framework
        owns every pixel, so beautiful is the default.
      </p>

      <h2 id="pipeline">How it works</h2>
      <ol className={styles.pipeline}>
        <li>
          <b>01</b>
          <strong>React 18</strong>
          <span>Your TSX, unmodified — hooks, effects, components.</span>
        </li>
        <li>
          <b>02</b>
          <strong>QuickJS</strong>
          <span>Embedded ES2023 engine, ~1MB, in-process. Zero webview.</span>
        </li>
        <li>
          <b>03</b>
          <strong>Reconciler</strong>
          <span>Streams the tree to C++ as JSON mutation ops over a C bridge.</span>
        </li>
        <li>
          <b>04</b>
          <strong>Yoga</strong>
          <span>Real flexbox layout in the native shadow tree.</span>
        </li>
        <li>
          <b>05</b>
          <strong>juce::Graphics</strong>
          <span>Every pixel painted natively, 60fps, any DAW, any OS.</span>
        </li>
      </ol>
      <p>
        Two halves make up the framework. The <code>vsreact-core</code> npm package is the
        TypeScript side: primitives, the Tailwind-style class resolver, parameter hooks,
        controls, and animation. The <code>vsreact</code> JUCE module is the native side:
        the QuickJS runtime, shadow tree, painter, hit-testing, text-input host, and the{' '}
        <code>RootView</code> component you drop into your plugin editor. The deep dive
        lives in <Link href="/docs/architecture">Architecture</Link>.
      </p>

      <h2 id="highlights">Key features</h2>
      <ul>
        <li>
          <strong>Modern React 18</strong> — function components, hooks, effects; the API you
          already know.
        </li>
        <li>
          <strong>Tailwind-style classes</strong> — with theme tokens, arbitrary values, and{' '}
          <code>hover:</code>/<code>active:</code>/<code>focus:</code> variants. Resolved in
          JS; C++ only sees final styles.
        </li>
        <li>
          <strong>Host-grade parameters</strong> — <code>useParameter(id)</code> and{' '}
          <code>&lt;ParamKnob&gt;</code> bind two-way to the APVTS with automation-safe
          gestures.
        </li>
        <li>
          <strong>~100ms hot reload in the DAW</strong> — save, rebuild, the plugin remounts.
          FL Studio never closes.
        </li>
        <li>
          <strong>Real text input</strong> — a chrome-stripped <code>juce::TextEditor</code>:
          caret, selection, IME.
        </li>
        <li>
          <strong>Native escape hatch</strong> — <code>&lt;NativeView/&gt;</code> mounts any{' '}
          <code>juce::Component</code> inside the React layout.
        </li>
        <li>
          <strong>Error overlay</strong> — JS exceptions render a red box with the stack trace
          instead of dying silently.
        </li>
      </ul>

      <h2 id="proof">Proven in production</h2>
      <p>
        <a href={STASH}>StashTrack</a> — a shipping VST3 for Windows, macOS, and Linux — runs
        its entire interface on VSReacT: splash screen, live download progress, preview
        playback, an animated stash drawer. Every feature documented here shipped there
        first. The framework itself lives at <a href={REPO}>github.com/N9RecordsTechnologiesIL/VSReacT</a>.
      </p>

      <h2 id="next">Where to next</h2>
      <ul>
        <li>
          <Link href="/docs/installation">Installation</Link> — requirements and wiring the
          module into your build.
        </li>
        <li>
          <Link href="/docs/quick-start">Quick start</Link> — build and run the gain example
          in five minutes.
        </li>
        <li>
          <Link href="/docs/components">UI reference</Link> — components, styling, events,
          animation.
        </li>
        <li>
          <Link href="/docs/parameters">Audio &amp; native</Link> — parameter binding,
          messaging, the C++ surface.
        </li>
      </ul>

      <Pager current="" />
    </article>
  )
}
