'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './page.module.css'
import {
  Cursor,
  Magnetic,
  OpStream,
  useMotionReady,
  useReveal,
} from './components/experience'

const REPO_URL = 'https://github.com/N9RecordsTechnologiesIL/VSReacT'
const STASHTRACK_URL = 'https://stashtrack.n9records.com'

const pipeline: Array<[string, string, string]> = [
  ['01', 'YOUR TSX', 'Hooks, effects, components — React 18, unmodified.'],
  ['02', 'QUICKJS', 'The bundle runs in an embedded ES2023 engine. ~1MB, no webview.'],
  ['03', 'RECONCILER', 'A custom host config streams JSON mutation ops over a C bridge.'],
  ['04', 'YOGA', 'The C++ shadow tree lays out with real flexbox — the RN engine.'],
  ['05', 'JUCE::GRAPHICS', 'Every pixel painted natively. Arcs, shadows, text, 60fps.'],
]

const features: Array<[string, string]> = [
  ['TAILWIND-STYLE CLASSES', 'className="flex-1 bg-zinc-950 rounded-xl hover:bg-lime-300" — resolved in JS, painted in C++.'],
  ['APVTS PARAMETERS', 'useParameter(id) binds two-way to the host with automation-safe gestures. ParamKnob is one line.'],
  ['HOT RELOAD IN THE DAW', 'Save your TSX, rebuild the bundle, the plugin remounts in ~100ms. FL Studio stays open.'],
  ['REAL TEXT INPUT', 'A chrome-stripped juce::TextEditor positioned by Yoga: real caret, selection, IME.'],
  ['NATIVE ESCAPE HATCH', '<NativeView nativeId="waveform"> mounts any juce::Component inside the React layout.'],
  ['DRAG, SCROLL, ANIMATE', 'Drag gestures, wheel-scroll containers, and a useTween API with spring-ish easings.'],
]

const codeSample = `import { render, View, ParamKnob } from "@vsreact/core";

function App() {
  return (
    <View className="flex-1 items-center justify-center
                     bg-zinc-950 gap-10 flex-row">
      <ParamKnob paramId="gain" size={88} />
      <ParamKnob paramId="pan" size={88} />
    </View>
  );
}

render(<App />);   // that's the whole plugin UI`

export default function Home() {
  const ready = useMotionReady()
  useReveal(ready)

  const heroRef = useRef<HTMLElement>(null)
  const pipelineRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ready || !heroRef.current) return

    const lines = heroRef.current.querySelectorAll(`.${styles.titleLine}`)
    const tl = gsap.timeline()
    tl.from(lines, { y: 150, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'power4.out' })

    return () => {
      tl.kill()
    }
  }, [ready])

  // Pinned horizontal pipeline (desktop only).
  useEffect(() => {
    if (!ready || !pipelineRef.current || !railRef.current) return
    if (window.matchMedia('(max-width: 767px)').matches) return

    const rail = railRef.current
    const distance = () => rail.scrollWidth - window.innerWidth

    const tween = gsap.to(rail, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pipelineRef.current,
        pin: true,
        scrub: 1,
        end: () => '+=' + distance(),
        invalidateOnRefresh: true,
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [ready])

  return (
    <main className={styles.page} id="top">
      <a className={styles.skipLink} href="#pipeline">
        Skip to content
      </a>

      <Cursor />
      <OpStream />

      <header className={styles.nav}>
        <a href="#top" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo-no-text.jpeg" alt="" width={30} height={30} />
          <span>VSReacT</span>
        </a>
        <nav className={styles.navLinks}>
          <a href="#pipeline">Pipeline</a>
          <a href="#code">Code</a>
          <a href="#built">Built with it</a>
        </nav>
        <a className={styles.navCta} href={REPO_URL} data-hover>
          GITHUB ↗
        </a>
      </header>

      <section ref={heroRef} className={styles.hero}>
        <p className={styles.microLabel}>A REACT RENDERER FOR JUCE AUDIO PLUGINS</p>
        <h1 className={styles.title}>
          <span className={styles.titleLine}>WRITE REACT.</span>
          <span className={styles.titleLine}>
            SHIP <em>NATIVE</em> VST.
          </span>
        </h1>
        <p className={styles.lede}>
          Your TSX runs inside the plugin. A custom reconciler streams the tree
          to C++, Yoga computes flexbox, juce::Graphics paints every pixel.
          There is no webview on this page&apos;s subject.
        </p>
        <div className={styles.actions}>
          <Magnetic>
            <a className={styles.primaryButton} href={REPO_URL} data-hover>
              GET THE FRAMEWORK
            </a>
          </Magnetic>
          <a className={styles.ghostButton} href="#pipeline" data-hover>
            HOW IT WORKS
          </a>
        </div>
        <p className={styles.heroHint} aria-hidden="true">
          ops in · pixels out — watch the stream behind this text
        </p>
      </section>

      <section id="pipeline" ref={pipelineRef} className={styles.pipeline}>
        <div className={styles.pipelineHead}>
          <h2 className={styles.sectionStatement} data-reveal>
            One tree,
            <br />
            five stations.
          </h2>
        </div>
        <div ref={railRef} className={styles.rail}>
          {pipeline.map(([n, title, body]) => (
            <article className={styles.station} key={n}>
              <span className={styles.stationIndex}>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="code" className={styles.code}>
        <div className={styles.codeCopy} data-reveal>
          <span className={styles.microLabel}>THE WHOLE API FITS IN YOUR HEAD</span>
          <h2 className={styles.sectionTitle}>A two-knob plugin is fourteen lines.</h2>
          <p>
            ParamKnob binds to your AudioProcessorValueTreeState through an
            automation-safe bridge. The arc is painted by the engine — stroke,
            not texture. Drag it in the DAW and the host records it.
          </p>
        </div>
        <div className={styles.codePanel} data-reveal>
          <div className={styles.codeBar}>
            <span />
            <span />
            <span className={styles.codeTitle}>GainExample / ui / main.tsx</span>
          </div>
          <pre>
            <code>{codeSample}</code>
          </pre>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionStatement} data-reveal>
          Everything a plugin
          <br />
          UI actually needs.
        </h2>
        <div className={styles.featureFlow}>
          {features.map(([title, body], index) => (
            <article
              className={styles.feature}
              key={title}
              data-reveal
              style={{ marginLeft: `${(index % 3) * 6}vw` }}
            >
              <span className={styles.microAccent}>{title}</span>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="built" className={styles.built}>
        <h2 className={styles.sectionTitle} data-reveal>
          Built with VSReacT
        </h2>
        <div className={styles.builtGrid}>
          <a className={styles.builtCard} href={STASHTRACK_URL} data-reveal data-hover>
            <span className={styles.microLabel}>STASHTRACK — N9 RECORDS</span>
            <h3>A full production VST3, UI entirely in React.</h3>
            <p>
              URL sampling, live download progress, preview playback, an
              animated stash drawer — splash screen to scroll containers, every
              pixel is the engine. Windows, macOS, Linux.
            </p>
            <span className={styles.builtLink}>stashtrack.n9records.com ↗</span>
          </a>
          <a
            className={styles.builtCard}
            href={`${REPO_URL}/tree/main/vsreact/examples/gain`}
            data-reveal
            data-hover
          >
            <span className={styles.microLabel}>GAIN — EXAMPLES/</span>
            <h3>The fourteen-line plugin above, ready to build.</h3>
            <p>
              Two APVTS-bound knobs, automation-safe gestures, hot reload.
              Clone it as the starting point for your own instrument.
            </p>
            <span className={styles.builtLink}>examples/gain ↗</span>
          </a>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.ctaTitle} data-reveal>
          NO MORE
          <br />
          JANKY VSTs.
        </h2>
        <div className={styles.actions} data-reveal>
          <Magnetic>
            <a className={styles.primaryButton} href={REPO_URL} data-hover>
              STAR IT ON GITHUB
            </a>
          </Magnetic>
          <a className={styles.ghostButton} href={STASHTRACK_URL} data-hover>
            SEE IT SHIPPING
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo-no-text.jpeg" alt="" width={24} height={24} />
          <span>VSReacT — N9 Records Technologies</span>
        </div>
        <p>QuickJS · react-reconciler · Yoga · JUCE. MIT-spirited, MIT-licensed module.</p>
      </footer>
    </main>
  )
}
