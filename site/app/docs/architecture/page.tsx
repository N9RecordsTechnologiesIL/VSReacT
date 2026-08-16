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

      <h3 id="handshake">Version handshake</h3>
      <p>
        Your UI bundle and the native module are two separately versioned halves of one
        program: <code>@vsreact/core</code> comes from npm, the module from the{' '}
        <code>GIT_TAG</code> in your <code>FetchContent</code> block. Bumping one and
        forgetting the other is a one-line mistake, so the module publishes the protocol
        level it speaks as <code>__vsreact_protocol</code> before your bundle is evaluated,
        and features that need a newer level fall back instead.
      </p>
      <p>
        Without it the mismatch is invisible: a module that doesn&apos;t know an op ignores
        it, and the assertion that catches this compiles out in Release — so a bundle newer
        than its module would paint its first frame and then freeze, with no error, no
        overlay and nothing in the log. Instead, <code>patchProps</code> degrades to a full{' '}
        <code>setProps</code> (a strict superset) and one warning names both versions.
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>LEVEL</th>
            <th>ADDED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>1</code>
            </td>
            <td>
              The op table above minus <code>patchProps</code>. Modules up to 0.0.27
              publish no level at all and are read as 1.
            </td>
          </tr>
          <tr>
            <td>
              <code>2</code>
            </td>
            <td>
              <code>patchProps</code>; interned <code>&quot;img:N&quot;</code> handles as an{' '}
              <code>&lt;Image src&gt;</code>. Modules from 0.0.28.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Read the module&apos;s level at runtime with <code>nativeProtocol()</code> and your
        bundle&apos;s with <code>PROTOCOL_VERSION</code> — both worth putting in a support
        dump alongside <code>VERSION</code>.
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
