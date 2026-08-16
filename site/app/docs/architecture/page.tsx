import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Architecture',
  description:
    'One render cycle end to end: reconciler mutation ops over the C bridge, the C++ shadow tree, Yoga layout, and the QuickJS engine.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="architecture" />
      <h1>Architecture</h1>
      <p className={styles.lead}>
        One render cycle, end to end: React commits a change → the reconciler’s host config
        serializes it as mutation ops → the JSON batch crosses the C bridge → the shadow tree
        applies it, Yoga recomputes layout, and the painter repaints the dirty region. Events
        travel the other way: JUCE mouse events hit-test into the tree and dispatch to JS
        listeners.
      </p>

      <h2 id="ops">The mutation protocol</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>OP</th>
            <th>SHAPE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>create</code>
            </td>
            <td>
              <code>["create", id, type]</code> — vs-view, vs-text, vs-image, vs-textinput,
              vs-native
            </td>
          </tr>
          <tr>
            <td>
              <code>setProps</code>
            </td>
            <td>
              <code>["setProps", id, {'{style, hoverStyle, activeStyle, …}'}]</code> —
              a node&apos;s first full props: resolved styles, listener flags, text,
              scrollTop
            </td>
          </tr>
          <tr>
            <td>
              <code>patchProps</code>
            </td>
            <td>
              <code>["patchProps", id, {'{changed keys only}'}]</code> — re-renders
              (since 0.0.28): only the top-level keys that changed; <code>null</code>{' '}
              removes a key. A style tweak never re-ships an unchanged image src, and
              an unchanged re-render sends nothing.
            </td>
          </tr>
          <tr>
            <td>
              <code>appendChild</code> / <code>insertBefore</code> / <code>removeChild</code>
            </td>
            <td>Tree mutations, mirroring the reconciler exactly</td>
          </tr>
          <tr>
            <td>
              <code>setText</code>
            </td>
            <td>
              <code>["setText", id, value]</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>clearContainer</code>
            </td>
            <td>Root unmount</td>
          </tr>
        </tbody>
      </table>
      <p>
        Ops are batched per React commit and flushed once — a full remount of the StashTrack
        UI is a single bridge crossing, not hundreds.
      </p>

      <h2 id="engine">The engine</h2>
      <p>
        The engine is QuickJS-ng — a complete ES2023 interpreter around one megabyte, running
        in-process on the message thread. Timers (<code>setTimeout</code>,{' '}
        <code>setInterval</code>) are provided by the native scheduler; promise rejections
        and uncaught exceptions route to the error overlay. There is no JIT, and there
        doesn’t need to be: JS runs only when your components render, and everything hot
        (layout, painting, hover) is C++.
      </p>

      <h2 id="layout">Layout &amp; painting</h2>
      <p>
        Yoga v2 provides the exact flexbox semantics React Native uses, so layout intuition
        transfers directly. The shadow tree owns one Yoga node per element; text nodes
        install measure functions so type sets its own size. The painter walks the laid-out
        tree with <code>juce::Graphics</code>: fills, borders, corner radii, shadows, knob
        arcs, glyph runs, scroll clipping. Hosted components (<code>NativeView</code>,{' '}
        <code>TextInput</code>) are real JUCE children positioned from layout results and
        visibility-synced with painted opacity.
      </p>

      <h2 id="bridge">The C bridge</h2>
      <p>
        Five host functions are all that connect the two worlds:{' '}
        <code>__vsreact_flush</code> (ops out), <code>__vsreact_dispatch</code> (events in),{' '}
        <code>__vsreact_nativeCall</code> (synchronous app calls),{' '}
        <code>__vsreact_setTimer</code>/<code>clearTimer</code> (scheduler), and{' '}
        <code>__vsreact_log</code> (console). Everything else — components, styling,
        parameters — is built on top of those in TypeScript and C++.
      </p>

      <Pager current="architecture" />
    </article>
  )
}
