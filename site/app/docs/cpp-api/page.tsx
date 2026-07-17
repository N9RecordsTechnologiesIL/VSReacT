import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'C++ API',
  description:
    'The native surface: RootOptions, RootView, ParameterBridge, and NativeRegistry.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="cpp-api" />
      <h1>C++ API</h1>
      <p className={styles.lead}>
        Four types make up the entire native surface. Everything lives in the{' '}
        <code>vsreact</code> namespace, header-first, in the JUCE module under{' '}
        <code>vsreact/module/</code>.
      </p>

      <h2 id="rootoptions">vsreact::RootOptions</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>FIELD</th>
            <th>TYPE</th>
            <th>PURPOSE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>bundleFile</code>
            </td>
            <td>juce::File</td>
            <td>Bundle on disk — dev builds, supports watching.</td>
          </tr>
          <tr>
            <td>
              <code>bundleSource</code>
            </td>
            <td>juce::String</td>
            <td>Embedded bundle (production). Fallback when the file is missing.</td>
          </tr>
          <tr>
            <td>
              <code>watchForChanges</code>
            </td>
            <td>bool</td>
            <td>Re-evaluate the bundle when the file changes — hot reload.</td>
          </tr>
          <tr>
            <td>
              <code>onNativeCall</code>
            </td>
            <td>std::function</td>
            <td>
              Handler for <code>native.call(name, args)</code>; returns a{' '}
              <code>juce::var</code> result.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="rootview">vsreact::RootView</h2>
      <p>
        A <code>juce::Component</code> that owns the JS runtime, shadow tree, scheduler,
        hosted native children, and paints the whole UI. Construct with{' '}
        <code>RootOptions</code> and an optional <code>NativeRegistry</code>, then{' '}
        <code>addAndMakeVisible</code>.
      </p>
      <Code title="signature">{`RootView (RootOptions options, NativeRegistry registry = {});

void sendNativeEvent (const juce::String& name, const juce::var& payload);
bool isBundleLoaded() const noexcept;`}</Code>
      <ul>
        <li>
          <code>sendNativeEvent(name, payload)</code> — push an event to{' '}
          <code>native.on</code> listeners (message thread only).
        </li>
        <li>
          <code>isBundleLoaded()</code> — true once the bundle evaluated successfully.
        </li>
        <li>
          Resizing relayouts the Yoga tree; the mouse overrides hit-test into the shadow
          tree and drive hover/active/drag — see{' '}
          <Link href="/docs/events">Events &amp; gestures</Link>.
        </li>
      </ul>

      <h2 id="parameterbridge">vsreact::ParameterBridge</h2>
      <Code title="signature">{`explicit ParameterBridge (juce::AudioProcessorValueTreeState& state);

void attach (RootView& root);
std::optional<juce::var> handleNativeCall (const juce::String& name,
                                           const juce::var& args);`}</Code>
      <p>
        Chain <code>handleNativeCall()</code> first inside <code>onNativeCall</code> (it
        returns <code>nullopt</code> for non-<code>param:*</code> calls), and{' '}
        <code>attach()</code> the RootView so host-side changes reach{' '}
        <code>useParameter</code>. Full protocol in{' '}
        <Link href="/docs/parameters">Audio parameters</Link>.
      </p>

      <h2 id="posthogbridge">vsreact::PostHogBridge</h2>
      <Code title="signature">{`struct Options { juce::String apiKey, host; juce::File stateFile; };
explicit PostHogBridge (Options options);

std::optional<juce::var> handleNativeCall (const juce::String& name,
                                           const juce::var& args);`}</Code>
      <p>
        The native half of <code>@vsreact/posthog</code>: answers{' '}
        <code>posthog:config</code> / <code>posthog:send</code> and posts event batches to
        PostHog on a background thread. Chain before or after the ParameterBridge — see{' '}
        <Link href="/docs/posthog">PostHog analytics</Link>.
      </p>

      <h2 id="nativeregistry">vsreact::NativeRegistry</h2>
      <Code title="signature">{`using Factory = std::function<std::unique_ptr<juce::Component>()>;

void registerFactory (const juce::String& id, Factory factory);`}</Code>
      <p>
        Maps a <code>nativeId</code> to a factory producing a <code>juce::Component</code>.
        The RootView creates, positions, and destroys instances as{' '}
        <code>&lt;NativeView&gt;</code> nodes mount and unmount — React owns layout, JUCE
        owns painting.
      </p>

      <Pager current="cpp-api" />
    </article>
  )
}
