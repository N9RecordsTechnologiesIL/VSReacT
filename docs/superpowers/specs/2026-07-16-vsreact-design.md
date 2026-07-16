# VSReacT — React-Native-Style UI Framework for JUCE VST Plugins

Date: 2026-07-16
Status: Implemented 2026-07-16 — all success criteria verified (see plan for
the two accepted deviations: hover-chain event bubbling added; painter
gradients dropped as YAGNI).

## Problem

Writing good-looking VST UIs today means either raw JUCE paint code, fighting
LookAndFeel, or abandoned bridges like react-juce (Blueprint). StashTrack
currently uses react-juce v0.2.16 only as a decorative backdrop — every real
control is still native JUCE. The goal is to write the *entire* plugin UI as a
modern React + TypeScript app, rendered natively with no webview.

## Goal (proof of concept)

StashTrack's full UI — URL text input, Download button, Clip toggle,
start/end fields, status text, and the waveform view — written in React and
rendered by the VSReacT engine inside the JUCE plugin. Only the native OS
file-drag remains C++ (host drags must use JUCE's native drag API).

Success criteria:

1. The plugin builds and runs in FL Studio with the React-driven UI.
2. All interactive controls work: typing a URL, clicking Download, toggling
   Clip, editing start/end, live status updates.
3. The waveform (native component) is embedded inside the React layout via the
   escape hatch and file-drag still works.
4. Styling is expressed as Tailwind-style utility classes in TSX.
5. Hot reload: editing the JS bundle updates the running plugin UI without
   restarting the DAW.

## Architecture

### Decision: custom-drawn renderer with native escape hatches

Flutter / React-Native-Skia model. C++ owns every pixel (rounded corners,
shadows, hover states, text), so Tailwind classes map 1:1 to draw code with no
LookAndFeel conflicts. Rejected alternatives:

- **Wrap real JUCE widgets** — modern styling fights LookAndFeel constantly.
- **Modernize react-juce** — abandoned, Duktape-based, its architecture is the
  ceiling we already hit.
- **Webview (JUCE 8)** — explicitly out of scope per project premise.

### Pipeline

```
React app (TSX, TypeScript)
  → react-reconciler custom host config      [runs in QuickJS-ng inside plugin]
  → batched mutations over JS↔C++ bridge     [createNode/setProps/insert/remove]
  → C++ shadow tree (retained node tree)
  → Yoga flexbox layout
  → juce::Graphics painter                   [dirty-region repaints]
```

Input events flow the reverse direction: JUCE mouse/keyboard → C++ hit-test
against layout tree → synthetic events dispatched into JS.

### Components

1. **JS runtime** — QuickJS-ng embedded in the plugin (small, ES2023, MIT).
   VSReacT provides `setTimeout`/`clearTimeout`/`queueMicrotask`/`console`
   backed by the JUCE message loop. All JS execution happens on the JUCE
   message thread.
2. **Bridge** — C functions registered into QuickJS:
   `__vsreact_flush(mutationBatch)` (JS→C++, JSON-encoded for the PoC) and a C++→JS
   dispatch entry `__vsreact_dispatchEvent(nodeId, type, payload)`. App-level
   messaging rides the same channel: `native.call(name, ...args)` /
   `native.on(event, cb)`.
3. **Reconciler package (`@vsreact/core`)** — TypeScript. `react-reconciler`
   host config emitting mutations; exports primitives `View`, `Text`, `Image`,
   `TextInput`, `NativeView`, plus `render(el)`, `native` messaging, and the
   className resolver.
4. **Shadow tree (C++)** — nodes mirror React tree; each owns a `YGNode`,
   resolved style, and event-listener flags. Mutations applied on message
   thread; dirty layout recomputed once per frame at most.
5. **Painter (C++)** — walks the laid-out tree painting: background color,
   rounded corners (per-corner radii), borders, drop shadows, linear
   gradients, opacity, text (juce::TextLayout / AttributedString), images.
   Hover/active restyling handled C++-side by swapping in variant styles
   (from `hover:`/`active:` classes) without a JS round trip.
6. **TextInput** — a real `juce::TextEditor` child component positioned by
   Yoga and chrome-stripped (transparent background/outline); VSReacT paints
   the box/border/placeholder styling. Real caret, selection, IME. `onChange`,
   `onSubmit` (Enter), `value`/`defaultValue`, `placeholder`.
7. **NativeView escape hatch** — `<NativeView id="waveform">` mounts a
   `juce::Component*` registered C++-side via
   `ViewRegistry::registerFactory(id, factory)`. Yoga sizes/positions it.
8. **Styling** — `className` string of a curated Tailwind subset resolved *in
   JS* by a small resolver to a flat style object; C++ only sees resolved
   props. Subset: flex(-row/-col/-1), items-*, justify-*, gap-*, w-*/h-*
   (numeric, fractional, full), p-*/m-* (+ directional), bg-*, text-* (size,
   color, weight, alignment), rounded-*, border(-*), shadow-*, opacity-*,
   absolute/relative + inset/top/left/right/bottom, overflow-hidden, and
   `hover:`/`active:` variants. Colors: Tailwind palette + user theme tokens
   via a `theme` config (e.g. `bg-accent`). Arbitrary values `w-[123]`,
   `bg-[#C6F135]` supported.
9. **Hot reload** — dev builds watch the bundle file (juce::Timer polling
   mtime, 250ms). On change: tear down the React root, reset the JS context,
   re-evaluate, remount. Production builds load the bundle from
   BinaryData/embedded string; dev builds load from a path baked in by CMake.
10. **Error handling** — JS exceptions (evaluation or event dispatch) render a
    red overlay in the plugin with message + stack; bundle-missing renders a
    plain diagnostic panel. C++ asserts mutations arrive on the message thread.

### Repo layout

```
VSReacT/
  docs/superpowers/specs/           this spec + plan
  vsreact/
    module/vsreact/                 JUCE module (C++): runtime, bridge, shadow
                                    tree, yoga adapter, painter, TextInput,
                                    NativeView registry, error overlay
    js/                             @vsreact/core TS package: reconciler host
                                    config, primitives, tailwind resolver,
                                    native messaging, runtime shims
    third_party/                    quickjs-ng, yoga (vendored/fetched)
  StashTrack/                       first consumer (own git repo)
    jsui/                           becomes the real React UI app (TSX)
```

StashTrack consumes the `vsreact` JUCE module via CMake path. The vendored
`external/react-juce` is deleted once parity is reached.

### StashTrack integration

- `PluginEditor` replaces the react-juce backdrop + native controls with one
  `vsreact::Root` component filling the editor, plus registered natives:
  `waveform` (existing WaveformFileDragComponent).
- C++ exposes `native.call` handlers: `startDownload(url, opts)`,
  `openUrl`, `getVersion`; C++ pushes events: `status(message, tone)`,
  `downloadFinished(ok, path)`, `updateAvailable(info)`.
- Download/update logic in DownloadUtils/UpdateUtils is unchanged.

## Testing

- **C++ unit tests** (console app target, CTest): shadow-tree mutations,
  style-prop application to Yoga, painter smoke tests via juce::Image
  rendering, bridge encode/decode.
- **TS tests** (bun test): tailwind resolver output, host-config mutation
  emission against a mock bridge.
- **Integration**: JUCE standalone/plugin build loading the real bundle;
  manual verification in FL Studio.
- Existing StashTrack tests (DownloadUtilsTests, PackagingTests) keep passing.

## Non-goals (PoC)

- GPU rendering (juce::Graphics is sufficient; OpenGL later if needed).
- Accessibility tree, scrolling containers, animations API (hover/active
  transitions only), react-refresh state preservation, npm publishing,
  parameter (APVTS) binding — StashTrack has no automatable params.

## Build order

1. Skeleton: vsreact module + quickjs-ng embedded; JS runs, console.log works.
2. Bridge + shadow tree + painter: React renders static boxes (backdrop parity).
3. Yoga layout + tailwind resolver: real flexbox layout from className.
4. Events: hit-testing, onClick/hover/active → working Button.
5. TextInput primitive → URL field works.
6. NativeView registry → waveform embedded in React layout.
7. App messaging + full StashTrack UI in React; delete react-juce. **PoC done.**
8. Hot reload + error overlay polish.
