// Single source of truth for the docs tree: sidebar order, groups, pager,
// and the search index (headings + keywords per page).

export interface DocPage {
  slug: string // '' = /docs
  title: string
  group: string
  /** [anchor id, heading label] — powers search results deep-links. */
  headings: Array<[string, string]>
  /** Extra search terms not present in the title/headings. */
  keywords: string
}

export const DOCS: DocPage[] = [
  {
    slug: '',
    title: 'Introduction',
    group: 'OVERVIEW',
    headings: [
      ['why', 'Why VSReacT exists'],
      ['pipeline', 'How it works'],
      ['highlights', 'Key features'],
      ['proof', 'Proven in production'],
    ],
    keywords: 'overview what is vsreact react juce renderer quickjs yoga no webview start here',
  },
  {
    slug: 'installation',
    title: 'Installation',
    group: 'GETTING STARTED',
    headings: [
      ['ui-package', 'The UI package'],
      ['native-module', 'The native module'],
      ['vendoring', 'Prefer vendoring?'],
      ['requirements', 'Requirements'],
    ],
    keywords: 'install setup bun npm yarn pnpm add fetchcontent cmake dependency @vsreact/core',
  },
  {
    slug: 'quick-start',
    title: 'Quick start',
    group: 'GETTING STARTED',
    headings: [
      ['ui', 'Build the UI bundle'],
      ['plugin', 'Build the plugin'],
      ['run', 'Run it'],
      ['tour', 'What just happened'],
    ],
    keywords: 'example gain first plugin five minutes build run standalone vst3 tutorial',
  },
  {
    slug: 'integration',
    title: 'Your plugin, in React',
    group: 'GETTING STARTED',
    headings: [
      ['editor', 'The editor side'],
      ['entry', 'The React side'],
      ['bundle', 'Bundling with Bun'],
      ['errors', 'When the bundle throws'],
    ],
    keywords: 'rootview rootoptions editor wiring integrate existing bundle iife error overlay',
  },
  {
    slug: 'hot-reload',
    title: 'Hot reload & shipping',
    group: 'GETTING STARTED',
    headings: [
      ['dev', 'Development — watch the file'],
      ['prod', 'Production — embed the bundle'],
      ['fallback', 'Fallback behavior'],
    ],
    keywords: 'watch live reload binarydata embed production ship release daw fl studio',
  },
  {
    slug: 'components',
    title: 'Components',
    group: 'UI REFERENCE',
    headings: [
      ['view', '<View>'],
      ['text', '<Text>'],
      ['image', '<Image>'],
      ['textinput', '<TextInput>'],
      ['controls', 'Built-in controls'],
      ['nativeview', '<NativeView>'],
    ],
    keywords:
      'primitives div view text image input knob slider toggle xypad segmented select dropdown meter generic editor native escape hatch',
  },
  {
    slug: 'styling',
    title: 'Styling',
    group: 'UI REFERENCE',
    headings: [
      ['classes', 'Supported classes'],
      ['cx', 'Composing classes — cx()'],
      ['theme', 'Theme tokens'],
      ['style-prop', 'The style prop'],
      ['arcs', 'Arc painting (knobs)'],
    ],
    keywords: 'tailwind classname colors palette hover active focus variants theme arbitrary size inset negative margin flex gap rounded border shadow cx clsx arc',
  },
  {
    slug: 'events',
    title: 'Events & gestures',
    group: 'UI REFERENCE',
    headings: [
      ['pointer', 'Pointer events'],
      ['drag', 'Drag gestures'],
      ['scroll', 'Scroll containers'],
      ['layout', 'Layout feedback — onLayout'],
      ['cursor', 'Cursors'],
    ],
    keywords:
      'click mouse hover onclick drag gesture dx dy scroll wheel overflow cursor bubbling onlayout layout rect useoverlay overlay popover tooltip uselayoutrect',
  },
  {
    slug: 'animation',
    title: 'Animation',
    group: 'UI REFERENCE',
    headings: [
      ['usetween', 'useTween'],
      ['usespring', 'useSpring'],
      ['stagger', 'Staggered sequences'],
      ['timers', 'Timers'],
    ],
    keywords: 'tween spring easing lerp motion animate transition stiffness damping settimeout setinterval',
  },
  {
    slug: 'parameters',
    title: 'Audio parameters',
    group: 'AUDIO & NATIVE',
    headings: [
      ['useparameter', 'useParameter(id)'],
      ['controls', 'Ready-made controls'],
      ['generic', 'The one-line editor'],
      ['wiring', 'C++ wiring'],
      ['protocol', 'The wire protocol'],
    ],
    keywords: 'apvts parameter automation gesture begin end paramknob paramslider paramtoggle generic editor useparameterlist param:list host daw',
  },
  {
    slug: 'native-messaging',
    title: 'Native messaging',
    group: 'AUDIO & NATIVE',
    headings: [
      ['js', 'The JS side'],
      ['cpp', 'The C++ side'],
      ['patterns', 'Patterns'],
    ],
    keywords: 'native call on events bridge sendnativeevent usenativeevent usedebounced debounce messaging json',
  },
  {
    slug: 'cpp-api',
    title: 'C++ API',
    group: 'AUDIO & NATIVE',
    headings: [
      ['rootoptions', 'vsreact::RootOptions'],
      ['rootview', 'vsreact::RootView'],
      ['parameterbridge', 'vsreact::ParameterBridge'],
      ['nativeregistry', 'vsreact::NativeRegistry'],
    ],
    keywords: 'c++ native api juce module rootview rootoptions bridge registry bundlefile bundlesource watchforchanges onnativecall',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    group: 'INTERNALS',
    headings: [
      ['ops', 'The mutation protocol'],
      ['engine', 'The engine'],
      ['layout', 'Layout & painting'],
      ['bridge', 'The C bridge'],
    ],
    keywords: 'internals how it works reconciler mutation ops shadow tree quickjs yoga painter flush dispatch protocol',
  },
  {
    slug: 'testing',
    title: 'Testing',
    group: 'INTERNALS',
    headings: [
      ['ts', 'TypeScript'],
      ['cpp', 'C++'],
      ['ci', 'Continuous integration'],
    ],
    keywords: 'test bun ctest unittest ci suites',
  },
  {
    slug: 'faq',
    title: 'FAQ',
    group: 'PROJECT',
    headings: [
      ['webview', 'Is this a webview?'],
      ['formats', 'Which plugin formats and platforms?'],
      ['performance', 'What about performance?'],
      ['npm', 'Can I use npm packages?'],
      ['debugging', 'How do I debug?'],
      ['licensing', 'What licenses am I agreeing to?'],
    ],
    keywords: 'questions answers webview vst3 au aax lv2 windows macos linux performance cpu debug console license',
  },
  {
    slug: 'support',
    title: 'Support & license',
    group: 'PROJECT',
    headings: [
      ['channels', 'Get help'],
      ['license', 'License'],
    ],
    keywords: 'help contact email issues github mit license stashtrack',
  },
]

export const hrefFor = (page: DocPage): string => (page.slug ? `/docs/${page.slug}` : '/docs')
