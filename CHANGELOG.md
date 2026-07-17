# Changelog

## 0.0.2 — 2026-07-17

Proper package build — `@vsreact/core` now works with every bundler, not
just Bun.

- Ships compiled ESM + TypeScript declarations in `dist/` (built with
  `tsc`, `jsx: react-jsx`). `exports` map serves `dist` to
  webpack/vite/esbuild-class tools and live TS source to Bun (the `bun`
  condition), so monorepo hot-reload workflows keep working untouched.
- `@types/react` moved to dependencies — TypeScript consumers get working
  types with zero extra installs.
- Release workflow builds `dist/` before packing/publishing and skips the
  registry step when the version is already published.
- npm listing metadata (description, keywords, homepage) now live on the
  package page.

## 0.0.1 — 2026-07-17

First public release.

- **[`@vsreact/core`](https://www.npmjs.com/package/@vsreact/core) on npm** —
  the TypeScript side: primitives, reconciler host config, styling, hooks.
- **`vsreact` JUCE module** consumable via CMake `FetchContent`
  (`SOURCE_SUBDIR vsreact`) or `add_subdirectory` — brings vendored
  QuickJS-ng v0.15.1 and Yoga v2.0.1 with it.
- Components: `View`, `Text`, `Image`, `TextInput` (a chrome-stripped
  `juce::TextEditor` host), `NativeView` (mount any `juce::Component`).
- Tailwind-style `className` subset with theme tokens
  (`configureTheme`), arbitrary values, and `hover:`/`active:`/`focus:`
  variants — resolved in JS, applied natively.
- Audio parameters: `useParameter(id)`, `<ParamKnob>`, `<ParamSlider>` —
  two-way, automation-safe binding to the
  `AudioProcessorValueTreeState` via `vsreact::ParameterBridge`.
- Events & gestures: DOM-style bubbling, hover chains,
  `onDragStart/onDrag/onDragEnd` with pixel deltas, wheel-scroll
  containers with painted thumbs, per-node cursors.
- Natively painted knob arcs (`arcColor`, `arcTrackColor`,
  `arcStart/End/ValueEnd`, `arcThickness`).
- Animation: `useTween`, `Easing`, `lerp` on the host scheduler;
  `setTimeout`/`setInterval` inside the engine.
- Native messaging: synchronous `native.call(name, args)` into C++,
  events back through `RootView::sendNativeEvent` → `native.on`.
- ~100ms hot reload in the DAW (watched bundle file); production embeds
  the bundle via `juce_add_binary_data`.
- Error overlay with stack traces instead of silent death.
- `examples/gain` — a complete two-knob gain/pan plugin.
- Documentation site: [vsreact.n9records.com/docs](https://vsreact.n9records.com/docs).

Proven in production by [StashTrack](https://github.com/N9RecordsTechnologiesIL/StashTrack),
whose entire UI is a VSReacT app (Windows · macOS · Linux).
