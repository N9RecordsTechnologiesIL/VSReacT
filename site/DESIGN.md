# VSReacT Site — THE INSTRUMENT (final)

Selected after 18 candidate directions. Built under the breaking-through-knots
discipline: UX contract → concept → design contract → semantic baseline →
motion → gates.

## UX contract (abridged)

- **Primary user:** audio plugin developers (JUCE/C++ devs tired of
  LookAndFeel; web devs entering audio).
- **Primary task:** believe "React but native" is real, then open GitHub.
- **Required actions:** GitHub (primary), StashTrack (proof), support mail.
- **Comprehension risk:** disbelief — countered by the signature interaction.
- **Constraints:** static export (GitHub Pages), no heavy libs, AA contrast,
  keyboard/touch parity, reduced-motion composition.

## Thesis

**Proof, not promise.** The hero is a *working* plugin UI — the exact
`examples/gain` component tree, live in the page. The visitor drags a knob
and sees the arc, readout, stereo meter, and the actual 14 lines of code
respond. The product demonstrates itself in the first five seconds.

## Signature interaction

- Manipulate: GAIN / PAN knobs (pointer drag, touch drag, mouse wheel,
  arrow keys, Home/End, `0`/double-click reset).
- Changes: SVG arc sweep, tabular-numeral readouts (dB / L-C-R), stereo
  meter with clip-red tips, live-value comments on the highlighted
  `<ParamKnob>` code lines.
- Clarifies: "you write this → you get this" — demonstrated, not claimed.
- Keyboard/touch: full parity (role=slider, aria-valuetext).
- Reduced motion / no-JS: static composition with default values remains
  complete and truthful.

## Design contract

- **Palette:** ink `#0B0B0A`, panel `#131312`, edge `#262624`, porcelain
  `#F2F1EA`, dim `#A3A299`, signal red `#FF2E2E` (sole accent — arcs, LEDs,
  highlights, hovers). All text pairs AA+.
- **Type:** Anton (uppercase display, the machine voice), Archivo (UI/body),
  JetBrains Mono (values, code, micro-labels — tabular numerals on
  readouts). VS⚛T mark: Anton + SVG atom, red nucleus, 22s rotation.
- **Topology:** manipulation-first single page — sticky tool-bar header →
  bench (plugin + code, equal columns) → 5-column signal path → two-column
  feature ledger → red-spined proof panel → monumental footer CTA.
- **Motion:** entrance rise (0.9s `cubic-bezier(0.16,1,0.3,1)`, staggered),
  IntersectionObserver reveals, meter 0.12s ease-out, LED/atom idle pulses.
  Everything gated behind `prefers-reduced-motion`.
- **Responsive:** bench stacks under 900px; signal path and ledger collapse
  to single column; knobs are `touch-action: none` pointer-captured.

## Gates run

- UX: primary action visible in header + footer; states covered (hover,
  focus-visible, active drag, clip); no hover-only reveals.
- A11y: sliders are focusable with names/values; contrast AA+; reduced
  motion = designed static page.
- Performance: three Google fonts, zero runtime deps beyond React; static
  export; no canvas/WebGL needed for the thesis.
