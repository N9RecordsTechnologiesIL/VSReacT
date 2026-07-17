import type { Metadata } from 'next'
import styles from '../docs.module.css'
import { Code, Crumbs, Pager } from '../ui'

export const metadata: Metadata = {
  title: 'Hot reload & shipping',
  description:
    'Development builds watch the bundle file and remount in ~100ms inside the DAW; production builds embed the bundle in the binary with BinaryData.',
}

export default function Page() {
  return (
    <article className={styles.article}>
      <Crumbs slug="hot-reload" />
      <h1>Hot reload &amp; shipping</h1>
      <p className={styles.lead}>
        The same <code>RootView</code> serves both lives of your plugin: a watched bundle
        file during development, an embedded string in the shipped binary.
      </p>

      <h2 id="dev">Development — watch the file</h2>
      <p>
        With <code>watchForChanges = true</code>, the RootView polls the bundle’s
        modification time every 250ms. Run <code>bun run watch</code>, save a component, and
        the running plugin tears down the JS runtime and remounts in about 100ms — inside the
        DAW, without closing FL Studio, Ableton, or your standalone build.
      </p>
      <Code title="terminal 1 — UI">{`cd ui && bun run watch`}</Code>
      <Code title="terminal 2 — plugin (once)">{`cmake --build build --target MyPlugin_VST3 --config Debug
# open the DAW, load the plugin, then just keep saving TSX`}</Code>

      <h2 id="prod">Production — embed the bundle</h2>
      <p>
        Ship a single binary with zero loose files: embed the bundle with JUCE’s BinaryData
        and pass it as <code>bundleSource</code>. A CMake option is the usual switch between
        the two modes:
      </p>
      <Code title="CMakeLists.txt">{`option(MYPLUGIN_DEV "Load the UI bundle from disk and watch it" OFF)

juce_add_binary_data(MyPluginAssets SOURCES ui/build/main.js)
target_link_libraries(MyPlugin PRIVATE MyPluginAssets)

target_compile_definitions(MyPlugin PRIVATE
    MYPLUGIN_DEV=$<BOOL:${'${MYPLUGIN_DEV}'}>)`}</Code>
      <Code title="PluginEditor.cpp">{`#if MYPLUGIN_DEV
    options.bundleFile = juce::File (MYPLUGIN_UI_BUNDLE_PATH);
    options.watchForChanges = true;
#else
    options.bundleSource = juce::String::fromUTF8 (BinaryData::main_js,
                                                   BinaryData::main_jsSize);
#endif`}</Code>

      <h2 id="fallback">Fallback behavior</h2>
      <p>
        When <code>bundleFile</code> is empty or missing on disk, the RootView automatically
        falls back to <code>bundleSource</code> — so a dev build still boots after you delete
        the build folder, and a misconfigured path never ships a blank window.
      </p>

      <Pager current="hot-reload" />
    </article>
  )
}
