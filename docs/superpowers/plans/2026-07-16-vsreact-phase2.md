# VSReacT Phase 2 Implementation Plan

Spec: `docs/superpowers/specs/2026-07-16-vsreact-phase2-design.md` (contracts live there).
Executor: inline (same conventions as phase 1 — TDD where the piece is pure,
interactive screenshot verification for UI, commit per task, StashTrack is a
nested repo).

### Task 18: Drag events + arc painting (framework C++/TS)
- RootView: capture drag target at mouseDown (nearest `drag` listener),
  dispatch dragstart/drag/dragend with {dx,dy,x,y}; suppress click after a
  drag beyond 3 px.
- hostConfig: onDragStart/onDrag/onDragEnd props → listeners.
- Painter: arc keys per spec (track + value arcs, round caps).
- Tests: C++ painter arc pixel probe; bun host-config drag listener test.

### Task 19: ParameterBridge (framework C++) + useParameter (TS)
- Module dependency += juce_audio_processors.
- ParameterBridge per spec contract (APVTS listener → AsyncUpdater → RootView
  sendNativeEvent; handleNativeCall for get/set/begin/end).
- TS: `useParameter` hook (native.call param:get on mount, native.on("param")
  subscription); exported from index.
- Tests: C++ round-trip with a real APVTS (dummy processor) in the console
  runner; bun useParameter with mocked __vsreact_nativeCall/dispatch.

### Task 20: Knob/Slider + scroll containers
- tw: `overflow-y-scroll`; Knob/Slider/ParamKnob/ParamSlider in
  @vsreact/core with pure `dragToValue(start, dy)` helper.
- C++ scroll: Node.scrollY, RootView::mouseWheelMove → nearest scrollable
  ancestor (new HitTest helper hitTestScrollable), clamp to content extent;
  Painter translates+clips children of scrolled nodes, draws thumb;
  hit-testing + syncHostedComponents apply accumulated ancestor offsets.
- Tests: C++ scroll clamp + offset hit-test + translated paint probe; bun
  dragToValue + tw class.

### Task 21: examples/gain — the APVTS proof plugin
- `vsreact/examples/gain/`: CMakeLists (own project; JUCE via JUCE_SOURCE_DIR;
  `add_subdirectory(../.. vsreact)`), Processor (APVTS: gain −60..+6 dB
  default 0, pan −1..1 default 0; applied in processBlock), Editor
  (RootView + ParameterBridge, dev bundle path define), `ui/` React app
  (two ParamKnobs, VSReacT-branded panel), workspace entry in root
  package.json.
- Verify: build Standalone, screenshot, scripted knob drag changes readout
  (capture before/after), tests still green.

### Task 22: StashTrack download progress
- DownloadUtils: progress-callback overload + incremental read loop + pure
  `parseYtDlpProgressPercent`; DownloadUtilsTests cases (plain, \r-chunked,
  none, multiple → last).
- Editor: progress callback → callAsync → `downloadProgress` event.
- UI: ProgressBar shows determinate width when percent set; falls back to
  the indeterminate sweep otherwise.

### Task 23: StashTrack preview playback
- Processor: no auto-start; startPreview/stopPreview/isPreviewPlaying/
  getPreviewFraction/seekPreview (transport under lock; fraction from
  transport position / length).
- Editor: loadAudioFile on download success + history load; preview natives
  per spec; 100 ms juce::Timer while playing pushes `preview` events and
  waveform playhead fraction.
- Waveform: setPlayheadFraction paints accent playhead line.
- UI: play/pause pill on the waveform card header; seek by clicking the
  progress hairline under it (preview:seek).

### Task 24: Stash history drawer
- `Source/HistoryStore.h/.cpp`: JSON file, add/dedupe/cap 50/prune; unit
  tests with temp dir (new StashTrackTests cases).
- Editor: history natives per spec; add on success.
- UI: header STASH pill (count); slide-in right drawer (useTween), scrollable
  rows (name + relative age, click → history:load, ✕ → history:remove),
  backdrop click closes.

### Task 25: Bump 0.8.0, full verify, ship to main
- Version bump: CMake project, iss AppVersion/AppVersionNumeric/OutputBase,
  build-installer strings, README, PackagingTests assertions, ui package.
- Full sweep: bun test, ctest (all suites), rebuild bundles, Standalone
  interactive verification (progress with a real yt-dlp run if tools exist —
  otherwise validation-path + parser tests), screenshots of drawer + preview.
- Update framework README (params/knobs/scroll/examples) + StashTrack README.
- Commit both repos, push both mains. NO release publish (user decides).
