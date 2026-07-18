# @vsreact/core

**Write React. Ship native VST.**

VSReacT is a React renderer for JUCE audio plugins — your UI runs in
QuickJS inside the plugin, lays out with Yoga, and paints with
`juce::Graphics`. No webview, no browser, no Electron. Real threads,
real automation gestures, hot reload in your DAW.

```tsx
import { render, View, Text, ParamKnob } from "@vsreact/core";

function App() {
  return (
    <View className="w-full h-full items-center justify-center gap-5">
      <Text className="text-text text-[15] font-bold tracking-widest">MY PLUGIN</Text>
      <View className="flex-row gap-10">
        <ParamKnob paramId="gain" size={88} />
        <ParamKnob paramId="pan" size={88} bipolar />
      </View>
    </View>
  );
}

render(<App />);
```

That's a working plugin UI: knobs bound to APVTS parameters, drag /
wheel / double-click-reset, automation-safe begin/set/end gestures.

## Install

Starting fresh? The scaffolder gives you a complete plugin project —
CMake, C++, and a React UI — in one command:

```sh
bun create vsreact my-plugin     # or: npm create vsreact@latest my-plugin
```

Adding to an existing plugin:

```sh
bun add @vsreact/core     # or npm / yarn / pnpm
```

The native side is a JUCE module fetched with CMake — see the
[installation guide](https://vsreact.n9records.com/docs/installation).

## What's in the box

**Parameter controls** — `Knob`, `Slider`, `Toggle`, `XYPad`,
`Segmented`, `Select`, `NumberBox`, `Checkbox`, `RadioGroup`,
`HardwareKnob`, `MacroPad`, `Crossfader` — each with a `Param*` twin
that binds to a host parameter in one line, and `GenericEditor`, the
one-line editor for your whole parameter list.

**Synth & performance** — `PianoKeyboard` (glissando, held notes),
`StepSequencer`, `ADSREnvelope` (four-corner editor), `PitchBend`,
`ModWheel`, `EQCurve` (real RBJ biquad response with draggable band
nodes).

**Meters & visualizers** — `Meter` (peak-hold, hot zone, reverse for
gain reduction), `RingMeter`, `Bars`, `Waveform`, `PulseOrb`.

**Structure & feedback** — `Tabs`, `Disclosure`, `Button`, `Tooltip`,
`Modal`, `ProgressBar` (determinate + indeterminate), `Spinner`.

**Hooks** — `useParameter`, `useParameterList`, `useNativeEvent`,
`useNativeValue`, `useSpring`, `useTween`, `usePeakHold`,
`useRollingBuffer`, `useDebounced`, `useThrottled`, `useInterval`,
`useHover`, `useToggle`, `usePrevious`, `useLayoutRect`, `useOverlay`.

**Utilities** — a Tailwind-subset `className` engine with theme
tokens, `cx`, value formatters (`formatDb`, `formatHz`, `formatMs`,
`formatPercent`, `formatSemitones`, `midiNoteName`, `midiNoteToHz`),
and the pure math behind the components (`adsrLevelAt`,
`biquadMagnitudeDb`, `eqResponseDb`, `snapToStep`, `mapRange`).

## How it works

```
React (QuickJS) ──mutations──▶ C++ shadow tree ──Yoga──▶ juce::Graphics
      ▲                                                        │
      └────────────── events, parameters, native calls ────────┘
```

Your bundle runs in QuickJS with a custom react-reconciler that
streams JSON mutations to a C++ shadow tree. Yoga computes layout,
JUCE paints, and input events flow back. Parameters ride
`vsreact::ParameterBridge`; anything else rides `native.call()` /
`useNativeEvent`.

- **Hot reload**: point the native side at your bundle file and it
  reloads on save — inside the DAW.
- **Automation-safe**: every control opens proper begin/set/end
  gestures.
- **No webview**: the UI is painted by the same process and toolkit as
  the rest of your plugin.

## Docs

- Site & component gallery: <https://vsreact.n9records.com/components>
- Quick start: <https://vsreact.n9records.com/docs/quick-start>
- Full docs: <https://vsreact.n9records.com/docs>
- Analytics add-on: [`@vsreact/posthog`](https://www.npmjs.com/package/@vsreact/posthog)

MIT © N9 Records Technologies
