import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'
import { PmTabs } from '../Tabs'

export const metadata: Metadata = {
  title: 'PostHog analytics',
  description:
    'Product analytics inside your plugin: capture from the React UI, delivered over HTTPS by the native PostHogBridge — which knobs users touch, which panels they open, which presets they load.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="posthog" />
      <h1>PostHog analytics</h1>
      <p className={styles.lead}>
        Know what your users actually do with your plugin — which knobs they touch, which
        panels they open, which presets they load. <code>@vsreact/posthog</code> captures
        from the React side and the native <code>PostHogBridge</code> delivers over HTTPS
        (QuickJS has no network; C++ owns delivery, off the message thread).
      </p>

      <h2 id="install">Install</h2>
      <PmTabs
        commands={{
          bun: 'bun add @vsreact/posthog',
          npm: 'npm install @vsreact/posthog',
          yarn: 'yarn add @vsreact/posthog',
          pnpm: 'pnpm add @vsreact/posthog',
        }}
      />

      <h2 id="cpp">C++ wiring</h2>
      <p>
        Construct a <code>PostHogBridge</code> with your project API key and chain it in{' '}
        <code>onNativeCall</code>, exactly like the ParameterBridge. The key lives in C++ —
        the JS bundle never sees it.
      </p>
      <Code title="PluginEditor.cpp">{`vsreact::PostHogBridge::Options analytics;
analytics.apiKey = "phc_...";                             // your project key
analytics.host = "https://eu.i.posthog.com";              // or us / self-hosted
analytics.stateFile = appDataDir.getChildFile ("ph-id");  // persistent anonymous id

posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
{
    if (auto handled = posthog->handleNativeCall (name, args)) return *handled;
    if (auto handled = bridge.handleNativeCall (name, args))   return *handled;
    return {};
};`}</Code>
      <ul>
        <li>
          Batches post to <code>{'{host}'}/batch/</code> on a background thread — never the
          audio or message thread.
        </li>
        <li>
          <code>stateFile</code> persists the anonymous distinct id across sessions; leave
          it empty for a fresh id per instance.
        </li>
      </ul>

      <h2 id="js">Capture from React</h2>
      <Code title="ui/src/main.tsx">{`import { render, GenericEditor } from "@vsreact/core";
import { posthog, usePostHogParameters, useCaptureOnMount } from "@vsreact/posthog";

posthog.init({ defaultProperties: { plugin_version: "1.2.0" } });

function App() {
  usePostHogParameters();          // every knob tweak, debounced per parameter
  useCaptureOnMount("plugin_opened");

  return <GenericEditor />;
}

render(<App />);`}</Code>
      <p>
        <code>usePostHogParameters()</code> is the flagship: it subscribes to every host
        parameter change and captures one <code>parameter_changed</code> event per parameter
        after the user settles (debounced, default 800ms) — usage analytics for your whole
        control surface in one line.
      </p>

      <h2 id="api">The client API</h2>
      <Code title="TSX">{`posthog.capture("preset_loaded", { preset: "Warm Tape" });
posthog.register({ daw: hostName });          // stamped on every event
posthog.identify("user-123", { plan: "pro" }); // tie to a known user
posthog.alias("licence-XYZ");                  // link another id
posthog.set({ favourite_mode: "TUBE" });       // person properties
posthog.setOnce({ first_version: "1.2.0" });   // only if unset
posthog.group("studio", "abbey-road");         // group analytics
posthog.time("preset_load");                   // start a stopwatch…
posthog.timeEnd("preset_load");                // …capture { duration_ms }
posthog.debug(true);                           // log captures (dev builds)
posthog.flush();                               // force-send now
posthog.reset();                               // fresh anonymous identity`}</Code>
      <Code title="scrub before anything queues">{`posthog.init({
  beforeSend: (event) => {
    if (event.event === "internal_debug") return null;   // veto
    delete event.properties.project_path;                // scrub
    return event;
  },
});`}</Code>
      <ul>
        <li>
          Events queue in JS and flush at 10 events or 10 seconds (tune with{' '}
          <code>init({'{flushAt, flushIntervalMs}'})</code>); the queue is capped at{' '}
          <code>maxQueueSize</code> (drop-oldest, default 1000).
        </li>
        <li>
          Every event carries <code>distinct_id</code>, <code>$session_id</code>, and lib
          metadata automatically.
        </li>
        <li>
          <code>init({'{sampleRate}'})</code> keeps a fraction of sessions and stamps{' '}
          <code>$sample_rate</code> on kept events so PostHog can weight counts.
        </li>
      </ul>

      <h2 id="errors">Error tracking &amp; sessions</h2>
      <Code title="ui/src/main.tsx">{`import { PostHogErrorBoundary, useEditorSession } from "@vsreact/posthog";

function App() {
  useEditorSession();   // editor_session_start / _end { duration_ms }
  return <MainPanel />;
}

render(
  <PostHogErrorBoundary fallback={<Text>Something broke — reopen the window.</Text>}>
    <App />
  </PostHogErrorBoundary>,
);`}</Code>
      <ul>
        <li>
          <code>posthog.captureException(error, props?)</code> — a properly-shaped{' '}
          <code>$exception</code> event for PostHog error tracking; the boundary calls it for
          every render crash and flushes immediately.
        </li>
        <li>
          <code>useCaptureOnUnmount(event)</code> — the closing bookend to{' '}
          <code>useCaptureOnMount</code>, stamped with <code>duration_ms</code>.
        </li>
        <li>
          <code>posthog.optOut()</code> / <code>optIn()</code> / <code>optedOut</code> — the
          consent switch: opting out drops new events and discards the unsent queue;{' '}
          <code>init({'{optOut}'})</code> starts disabled. <code>unregister(key)</code> and{' '}
          <code>getSessionId()</code> round out the client.
        </li>
      </ul>

      <Note>
        <strong>Respect your users:</strong> ship analytics behind a consent toggle in your
        settings panel, and say what you collect. A <code>&lt;ParamToggle&gt;</code> wired to
        a &quot;share usage data&quot; flag that drives <code>posthog.optOut()</code> /{' '}
        <code>optIn()</code> is the pattern.
      </Note>

      <p>
        Full messaging model in <Link href="/docs/native-messaging">Native messaging</Link>;
        the bridge type in the <Link href="/docs/cpp-api">C++ API</Link>.
      </p>

      <Pager current="posthog" />
    </article>
  )
}
