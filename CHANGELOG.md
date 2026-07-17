# Changelog

## 0.0.6 — 2026-07-17

The DAW-feel update — the mouse conventions plugin hands expect, plus the
dialog kit.

### DAW conventions on every control

- **Double-click resets to default** — new `onDoubleClick` events
  (native `dblclick` dispatch); `Knob`/`Slider` take `defaultValue`, and
  `ParamKnob`/`ParamSlider` wire the **host's** normalized default
  automatically (`defaultValue` now included in `param:get`/`param:list`).
  Resets are full begin/set/end gestures, so hosts record them cleanly.
- **Wheel nudging** — new `onWheel` events (`{dy}`): controls get first
  refusal on the wheel, scroll containers keep it otherwise.
  `wheelSensitivity` prop (0 disables).
- **Bipolar knobs** — `bipolar` on `Knob`/`ParamKnob` sweeps the value
  arc from 12 o'clock for centre-based params (pan, tilt). Powered by a
  new `arcValueStart` paint key.

### Dialog kit

- **`<Tooltip label delayMs?>`** — wraps any child; the tip shows below
  it after a hover dwell, via the overlay layer.
- **`<Modal open onClose title? width?>`** — centered dialog over a
  click-away backdrop; panel clicks are swallowed.

Native changes: `dblclick` + `wheel` event dispatch, `arcValueStart`,
`defaultValue` in the parameter protocol — all backward-compatible.

## 0.0.5 — 2026-07-17

Layout feedback, overlays, and the dropdown.

### Layout feedback (new native capability)

- **`onLayout`** on every primitive — fires with the node's root-space,
  scroll-adjusted rect after layout, and only when the rect actually
  changes. JS finally knows where things landed.
- **`useLayoutRect()`** — `[rect, onLayout]` sugar.

### Overlays

- **`useOverlay()` + `<OverlayLayer/>`** — a top-most layer for menus,
  tooltips, and modals. `render()` mounts it automatically after your
  app, so overlay content paints above everything and receives input
  first. `show(node)` / `hide()`, auto-cleanup on unmount.

### Select

- **`<Select>` / `<ParamSelect>`** — the dropdown, built from onLayout +
  the overlay layer: menu positioned under the trigger, matches its
  width, scrolls past `maxMenuHeight`, click-away closes, hover states,
  active option highlighted. `ParamSelect` maps choice-style parameters
  exactly like `ParamSegmented`.

### Docs

- Search moved to the right side of the top bar; focus handling fixed
  (input auto-focuses, clicking results can't strand the keyboard,
  arrows/Enter work globally while open, Esc/click-away close, focus
  returns to the trigger, page scroll locks) and the modal got an
  entrance animation.

## 0.0.4 — 2026-07-17

The one-line editor, meters, and utilities.

### The one-line editor

- **`render(<GenericEditor />)` is a complete plugin UI** — one knob per
  APVTS parameter, laid out in rows (`columns`, `size`, colors
  configurable).
- **`useParameterList()`** — enumerates every host parameter
  (`{id, name, label, value, text}`), for building your own generic UIs.
- Native side: `ParameterBridge` now answers **`param:list`**
  (backward-compatible addition — the only C++ change).

### Meters

- **`<Meter>`** — natively painted level meter with a hot zone and a
  peak-hold line that holds, then falls. Vertical or horizontal; feed it
  0..1 values (typically pushed from C++ via `useNativeEvent`).
- **`usePeakHold(value, {holdMs, decayPerSecond})`** and the pure
  **`peakHoldStep`** stepper are exported for custom metering.

### Utilities

- **`useDebounced(value, delayMs)`** — debounce chatty inputs before they
  become native calls.
- Negative spacing utilities (`-mt-2`, `-mx-[10]`, `-top-4`,
  `-left-1/2`) — documented, hardened for percentages, and tested.

### Docs

- **Search** — Ctrl+K / ⌘K quick-switcher over every docs page and
  section, keyboard-first, fully static.

## 0.0.3 — 2026-07-17

SDK expansion — new controls, springs, and the full color palette.

### New controls (each with a `Param*` twin bound to the APVTS)

- **`<Toggle>` / `<ParamToggle>`** — a switch with a spring-animated thumb;
  the param variant treats value ≥ 0.5 as on and writes clean
  begin/set/end gestures.
- **`<XYPad>` / `<ParamXYPad>`** — a 2D drag pad with crosshair driving two
  values (or two parameters) at once; `y = 1` is the top.
- **`<Segmented>` / `<ParamSegmented>`** — a row of exclusive options;
  the param variant maps the normalized value to an option index,
  matching `AudioParameterChoice`.
- **`<Slider vertical>`** — sliders can now be faders: drag up for more,
  fill rises from the bottom (`height` sets the track length).

### New APIs

- **`useSpring(target, {stiffness, damping, mass, restDelta})`** —
  physics-based motion that retargets mid-flight without losing velocity.
  The pure integrator `springStep` is exported too.
- **`useNativeEvent(name, handler)`** — lifetime-scoped subscription to
  C++ events with an always-fresh handler (no stale closures).
- **`cx(...)`** — a tiny clsx for conditional classNames (strings,
  arrays, object maps).

### Styling

- The **full Tailwind v3 color palette** — all 22 families, 50–950
  (previously a 7-family subset).
- `size-*` (width + height together), `inset-x-*` / `inset-y-*`,
  `text-5xl` / `text-6xl`.

No native-module changes — the C++ API is identical to 0.0.2.

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
