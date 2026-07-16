# VSReacT Phase 2 — Parameter Binding + StashTrack Product Features

Date: 2026-07-16
Status: Approved (user: "do BOTH 1 AND 2!")

## Goals

**A. Framework:** make VSReacT viable for real instrument/effect plugins.
1. Drag gestures (mouse-drag events into JS).
2. Audio parameter binding: `useParameter(id)` two-way bound to a
   `juce::AudioProcessorValueTreeState` (automation-safe: begin/end gestures).
3. `<Knob>`/`<Slider>` components (arc painting added to the C++ painter).
4. Scroll containers (`overflow-y-scroll`): wheel scrolling, clamped, thumb.
5. Example: a Gain plugin (gain + pan knobs) in `vsreact/examples/gain/`,
   proving APVTS binding end-to-end. Standalone CMake project (not part of
   the StashTrack superbuild).

**B. StashTrack:**
1. Real download progress (parse yt-dlp `[download] NN.N%` lines from an
   incremental ChildProcess read; determinate progress bar with indeterminate
   fallback).
2. Preview playback: play/pause + seek of the downloaded file through the
   plugin output, playhead drawn on the native waveform.
3. Stash history: last 50 downloads persisted to
   `<userAppData>/StashTrack/history.json`; a slide-in drawer lists them
   (exercises scroll containers); click to reload a file for preview/drag.
4. Version bump to 0.8.0 (no release publish — user's call afterward).

## Contracts

### Drag events
Listeners `dragstart|drag|dragend`; payload `{dx, dy, x, y}` (dx/dy relative
to drag start, root coords). Target = nearest ancestor of the mouseDown hit
listening for `drag`, captured at press time.

### Parameter bridge
- C++ `vsreact::ParameterBridge` (module gains dependency
  `juce_audio_processors`): `ParameterBridge(APVTS&, RootView&)`;
  `std::optional<juce::var> handleNativeCall(name, args)` the plugin chains
  inside its own `onNativeCall`. APVTS listener → coalesced via AsyncUpdater →
  pushes event `param {id, value, text}` (value normalized 0..1).
- Native calls: `param:get {id}` → `{value, text, name, label}`;
  `param:set {id, value}`; `param:begin {id}`; `param:end {id}`.
- JS: `useParameter(id)` → `{value, text, name, label, set, begin, end}`.

### Arc painting (for knobs)
Style keys: `arcTrackColor`, `arcColor`, `arcStart`, `arcEnd`, `arcValueEnd`,
`arcThickness`. Degrees, 0 = 12 o'clock, clockwise, JUCE addCentredArc
semantics. Track drawn arcStart→arcEnd, value arc arcStart→arcValueEnd.

### Knob / Slider (TS only, in @vsreact/core)
`<Knob value(0..1) text? label? size? disabled? onChange onBegin onEnd>` —
arc −135°..135°, vertical drag = ±0.005/px, double-ish fine control not in
scope. `<ParamKnob paramId size?>` wires Knob to useParameter.
`<Slider value onChange ...>` horizontal fill bar + thumb, drag + click-jump.
`<ParamSlider paramId>`.

### Scroll containers
`overflow-y-scroll` class → `{overflow: "scroll"}`. C++ Node gains `scrollY`;
wheel over a node scrolls nearest scrollable ancestor (40 px/notch, clamped to
content height). Children painted translated and clipped; hit-testing and
hosted-component sync account for accumulated ancestor scroll; thin thumb
painted when scrollable. JS may set `scrollTop` prop to reset position.

### StashTrack natives (new)
- Event `downloadProgress {percent}` (0..100, only when parsed).
- `preview:toggle` → `{playing}`; `preview:seek {fraction}`; event
  `preview {playing, fraction}` (100 ms timer while playing).
- `history:get` → `[{path, name, addedMs}]` (pruned to existing files);
  `history:load {path}` → `{ok}` (loads waveform + preview source);
  `history:remove {path}` → `{ok}`.
- DownloadUtils: `downloadAudioWithYtDlp(url, folder, options, onProgress)`
  overload; pure `parseYtDlpProgressPercent(chunk)` → optional last percent.
- Processor: `loadAudioFile` no longer auto-plays; adds `startPreview`,
  `stopPreview`, `isPreviewPlaying`, `getPreviewFraction`, `seekPreview`.
- Waveform component: `setPlayheadFraction(f)` draws a playhead line.

## Non-goals
Fine-drag modifiers, horizontal scroll, scroll momentum, knob keyboard input,
example plugin installer/release, publishing a v0.8 release.

## Testing
- bun: tw scroll/arc classes, Knob drag math (pure helper), useParameter via
  mocked native, host-config drag listeners.
- C++: arc painter pixel probes, scroll clamp/hit-test/translation, parameter
  bridge round-trip (real APVTS in console app), yt-dlp progress parser,
  HistoryStore round-trip (temp dir).
- Interactive: gain example Standalone knob drag changes readout; StashTrack
  drawer scroll + history load + preview toggle screenshots.
