import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Native messaging',
  description:
    'native.call for synchronous requests into C++, native.on for events pushed back — the app-level channel beyond parameters.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="native-messaging" />
      <h1>Native messaging</h1>
      <p className={styles.lead}>
        Beyond parameters, apps talk to the plugin through one call channel and one event
        channel. Payloads cross the bridge as JSON.
      </p>

      <h2 id="js">The JS side</h2>
      <Code title="TSX">{`import { native } from "@vsreact/core";

// synchronous request → C++ handler → JSON result
const version = native.call("app:version");
const ok = native.call("download:start", { url });

// subscribe to events pushed from C++; returns an unsubscribe fn
useEffect(
  () => native.on("download:progress", (p) => setProgress(p.ratio)),
  [],
);`}</Code>

      <h2 id="cpp">The C++ side</h2>
      <Code title="C++">{`// handle calls (RootOptions::onNativeCall)
options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
{
    if (name == "app:version")
        return juce::var (ProjectInfo::versionString);

    if (name == "download:start")
    {
        startDownload (args["url"].toString());   // kick off async work
        return juce::var (true);
    }

    return {};
};

// push events — from the message thread
juce::MessageManager::callAsync ([this, ratio]
{
    auto* obj = new juce::DynamicObject();
    obj->setProperty ("ratio", ratio);
    root->sendNativeEvent ("download:progress", juce::var (obj));
});`}</Code>

      <h2 id="patterns">Patterns</h2>
      <ul>
        <li>
          <strong>Calls are synchronous</strong> from the JS side — keep handlers fast. For
          long work, start it in the handler, return immediately, and report back with
          events.
        </li>
        <li>
          <strong>Namespace your messages</strong> (<code>download:*</code>,{' '}
          <code>history:*</code>) — <code>param:*</code> is reserved by the ParameterBridge.
        </li>
        <li>
          <strong>Marshal to the message thread</strong> before calling{' '}
          <code>sendNativeEvent</code> from workers or the audio thread.
        </li>
      </ul>
      <Note>
        StashTrack drives its whole download pipeline this way: a{' '}
        <code>download:start</code> call, then <code>download:progress</code> /{' '}
        <code>download:done</code> events rendering a live progress arc.
      </Note>

      <Pager current="native-messaging" />
    </article>
  )
}
