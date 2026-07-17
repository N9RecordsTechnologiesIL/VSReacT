import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './page.module.css'
import { REPO, STASH } from '../variants/content'

export const metadata: Metadata = {
  title: 'Documentation — VSReacT',
  description:
    'Install VSReacT, build the example plugin, and learn the full API: components, Tailwind-style classes, audio parameter binding, native messaging, hot reload, and the C++ integration surface.',
  alternates: { canonical: '/docs' },
}

function Code({ title, children }: { title: string; children: string }) {
  return (
    <figure className={styles.codeBlock}>
      <figcaption className={styles.codeBlockBar}>{title}</figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  )
}

const TOC: Array<[group: string, items: Array<[id: string, label: string]>]> = [
  [
    'GETTING STARTED',
    [
      ['overview', 'Overview'],
      ['requirements', 'Requirements'],
      ['installation', 'Installation'],
      ['quick-start', 'Quick start'],
      ['first-ui', 'Your plugin, in React'],
      ['hot-reload', 'Hot reload & shipping'],
    ],
  ],
  [
    'REFERENCE',
    [
      ['components', 'Components'],
      ['styling', 'Styling'],
      ['parameters', 'Audio parameters'],
      ['events', 'Events & gestures'],
      ['native', 'Native messaging'],
      ['animation', 'Animation'],
      ['cpp-api', 'C++ API'],
      ['architecture', 'Architecture'],
    ],
  ],
  [
    'PROJECT',
    [
      ['testing', 'Testing'],
      ['showcase', 'Built with VSReacT'],
      ['faq', 'FAQ'],
      ['support', 'Support & license'],
    ],
  ],
]

export default function Docs() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href="/" className={styles.mark} aria-label="VSReacT — back to the landing page">
          <b>VS</b>
          <svg viewBox="0 0 100 100" className={styles.markAtom} aria-hidden="true">
            <ellipse cx="50" cy="50" rx="46" ry="17" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(-60 50 50)" />
            <circle cx="50" cy="50" r="9" className={styles.markCore} />
          </svg>
          <b>T</b>
        </Link>
        <span className={styles.crumb}>/ DOCS</span>
        <nav className={styles.headNav}>
          <Link className={styles.headLink} href="/">
            HOME
          </Link>
          <a className={styles.headCta} href={REPO}>
            GET IT ON GITHUB
          </a>
        </nav>
      </header>

      <div className={styles.hero}>
        <span className={styles.heroKicker}>VSREACT DOCUMENTATION</span>
        <h1 className={styles.heroTitle}>
          Everything, from
          <br />
          clone to shipped VST.
        </h1>
        <p className={styles.heroSub}>
          VSReacT is a React renderer for JUCE audio plugins. Your TSX runs in an embedded
          QuickJS engine inside the plugin, a custom reconciler streams the tree to C++, Yoga
          computes flexbox, and <code>juce::Graphics</code> paints every pixel. No webview.
          This page is the full manual: installation, the example plugin, and the complete JS
          and C++ API surface.
        </p>
      </div>

      <div className={styles.shell}>
        <nav className={styles.toc} aria-label="Documentation sections">
          {TOC.map(([group, items]) => (
            <div key={group} style={{ display: 'contents' }}>
              <span className={styles.tocGroup}>{group}</span>
              {items.map(([id, label]) => (
                <a key={id} href={`#${id}`}>
                  {label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.content}>
          <Section id="overview" title="Overview">
            <p>
              Plugin UIs deserve the modern component model — hooks, state, utility-class
              styling, hot reload — without embedding a browser or fighting{' '}
              <code>LookAndFeel</code>. VSReacT is the Flutter / React-Native-Skia approach
              applied to audio software: the framework owns every pixel, so beautiful is the
              default.
            </p>
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
              Two packages make up the framework. <code>@vsreact/core</code> is the TypeScript
              side: primitives, the Tailwind-style class resolver, parameter hooks, controls,
              and animation. <code>vsreact</code> is a JUCE module: the QuickJS runtime, shadow
              tree, painter, hit-testing, text-input host, and the <code>RootView</code>{' '}
              component you drop into your plugin editor.
            </p>
          </Section>

          <Section id="requirements" title="Requirements">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>TOOL</th>
                  <th>VERSION</th>
                  <th>USED FOR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CMake</td>
                  <td>3.22+</td>
                  <td>Building the module, the example, and the test suites.</td>
                </tr>
                <tr>
                  <td>C++ toolchain</td>
                  <td>C++17</td>
                  <td>MSVC 2022, Xcode/clang, or gcc. All three are exercised in CI.</td>
                </tr>
                <tr>
                  <td>JUCE</td>
                  <td>8</td>
                  <td>
                    A local checkout, passed to CMake as <code>JUCE_SOURCE_DIR</code>.
                  </td>
                </tr>
                <tr>
                  <td>Bun</td>
                  <td>1.x</td>
                  <td>Installing and bundling the TypeScript UI (fast, zero-config TSX).</td>
                </tr>
              </tbody>
            </table>
            <p>
              QuickJS-ng (v0.15.1) and Yoga (v2.0.1) are vendored under{' '}
              <code>vsreact/third_party/</code> — nothing to install, no network access at
              build time.
            </p>
          </Section>

          <Section id="installation" title="Installation">
            <h3>1. Get the repository</h3>
            <Code title="shell">{`git clone https://github.com/N9RecordsTechnologiesIL/VSReacT.git
cd VSReacT`}</Code>
            <h3>2. Wire the module into your plugin</h3>
            <p>
              VSReacT builds as a static JUCE module through CMake. Add the directory and link
              the <code>vsreact</code> target — it brings QuickJS, Yoga, and the required JUCE
              module dependencies with it.
            </p>
            <Code title="CMakeLists.txt">{`add_subdirectory(path/to/VSReacT/vsreact vsreact-build)

target_link_libraries(MyPlugin PRIVATE vsreact)`}</Code>
            <h3>3. Install the TypeScript package</h3>
            <p>
              <code>@vsreact/core</code> lives at <code>vsreact/js</code>. Point your UI
              project at it with a workspace or file dependency:
            </p>
            <Code title="package.json">{`{
  "dependencies": {
    "@vsreact/core": "file:path/to/VSReacT/vsreact/js",
    "react": "^18.3.1"
  }
}`}</Code>
            <div className={styles.note}>
              <strong>Note:</strong> on Windows, Bun resolves local packages most reliably
              through a workspace root (a top-level <code>package.json</code> with a{' '}
              <code>workspaces</code> array) rather than <code>file:</code> links inside nested
              folders.
            </div>
          </Section>

          <Section id="quick-start" title="Quick start — the gain example">
            <p>
              The fastest tour is <code>vsreact/examples/gain</code>: a working gain/pan VST3
              and standalone app whose entire UI is fourteen lines of TSX — the exact tree
              running in the demo on the landing page.
            </p>
            <h3>Build the UI bundle</h3>
            <Code title="shell">{`cd vsreact/examples/gain/ui
bun install
bun run build        # emits build/main.js`}</Code>
            <h3>Build the plugin</h3>
            <Code title="shell">{`cd vsreact/examples/gain
cmake -S . -B build -DJUCE_SOURCE_DIR=path/to/JUCE
#   on Windows add: -G "Visual Studio 17 2022" -A x64
cmake --build build --target GainExample_Standalone --config Release`}</Code>
            <p>
              Run the standalone target (or load the VST3 in your DAW) and you get two knobs —
              <code>gain</code> and <code>pan</code> — bound to real{' '}
              <code>AudioProcessorValueTreeState</code> parameters with automation-safe
              gestures. This is the complete UI source:
            </p>
            <Code title="ui/src/main.tsx">{`import { render, View, ParamKnob } from "@vsreact/core";

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
          </Section>

          <Section id="first-ui" title="Your plugin, in React">
            <p>
              Integrating VSReacT into an existing plugin takes one component. In your editor,
              construct a <code>vsreact::RootView</code> with a bundle source and (optionally)
              a native-call handler, then add it like any <code>juce::Component</code>:
            </p>
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
              On the TypeScript side, <code>render(&lt;App /&gt;)</code> mounts your tree into
              the RootView. There is no HTML and no DOM — the primitives are{' '}
              <code>View</code>, <code>Text</code>, <code>Image</code>,{' '}
              <code>TextInput</code>, and <code>NativeView</code>, laid out by Yoga and painted
              by C++.
            </p>
            <p>
              Bundle with Bun targeting the embedded engine. QuickJS runs ES2023, so no
              transpilation gymnastics are needed — one flat IIFE bundle:
            </p>
            <Code title="ui/package.json (scripts)">{`{
  "scripts": {
    "build": "bun build src/main.tsx --outfile build/main.js --format iife",
    "watch": "bun build src/main.tsx --outfile build/main.js --format iife --watch"
  }
}`}</Code>
            <p>
              If the bundle throws — at load or inside an effect — the plugin does not die
              silently: VSReacT renders a red <strong>error overlay</strong> with the message
              and stack trace right inside the plugin window.
            </p>
          </Section>

          <Section id="hot-reload" title="Hot reload & shipping">
            <h3>Development — watch the file</h3>
            <p>
              With <code>watchForChanges = true</code>, the RootView polls the bundle’s
              modification time (250ms). Run <code>bun run watch</code>, save a component, and
              the running plugin tears down the JS runtime and remounts in about 100ms —
              inside the DAW, without closing FL Studio, Ableton, or your standalone build.
            </p>
            <h3>Production — embed the bundle</h3>
            <p>
              Ship a single binary with zero loose files: embed the bundle with JUCE’s
              BinaryData and pass it as <code>bundleSource</code>. A CMake option is the usual
              switch between the two modes:
            </p>
            <Code title="CMakeLists.txt">{`juce_add_binary_data(MyPluginAssets SOURCES ui/build/main.js)
target_link_libraries(MyPlugin PRIVATE MyPluginAssets)`}</Code>
            <Code title="PluginEditor.cpp">{`#if MYPLUGIN_DEV
    options.bundleFile = juce::File (MYPLUGIN_UI_BUNDLE_PATH);
    options.watchForChanges = true;
#else
    options.bundleSource = juce::String::fromUTF8 (BinaryData::main_js,
                                                   BinaryData::main_jsSize);
#endif`}</Code>
            <p>
              When <code>bundleFile</code> is empty or missing, the RootView falls back to{' '}
              <code>bundleSource</code> automatically — so a dev build still works after you
              delete the build folder.
            </p>
          </Section>

          <Section id="components" title="Components">
            <p>
              Five primitives cover the render surface. All of them accept{' '}
              <code>className</code>, <code>style</code>, and the pointer props listed under{' '}
              <a href="#events">Events &amp; gestures</a>.
            </p>
            <h3>&lt;View&gt;</h3>
            <p>
              The flexbox container — the <code>div</code> of VSReacT. Backgrounds, borders,
              rounded corners, shadows, opacity, scroll containers, and knob arcs are all drawn
              on Views.
            </p>
            <h3>&lt;Text&gt;</h3>
            <p>
              Draws strings and numbers. Font size, weight, family (<code>font-mono</code>),
              letter-spacing, line-height, alignment, and color come from classes or{' '}
              <code>style</code>. Text nodes measure themselves into the Yoga layout.
            </p>
            <h3>&lt;Image src&gt;</h3>
            <p>
              Paints an image from a file path or a <code>data:</code> URI, scaled to its
              layout box.
            </p>
            <h3>&lt;TextInput&gt;</h3>
            <p>
              A real, chrome-stripped <code>juce::TextEditor</code> positioned by Yoga — real
              caret, selection, and IME, while VSReacT paints the box, border, and focus ring
              around it.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PROP</th>
                  <th>TYPE</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>value</code> / <code>defaultValue</code>
                  </td>
                  <td>string</td>
                  <td>Controlled or uncontrolled, exactly like the DOM.</td>
                </tr>
                <tr>
                  <td>
                    <code>placeholder</code>
                  </td>
                  <td>string</td>
                  <td>
                    Color via the <code>placeholderColor</code> style key.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>disabled</code>
                  </td>
                  <td>boolean</td>
                  <td>Blocks focus and input.</td>
                </tr>
                <tr>
                  <td>
                    <code>onChange</code> / <code>onSubmit</code>
                  </td>
                  <td>(value: string) =&gt; void</td>
                  <td>Submit fires on Enter.</td>
                </tr>
                <tr>
                  <td>
                    <code>onFocus</code> / <code>onBlur</code>
                  </td>
                  <td>() =&gt; void</td>
                  <td>
                    Pair with <code>focus:</code> class variants for focus rings.
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>&lt;NativeView nativeId&gt;</h3>
            <p>
              The escape hatch: mounts any <code>juce::Component</code> you registered in the{' '}
              <code>NativeRegistry</code> inside the React layout. React owns its position and
              size; JUCE owns its painting. Perfect for waveform displays, meters fed from the
              audio thread, or any legacy component you are not ready to rewrite.
            </p>
            <Code title="C++ + TSX">{`// C++ — register a factory
vsreact::NativeRegistry registry;
registry.registerFactory ("waveform", [this] {
    return std::make_unique<WaveformDisplay> (processor);
});

// TSX — position it with flexbox
<NativeView nativeId="waveform" className="flex-1 rounded-lg overflow-hidden" />`}</Code>
          </Section>

          <Section id="styling" title="Styling">
            <p>
              Styling is a Tailwind-style utility subset, resolved <strong>in JS</strong> by
              the <code>tw()</code> resolver — C++ only ever sees final style objects. Classes
              compose left to right; unknown classes warn once in dev instead of failing.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>FAMILY</th>
                  <th>CLASSES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Flexbox</td>
                  <td>
                    <code>flex-row</code> <code>flex-col</code> <code>flex-1</code>{' '}
                    <code>flex-auto</code> <code>flex-none</code> <code>grow</code>{' '}
                    <code>shrink-0</code> <code>flex-wrap</code> <code>items-*</code>{' '}
                    <code>justify-*</code> <code>self-*</code> <code>basis-*</code>
                  </td>
                </tr>
                <tr>
                  <td>Sizing &amp; spacing</td>
                  <td>
                    <code>w-* h-*</code> <code>min-w-* max-h-*</code> <code>p-* px-* pt-*</code>{' '}
                    <code>m-* mx-* mt-*</code> <code>gap-* gap-x-* gap-y-*</code> — 4px scale,
                    fractions (<code>w-1/2</code>), <code>w-full</code>, arbitrary{' '}
                    <code>w-[220]</code>
                  </td>
                </tr>
                <tr>
                  <td>Position</td>
                  <td>
                    <code>absolute</code> <code>relative</code> <code>inset-*</code>{' '}
                    <code>top-* right-* bottom-* left-*</code>
                  </td>
                </tr>
                <tr>
                  <td>Color</td>
                  <td>
                    <code>bg-*</code> <code>text-*</code> <code>border-*</code> — palette
                    (zinc, neutral, red, lime, amber, emerald, sky…), theme tokens, hex{' '}
                    <code>bg-[#0B0B0A]</code>, opacity suffix <code>bg-black/40</code>
                  </td>
                </tr>
                <tr>
                  <td>Borders &amp; radius</td>
                  <td>
                    <code>border</code> <code>border-2</code> <code>rounded</code>{' '}
                    <code>rounded-sm…3xl/full</code>, per corner <code>rounded-t-lg</code>{' '}
                    <code>rounded-br-full</code>, arbitrary <code>rounded-[10]</code>
                  </td>
                </tr>
                <tr>
                  <td>Typography</td>
                  <td>
                    <code>text-xs…text-4xl</code> <code>text-[15]</code>{' '}
                    <code>font-normal/medium/semibold/bold</code> <code>font-mono</code>{' '}
                    <code>text-left/center/right</code> <code>tracking-*</code>{' '}
                    <code>leading-*</code>
                  </td>
                </tr>
                <tr>
                  <td>Effects</td>
                  <td>
                    <code>opacity-*</code> <code>shadow…shadow-xl</code>{' '}
                    <code>overflow-hidden</code> <code>overflow-y-scroll</code>{' '}
                    <code>aspect-square</code> <code>cursor-pointer/text/default</code>
                  </td>
                </tr>
                <tr>
                  <td>Variants</td>
                  <td>
                    <code>hover:</code> <code>active:</code> <code>focus:</code> — resolved to
                    native hover/active/focus style layers, applied by the C++ hit-tester
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Theme tokens</h3>
            <p>
              Register your palette once and use semantic names everywhere — the resolver
              expands them like any other color:
            </p>
            <Code title="theme.ts">{`import { configureTheme } from "@vsreact/core";

configureTheme({
  colors: {
    surface: "#0F1210",
    raised:  "#161B17",
    accent:  "#C6F135",
    text:    "#ECF2E8",
    faint:   "#8B948C",
  },
});

// then: <View className="bg-surface border-raised hover:bg-raised">
//       <Text className="text-accent" />`}</Code>
            <h3>The style prop</h3>
            <p>
              For computed values, pass <code>style</code> directly — the same keys the
              resolver produces (<code>width</code>, <code>backgroundColor</code>,{' '}
              <code>fontSize</code>, <code>opacity</code>…). Two families exist only as style
              keys:
            </p>
            <ul>
              <li>
                <strong>Arc painting</strong> — <code>arcTrackColor</code>,{' '}
                <code>arcColor</code>, <code>arcStart</code>, <code>arcEnd</code>,{' '}
                <code>arcValueEnd</code>, <code>arcThickness</code>: the natively painted knob
                arc, angles in degrees around the View’s center.
              </li>
              <li>
                <strong>Text input chrome</strong> — <code>caretColor</code>,{' '}
                <code>placeholderColor</code>.
              </li>
            </ul>
          </Section>

          <Section id="parameters" title="Audio parameters">
            <p>
              Parameter binding is two-way and automation-safe. C++ owns the truth (the{' '}
              <code>AudioProcessorValueTreeState</code>); JS reads, sets, and subscribes
              through <code>vsreact::ParameterBridge</code>. All values are normalized 0..1.
            </p>
            <h3>useParameter(id)</h3>
            <Code title="TSX">{`const gain = useParameter("gain");

gain.value   // 0..1, live — updates when the DAW automates it
gain.text    // host-formatted display text, e.g. "-3.2 dB"
gain.name    // parameter name from the APVTS
gain.label   // unit label, e.g. "dB"

gain.begin();       // start an automation gesture
gain.set(0.75);     //   ...as many times as you like (drag)
gain.end();         // end the gesture — hosts record clean automation`}</Code>
            <h3>Ready-made controls</h3>
            <p>
              <code>&lt;ParamKnob paramId label? size? trackColor? valueColor? /&gt;</code> and{' '}
              <code>&lt;ParamSlider /&gt;</code> wrap <code>useParameter</code> with the
              natively painted <code>Knob</code>/<code>Slider</code>: arc or bar, host text in
              the middle, drag with correct begin/set/end gestures, label from the parameter
              name. The unbound <code>&lt;Knob value onChange /&gt;</code> and{' '}
              <code>&lt;Slider /&gt;</code> are exported too, for values that are not host
              parameters.
            </p>
            <h3>C++ wiring</h3>
            <Code title="PluginEditor.h / .cpp">{`vsreact::ParameterBridge bridge { processor.apvts };

// 1. chain param:* calls first in onNativeCall
options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var {
    if (auto handled = bridge.handleNativeCall (name, args))
        return *handled;
    return {};
};

// 2. attach the RootView so DAW-side changes reach useParameter
bridge.attach (*root);`}</Code>
            <p>
              DAW-side changes (automation, preset loads, other UI) are coalesced on the
              message thread and pushed to JS as <code>param</code> events — the{' '}
              <code>useParameter</code> hook subscribes for you.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PROTOCOL</th>
                  <th>PAYLOAD</th>
                  <th>DIRECTION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>param:get</code>
                  </td>
                  <td>
                    <code>{'{id}'}</code> → <code>{'{value, text, name, label}'}</code>
                  </td>
                  <td>JS → C++</td>
                </tr>
                <tr>
                  <td>
                    <code>param:set</code>
                  </td>
                  <td>
                    <code>{'{id, value}'}</code>
                  </td>
                  <td>JS → C++</td>
                </tr>
                <tr>
                  <td>
                    <code>param:begin</code> / <code>param:end</code>
                  </td>
                  <td>
                    <code>{'{id}'}</code>
                  </td>
                  <td>JS → C++ (gesture brackets)</td>
                </tr>
                <tr>
                  <td>
                    <code>param</code> event
                  </td>
                  <td>
                    <code>{'{id, value, text}'}</code>
                  </td>
                  <td>C++ → JS</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="events" title="Events & gestures">
            <p>
              The RootView hit-tests every mouse event into the shadow tree with DOM-style
              bubbling, maintains hover chains, and applies <code>hover:</code>/
              <code>active:</code> style layers natively — no JS round-trip for a hover
              repaint.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PROP</th>
                  <th>PAYLOAD</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>onClick</code>
                  </td>
                  <td>—</td>
                  <td>Fires on release over the pressed node.</td>
                </tr>
                <tr>
                  <td>
                    <code>onMouseEnter</code> / <code>onMouseLeave</code>
                  </td>
                  <td>—</td>
                  <td>Hover chain, parent-to-child, like the DOM.</td>
                </tr>
                <tr>
                  <td>
                    <code>onMouseDown</code> / <code>onMouseUp</code>
                  </td>
                  <td>—</td>
                  <td>
                    Drive <code>active:</code> styles.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>onDragStart</code> / <code>onDrag</code> / <code>onDragEnd</code>
                  </td>
                  <td>
                    <code>{'{dx, dy, x, y}'}</code>
                  </td>
                  <td>
                    Deltas from the drag origin plus the live pointer position, in root
                    coordinates — everything a knob or an XY pad needs.
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Scroll containers</h3>
            <p>
              Give a View <code>overflow-y-scroll</code> and a bounded height: children lay
              out at full size, the mouse wheel scrolls, the painter clips and draws a thumb.
              Set the <code>scrollTop</code> prop to reset the offset programmatically (say,
              when switching tabs).
            </p>
            <Code title="TSX">{`<View className="flex-1 overflow-y-scroll gap-2 p-3" scrollTop={0}>
  {items.map((item) => <Row key={item.id} item={item} />)}
</View>`}</Code>
            <p>
              Cursors come from classes — <code>cursor-pointer</code>, <code>cursor-text</code>
              , <code>cursor-default</code> — applied per-node by the hit-tester.
            </p>
          </Section>

          <Section id="native" title="Native messaging">
            <p>
              Beyond parameters, apps talk to the plugin through one call and one event
              channel:
            </p>
            <Code title="TSX">{`import { native } from "@vsreact/core";

// synchronous request → C++ handler → JSON result
const info = native.call("app:version");

// subscribe to events pushed from C++; returns an unsubscribe fn
useEffect(() => native.on("download:progress", (p) => setProgress(p.ratio)), []);`}</Code>
            <Code title="C++">{`// handle calls (RootOptions::onNativeCall)
options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var {
    if (name == "app:version") return juce::var ("1.2.0");
    return {};
};

// push events (any thread → marshal to the message thread first)
root->sendNativeEvent ("download:progress",
                       juce::var (new juce::DynamicObject())); // {ratio: ...}`}</Code>
            <p>
              Calls are synchronous from the JS side — return values cross the bridge as JSON.
              For long work, kick it off in the call handler and report back with events.
            </p>
          </Section>

          <Section id="animation" title="Animation">
            <p>
              Tweens run on the host timer (16ms ticks through the C++ scheduler) and set
              React state, so every animated style flows through the normal setProps → repaint
              path — no separate animation system to learn.
            </p>
            <Code title="TSX">{`import { useTween, lerp, Easing } from "@vsreact/core";

function Splash() {
  const t = useTween({ duration: 600, delay: 150, easing: Easing.outExpo });

  return (
    <View
      className="items-center justify-center"
      style={{ opacity: t, marginTop: lerp(24, 0, t) }}
    >
      <Text className="text-2xl font-bold">STASHTRACK</Text>
    </View>
  );
}`}</Code>
            <ul>
              <li>
                <code>useTween({'{duration, delay?, easing?, onComplete?}'})</code> — eased
                progress 0→1, starting on mount. Remount (via <code>key</code>) to replay.
              </li>
              <li>
                <code>Easing</code> — <code>linear</code>, <code>outCubic</code>,{' '}
                <code>inOutCubic</code>, <code>outExpo</code>, <code>outBack</code>,{' '}
                <code>outQuint</code>, or any <code>(t) =&gt; t</code> function.
              </li>
              <li>
                <code>lerp(from, to, t)</code> — map progress onto any numeric style value.
              </li>
              <li>
                <code>setTimeout</code> / <code>setInterval</code> work inside the engine too —
                they are backed by the same native scheduler.
              </li>
            </ul>
          </Section>

          <Section id="cpp-api" title="C++ API">
            <h3>vsreact::RootOptions</h3>
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
            <h3>vsreact::RootView</h3>
            <p>
              A <code>juce::Component</code> that owns the JS runtime, shadow tree, scheduler,
              hosted native children, and paints the whole UI. Construct with{' '}
              <code>RootOptions</code> and an optional <code>NativeRegistry</code>, then{' '}
              <code>addAndMakeVisible</code>. Key members:
            </p>
            <ul>
              <li>
                <code>sendNativeEvent(name, payload)</code> — push an event to{' '}
                <code>native.on</code> listeners.
              </li>
              <li>
                <code>isBundleLoaded()</code> — true once the bundle evaluated successfully.
              </li>
              <li>
                Resizing the component relayouts the Yoga tree; mouse overrides do the
                hit-testing.
              </li>
            </ul>
            <h3>vsreact::ParameterBridge</h3>
            <p>
              Construct with your APVTS, chain <code>handleNativeCall()</code> first inside{' '}
              <code>onNativeCall</code>, and <code>attach()</code> the RootView. See{' '}
              <a href="#parameters">Audio parameters</a> for the full protocol.
            </p>
            <h3>vsreact::NativeRegistry</h3>
            <p>
              <code>registerFactory(id, factory)</code> maps a <code>nativeId</code> to a{' '}
              <code>std::function</code> producing a <code>juce::Component</code>. The RootView
              creates, positions, and destroys instances as <code>&lt;NativeView&gt;</code>{' '}
              nodes mount and unmount.
            </p>
          </Section>

          <Section id="architecture" title="Architecture">
            <p>
              One render cycle, end to end: React commits a change →{' '}
              the reconciler’s host config serializes it as mutation ops →{' '}
              <code>__vsreact_flush</code> hands the JSON batch to C++ → the shadow tree
              applies it, Yoga recomputes layout, and the painter repaints the dirty region.
              Events travel the other way: JUCE mouse events hit-test into the tree and
              dispatch to JS listeners through <code>__vsreact_dispatch</code>.
            </p>
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
                    <code>["create", id, type]</code> — vs-view, vs-text, vs-image,
                    vs-textinput, vs-native
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>setProps</code>
                  </td>
                  <td>
                    <code>["setProps", id, {'{style, hoverStyle, activeStyle, …}'}]</code> —
                    resolved styles, listener flags, text, scrollTop
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>appendChild</code> / <code>insertBefore</code> /{' '}
                    <code>removeChild</code>
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
              The engine is QuickJS-ng — a complete ES2023 interpreter around one megabyte,
              running in-process on the message thread. Timers (<code>setTimeout</code>,{' '}
              <code>setInterval</code>) are provided by the native scheduler; promise
              rejections and exceptions route to the error overlay. Yoga v2 provides the exact
              flexbox semantics React Native uses, so layout intuition transfers directly.
            </p>
          </Section>

          <Section id="testing" title="Testing">
            <p>Both halves of the framework ship with suites that run in CI on every push:</p>
            <Code title="shell">{`# TypeScript — reconciler host config, tw resolver, controls, animation
cd vsreact/js && bun test

# C++ — shadow tree, styles, layout, painter, bridge (JUCE UnitTest + CTest)
cmake -S ci -B ci/build -DJUCE_SOURCE_DIR=path/to/JUCE -DCMAKE_BUILD_TYPE=Release
cmake --build ci/build --config Release
ctest --test-dir ci/build -C Release`}</Code>
            <p>
              CI builds Windows (MSVC) and macOS (clang) on every push via the workflows in{' '}
              <code>.github/workflows/</code>.
            </p>
          </Section>

          <Section id="showcase" title="Built with VSReacT">
            <p>
              <a href={STASH}>
                <strong>StashTrack</strong>
              </a>{' '}
              is a production VST3 for Windows, macOS, and Linux whose entire interface is a
              VSReacT app — splash screen with staged entrance animations, live download
              progress, preview playback, and an animated scrollable stash drawer. One React
              codebase, every platform, no webview. It is also the framework’s proving ground:
              every feature on this page shipped there first.
            </p>
          </Section>

          <Section id="faq" title="FAQ">
            <h3>Is this a webview?</h3>
            <p>
              No. There is no browser, no HTML, no CSS engine in the binary. Your React runs in
              QuickJS (~1MB, in-process) and every pixel is painted by{' '}
              <code>juce::Graphics</code>. That is the whole point.
            </p>
            <h3>Which plugin formats and platforms?</h3>
            <p>
              Anything JUCE targets — VST3, AU, AAX, LV2, standalone — on Windows, macOS, and
              Linux. VSReacT is a JUCE module; it goes wherever your JUCE plugin goes.
            </p>
            <h3>What about performance?</h3>
            <p>
              Layout and painting are C++. JS runs only when your components render, and the
              bridge batches mutations per commit. Hover and active styles repaint natively
              with no JS round-trip. The gain example idles at zero JS activity.
            </p>
            <h3>Can I use npm packages?</h3>
            <p>
              Pure-JS packages that target ES2023 work — Bun bundles them in. Anything that
              expects the DOM, Node APIs, or the network will not, by design: a plugin UI
              should be deterministic and offline.
            </p>
            <h3>How do I debug?</h3>
            <p>
              <code>console.log</code> routes to the native logger (<code>__vsreact_log</code>)
              and shows in your debugger’s output. Runtime errors render the red overlay with a
              stack trace in the plugin window. And hot reload keeps the iteration loop around
              100ms.
            </p>
            <h3>What licenses am I agreeing to?</h3>
            <p>
              VSReacT itself is MIT. Vendored engines keep their permissive licenses
              (QuickJS-ng: MIT, Yoga: MIT). JUCE has its own commercial/GPL terms you must
              satisfy for plugin distribution.
            </p>
          </Section>

          <Section id="support" title="Support & license">
            <ul>
              <li>
                <strong>Source &amp; issues</strong> — <a href={REPO}>{REPO.replace('https://', '')}</a>
              </li>
              <li>
                <strong>Email</strong> —{' '}
                <a href="mailto:vsreact-support@n9records.com">vsreact-support@n9records.com</a>
              </li>
              <li>
                <strong>License</strong> — MIT, © N9 Records Technologies.
              </li>
            </ul>
          </Section>
        </div>
      </div>

      <footer className={styles.foot}>
        <a className={styles.footCta} href={REPO}>
          START BUILDING →
        </a>
        <p>
          VSReacT — N9 Records Technologies · MIT ·{' '}
          <a className={styles.footMail} href="mailto:vsreact-support@n9records.com">
            vsreact-support@n9records.com
          </a>
        </p>
      </footer>
    </main>
  )
}
