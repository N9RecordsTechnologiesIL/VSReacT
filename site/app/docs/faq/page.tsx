import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Is it a webview? Which formats and platforms? Performance, npm packages, debugging, licensing.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="faq" />
      <h1>FAQ</h1>
      <p className={styles.lead}>The questions every plugin developer asks first.</p>

      <h2 id="webview">Is this a webview?</h2>
      <p>
        No. There is no browser, no HTML, no CSS engine in the binary. Your React runs in
        QuickJS (~1MB, in-process) and every pixel is painted by{' '}
        <code>juce::Graphics</code>. That is the whole point.
      </p>

      <h2 id="formats">Which plugin formats and platforms?</h2>
      <p>
        Anything JUCE targets — VST3, AU, AAX, LV2, standalone — on Windows, macOS, and
        Linux. VSReacT is a JUCE module; it goes wherever your JUCE plugin goes.
      </p>

      <h2 id="performance">What about performance?</h2>
      <p>
        Layout and painting are C++. JS runs only when your components render, and the
        bridge batches mutations per commit. Hover and active styles repaint natively with
        no JS round-trip. The gain example idles at zero JS activity.
      </p>

      <h2 id="npm">Can I use npm packages?</h2>
      <p>
        Pure-JS packages that target ES2023 work — Bun bundles them in. Anything that
        expects the DOM, Node APIs, or the network will not, by design: a plugin UI should
        be deterministic and offline.
      </p>

      <h2 id="debugging">How do I debug?</h2>
      <p>
        <code>console.log</code> routes to the native logger and shows in your debugger’s
        output. Runtime errors render the red overlay with a stack trace in the plugin
        window. And hot reload keeps the iteration loop around 100ms.
      </p>

      <h2 id="licensing">What licenses am I agreeing to?</h2>
      <p>
        VSReacT itself is MIT. Vendored engines keep their permissive licenses (QuickJS-ng:
        MIT, Yoga: MIT). JUCE has its own commercial/GPL terms you must satisfy for plugin
        distribution.
      </p>

      <Pager current="faq" />
    </article>
  )
}
