---
name: breakthrough-fed
description: "Design and build Awwwards-winning, experiential front-end interfaces. Use when the user requests a 'breakthrough', 'cinematic', 'Awwwards-level', 'highly interactive', or 'world-class' web experience. Activates the full taxonomy of experiential web design: WebGL/3D, GSAP choreography, kinetic typography, diegetic navigation, and cinematic aesthetics derived from analysis of 35 Awwwards winners."
---

# Breakthrough Front-End Design

This skill encodes the design intelligence of world-class creative studios, derived from empirical analysis of 35 Awwwards-winning sites. It overrides default utility-framework instincts with the six pillars of experiential web design.

## Core Philosophy (Never Negotiate These)

1. **Abandon the Grid.** No standard 12-column layouts. Use fluid, borderless canvases where elements float, overlap, and react to scroll position.
2. **Typography is Architecture.** Use extreme scale contrast: display type at 8–15vw paired with micro-copy at 10px in a monospaced font. No medium-sized text.
3. **Motion is Normative.** Nothing appears instantly. Use GSAP physics-based easing (`power4.out`, `expo.out`) for all entry, exit, and scroll-triggered animations. Never use CSS `transition: all 0.3s ease`.
4. **Spatial Depth.** Use WebGL (Three.js) or deep parallax to create Z-axis movement, not just X/Y scrolling.

## Step-by-Step Workflow

### Step 1: Generate the `DESIGN.md`

Before writing any code, generate a `DESIGN.md` in the project root.
- Read `references/design-system-rules.md` for the full format spec.
- Copy `templates/template.DESIGN.md` as the starting point.
- Define an atmospheric, near-black base palette with a single vivid accent color.
- Define the kinetic typography system with extreme scale contrast.
- Ensure all component color pairs pass WCAG AA (4.5:1 contrast ratio).

### Step 2: Establish the Tech Stack

```bash
# Framework (for seamless page transitions)
npx create-next-app@latest my-site --typescript --tailwind=false

# Motion (GSAP + smooth scroll)
npm install gsap @studio-freight/lenis

# 3D/WebGL (if applicable)
npm install three @react-three/fiber @react-three/drei
```

Do NOT use Tailwind CSS. Write custom CSS/SCSS for precise visual control.

### Step 3: Implement the Core Experience

**The Hero:** Create an interactive 3D object (Three.js), a scroll-driven cinematic video, or a complex CSS `clip-path` morphing animation. Never use a static flat image as the primary hero element.

**The Navigation:** Hide behind a hamburger menu with a full-screen overlay, or integrate diegetically into the environment. Never use a standard horizontal nav bar as the primary navigation.

**The Scroll:** Implement Lenis smooth scrolling. Bind GSAP ScrollTrigger timelines to scroll position to trigger animations, reveal text, and move the camera.

```javascript
// Lenis + GSAP ScrollTrigger setup (always include this)
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

**The Cursor:** Implement a custom cursor that reacts magnetically to interactive elements and changes state on hover. Read `references/motion-guidelines.md` for implementation patterns.

**The Signature Move:** Every breakthrough site has one uniquely memorable interaction. Define it before building. Examples: a draggable 3D object, a CSS `clip-path` morph, a radial navigation menu, a scroll-driven camera path.

## Gotchas

- **Performance:** Optimize 3D models (DRACO compression for GLTF). Use `will-change: transform` on animated elements. Target LCP < 2.5s.
- **Accessibility:** Wrap all GSAP animations in `window.matchMedia('(prefers-reduced-motion: reduce)')` checks. Provide static fallbacks.
- **Mobile:** 3D and scroll-jacking rarely translate to touch. Design a separate, simplified mobile experience for viewports < 768px. Detect touch devices and disable WebGL/complex scroll behaviors.

## Quality Checklist (Run Before Delivery)

Read `references/quality-checklist.md` for the full Awwwards-grade quality gate.
