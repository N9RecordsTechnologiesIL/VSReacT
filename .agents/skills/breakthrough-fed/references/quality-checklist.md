# Awwwards-Grade Quality Checklist

Run this checklist before delivering any breakthrough front-end build. It maps directly to the Awwwards jury evaluation rubric (Design ~40%, Usability ~25%, Creativity ~20%, Content ~15%) plus the Developer Award criteria.

---

## Design (~40% of Awwwards score)

- [ ] Color palette uses a near-black base (`#0A0A0A`–`#111112`) with a **single** vivid accent color. No more than 3 colors total.
- [ ] Typography employs extreme scale contrast: display type at **8vw or larger** paired with micro-copy at **10–12px** in a monospaced font.
- [ ] Layout is asymmetrical and borderless. No standard 12-column grid visible in the final output.
- [ ] Hero section features a **3D object**, **cinematic video**, or **complex CSS animation** — not a static flat image.
- [ ] Custom typefaces are loaded via `@font-face` or a type service (Google Fonts, Adobe Fonts). No system fonts.
- [ ] Every element has a deliberate visual weight and position. Nothing is placed by default.

---

## Usability (~25% of Awwwards score)

- [ ] Navigation is discoverable within 5 seconds, even if unconventional.
- [ ] All body text passes **WCAG AA contrast ratio (4.5:1)** against its background.
- [ ] All large text (18px+ regular, 14px+ bold) passes **WCAG AA (3:1)**.
- [ ] `prefers-reduced-motion` media query is respected. All animations have a static fallback.
- [ ] Mobile experience is **designed separately** for viewports < 768px — not just a responsive collapse of the desktop layout.
- [ ] Touch devices detect and disable WebGL/complex scroll behaviors.
- [ ] All interactive elements have visible focus states (keyboard navigation works).
- [ ] Page has a meaningful `<title>` and `<meta description>`.

---

## Creativity (~20% of Awwwards score)

- [ ] The site has a **"Signature Move"** — one interaction or visual effect that is uniquely memorable and cannot be found on a standard template site.
- [ ] Navigation or content discovery is **unexpected or diegetic** (integrated into the environment).
- [ ] At least one element uses a technique in an **unexpected way** (e.g., CSS `clip-path` for morphing, `mix-blend-mode: difference` for cursor, scroll-driven video playback).
- [ ] The concept behind the visual design is **coherent and intentional** — there is a "why" behind every major design decision.

---

## Content (~15% of Awwwards score)

- [ ] The site tells a **story** with a beginning, middle, and end to the scroll experience.
- [ ] Copy is **minimal and purposeful**. Every word earns its place.
- [ ] The visual language and content **reinforce each other** — the aesthetic matches the brand/message.
- [ ] No placeholder text (`Lorem ipsum`) in the final build.

---

## Technical Excellence (Developer Award criteria)

- [ ] Smooth scrolling implemented via **Lenis** (`@studio-freight/lenis`) or equivalent.
- [ ] All scroll-driven animations use **GSAP ScrollTrigger** with `scrub` for fluid, physical feel.
- [ ] 3D assets are optimized: **DRACO compression** for GLTF models, texture atlasing where applicable.
- [ ] Custom cursor implemented with **magnetic pull** on interactive elements.
- [ ] Page transitions are **seamless** (SPA architecture, no flash of white between routes).
- [ ] Core Web Vitals targets met: **LCP < 2.5s**, **CLS < 0.1**, **FID/INP < 100ms**.
- [ ] No console errors or warnings in production build.
- [ ] Images use modern formats (WebP, AVIF) and are lazy-loaded below the fold.

---

## Scoring Heuristic

Count the checked items in each category. A site ready for Awwwards submission should pass:
- **Design:** 5/6 or better
- **Usability:** 7/8 or better
- **Creativity:** 3/4 or better
- **Content:** 3/4 or better
- **Technical:** 6/8 or better

If any category scores below threshold, address those items before delivery.
