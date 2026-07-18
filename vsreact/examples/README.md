# VSReacT examples

Four complete plugins, each a standalone CMake project whose entire UI
is React. Build any of them with:

```sh
cd <example>/ui && bun install && bun run build   # the UI bundle
cmake -S <example> -B <example>/build-vs -G "Visual Studio 17 2022" -A x64 -DJUCE_SOURCE_DIR=/path/to/JUCE
cmake --build <example>/build-vs --target <Name>Example_Standalone --config Release
```

Dev builds watch the bundle file — edit `ui/src/main.tsx`, run
`bun run build`, and the plugin hot-reloads.

| Example | Shows off | Analytics |
| --- | --- | --- |
| **gain** | The five-minute plugin: two `ParamKnob`s on an APVTS. Start here. | — |
| **synth** | `PianoKeyboard` playing through `native.call`, the `ParamADSREnvelope` editor, both wheels, a `RingMeter` riding native events. 8 sine voices in C++. | Full `@vsreact/posthog`: sessions, parameter analytics, screens, error boundary. |
| **drums** | `StepSequencer` patterns driving a native 16-step clock (pattern out over `native.call`, playhead back over native events), `ParamNumberBox`, `ParamToggle`. Synthesized kick/snare/hat. | None — core SDK alone. |
| **channel** | `EQCurve` bound to real APVTS bands — the same RBJ biquad math runs in C++ and in the display. Gain-reduction `Meter` (`reverse`), `RingMeter`, `Disclosure`. | Light: sessions + screens. |
