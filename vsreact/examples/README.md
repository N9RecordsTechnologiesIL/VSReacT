# VSReacT examples

Six complete plugins, each a standalone CMake project whose entire UI
is React, built from the SDK's stock components — the same families the
site's [component gallery](https://vsreact.n9records.com/components)
shows, each panel themed to its own hardware character. Build any of
them with:

```sh
cd <example>/ui && bun install && bun run build   # the UI bundle
cmake -S <example> -B <example>/build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=/path/to/JUCE
cmake --build <example>/build-vs --target <Name>Example_Standalone --config Release
```

Dev builds watch the bundle file — edit `ui/src/main.tsx`, run
`bun run build`, and the plugin hot-reloads.

On Windows, `tools/launch-examples.ps1` (from the repo root) launches the
built standalones and parks each window at a known on-screen position —
JUCE restores saved window coordinates, which can leave an editor
off-screen.

| Example | Shows off | Analytics |
| --- | --- | --- |
| **gain** | The five-minute plugin: two big `instrument`-faced knobs over amber scale arcs, a boxed readout, a power glyph — one themed panel, ~120 lines of TSX. Start here. | — |
| **delay** | Vintage in components: four `chickenhead` knobs over printed tick scales, a red LED millisecond display built from `textShadow` glow in a recessed `boxShadow` bezel, and a `Toggle` bypass with a status LED. Stereo delay with a one-pole LP in the feedback path. | — |
| **drums** | The SDK's `StepSequencer` as a 16×3 pad grid (playhead riding native "step" events, pattern out over `native.call`), a `NumberBox` tempo with nudge `Button`s, RUN/STOP transport, and a readout in a registered custom OTF. Native 16-step clock, synthesized kick/snare/hat. | None — core SDK alone. |
| **channel** | A live `EQCurve` with draggable band handles bound to real APVTS bands — the same RBJ biquad math runs in C++ and in the display — `steel` knobs, gain-reduction and output `Meter`s on a 30Hz native feed, and a `Disclosure` fold. | Light: sessions + screens. |
| **synth** | The component showcase: `PianoKeyboard` playing through `native.call`, the `ParamADSREnvelope` editor, both wheels, a `RingMeter` riding native events. 8 sine voices in C++. | Full `@vsreact/posthog`: sessions, parameter analytics, screens, error boundary. |
| **compressor** | Scaffolded with `create-vsreact` and grown — what the starter becomes. A soft-knee transfer curve drawn with `Svg`/`SvgPath` from the live parameter values, using the same gain-computer formula the audio thread runs; `steel` knobs; three `Meter`s on a 30Hz native feed. Feed-forward peak compressor in C++. | None — core SDK alone. |

## One component set, six voices

Every panel is flexbox + stock components; what changes per plugin is the
theme (`configureTheme`) and the knob `variant` — `instrument` for
PlainGain's studio look, `chickenhead` for DirtyDelay's vintage,
`steel` for CleanStrip and the compressor. That's the intended workflow:
pick faces from the gallery, set a palette, and the whole panel speaks
with one voice. Recurring habits worth copying:

- **Math lives in its own module.** `parameters.ts`, `sequencer.ts`,
  `compressor.ts` are pure and portable — unit-testable without a plugin
  around them.
- **Native units come from the host.** `normalizedToNatural(p.value, p)`
  derives dB/Hz/ms from the APVTS range riding on the handle, so nothing
  in TS restates a min, max or skew.
- **Meters live in leaves.** The 30Hz native feed subscribes in a leaf
  component (memoized where it fans out), so a meter tick never
  re-renders knobs or displays.
- **Custom fonts are assets.** drums and channel register an OTF with
  `registerFont` and set readouts in it — inlined as a data URI at build
  time, since a plugin has no file server to fetch from (each
  `ui/build.ts` calls the shared `js/src/tools/buildExampleUi.ts`).

## Prefer pixel-exact designer art instead?

That workflow — ship the designer's render as a full-panel plate, lay
invisible hit zones over it, cover the moving parts — is documented at
[/docs/reference-art](https://vsreact.n9records.com/docs/reference-art)
and is how [StashTrack](https://github.com/N9RecordsTechnologiesIL/StashTrack)
ships in production. These examples were built that way before 0.0.33
(`git log` has the plate versions) and moved to components so the thing
most people build first has a copyable starting point.

`tests/ExampleBundleTests.cpp` evaluates the five non-synth bundles
headlessly — eval, layout, paint into an offscreen image — and
`ExampleInteractionTests.cpp` drags each panel's knobs at measured
coordinates and asserts the APVTS write, so a UI that renders but went
dead fails CI rather than a screenshot.
