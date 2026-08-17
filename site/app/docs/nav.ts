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
      ['create', 'Scaffold a project'],
      ['ui', 'Build the UI bundle'],
      ['plugin', 'Build the plugin'],
      ['run', 'Run it'],
      ['tour', 'What just happened'],
    ],
    keywords: 'example gain first plugin five minutes build run standalone vst3 tutorial create-vsreact create scaffold scaffolder starter template new project generator npm create bun create',
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
      ['canvas', '<Canvas>'],
      ['film-strip', 'Film-strip knobs'],
    ],
    keywords:
      'registerimage intern image handle plate canvas raster pixels rgba arraybuffer draw filmstrip film strip bakeknobstrip bake sprite sheet webp primitives div view text image svg svgpath path vector icon icons lucide heroicons viewbox input knob slider toggle xypad segmented select dropdown meter generic editor tooltip modal dialog bipolar button bars waveform visualizer spectrum variant skin face knobvariant instrument gauge steel stainless metal knurled glass dome chickenhead vintage neon led segments blueprint drafted numberbox number checkbox radio radiogroup progress progressbar spinner loading indeterminate macropad macro hardware hardwareknob crossfader dry wet pulseorb orb rings output portal thermal novelty pianokeyboard piano keyboard keys midi note glissando stepsequencer step sequencer pattern grid playhead adsr envelope attack decay sustain release adsrenvelope pitchbend pitch bend modwheel mod wheel spring tabs tab pages disclosure collapsible accordion fold gain reduction reverse eqcurve eq curve biquad filter response peak shelf lowpass highpass notch q ringmeter ring circular native escape hatch',
  },
  {
    slug: 'styling',
    title: 'Styling',
    group: 'UI REFERENCE',
    headings: [
      ['classes', 'Supported classes'],
      ['cx', 'Composing classes — cx()'],
      ['theme', 'Theme tokens'],
      ['fonts', 'Custom fonts'],
      ['style-prop', 'The style prop'],
      ['arcs', 'Arc painting (knobs)'],
    ],
    keywords: 'font fonts registerfont fontfamily typeface boxshadow backgroundlayers layers textstroke stroke textlength tailwind classname colors palette hover active focus variants theme arbitrary size inset negative margin flex gap rounded border shadow cx clsx arc gradient gradients conic radial linear from via to repeat rotate scale translate transform zindex z clip clippath polygon inner textshadow glow',
  },
  {
    slug: 'events',
    title: 'Events & gestures',
    group: 'UI REFERENCE',
    headings: [
      ['pointer', 'Pointer events'],
      ['drag', 'Drag gestures'],
      ['keyboard', 'Keyboard & focus'],
      ['scroll', 'Scroll containers'],
      ['layout', 'Layout feedback — onLayout'],
      ['cursor', 'Cursors'],
    ],
    keywords:
      'click double dblclick doubleclick mouse hover onclick drag gesture dx dy scroll wheel onwheel overflow cursor bubbling onlayout layout rect useoverlay overlay popover tooltip uselayoutrect reset default keyboard keydown onkeydown focus blur tab arrow arrows focusable sliderkeytarget mousemove onmousemove',
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
    keywords: 'tween spring easing lerp motion animate transition transitioneasing cubic-bezier cubicbezier bezier stiffness damping settimeout setinterval',
  },
  {
    slug: 'hooks',
    title: 'Hooks & utilities',
    group: 'UI REFERENCE',
    headings: [
      ['state', 'State & timing'],
      ['pointer', 'Pointer & layout'],
      ['audio', 'Audio data'],
      ['bridge', 'Native bridge'],
      ['format', 'Value formatting'],
    ],
    keywords:
      'useeditorsize userootsize resize editor size usetoggle useprevious usedebounced usethrottled useinterval usehover usenativevalue userollingbuffer pushrolling usepeakhold utilities toolbox debounce throttle interval toggle previous hover rolling buffer formatdb formathz formatms formatpercent formatsemitones midinotename midinotetohz hztomidinote frequency tuning maprange db hz khz decibel readout format',
  },
  {
    slug: 'reference-art',
    title: 'Reference-art workflow',
    group: 'UI REFERENCE',
    headings: [
      ['idea', 'The idea'],
      ['plate', 'Ship the plate'],
      ['hits', 'Invisible hit zones'],
      ['covers', 'Cover the moving parts'],
      ['knobs', 'Film-strip knobs'],
      ['fonts', 'Readouts & fonts'],
      ['verify', 'Verify it moves'],
    ],
    keywords:
      'reference art plate panel photo design port figma export webp intern registerimage cover patch hit zone invisible useparamgestures film strip filmstrip bakeknobstrip knob sprite readout textlength seven segment neutralise workflow guide tutorial pixel exact hardware skeuomorphic',
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
    keywords: 'apvts parameter automation gesture begin end paramknob paramslider paramtoggle generic editor useparameterlist param:list host daw useparamgestures headless hit zone drag reset wheel min max skew interval range metadata normalizedtonatural naturaltonormalized normalisablerange',
  },
  {
    slug: 'presets',
    title: 'Presets',
    group: 'AUDIO & NATIVE',
    headings: [
      ['cpp', 'The C++ side'],
      ['react', 'The React side'],
      ['protocol', 'The wire protocol'],
      ['resize', 'Resizable editors'],
    ],
    keywords:
      'preset presets presetmanager presetbrowser usepresets factory user save load next prev dirty asterisk bank patch program resizable resize setresizable setresizelimits uiwidth uiheight persist size scale editor corner grip',
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
    slug: 'posthog',
    title: 'PostHog analytics',
    group: 'AUDIO & NATIVE',
    headings: [
      ['install', 'Install'],
      ['cpp', 'C++ wiring'],
      ['js', 'Capture from React'],
      ['api', 'The client API'],
      ['errors', 'Error tracking & sessions'],
    ],
    keywords:
      'posthog analytics telemetry usage events capture identify tracking metrics parameter_changed usecaptureonmount usecaptureonunmount useeditorsession useposthogparameters errorboundary captureexception exception error tracking optout optin consent privacy alias setonce group groups groupidentify beforesend scrub sanitize debug time timeend duration stopwatch samplerate sampling maxqueuesize queue screen usescreen shutdown teardown denylist propertydenylist register registeronce bridge',
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
    keywords: 'c++ native api juce module rootview rootoptions bridge registry bundlefile bundlesource watchforchanges onnativecall fontregistry vsreact:resize setsize',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    group: 'INTERNALS',
    headings: [
      ['ops', 'The mutation protocol'],
      ['handshake', 'Version handshake'],
      ['engine', 'The engine'],
      ['layout', 'Layout & painting'],
      ['bridge', 'The C bridge'],
    ],
    keywords:
      'internals how it works reconciler mutation ops shadow tree quickjs yoga painter flush dispatch protocol version handshake mismatch nativeprotocol protocol_version frozen freeze stuck not updating git_tag fetchcontent upgrade compatibility',
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
