# VSReacT examples

Five complete plugins, each a standalone CMake project whose entire UI
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
| **gain** | The five-minute plugin, in the reference-art style: a photoreal plate with two live knob indicators on an APVTS. Start here. | — |
| **delay** | A film-strip knob (a sprite sheet baked at build time, standing in for a per-pixel shader), and a 7-segment LED display built from hexagonal `clipPolygon` segments with layered `boxShadow` glow. Stereo delay with a one-pole LP in the feedback path. | — |
| **drums** | A 16×3 pad grid over a baked plate: sprite overrides for changed pads, a live playhead box, and readouts in a registered custom OTF stretched to fixed widths with `textLength`. Native 16-step clock (pattern out over `native.call`, playhead back over native events), synthesized kick/snare/hat. | None — core SDK alone. |
| **channel** | An `EQCurve` over reference art bound to real APVTS bands — the same RBJ biquad math runs in C++ and in the display — plus gain-reduction and output meters redrawn as overlays, and a registered custom OTF. | Light: sessions + screens. |
| **synth** | The component showcase: `PianoKeyboard` playing through `native.call`, the `ParamADSREnvelope` editor, both wheels, a `RingMeter` riding native events. 8 sine voices in C++. | Full `@vsreact/posthog`: sessions, parameter analytics, screens, error boundary. |

## Two UI styles

**synth** is built from the SDK's stock components — `ParamKnob`,
`StepSequencer`, `Disclosure` and friends — laid out with flexbox. It is
the fastest way to get a working panel and the best place to see what
ships in the box.

The other four are **reference-art** UIs: a designer's rendered panel is
committed as a WebP plate, drawn full-bleed, and the UI redraws only the
parts that move on top of it. That architecture is worth understanding
before you copy it:

- **The plate is the layout.** Every coordinate lives in plate space
  (gain's 1536×1024, drums' 1672×941) and goes through one `px()` helper
  that scales it by a single factor `S`, so the panel is
  resolution-independent and the numbers in the source match what you
  measure in an image editor.
- **Overlay, don't rebuild.** A knob is the baked knob plus a rotated
  indicator; a meter is the baked scale plus a clipped bar. Only the
  moving pixels are React nodes.
- **Patch over what you can't reuse.** Where the art bakes in a *state*
  (drums' active pads, delay's "347" on the LED), a `Cover` view samples
  clean plate pixels over it, or — for the two cases where covering left
  seams — `js/src/tools/prepExampleAssets.ts` erased it from the asset
  once, at prep time.
- **Hit zones are separate from art.** Transparent views sized in plate
  space take the drags, so pointer targets can be larger and squarer than
  what's drawn.
- **Math lives in its own module.** `parameters.ts`, `sequencer.ts`,
  `cleanstrip-model.ts` are pure and portable — the same functions run in
  the web prototype and in the plugin.

Assets are inlined as base64 `data:` URIs by each `ui/build.ts` (a
plugin has no file server to fetch from), which generates an ignored
`src/_assets.ts` during the build.

`tests/ExampleBundleTests.cpp` evaluates all four reference-art bundles
headlessly — eval, layout, paint into an offscreen image — so a bundle
that launches but renders nothing fails CI rather than a screenshot.
