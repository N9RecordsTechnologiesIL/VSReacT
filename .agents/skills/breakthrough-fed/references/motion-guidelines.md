# Breakthrough Motion Guidelines

Awwwards-winning sites rely on physics-based motion and scroll-choreography. Use these patterns when implementing animations.

## GSAP Easing Reference

Never use CSS `transition: all 0.3s ease`. Use GSAP with these easing curves:

| Use Case | GSAP Ease | Feel |
|:---------|:----------|:-----|
| Element reveals (text, images) | `power4.out` | Fast in, slow settle |
| Page transitions | `expo.inOut` | Cinematic, symmetrical |
| Background fades | `power2.inOut` | Atmospheric, dreamy |
| Hover micro-interactions | `back.out(1.7)` | Slight overshoot, playful |
| Scroll-pinned scenes | `none` (scrub: 1) | Direct, physical |

## Scroll-Driven Narrative (ScrollTrigger Patterns)

### Text Reveal on Scroll
```javascript
gsap.from('.headline', {
  scrollTrigger: {
    trigger: '.headline',
    start: 'top 80%',
    toggleActions: 'play none none reverse'
  },
  y: 120,
  opacity: 0,
  duration: 1.2,
  ease: 'power4.out',
  stagger: 0.08
});
```

### Pinned Horizontal Scroll
```javascript
const sections = gsap.utils.toArray('.panel');
gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-container',
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => '+=' + document.querySelector('.horizontal-container').offsetWidth
  }
});
```

### 3D Camera Path on Scroll
```javascript
// Bind Three.js camera position to scroll progress
ScrollTrigger.create({
  trigger: '.scene-container',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 2,
  onUpdate: (self) => {
    camera.position.z = gsap.utils.interpolate(10, 2, self.progress);
    camera.position.y = gsap.utils.interpolate(0, 3, self.progress);
  }
});
```

## Custom Cursor Implementation

```javascript
// Custom cursor with magnetic effect
const cursor = document.querySelector('.cursor');
const magneticElements = document.querySelectorAll('[data-magnetic]');

document.addEventListener('mousemove', (e) => {
  gsap.to(cursor, {
    x: e.clientX,
    y: e.clientY,
    duration: 0.6,
    ease: 'power3.out'
  });
});

magneticElements.forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, { x: relX * 0.3, y: relY * 0.3, duration: 0.4, ease: 'power2.out' });
    gsap.to(cursor, { scale: 2.5, duration: 0.3 });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    gsap.to(cursor, { scale: 1, duration: 0.3 });
  });
});
```

## Accessibility: Reduced Motion

Always wrap complex animations:

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // All GSAP animations here
  initScrollAnimations();
  initCursor();
} else {
  // Static fallback: just show everything without animation
  document.querySelectorAll('.animated').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}
```
