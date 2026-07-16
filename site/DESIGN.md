---
version: alpha
name: VSReacT Breakthrough
description: Engineering-cinema identity for the VSReacT framework site
colors:
  primary: "#050705"
  secondary: "#0C110B"
  tertiary: "#C6F135"
  neutral: "#EFF3E6"
  muted: "#76806B"
typography:
  display-huge:
    fontFamily: Space Grotesk
    fontSize: 10vw
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.04em
  display-section:
    fontFamily: Space Grotesk
    fontSize: 4.5vw
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.03em
  body:
    fontFamily: Space Grotesk
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0em
  label-micro:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.14em
rounded:
  none: 0px
  soft: 10px
  full: 999px
spacing:
  section: 22vh
  gutter: 5vw
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 18px
    typography: "{typography.label-micro}"
  button-ghost:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
    padding: 18px
    typography: "{typography.label-micro}"
  code-panel:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.soft}"
    padding: 26px
---

## Overview

VSReacT is a compiler's stage magic: React goes in one side, native pixels
come out the other, and nothing in between is a webview. The site performs
that trick in front of you. The tone is engineering-cinema — the confidence of
a build log, staged like a title sequence. Motion tokens:
`ease-cinematic: cubic-bezier(0.16, 1, 0.3, 1)`; durations micro 0.25s /
standard 0.7s / cinematic 1.4s+; pinned scenes scrub with `scrub: 1`.

## Colors

`primary #050705` — void. `secondary #0C110B` — instrument panels and code
slabs. `tertiary #C6F135` — the electron lime of the logo: it means "painted
by the engine" everywhere it appears (op tokens, knob arcs, buttons).
`neutral #EFF3E6` headlines, `muted #76806B` annotations. One accent, no
exceptions. Contrast: lime/primary 12.7:1, neutral/primary 17.6:1,
muted/primary 4.9:1 — AA everywhere.

## Typography

Space Grotesk at 10vw shouts the thesis; JetBrains Mono at 11–13px is the
build log underneath it. Code samples are first-class typography here — set
generously at 13px/1.7 with lime keywords, never screenshots. Headlines split
and rise line-by-line (`power4.out`); mono ops in the hero stream jitter like
a live console.

## Layout

Borderless single canvas. The hero types off-center left; the op-stream canvas
owns the full viewport behind it. The pipeline is a pinned horizontal journey
— five stations crossing the screen as you scroll (vertical stack on touch).
Feature notes stagger asymmetrically. 22vh between movements.

## Elevation & Depth

Z-layers: `op-stream canvas (0)`, `content (10)`, `code-panels (12)` with
soft black 50px shadows, `nav (20)`, `cursor (100)`. The op-stream drifts at
0.3 scroll factor — the machine hums under the page.

## Shapes

10px-radius slabs for code and cards (the plugin's own corner language),
pills for actions, hard right angles for the stream. The only curves are knob
arcs — drawn, like in the engine, as strokes.

## Components

- `button-primary`: lime pill, black mono label, magnetic 24px, hover scale
  1.04 `back.out(1.7)`.
- `button-ghost`: 1px #222b1d border pill; border ignites lime on hover.
- `code-panel`: #0C110B slab, mono 13px, lime keywords, mono line numbers in
  muted; window chrome dots to sell the "app" feel.
- `pipeline-station`: numbered mono label + statement + one-line detail.
- `cursor`: 10px lime dot + 38px ring, mix-blend difference, swells on
  interactive; absent on touch.

## Do's and Don'ts

- DO make the op-stream real: tokens are actual protocol ops
  (["create",7,"view"] …) becoming painted bars — the signature move.
- DO show real API code (useParameter, ParamKnob, className strings).
- DON'T screenshot code; DON'T use a second accent; DON'T grid the features.
- DON'T animate anything when prefers-reduced-motion is set.
- DON'T let the pinned pipeline exist on touch — stack it.
