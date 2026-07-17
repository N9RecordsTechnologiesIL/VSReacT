// Shared copy for every design variant — layouts differ, the story doesn't.

export const REPO = 'https://github.com/N9RecordsTechnologiesIL/VSReacT'
export const STASH = 'https://stashtrack.n9records.com'
export const MAIL = 'mailto:vsreact-support@n9records.com'

export const TAGLINE = 'A React renderer for JUCE audio plugins'

export const LEDE =
  'Your TSX runs in an embedded QuickJS engine inside the plugin. A custom reconciler streams the tree to C++, Yoga computes flexbox, juce::Graphics paints every pixel. No webview.'

export const STEPS: Array<[string, string, string]> = [
  ['01', 'React 18', 'Your TSX, unmodified — hooks, effects, components.'],
  ['02', 'QuickJS', 'Embedded ES2023 engine, ~1MB, in-process. Zero webview.'],
  ['03', 'Reconciler', 'Streams the tree to C++ as mutation ops over a C bridge.'],
  ['04', 'Yoga', 'Real flexbox layout in the native shadow tree.'],
  ['05', 'juce::Graphics', 'Every pixel painted natively, 60fps, any DAW.'],
]

export const FEATURES: Array<[string, string]> = [
  ['Classes you know', 'Tailwind-style utilities with variants — resolved in JS, painted in C++.'],
  ['Host-grade params', 'useParameter(id) binds two-way to the APVTS with automation-safe gestures.'],
  ['~100ms hot reload', 'Save, rebuild, the plugin remounts inside the DAW. FL Studio never closes.'],
  ['Real text input', 'A chrome-stripped juce::TextEditor — caret, selection, IME.'],
  ['Native escape hatch', '<NativeView/> mounts any juce::Component inside the React layout.'],
  ['Motion built in', 'Drag gestures with pixel deltas, scroll containers, a useTween API.'],
]

export const CODE = `import { render, View, ParamKnob } from "vsreact-core";

function App() {
  return (
    <View className="flex-1 items-center justify-center
                     bg-zinc-950 gap-10 flex-row">
      <ParamKnob paramId="gain" size={88} />
      <ParamKnob paramId="pan" size={88} />
    </View>
  );
}

render(<App />);   // the whole plugin UI`

export const SHOWCASE_TITLE = 'StashTrack runs on it.'

export const SHOWCASE_BODY =
  'A production VST3 whose entire interface is VSReacT — splash screen, live download progress, preview playback, an animated stash drawer. One React codebase. Windows, macOS, Linux.'
