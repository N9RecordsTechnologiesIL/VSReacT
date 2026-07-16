---
version: alpha
name: Breakthrough Template
description: Cinematic, experiential web design. Near-black base, single vivid accent, extreme typographic scale contrast.
colors:
  primary: "#FFFFFF"
  secondary: "#6B6B6B"
  tertiary: "#D2FF00"
  neutral: "#0A0A0A"
  on-tertiary: "#000000"
  on-neutral: "#FFFFFF"
typography:
  display-huge:
    fontFamily: Space Grotesk
    fontSize: 12vw
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.04em
  display-large:
    fontFamily: Space Grotesk
    fontSize: 7vw
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.03em
  h1:
    fontFamily: Space Grotesk
    fontSize: 4vw
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0em
  label-micro:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.12em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  xxl: 128px
  massive: 20vw
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.full}"
    padding: 16px
    typography: "{typography.label-micro}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 16px
    typography: "{typography.label-micro}"
  nav-label:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.label-micro}"
  cursor-default:
    backgroundColor: "{colors.tertiary}"
    size: 12px
    rounded: "{rounded.full}"
  cursor-hover:
    backgroundColor: "{colors.primary}"
    size: 48px
    rounded: "{rounded.full}"
---

## Overview

Cinematic, immersive, and deeply kinetic. This design system abandons the standard 12-column grid in favor of a fluid, borderless canvas. The aesthetic philosophy is borrowed from cinema and spatial computing: a deep, atmospheric void from which content emerges, driven by the user's scroll. The emotional register is **precise, powerful, and slightly unsettling** — the feeling of encountering something that was clearly made by humans who care obsessively about craft.

The palette is a binary of near-black and high-contrast white, punctuated by a single electric accent color (Electric Lime, `#D2FF00`) used exclusively for interaction. The typographic system relies on extreme scale contrast — letterforms so large they function as architecture — paired with technical micro-copy that evokes precision instruments.

**Motion Tokens:**
- `ease-cinematic: cubic-bezier(0.16, 1, 0.3, 1)` — fast in, long slow settle. Use for all element reveals.
- `ease-atmospheric: cubic-bezier(0.45, 0, 0.55, 1)` — symmetrical, dreamy. Use for background and color transitions.
- `ease-spring: gsap power4.out with slight overshoot` — for hover micro-interactions.
- Duration scale: micro (0.2s), standard (0.6s), cinematic (1.5s+).

## Colors

The palette is rooted in cinematic lighting and high-contrast photography.

**Neutral (`#0A0A0A`)** is the foundation — a near-black void, not pure black, which would feel flat. It creates the depth that makes 3D elements and motion feel like they exist in real space. All pages default to this background.

**Primary (`#FFFFFF`)** is high-contrast white for all core narrative text. Used for headlines, body copy, and primary UI labels.

**Secondary (`#6B6B6B`)** is a muted mid-grey for secondary information — metadata, timestamps, supporting labels — creating a subtle hierarchy without introducing additional hue.

**Tertiary (`#D2FF00`, "Electric Lime")** is the sole driver of interaction. It is used exclusively for: the custom cursor, primary call-to-action buttons, active navigation states, and critical typographic highlights. It must never appear as a background for large areas. Its scarcity is its power.

## Typography

The typography strategy is built on a single principle: **extreme scale contrast creates visual tension that draws the eye and communicates energy**.

**Display Huge (12vw)** is used as a structural, architectural element. At this scale, individual letterforms become shapes. It is used for the primary hero statement and for section-opening words that serve as visual anchors.

**Display Large (7vw)** bridges the gap between architectural display type and readable headlines. Used for secondary hero text and major section headings.

**H1 (4vw)** is the smallest "large" text. Used for sub-section headings where readability is required but visual weight is still important.

**Body MD (16px, Inter)** is used for all narrative paragraphs. Inter is chosen for its exceptional legibility at small sizes and its neutral, modern character.

**Label Micro (10px, JetBrains Mono)** is used for all technical data, coordinates, UI labels, button text, and metadata. It must always be set in uppercase with generous letter-spacing (0.12em). It evokes precision instruments, technical readouts, and the aesthetic of developer tools.

**The Gap:** There is intentionally no typography token between H1 (4vw) and Body MD (16px). This gap is the design. It forces the layout to choose between architectural scale and intimate legibility, creating the visual tension that defines the aesthetic.

## Layout

The layout abandons standard grids entirely. Elements are positioned using a combination of absolute positioning, CSS Grid with custom track definitions, and viewport-relative units.

**Borderless Canvas:** Content bleeds to the edges of the viewport. There are no standard gutters or margins constraining the layout.

**Scroll as Narrative:** Vertical spacing is vast (`massive: 20vw`) to allow elements to enter and exit the viewport independently, each driven by its own GSAP ScrollTrigger animation. The user does not scroll to see more content; they scroll to advance a timeline.

**Asymmetrical Composition:** Elements are intentionally offset, overlapping, and positioned at unexpected coordinates. The layout creates visual tension and directs the eye through a deliberate path.

## Elevation & Depth

Depth is achieved through WebGL and motion, not drop shadows or borders.

**Z-Axis Layers:** `canvas-3d (z-index: 0)` for the WebGL scene, `content (z-index: 10)` for narrative text and images, `ui-overlay (z-index: 20)` for navigation and persistent UI, `cursor (z-index: 100)` for the custom cursor element.

**Parallax Factors:** Background elements move at `0.1x` scroll speed (far), mid-ground at `0.4x` (mid), and foreground content at `0.8x` (near), creating a sense of physical depth without WebGL.

**Flat UI on 3D Stage:** All UI elements (buttons, labels, navigation) are perfectly flat — no shadows, no gradients, no depth effects. This contrast between the flat UI layer and the 3D environment behind it creates a powerful spatial hierarchy.

## Shapes

The shape language is defined by a deliberate tension between two extremes: **architectural sharpness** and **organic fluidity**.

UI elements use either perfectly sharp corners (`0px`) or fully pill-shaped curves (`9999px`). There are no intermediate border radii (e.g., 8px, 16px) in the UI layer. This binary choice reinforces the precision and intentionality of the design.

The WebGL environment, by contrast, may feature organic, fluid, continuously morphing forms — liquid metal, particle clouds, biological structures. The contrast between the rigid UI and the fluid 3D environment creates the defining visual tension of the aesthetic.

## Components

**Primary Button:** Pill-shaped, Electric Lime background, black text, Label Micro typography in uppercase. Used for the single most important call to action on any given view. There should be at most one primary button visible at any time.

**Ghost Button:** Pill-shaped, transparent background, white text with a 1px white border. Used for secondary actions.

**Navigation Labels:** Transparent background, secondary grey text, Label Micro typography. Navigation items should feel like technical readouts, not marketing copy.

**Custom Cursor (Default):** A 12px Electric Lime circle that follows the mouse with a 0.6s `power3.out` lag, creating a trailing, physical sensation.

**Custom Cursor (Hover):** Expands to 48px on hover over interactive elements. On hover over text, switches to `mix-blend-mode: difference` to create a visual inversion effect.

## Do's and Don'ts

**Do** use the tertiary color (Electric Lime) exclusively for interactive elements. Its scarcity is its power — every time it appears, the user should feel a signal.

**Do** maintain WCAG AA contrast ratios (4.5:1) for all readable text. High-end design and accessibility are not in conflict.

**Do** define the site's "Signature Move" before writing any code. Every breakthrough site has one uniquely memorable interaction that cannot be found on a template site.

**Don't** use Tailwind CSS. Its utility-first approach enforces a specific aesthetic that is antithetical to breakthrough design. Write custom CSS/SCSS.

**Don't** use medium-sized text (24px–48px). Force the extreme contrast between massive display type and micro-copy. The gap is the design.

**Don't** use standard CSS `transition: all 0.3s ease`. Every animation must use GSAP with physics-based easing.

**Don't** use a standard horizontal navigation bar as the primary navigation. Hide it, invert it, make it diegetic, or replace it entirely.
