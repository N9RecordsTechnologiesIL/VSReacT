# DESIGN.md Format for Breakthrough Sites

This skill uses the Google Labs `DESIGN.md` specification as a structured way to define a high-end visual identity before writing any code. A `DESIGN.md` file combines machine-readable design tokens (YAML front matter) with human-readable design rationale (Markdown prose).

## Token Schema (YAML front matter)

```yaml
version: alpha
name: <design system name>
description: <optional>
colors:
  primary: <Color>
  secondary: <Color>
  tertiary: <Color>
  neutral: <Color>
typography:
  <token-name>: <Typography>
rounded:
  <scale-level>: <Dimension>
spacing:
  <scale-level>: <Dimension | number>
components:
  <component-name>:
    <token-name>: <string | token reference>
```

### Token Types

| Type | Format | Example |
|:-----|:-------|:--------|
| Color | `#` + hex (sRGB) | `"#0A0A0A"` |
| Dimension | number + unit (`px`, `em`, `rem`, `vw`) | `48px`, `-0.04em`, `12vw` |
| Token Reference | `{path.to.token}` | `{colors.tertiary}` |
| Typography | object with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` | See example below |

### Typography Token Example

```yaml
typography:
  display-huge:
    fontFamily: Space Grotesk
    fontSize: 12vw
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.04em
  label-micro:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
```

### Component Tokens

```yaml
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.full}"
    padding: 16px
    typography: "{typography.label-micro}"
```

Valid component properties: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`.

## Canonical Section Order (Markdown body)

Sections use `##` headings and must appear in this order:

1. **Overview** — Brand personality, aesthetic direction, emotional tone
2. **Colors** — Palette rationale, usage rules, accent color restrictions
3. **Typography** — Scale system, typeface selection rationale, kinetic behavior
4. **Layout** — Grid philosophy (or lack thereof), spacing strategy, scroll approach
5. **Elevation & Depth** — Z-axis strategy, WebGL depth, parallax layers
6. **Shapes** — Corner radius philosophy, organic vs. geometric tension
7. **Components** — Button, card, nav, cursor state definitions
8. **Do's and Don'ts** — Hard rules derived from the design philosophy

## Linting Rules (Quality Gates)

When generating a `DESIGN.md`, ensure it passes these checks:

| Rule | Description |
|:-----|:------------|
| `broken-ref` | Token references (`{colors.primary}`) must resolve to a defined token |
| `missing-primary` | At least one `primary` color must exist |
| `contrast-ratio` | Component `backgroundColor`/`textColor` pairs must pass WCAG AA (4.5:1) |
| `orphaned-tokens` | All defined color tokens should be referenced by a component |
| `section-order` | Sections must appear in the canonical order above |

## Breakthrough-Specific Extensions

The standard `DESIGN.md` schema covers colors, typography, and spacing. For breakthrough sites, add these in the prose sections:

### Motion Tokens (in Overview or a `## Motion` section)
Describe named easing curves and duration scales:
- `ease-cinematic: cubic-bezier(0.16, 1, 0.3, 1)` — for reveals
- `ease-atmospheric: cubic-bezier(0.45, 0, 0.55, 1)` — for background transitions
- Duration scale: micro (0.2s), standard (0.6s), cinematic (1.5s+)

### Interaction Tokens (in Components section)
- Cursor default size, hover size, and `mix-blend-mode`
- Magnetic radius for interactive elements (e.g., `24px`)

### Depth Tokens (in Elevation & Depth section)
- Named Z-index layers: `canvas-3d (0)`, `content (10)`, `ui-overlay (20)`, `cursor (100)`
- Parallax factors for depth layers: `far (0.1)`, `mid (0.4)`, `near (0.8)`
