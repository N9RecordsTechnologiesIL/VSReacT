# Changelog

## 0.0.23 — 2026-07-19

Input & media: pointer-events, image fitting/tinting, dashed borders,
richer cursors, and text inputs in the Tab order.

### Native (`vsreact` module)

- **`pointerEvents: "none"`** — the node and its whole subtree become
  transparent to input (decorative overlays stop eating clicks; the
  CSS your web builds already rely on).
- **`<Image>` `objectFit`** — `"contain"` (default, unchanged),
  `"cover"` (clips overflow), `"fill"` (stretches) — and
  **`tintColor`**, which fills the image's alpha with a solid colour:
  one white icon PNG, any accent.
- **`borderStyle: "dashed" | "dotted"`** on the uniform border.
- **More cursors**: `grab`, `grabbing`, `move`, `ns-resize`,
  `ew-resize`, `crosshair`, `not-allowed`.
- **TextInput joins the Tab order** — Tab focuses the hosted editor,
  Tab from inside it leaves the field and continues the focus cycle,
  and the cycle stays in sync when an editor is focused by click.

### `@vsreact/core` 0.0.23

- Classes: `pointer-events-none/auto`, `border-solid/dashed/dotted`,
  `object-contain/cover/fill`, `cursor-grab/grabbing/move/ns-resize/
  ew-resize/crosshair/not-allowed`. 137 tests.

## 0.0.22 — 2026-07-19

Typography & keys: text finally behaves like web text.

### Native (`vsreact` module)

- **`numberOfLines`** clamps wrapping and truncates with an ellipsis
  (CSS `truncate` / `line-clamp-N`).
- **`lineHeight` is now painted** — `leading-*` classes always resolved,
  but the painter ignored the key until now (extra spacing between
  wrapped lines).
- **`textTransform`** (`uppercase` / `lowercase` / `capitalize`) applied
  at paint time, and **`textDecoration`** (`underline` via the font,
  `line-through` drawn per wrapped line).
- **`keyup` events** — releases of keys the focused node saw go down
  dispatch `keyup` with the same web key names and modifier flags.

### `@vsreact/core` 0.0.22

- `onKeyUp` prop; `truncate`, `line-clamp-N`, `uppercase/lowercase/
  capitalize/normal-case`, `underline/line-through/no-underline`, and
  arbitrary `leading-[18]` classes. 136 tests.

## 0.0.21 — 2026-07-19

Patch: `sliderKeyTarget` and the `KeyEventPayload` / `MouseMovePayload`
types were missing from the `@vsreact/core` barrel (caught by verifying
the published 0.0.20 from the registry). Native module unchanged.

## 0.0.20 — 2026-07-19

Keyboard, stacking, and shapes: the last big structural gaps between
"React that happens to render in JUCE" and how a UI behaves on the web.

### Native (`vsreact` module)

- **Keyboard focus for any View.** Declaring `onKeyDown` (or
  `onFocus`/`onBlur`, or a `focus:` style variant) makes a node
  focusable: click focuses, Tab / Shift-Tab cycle focusables in tree
  order (wrapping), clicking empty space blurs, and keys arrive as web
  `KeyboardEvent.key` names (`"ArrowUp"`, `"Enter"`, `"Escape"`, `" "`,
  `"a"`) with `shift/ctrl/alt/meta` flags. Unhandled keys fall through
  to the host. `focusStyle` (the `focus:` variant) paints on the
  focused node.
- **`zIndex`** — reorders both painting and hit-testing among siblings
  (stable: tree order breaks ties).
- **`clipPolygon`** — CSS `clip-path: polygon()` as a flat
  `[x, y, …]` percent array; shapes background, borders, shadows, and
  overflow clipping. Beveled 7-segment digits are now a style, not a
  sprite.
- **`gradientRepeat: N`** — repeating gradients of any type (knurl
  rings, scanlines).
- **Transform-aware hit testing** — rotated/scaled/translated nodes now
  receive input where they paint; the 0.0.19 "visual-only" caveat is
  gone.
- **`onMouseMove`** on any node (root-space x/y).

### `@vsreact/core` 0.0.20

- `onKeyDown` / `onMouseMove` props + `KeyEventPayload` /
  `MouseMovePayload` types; `onFocus`/`onBlur` now work on every View.
- **Built-in controls are keyboard-accessible**: Knob, Slider, Toggle,
  XYPad (and Param* twins) follow the web `<input type="range">` model —
  arrows ±1%, Shift = ±0.1% fine, PageUp/Down ±10%, Home/End to the
  stops, Enter/Space flips a Toggle. `sliderKeyTarget` is exported for
  custom controls.
- `z-10` / `z-[3]` / `-z-1` classes.
- 132 tests.

## 0.0.19 — 2026-07-19

Web-parity round: the CSS features whose absence forced DirtyDelay to
pre-bake its UI as sprites now render natively, and the parameter layer
can no longer be poisoned by malformed traffic.

### Native (`vsreact` module)

- **Gradient backgrounds** — `gradientType: "linear" | "radial" | "conic"`
  with `gradientFrom/Via/To` shorthands or a full `gradientStops` array,
  `gradientAngle` in CSS degrees (0 = up, clockwise). Linear spans the
  rect's projection exactly like CSS; radial is a farthest-corner
  ellipse; conic is software-rendered once and cached per size + spec.
- **Inset shadows** — `insetShadowColor/Radius/OffsetX/OffsetY`
  (CSS `box-shadow: inset`): glass vignettes without a baked overlay.
- **Glyph-shaped text shadows** — `textShadowColor/Radius/OffsetX/OffsetY`
  on `<Text>`: LED/glow text without the rectangular halo the node
  shadow gives.
- **Transforms** — `rotate` (degrees), `scale`, `translateX/Y` about the
  frame centre, children inherit. Paint-time only: layout and hit
  rectangles stay untransformed (documented) — knob pointers and radial
  ticks are now one rotated `<View>` instead of impossible.
- **Per-side borders** — `borderTop/Right/Bottom/LeftWidth` (drawn as
  square strips; corner radii ignored per side).
- `shadowOffsetX` joins the existing outer-shadow keys.
- **NaN can no longer poison a parameter**: `param:set` drops non-finite
  values (jlimit passed NaN straight through to
  `setValueNotifyingHost` — garbage text, stuck UI until the next
  honest set).

### `@vsreact/core` 0.0.19

- Tailwind classes for all of the above: `bg-gradient-to-*`,
  `bg-gradient-radial/conic`, `from-*` / `via-*` / `to-*`,
  `shadow-inner`, `rotate-*` / `-rotate-*` / `rotate-[n]`, `scale-*` /
  `scale-[f]`, `translate-x/y-*` (spacing scale + arbitrary + negative),
  per-side `border-t` / `border-b-2` / `border-l-[3]`.
- `useParameter` hardening: `set(NaN)` is dropped before the native
  call; a param event with a missing `text` keeps the previous text; a
  non-finite `value` keeps the previous value. New test suite covers the
  malformed-traffic cases.
- 128 tests.

## 0.0.18 — 2026-07-19

The dogfood release: everything here came out of building
[DirtyDelay](https://github.com/N9RecordsTechnologiesIL) against only the
public SDK + docs, then pixel-diffing the plugin against the same UI
running in a browser.

### Native (`vsreact` module)

- **Image downscaling no longer sparkles** — the painter draws images
  with high resampling quality; bright single pixels used to survive
  nearest-style sampling as white dots when an asset painted below its
  native size.
- **`<Image src>` accepts base64 `data:` URIs** (PNG/JPEG/GIF), decoded
  once and cached. Previously documented but unimplemented — a data URI
  painted nothing, silently.
- **`arcCap: "butt"`** style key: arc strokes default to rounded caps,
  which turn short slices into capsule blobs — butt caps make radial
  tick marks and crisp dashes possible.

### `@vsreact/core` 0.0.18

- **`tracking-[n]`** arbitrary letter-spacing (px), including negative
  `-tracking-[2]` — the named `tracking-*` scale already worked.
- `VERSION` is now `0.0.18`.

### `create-vsreact` 0.1.1

- **`bun run watch` ships in the scaffold** (`ui/watch.ts`) — the docs'
  hot-reload loop now works out of the box.
- **Dev/ship split generated for you**: `<TARGET>_DEV` CMake option
  (default ON, hot reload from disk); `OFF` embeds the bundle via
  BinaryData so shipped builds work on machines that aren't yours. The
  compile definition is now `<TARGET>_UI_BUNDLE_PATH`, matching the docs.
- Pins vsreact `v0.0.18` / `@vsreact/core ^0.0.18` — the scaffold and the
  installation docs now agree on the version.

### Docs

- Audio-parameters page shows the APVTS `ParameterLayout` (ranges, skew,
  label, string formatting) that `useParameter` reflects — with a note
  that `.value` is the *normalized, skew-included* 0–1, the trap that
  makes web-linear knob angles differ if you map it directly.
- `<Image>` documents the supported formats (PNG/JPEG/GIF/BMP — no WebP)
  and the ship-assets-at-display-size rule.
- Styling page documents `arcCap` and `tracking-[n]`.

## 0.0.17 — 2026-07-18

The scaffolder. JS-only; native module unchanged from 0.0.9.

### New package: `create-vsreact` 0.1.0

- **`bun create vsreact my-plugin`** / **`npm create vsreact@latest
  my-plugin`** — one command scaffolds a complete plugin project:
  CMake (auto-fetches JUCE and the VSReacT native module, or points at
  local checkouts), a gain/pan processor, and a themed React UI that
  hot-reloads in your DAW.
- Interactive prompts (or `--yes`) for product name, company, and the
  4-char JUCE codes; `--posthog` wires `@vsreact/posthog` end-to-end
  with a **placeholder** API key and instructions to bring your own.
- Zero dependencies; the generated `ui/` installs `@vsreact/core` from
  npm like any real project.

### Housekeeping

- Core 0.0.17: the npm README now leads with the scaffolder. The
  example plugins carry a placeholder PostHog key (never a real one),
  and StashTrack's key moved out of source into build-time injection.

## 0.0.16 — 2026-07-18

The release-polish tier. JS-only; native module unchanged from 0.0.9.

### Polish

- **npm READMEs** for both packages — `@vsreact/core` and
  `@vsreact/posthog` finally have real registry pages: quick-starts,
  the full component index, the architecture picture, and the C++
  wiring for analytics.
- **`VERSION`** exported from `@vsreact/core` — stamp support dumps
  and analytics with the SDK version.

### `@vsreact/posthog` 0.0.6

- **`registerOnce(props)`** — super properties that never clobber
  existing values (safe defaults).

### Examples

- **Three new example plugins** under `vsreact/examples/`, each a
  complete CMake + React project: **synth** (PianoKeyboard,
  ParamADSREnvelope, wheels, full PostHog integration), **drums**
  (StepSequencer patterns driving a native step clock, RingMeter —
  no analytics), and **channel** (EQCurve bound to APVTS bands,
  gain-reduction Meter, Disclosure) — alongside the original gain
  quick-start.
- StashTrack ships `@vsreact/posthog` — editor sessions, parameter
  analytics, and error tracking wired end-to-end.

## 0.0.15 — 2026-07-18

The DSP-display tier — the EQ curve and the ring meter. JS-only;
native module unchanged from 0.0.9.

### New components

- **`<EQCurve>`** — the display every EQ plugin wants: the real summed
  biquad response (RBJ cookbook — peak, shelves, passes, notch,
  bandpass) drawn as a center-anchored fill, with one draggable node
  per band (x = frequency on a 20 Hz–20 kHz log scale, y = gain) and
  the wheel adjusting Q inside a begin/end gesture. The pure math is
  exported: `biquadMagnitudeDb`, `eqResponseDb`, `eqXToHz`/`eqHzToX`.
- **`<RingMeter>`** — a circular level meter on the native arc keys:
  hot zone above `hotFrom`, optional center readout via `format` —
  channel-strip rings, macro amounts, gain-reduction dials.

### `@vsreact/posthog` 0.0.5

- **`screen(name)` / `useScreen(name)`** — PostHog screen analytics
  for plugin panels: `$screen { $screen_name }` on mount.
- **`shutdown()`** — editor teardown: flush everything, then go
  silent; captures after shutdown are dropped.
- **`init({ propertyDenylist })`** — a mechanical strip-list for
  sensitive keys (paths, emails), applied before `beforeSend`.

### Site

- Gallery: EQCurve and RingMeter families in all eight worlds.

## 0.0.14 — 2026-07-18

The workspace tier — structure for multi-page plugin UIs. JS-only;
native module unchanged from 0.0.9.

### New components

- **`<Tabs>`** — the page switcher (MAIN / FX / SETTINGS): a themed
  tab bar with an underline indicator that renders the active panel.
  Controlled or uncontrolled.
- **`<Disclosure>`** — the collapsible settings row ("ADVANCED"):
  click the header to fold content in and out.

### Hooks & control upgrades

- **`useNativeValue(name, initial)`** — the one-liner for native → UI
  data feeds: holds the latest payload of a C++ event as state.
- `Meter` — **`reverse`** fills from the top (vertical) or right
  (horizontal): gain-reduction meters for compressors.

### `@vsreact/posthog` 0.0.4

- **`time(name)` / `timeEnd(name, props?)`** — stopwatch captures:
  `preset_load { duration_ms }` for load times, render passes,
  analysis sweeps.
- **`init({ sampleRate })`** — whole-session sampling: keep a fraction
  of clients, and kept events carry `$sample_rate` so PostHog can
  weight the counts.
- **`init({ maxQueueSize })`** — a queue cap (drop-oldest, default
  1000) so a misbehaving bridge can't grow memory.

### Site

- Gallery: Tabs and Disclosure families in all eight worlds.

## 0.0.13 — 2026-07-18

The synth tier — the envelope editor and the wheels. JS-only; native
module unchanged from 0.0.9.

### New components

- **`<ADSREnvelope>` / `<ParamADSREnvelope>`** — the classic
  four-corner envelope editor: a filled curve with draggable handles
  for the attack peak, the decay/sustain corner (both axes at once),
  and the release corner. The Param twin drives four host parameters
  with per-handle gestures. The pure `adsrLevelAt` sampler is exported.
- **`<PitchBend>` / `<ParamPitchBend>`** — the pitch wheel: drag from
  center, springs back to rest on release; the Param twin writes
  0.5 ± bend/2 and closes the gesture at dead center.
- **`<ModWheel>` / `<ParamModWheel>`** — the mod wheel: a vertical
  strip that stays where you leave it.

### Pitch math

- **`midiNoteToHz` / `hzToMidiNote`** — equal-temperament conversion
  (69 ↔ 440); feed an oscillator straight from `PianoKeyboard`.

### `@vsreact/posthog` 0.0.3

- **`group(type, key, props?)`** — group analytics: `$groupidentify`
  plus `$groups` stamped on every later event (cleared by `reset()`).
- **`alias(id)`** and **`setOnce(props)`** — link a licence key or old
  install id; write person properties only if unset.
- **`init({ beforeSend })`** — scrub or veto events before they queue:
  return the edited event, or null to drop it.
- **`debug(true)`** — log every capture and flush to the console.

### Site

- Gallery: ADSREnvelope and PitchBend/ModWheel families, interactive
  in all eight worlds.

## 0.0.12 — 2026-07-18

The perform tier — play your plugin, not just tweak it. JS-only;
native module unchanged from 0.0.9.

### New components

- **`<PianoKeyboard>`** — the playable keyboard: press for note-on,
  release for note-off, drag across keys for glissando (black keys
  correctly steal the top zone). `heldNotes` paints host MIDI in,
  octave labels on the Cs, any range via `startNote`/`octaves`.
- **`<StepSequencer>`** — the pattern grid: rows × steps of clickable
  cells, downbeat tinting every 4, a playhead column the host drives,
  optional row labels. Fully controlled — patterns live in your state.

### Value formatting

- **`formatDb` / `formatHz` / `formatMs` / `formatPercent` /
  `formatSemitones` / `midiNoteName` / `mapRange`** — the readout
  strings DAW users expect ("+6.0 dB", "1.2 kHz", "350 ms", "C#4"),
  ready for `NumberBox`'s `format` prop or any label.

### Control upgrades

- `ProgressBar` — `indeterminate` sweeps a segment across the track
  for unknown-duration work.
- Styling fix: arbitrary text sizes (`text-[13]`) now actually resolve
  to font sizes — they were silently ignored, so labels using them
  rendered at the default size.

### `@vsreact/posthog` 0.0.2

- **`posthog.captureException(error, props?)`** — report errors to
  PostHog error tracking as properly-shaped `$exception` events
  (name, message, QuickJS stack).
- **`<PostHogErrorBoundary>`** — wrap your app: render crashes are
  captured (and flushed immediately) while a fallback keeps the
  editor window alive.
- **`optOut()` / `optIn()` / `optedOut`** — a user privacy switch:
  opting out drops new events and discards the unsent queue;
  `init({ optOut })` starts disabled.
- **`useEditorSession()`** — brackets the editor lifetime:
  `editor_session_start` on mount, `editor_session_end
  { duration_ms }` on unmount, self-flushing on close.
- **`useCaptureOnUnmount(event)`** — the closing bookend to
  `useCaptureOnMount`, stamped with the mounted duration.
- `unregister(key)` removes one super property; `getSessionId()`
  exposes the session id for cross-referencing native logs.

### Site

- Gallery: PianoKeyboard and StepSequencer families, playable in all
  eight worlds.

## 0.0.11 — 2026-07-17

The flagship-visual tier — Output-style centerpieces and hardware feel.
JS-only; native module unchanged from 0.0.9.

### New components

- **`<MacroPad>` / `<ParamMacroPad>`** — the centerpiece macro control:
  a circular 2D pad whose concentric rings breathe with the values
  (x spreads them, y drives intensity), axis labels, drag anywhere,
  double-click recenters. The Param twin drives two host parameters
  from one drag with both gestures opened together.
- **`<HardwareKnob>` / `<ParamHardwareKnob>`** — the skeuomorphic cap
  with a glowing pointer notch riding the rim (a short value arc) and a
  faint tick track; drag/wheel/double-click like Knob.
- **`<Crossfader>` / `<ParamCrossfader>`** — the DRY/WET strip: wide
  track, grippy rectangular handle, end labels, double-click recenters.
- **`<PulseOrb>`** — a value-reactive orb: glowing core with echo rings
  that emit faster and brighter as the level rises.

### Control upgrades

- `Toggle` — `offLabel` / `onLabel` side captions (hardware OFF/ON
  style), the active side highlighted.
- `Slider` — `barThumb` renders the flat hardware-style bar thumb in
  both orientations.

### Site

- Gallery: MacroPad showpiece card (wide), HardwareKnob, Crossfader,
  and PulseOrb cards — all interactive.

## 0.0.10 — 2026-07-17

Fields & feedback — the settings-panel tier, and value labels on the
one-line editor. JS-only; native module unchanged from 0.0.9.

### New components

- **`<NumberBox>` / `<ParamNumberBox>`** — the draggable number (BPM,
  ms, semitones): drag vertically, wheel to step, double-click to
  reset, snap-to-step without float dust (`snapToStep` exported). The
  Param twin shows the host's formatted text.
- **`<Checkbox>` / `<ParamCheckbox>`** — settings-panel rows; checked =
  value ≥ 0.5, gestures automation-safe.
- **`<RadioGroup>` / `<ParamRadioGroup>`** — vertical exclusive options
  with dots; value ↔ index mapping like Segmented.
- **`<ProgressBar>`** — determinate progress with optional percent.
- **`<Spinner>`** — indeterminate loading, a 100° arc chasing its tail
  on the native arc keys.

### GenericEditor

- Every knob now shows a **live value label** (the host's formatted
  text) plus the parameter name beneath it.

### Site

- /components gallery: six new cards (NumberBox, Checkbox, RadioGroup,
  ProgressBar, Spinner, Button sizes & states) and live value labels on
  the GenericEditor card.

## 0.0.9 — 2026-07-17

PostHog analytics inside your plugin.

### New package: `@vsreact/posthog` 0.0.1

- **`posthog`** client — posthog-js-shaped API (`init`, `capture`,
  `identify`, `register`, `set`, `reset`, `flush`) that batches in JS
  (flush at 10 events / 10s) and delivers through the native bridge.
  Every event carries `distinct_id`, `$session_id`, and lib metadata.
- **`usePostHogParameters()`** — the one-liner for plugin usage
  analytics: every host parameter change becomes one debounced
  `parameter_changed {parameter_id, value, text}` event per parameter.
- **`useCaptureOnMount(event)`** for panel/screen views, `usePostHog()`.

### Core 0.0.9 — native side

- **`vsreact::PostHogBridge`** — chain it in `onNativeCall` like the
  ParameterBridge. Answers `posthog:config` (persistent anonymous
  distinct id via an optional `stateFile`, host) and `posthog:send`
  (queues batches, posts `{api_key, batch}` to `{host}/batch/` on a
  background thread via `juce::URL`). The API key stays in C++. Test
  transport + synchronous-flush hooks included; covered by C++ tests.
- Release workflow now builds and publishes both packages; CI tests both.
- No other core changes — JS core API identical to 0.0.8.

## 0.0.8 — 2026-07-17

- **`@vsreact/core/components`** subpath export — the whole component
  kit importable on its own (`import { Knob, Select, Meter } from
  "@vsreact/core/components"`). Same exports as the root; exists for
  readability and as the boundary line if the kit ever becomes its own
  package. Everything still ships in the one `@vsreact/core` install.

## 0.0.7 — 2026-07-17

Visualizers, the hooks toolbox, and Button. JS-only — the native module
is unchanged from 0.0.6.

### Audio visualizers

- **`<Bars values>`** — bottom-anchored bar display with a hot zone:
  spectrum analyzers, band meters.
- **`<Waveform values>`** — centre-mirrored bars with an optional centre
  line: waveform overviews, envelope history.
- **`useRollingBuffer(value, length?)`** — a fixed rolling window of a
  live scalar; three lines from a meter event to a scrolling envelope
  display. Pure `pushRolling` stepper exported.

### Hooks toolbox (usehooks-style, plugin-tuned)

- `useToggle`, `usePrevious`, `useInterval` (host-scheduler,
  pause with null), `useThrottled` (complements `useDebounced`),
  `useHover`.

### Button

- **`<Button label onClick>`** — solid / outline / ghost variants, three
  sizes, hover/active states baked in via native style variants.

### Site

- New **/components** page — the component library, live: every control
  rendered as an interactive web twin with its import line, linked from
  the header and docs.

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
