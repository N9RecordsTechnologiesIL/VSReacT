import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Presets',
  description:
    'Factory and user presets with one C++ manager and one React strip: vsreact::PresetManager and <PresetBrowser> — load, save, prev/next, dirty tracking.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="presets" />
      <h1>Presets</h1>
      <p className={styles.lead}>
        Every shipping plugin rebuilds the same preset boilerplate: factory sounds, user
        saves, prev/next, a dirty asterisk. VSReacT ships it once —{' '}
        <code>vsreact::PresetManager</code> on the C++ side, <code>usePresets()</code> and{' '}
        <code>&lt;PresetBrowser&gt;</code> on the React side.
      </p>

      <h2 id="cpp">The C++ side</h2>
      <p>
        Construct a manager next to your <code>ParameterBridge</code>, chain its{' '}
        <code>handleNativeCall</code>, and <code>attach()</code> the RootView. Factory
        presets are parameter values in <strong>natural units</strong> — the same numbers
        you&apos;d dial in by hand. User presets are full APVTS snapshots saved to{' '}
        <code>userApplicationDataDirectory/&lt;appName&gt;/Presets</code>.
      </p>
      <Code title="PluginEditor.cpp">{`vsreact::PresetManager::Options options;
options.appName = "My Plugin";
options.factoryPresets = {
    { "Default",   { { "threshold", -18.0f }, { "ratio", 4.0f } } },
    { "Drum Smash",{ { "threshold", -30.0f }, { "ratio", 10.0f } } },
};
presets = std::make_unique<vsreact::PresetManager> (state, options);

rootOptions.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var {
    if (auto handled = presets->handleNativeCall (name, args)) return *handled;
    if (auto handled = bridge.handleNativeCall (name, args))   return *handled;
    return {};
};
// after constructing the RootView:
presets->attach (*root);`}</Code>
      <p>
        Dirty tracking is automatic: the manager listens to every parameter, so the first
        tweak after a load or save pushes a <code>preset</code> event with{' '}
        <code>dirty: true</code> — the UI&apos;s asterisk appears without polling, and
        self-inflicted changes (the load itself) don&apos;t count as edits.
      </p>

      <h2 id="react">The React side</h2>
      <p>
        <code>&lt;PresetBrowser /&gt;</code> is the strip every plugin header has —
        prev/next arrows, the current name (asterisk when edited) opening a grouped menu
        (factory first, then user saves), and a save dialog. Drop it anywhere; multiple
        instances stay in sync because all state lives on the C++ side.
      </p>
      <Code title="ui/src/main.tsx">{`import { PresetBrowser, usePresets } from "@vsreact/core";

<PresetBrowser width={200} />

// or headless, for a custom UI:
const { presets, current, dirty, load, save, next, prev } = usePresets();`}</Code>

      <h2 id="protocol">The wire protocol</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>CALL / EVENT</th>
            <th>SHAPE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>preset:list</code></td>
            <td><code>{'{current, dirty, presets: [{name, factory}]}'}</code></td>
          </tr>
          <tr>
            <td><code>preset:load / save / delete</code></td>
            <td><code>{'{name} → {ok}'}</code> — factory names are reserved against save/delete</td>
          </tr>
          <tr>
            <td><code>preset:next / prev</code></td>
            <td>walks factory-then-user order and wraps</td>
          </tr>
          <tr>
            <td>event <code>preset</code></td>
            <td>full state after load/save/delete, and when a tweak first dirties the preset</td>
          </tr>
        </tbody>
      </table>

      <h2 id="resize">Resizable editors</h2>
      <p>
        Related ship-readiness boilerplate, worth the four lines: because panels are
        flexbox, a resizable editor <em>reflows</em> instead of scaling. Read the saved
        size <strong>before</strong> installing the constrainer — its limits fire{' '}
        <code>resized()</code>, and persisting from that call would clobber the saved size
        with the construction-time bounds.
      </p>
      <Code title="PluginEditor.cpp">{`const int savedW = (int) state.state.getProperty ("uiWidth", 720);
const int savedH = (int) state.state.getProperty ("uiHeight", 420);
setResizable (true, true);
setResizeLimits (600, 360, 1280, 800);
setSize (savedW, savedH);
constructed = true;

void resized() override
{
    root->setBounds (getLocalBounds());
    if (constructed)   // survives the session via get/setStateInformation
    {
        state.state.setProperty ("uiWidth", getWidth(), nullptr);
        state.state.setProperty ("uiHeight", getHeight(), nullptr);
    }
}`}</Code>
      <p>
        The compressor example wires all of this — presets, factory sounds, resize with
        persistence — in <code>vsreact/examples/compressor</code>.
      </p>

      <Pager current="presets" />
    </article>
  )
}
