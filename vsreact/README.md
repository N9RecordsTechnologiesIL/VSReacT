# VSReacT

Write native JUCE plugin UIs in modern React + TypeScript — no webview, no
LookAndFeel fights, no janky workarounds.

Full documentation: **[vsreact.n9records.com/docs](https://vsreact.n9records.com/docs)** ·
UI package: **[`@vsreact/core` on npm](https://www.npmjs.com/package/@vsreact/core)**

```tsx
import { useState } from "react";
import { render, View, Text } from "@vsreact/core";

function App() {
  const [count, setCount] = useState(0);
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 gap-3">
      <View
        className="px-6 py-3 bg-lime-400 rounded-xl cursor-pointer hover:bg-lime-300 active:bg-lime-500"
        onClick={() => setCount((c) => c + 1)}
      >
        <Text className="text-zinc-950 font-bold">clicked {count} times</Text>
      </View>
    </View>
  );
}

render(<App />);
```

## How it works

```
Your React app (TSX)
  → react-reconciler custom host config     runs in QuickJS-ng inside the plugin
  → JSON mutation batches over a C bridge   create/setProps/append/remove/setText
  → C++ shadow tree                         retained mirror of the React tree
  → Yoga flexbox layout                     the same engine React Native uses
  → juce::Graphics painter                  every pixel drawn natively
```

Pointer input flows the other way: JUCE mouse events are hit-tested against
the layout tree and dispatched into JS as React-style events with DOM-like
bubbling, hover/active/focus restyling, and cursors.

## Features

- **Modern React 18** — hooks, function components, effects, the API you know.
- **Tailwind-style classes** — a curated subset (`flex`, spacing, palette +
  theme colors, `rounded-*`, `border`, `shadow-*`, `opacity-*`, text utils,
  arbitrary values like `w-[123]`/`bg-[#C6F135]`) with `hover:`, `active:`,
  and `focus:` variants resolved in JS; C++ only sees resolved styles.
- **Real text input** — `<TextInput>` wraps a chrome-stripped
  `juce::TextEditor` positioned by Yoga: real caret, selection, IME. VSReacT
  paints the box and focus ring.
- **Native escape hatch** — `<NativeView nativeId="waveform">` mounts any
  registered `juce::Component` inside the React layout.
- **Audio parameter binding** — `useParameter(id)` + `<ParamKnob>`/
  `<ParamSlider>` bind two-way to a `juce::AudioProcessorValueTreeState`
  through `vsreact::ParameterBridge`, with automation-safe begin/end gestures.
  See `examples/gain` for a complete two-knob plugin.
- **Knobs, sliders, drag gestures** — `onDragStart/onDrag/onDragEnd` events
  with pixel deltas; the painter draws knob arc rings natively (`arcColor`,
  `arcTrackColor`, `arcStart/End/ValueEnd`, `arcThickness`).
- **Scroll containers** — `overflow-y-scroll` gives wheel scrolling with
  clamping, a painted thumb, scroll-aware hit-testing, and translated
  children. (Hosted components inside scroll containers move too; use
  `opacity-0` to hide hosted TextInputs under overlays — real JUCE children
  always draw above painted content.)
- **Native messaging** — `native.call("startDownload", {...})` invokes C++
  handlers synchronously; C++ pushes events with
  `root.sendNativeEvent("status", ...)` to `native.on(...)` listeners.
- **Hot reload** — dev builds watch the bundle file; rebuild and the running
  plugin remounts in-place. No DAW restart.
- **Error overlay** — JS exceptions show an RN-style red box with the stack.

## Using it in a plugin

JS side:

```bash
bun add @vsreact/core   # or npm install / yarn add / pnpm add
```

CMake (after adding JUCE) — FetchContent, or `add_subdirectory` if vendored:

```cmake
include(FetchContent)
FetchContent_Declare(vsreact
    GIT_REPOSITORY https://github.com/N9RecordsTechnologiesIL/VSReacT.git
    GIT_TAG        v0.0.1
    SOURCE_SUBDIR  vsreact)
FetchContent_MakeAvailable(vsreact)

target_link_libraries(MyPlugin PRIVATE vsreact)
```

C++:

```cpp
vsreact::NativeRegistry registry;
registry.registerFactory ("meter", [] { return std::make_unique<MyMeter>(); });

vsreact::RootOptions options;
options.bundleFile = juce::File ("path/to/build/main.js"); // dev
options.watchForChanges = true;
options.onNativeCall = [] (const juce::String& name, const juce::var& args) -> juce::var
{
    // handle native.call(name, args) from JS
    return {};
};

root = std::make_unique<vsreact::RootView> (std::move (options), std::move (registry));
addAndMakeVisible (*root);
```

JS app: depend on `@vsreact/core` (published on npm; source at `js/` in
this repo), bundle with Bun as an IIFE (`js/build.ts` shows how),
production builds embed the bundle via `juce_add_binary_data` and
`RootOptions::bundleSource`.

## Layout

- `module/vsreact/` — the JUCE module: QuickJS runtime, bridge, shadow tree,
  Yoga adapter, painter, hit-testing, TextInput host, native registry,
  RootView, error overlay.
- `js/` — `@vsreact/core`: reconciler host config, primitives, tailwind
  resolver, runtime shims, native messaging.
- `third_party/` — vendored quickjs-ng (v0.15.1) and Yoga (v2.0.1).
- `examples/gain/` — a real gain/pan plugin: APVTS-bound React knobs.
  Builds standalone: `cmake -S examples/gain -B examples/gain/build-vs
  -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=path/to/JUCE`.
- `tests/` — C++ unit tests (`VSReacTTests`); JS tests run with `bun test`.

First consumer: [StashTrack](../StashTrack), whose entire plugin UI is a
VSReacT app (`StashTrack/jsui-vsreact/`).
