import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../docs.module.css'
import { Code, Crumbs, Note, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Your plugin, in React',
  description:
    'Integrate VSReacT into an existing JUCE plugin: construct a RootView in your editor, bundle your TSX with Bun, and handle native calls.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="integration" />
      <h1>Your plugin, in React</h1>
      <p className={styles.lead}>
        Integrating VSReacT into an existing plugin takes one component: construct a{' '}
        <code>vsreact::RootView</code> in your editor, point it at your bundle, and add it
        like any <code>juce::Component</code>.
      </p>

      <h2 id="editor">The editor side</h2>
      <Code title="PluginEditor.cpp">{`vsreact::RootOptions options;
options.bundleFile = juce::File ("path/to/ui/build/main.js"); // dev: watched
options.watchForChanges = true;                               // hot reload
options.onNativeCall = [this] (const juce::String& name,
                               const juce::var& args) -> juce::var
{
    if (auto handled = bridge.handleNativeCall (name, args)) // APVTS binding
        return *handled;

    if (name == "app:version")
        return juce::var (ProjectInfo::versionString);        // your own calls

    return {};
};

root = std::make_unique<vsreact::RootView> (std::move (options),
                                            std::move (registry));
bridge.attach (*root);   // pushes DAW-side param changes to useParameter
addAndMakeVisible (*root);
setSize (520, 340);`}</Code>
      <p>
        Every field of <code>RootOptions</code> is documented in the{' '}
        <Link href="/docs/cpp-api">C++ API reference</Link>. Resizing the editor relayouts the
        whole Yoga tree — a resizable plugin needs nothing extra.
      </p>

      <h2 id="entry">The React side</h2>
      <p>
        <code>render(&lt;App /&gt;)</code> mounts your tree into the RootView. There is no
        HTML and no DOM — the primitives are <code>View</code>, <code>Text</code>,{' '}
        <code>Image</code>, <code>TextInput</code>, and <code>NativeView</code>, laid out by
        Yoga and painted by C++.
      </p>
      <Code title="ui/src/main.tsx">{`import { render, View, Text } from "vsreact";

function App() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950">
      <Text className="text-2xl font-bold">Hello, host.</Text>
    </View>
  );
}

render(<App />);`}</Code>

      <h2 id="bundle">Bundling with Bun</h2>
      <p>
        QuickJS runs ES2023, so no transpilation gymnastics are needed — one flat IIFE
        bundle:
      </p>
      <Code title="ui/package.json (scripts)">{`{
  "scripts": {
    "build": "bun build src/main.tsx --outfile build/main.js --format iife",
    "watch": "bun build src/main.tsx --outfile build/main.js --format iife --watch"
  }
}`}</Code>
      <Note>
        Pure-JS npm packages that target ES2023 bundle right in. Anything expecting the DOM,
        Node APIs, or the network will not — by design, a plugin UI should be deterministic
        and offline.
      </Note>

      <h2 id="errors">When the bundle throws</h2>
      <p>
        If your bundle throws — at load or later inside an effect — the plugin does not die
        silently: VSReacT renders a red <strong>error overlay</strong> with the message and
        stack trace right inside the plugin window. <code>console.log</code> routes to the
        native logger, so your debugger’s output window shows JS logs alongside C++ ones.
      </p>

      <Pager current="integration" />
    </article>
  )
}
