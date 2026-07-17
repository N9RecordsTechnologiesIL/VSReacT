'use client'

// THE INSTRUMENT — vsreact.n9records.com
// Hero states the claim; the bench proves it. Every zone of the plugin
// mock is live and traces to its own line of the demo source: knobs,
// meter, title bar, NATIVE badge, hint bar, canvas, window chrome.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { GitHubIcon } from './GitHubIcon'
import { REPO, STASH, TAGLINE, LEDE, STEPS, FEATURES, SHOWCASE_BODY } from './variants/content'
import { VERSION } from './version'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const GAIN_DEFAULT = 10 / 11 // 0.0 dB on the -60..+6 range
const PAN_DEFAULT = 0.5 // centre

type Zone = 'gain' | 'pan' | 'meter' | 'title' | 'badge' | 'hint' | 'view' | 'app' | null

function arcPath(value: number): string {
  const start = (-135 * Math.PI) / 180
  const end = ((-135 + 270 * clamp01(value)) * Math.PI) / 180
  const r = 40
  const x0 = 50 + r * Math.sin(start)
  const y0 = 50 - r * Math.cos(start)
  const x1 = 50 + r * Math.sin(end)
  const y1 = 50 - r * Math.cos(end)
  const large = 270 * clamp01(value) > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

function Knob({
  label,
  value,
  text,
  defaultValue,
  hot,
  onChange,
  onActive,
}: {
  label: string
  value: number
  text: string
  defaultValue: number
  hot: boolean
  onChange: (v: number) => void
  onActive: (active: boolean) => void
}) {
  const start = useRef({ y: 0, v: 0 })

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { y: e.clientY, v: value }
      onActive(true)
    },
    [value, onActive],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      onChange(clamp01(start.current.v - (e.clientY - start.current.y) * 0.005))
    },
    [onChange],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      onActive(false)
    },
    [onActive],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step =
        e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 0.02
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -0.02
        : 0
      if (step !== 0) {
        e.preventDefault()
        onChange(clamp01(value + step))
      } else if (e.key === 'Home') onChange(0)
      else if (e.key === 'End') onChange(1)
      else if (e.key === '0' || e.key === 'Backspace') onChange(defaultValue)
    },
    [value, onChange, defaultValue],
  )

  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      onChange(clamp01(value - Math.sign(e.deltaY) * 0.03))
    },
    [value, onChange],
  )

  const angle = -135 + 270 * clamp01(value)

  return (
    <div className={`${styles.knobGroup} ${hot ? styles.knobHot : ''}`}>
      <div
        className={styles.knob}
        role="slider"
        tabIndex={0}
        aria-label={`${label} — drag, scroll, or use arrow keys; double-click resets`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={text}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onDoubleClick={() => onChange(defaultValue)}
        onMouseEnter={() => onActive(true)}
        onMouseLeave={() => onActive(false)}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={arcPath(1)} className={styles.arcTrack} />
          <path d={arcPath(value)} className={styles.arcValue} />
        </svg>
        <i className={styles.cap} style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
      <span className={styles.knobValue}>{text}</span>
      <span className={styles.knobLabel}>{label}</span>
    </div>
  )
}

function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const targets = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.18 },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])
}

/** One stable line of the demo source; only its background ever changes. */
function CodeLine({
  hl,
  live,
  children,
}: {
  hl?: boolean
  live?: string
  children?: ReactNode
}) {
  return (
    <div className={`${styles.codeLine} ${hl ? styles.hl : ''}`}>
      {children ?? ' '}
      {live ? <em className={styles.live}>{`  // ${live}`}</em> : null}
    </div>
  )
}

/**
 * The hero signal: one continuous EKG line that enters from the left edge
 * of the screen at the headline's baseline, rises up and AROUND the two
 * text lines (never crossing them — geometry is measured from the real
 * rendered spans), steps down past "VST.", and exits right. Flat runs with
 * a few sharp pulse spikes, like a heart monitor.
 */
function useHeroSignal(
  wrapRef: React.RefObject<HTMLDivElement | null>,
  l1Ref: React.RefObject<HTMLSpanElement | null>,
  l2Ref: React.RefObject<HTMLSpanElement | null>,
) {
  const [d, setD] = useState<string | null>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const l1 = l1Ref.current
    const l2 = l2Ref.current
    if (!wrap || !l1 || !l2) return

    const compute = () => {
      const W = wrap.offsetWidth
      const H = wrap.offsetHeight
      if (W === 0 || H === 0) return
      const r1 = l1.offsetLeft + l1.offsetWidth // right edge of "Write React."
      const t2 = l2.offsetTop // top of "Ship native VST."
      const rect = wrap.getBoundingClientRect()

      const p = Math.min(26, Math.max(14, W * 0.035)) // breathing room around glyphs
      const yTop = -p
      const yStep = Math.max(t2 - p * 0.55, yTop + 24) // shelf above line 2
      const xStep = Math.min(r1 + p, W - 30) // corner after "React."
      const yBase = H + p * 0.55 // the EKG baseline under everything
      const tailL = Math.max(rect.left, 0) + p + 40 // out to the viewport edge
      const tailR = Math.max(window.innerWidth - rect.right, 0) + p + 40

      const spike = (x: number, y: number, s = 16) =>
        `L ${x} ${y} L ${x + 8} ${y - s} L ${x + 16} ${y + s * 0.62} L ${x + 24} ${y}`

      const parts = [
        `M ${-tailL} ${yBase}`,
        spike(-tailL * 0.55 - p, yBase, 12),
        `L ${-p} ${yBase}`,
        `L ${-p} ${yTop}`,
        spike(Math.max(40, r1 * 0.34), yTop),
        `L ${xStep} ${yTop}`,
        `L ${xStep} ${yStep}`,
      ]
      if (W + p - xStep > 110) parts.push(spike(xStep + (W - xStep) * 0.42, yStep, 12))
      parts.push(
        `L ${W + p} ${yStep}`,
        `L ${W + p} ${yBase}`,
        spike(W + p + tailR * 0.4, yBase, 12),
        `L ${W + tailR} ${yBase}`,
      )
      setD(parts.join(' '))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(wrap)
    ro.observe(l1)
    ro.observe(l2)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [wrapRef, l1Ref, l2Ref])

  return d
}

export default function Home() {
  const [gain, setGain] = useState(GAIN_DEFAULT)
  const [pan, setPan] = useState(PAN_DEFAULT)
  const heroWrapRef = useRef<HTMLDivElement>(null)
  const heroL1Ref = useRef<HTMLSpanElement>(null)
  const heroL2Ref = useRef<HTMLSpanElement>(null)
  const heroSignal = useHeroSignal(heroWrapRef, heroL1Ref, heroL2Ref)
  const [knobZone, setKnobZone] = useState<'gain' | 'pan' | null>(null)
  const [titleHover, setTitleHover] = useState(false)
  const [badgeHover, setBadgeHover] = useState(false)
  const [meterHover, setMeterHover] = useState(false)
  const [hintHover, setHintHover] = useState(false)
  const [canvasHover, setCanvasHover] = useState(false)
  const [windowHover, setWindowHover] = useState(false)
  useReveal()

  // Zone priority mirrors real plugin hit-testing: innermost control wins.
  const zone: Zone =
    knobZone ??
    (titleHover ? 'title'
    : badgeHover ? 'badge'
    : meterHover ? 'meter'
    : hintHover ? 'hint'
    : canvasHover ? 'view'
    : windowHover ? 'app'
    : null)

  const gainDb = -60 + gain * 66
  const gainText = `${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)} dB`
  const panPos = pan * 2 - 1
  const panText =
    Math.abs(panPos) < 0.02 ? 'C' : panPos < 0 ? `L ${Math.round(-panPos * 100)}` : `R ${Math.round(panPos * 100)}`

  const level = clamp01((gainDb + 60) / 66)
  const meterL = clamp01(level * (panPos <= 0 ? 1 : 1 - panPos * 0.85))
  const meterR = clamp01(level * (panPos >= 0 ? 1 : 1 + panPos * 0.85))
  const meterLDb = `${(-60 + meterL * 66).toFixed(1)}`
  const meterRDb = `${(-60 + meterR * 66).toFixed(1)}`

  const hint =
    zone === 'gain' ? `param "gain" · ${gainText} — automation-safe host binding`
    : zone === 'pan' ? `param "pan" · ${panText} — automation-safe host binding`
    : zone === 'title' ? '<Text> — measured by Yoga, painted by juce::Graphics'
    : zone === 'badge' ? '<Text> "NATIVE" — zero webview. every pixel is native'
    : zone === 'meter' ? '<NativeView "meter"> — a juce::Component fed by the audio thread'
    : zone === 'hint' ? '<Text>{hint}</Text> — this bar is React state. you just set it'
    : zone === 'view' ? '<View> — Yoga flexbox layout, styled by className'
    : zone === 'app' ? 'plugin window — render(<App />) mounts your tree'
    : 'hover any zone to trace it to the code →'

  const kw = (t: string) => <span className={styles.kw}>{t}</span>
  const str = (t: string) => <span className={styles.str}>{t}</span>
  const tag = (t: string) => <span className={styles.tag}>{t}</span>
  const attr = (t: string) => <span className={styles.attr}>{t}</span>
  const fn = (t: string) => <span className={styles.fn}>{t}</span>

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className={styles.mark} aria-label="VSReacT">
          <b>VS</b>
          <svg viewBox="0 0 100 100" className={styles.markAtom} aria-hidden="true">
            <ellipse cx="50" cy="50" rx="46" ry="17" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(-60 50 50)" />
            <circle cx="50" cy="50" r="9" className={styles.markCore} />
          </svg>
          <b>T</b>
        </span>
        <a className={styles.verChip} href={`${REPO}/releases`}>
          v{VERSION}
        </a>
        <nav className={styles.headNav}>
          <Link className={styles.headLink} href="/docs">
            DOCS
          </Link>
          <a className={styles.ghBtn} href={REPO} aria-label="VSReacT on GitHub">
            <GitHubIcon size={20} />
          </a>
        </nav>
      </header>

      <section className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/logo-text-red.png" alt="" className={styles.heroLogo} aria-hidden="true" />

        <div className={styles.heroInner}>
          <span className={`${styles.heroKicker} ${styles.rise}`}>{TAGLINE.toUpperCase()}</span>
          <div className={`${styles.heroTitleWrap} ${styles.rise} ${styles.d1}`} ref={heroWrapRef}>
            {heroSignal ? (
              <svg className={styles.heroOutline} aria-hidden="true" focusable="false">
                <path d={heroSignal} pathLength={1000} className={styles.heroOutlineGhost} />
                <path d={heroSignal} pathLength={1000} className={styles.heroOutlineLive} />
              </svg>
            ) : null}
            <h1 className={styles.heroTitle}>
              <span className={styles.heroLine} ref={heroL1Ref}>
                Write React.
              </span>
              <br />
              <span className={styles.heroLine} ref={heroL2Ref}>
                Ship <span className={styles.heroRed}>native</span> VST.
              </span>
            </h1>
          </div>
          <p className={`${styles.heroLede} ${styles.rise} ${styles.d2}`}>{LEDE}</p>
          <div className={`${styles.heroCtas} ${styles.rise} ${styles.d2}`}>
            <Link className={styles.heroBtn} href="/docs">
              READ THE DOCS
            </Link>
            <a className={styles.heroBtnIcon} href={REPO} aria-label="VSReacT on GitHub">
              <GitHubIcon size={22} />
            </a>
          </div>
          <p className={`${styles.heroSpecs} ${styles.rise} ${styles.d3}`}>
            NO WEBVIEW · QUICKJS ES2023 · YOGA FLEXBOX · JUCE::GRAPHICS · WINDOWS · MACOS · LINUX
          </p>
        </div>

        <a className={styles.heroScroll} href="#bench">
          <span aria-hidden="true">▼</span> THE PROOF IS BELOW — DRAG IT
        </a>
      </section>

      <section className={styles.stage} id="bench">
        <h2 className={`${styles.thesis}`} data-reveal>
          This UI is React.<span> Drag it.</span>
        </h2>
        <p className={styles.thesisSub} data-reveal>
          The window below is a working plugin UI — the same component tree VSReacT paints
          with juce::Graphics in your DAW, here running as the page itself. Grab a knob.
          Scroll it. Hover every zone — title bar, badge, meter, canvas, even the hint bar —
          and watch it trace to its own line of code.
        </p>

        <div className={styles.bench} data-reveal>
          <div
            className={`${styles.plugin} ${zone === 'app' ? styles.zoneOn : ''}`}
            onMouseEnter={() => setWindowHover(true)}
            onMouseLeave={() => setWindowHover(false)}
          >
            <div className={styles.pluginBar}>
              <i aria-hidden="true" />
              <span
                className={`${styles.barTitle} ${zone === 'title' ? styles.chipOn : ''}`}
                onMouseEnter={() => setTitleHover(true)}
                onMouseLeave={() => setTitleHover(false)}
              >
                VSReacT Gain
              </span>
              <em
                className={zone === 'badge' ? styles.chipOn : ''}
                onMouseEnter={() => setBadgeHover(true)}
                onMouseLeave={() => setBadgeHover(false)}
              >
                NATIVE
              </em>
            </div>
            <div
              className={`${styles.pluginBody} ${zone === 'view' ? styles.canvasOn : ''}`}
              onMouseEnter={() => setCanvasHover(true)}
              onMouseLeave={() => setCanvasHover(false)}
            >
              <div className={styles.knobs}>
                <Knob
                  label="GAIN"
                  value={gain}
                  text={gainText}
                  defaultValue={GAIN_DEFAULT}
                  hot={zone === 'gain'}
                  onChange={setGain}
                  onActive={(a) => setKnobZone(a ? 'gain' : null)}
                />
                <Knob
                  label="PAN"
                  value={pan}
                  text={panText}
                  defaultValue={PAN_DEFAULT}
                  hot={zone === 'pan'}
                  onChange={setPan}
                  onActive={(a) => setKnobZone(a ? 'pan' : null)}
                />
              </div>
              <div
                className={`${styles.meter} ${zone === 'meter' ? styles.meterOn : ''}`}
                onMouseEnter={() => setMeterHover(true)}
                onMouseLeave={() => setMeterHover(false)}
                role="img"
                aria-label={`Output level — left ${meterLDb} dB, right ${meterRDb} dB`}
              >
                <div className={styles.meterCol}>
                  <span className={styles.meterVal} data-show={zone === 'meter' ? 'true' : undefined}>
                    {meterLDb}
                  </span>
                  <i style={{ height: `${8 + meterL * 88}%` }} data-hot={meterL > 0.92 ? 'true' : undefined} />
                  <span>L</span>
                </div>
                <div className={styles.meterCol}>
                  <span className={styles.meterVal} data-show={zone === 'meter' ? 'true' : undefined}>
                    {meterRDb}
                  </span>
                  <i style={{ height: `${8 + meterR * 88}%` }} data-hot={meterR > 0.92 ? 'true' : undefined} />
                  <span>R</span>
                </div>
              </div>
            </div>
            <div
              className={`${styles.pluginFoot} ${zone === 'hint' ? styles.footHot : ''}`}
              data-live={zone ? 'true' : undefined}
              onMouseEnter={() => setHintHover(true)}
              onMouseLeave={() => setHintHover(false)}
            >
              {hint}
            </div>
          </div>

          <pre className={styles.code}>
            <code>
              <CodeLine>
                {kw('import')}
                {' { useState } '}
                {kw('from')} {str('"react"')};
              </CodeLine>
              <CodeLine>
                {kw('import')}
                {' { render, View, Text, ParamKnob, NativeView }'}
              </CodeLine>
              <CodeLine>
                {'  '}
                {kw('from')} {str('"vsreact"')};
              </CodeLine>
              <CodeLine />
              <CodeLine hl={zone === 'app'}>
                {kw('function')} {fn('App')}
                {'() {'}
              </CodeLine>
              <CodeLine hl={zone === 'hint'}>
                {'  '}
                {kw('const')}
                {' [hint, setHint] = '}
                {fn('useState')}
                {'('}
                {str('"hover a control"')}
                {');'}
              </CodeLine>
              <CodeLine>
                {'  '}
                {kw('return')}
                {' ('}
              </CodeLine>
              <CodeLine hl={zone === 'app'}>
                {'    <'}
                {tag('View')} {attr('className')}
                {'='}
                {str('"flex-1 bg-zinc-950"')}
                {'>'}
              </CodeLine>
              <CodeLine>
                {'      <'}
                {tag('View')} {attr('className')}
                {'='}
                {str('"flex-row items-center px-3 py-2"')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'title'}>
                {'        <'}
                {tag('Text')} {attr('className')}
                {'='}
                {str('"text-xs"')}
                {'>VSReacT Gain</'}
                {tag('Text')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'badge'}>
                {'        <'}
                {tag('Text')} {attr('className')}
                {'='}
                {str('"text-[9] text-red-400"')}
                {'>NATIVE</'}
                {tag('Text')}
                {'>'}
              </CodeLine>
              <CodeLine>{'      </View>'}</CodeLine>
              <CodeLine hl={zone === 'view'}>
                {'      <'}
                {tag('View')} {attr('className')}
                {'='}
                {str('"flex-1 flex-row items-center')}
              </CodeLine>
              <CodeLine hl={zone === 'view'}>
                {'                       '}
                {str('justify-center gap-10"')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'gain'} live={zone === 'gain' ? gainText : undefined}>
                {'        <'}
                {tag('ParamKnob')} {attr('paramId')}
                {'='}
                {str('"gain"')} {attr('size')}
                {'={88} />'}
              </CodeLine>
              <CodeLine hl={zone === 'pan'} live={zone === 'pan' ? panText : undefined}>
                {'        <'}
                {tag('ParamKnob')} {attr('paramId')}
                {'='}
                {str('"pan"')} {attr('size')}
                {'={88} />'}
              </CodeLine>
              <CodeLine hl={zone === 'meter'}>
                {'        <'}
                {tag('NativeView')} {attr('nativeId')}
                {'='}
                {str('"meter"')} {attr('className')}
                {'='}
                {str('"w-12"')}
                {' />'}
              </CodeLine>
              <CodeLine hl={zone === 'view'}>
                {'      </'}
                {tag('View')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'hint'}>
                {'      <'}
                {tag('Text')} {attr('className')}
                {'='}
                {str('"text-[10] px-3 py-2"')}
                {'>{hint}</'}
                {tag('Text')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'app'}>
                {'    </'}
                {tag('View')}
                {'>'}
              </CodeLine>
              <CodeLine>{'  );'}</CodeLine>
              <CodeLine>{'}'}</CodeLine>
              <CodeLine />
              <CodeLine hl={zone === 'app'}>
                {fn('render')}
                {'(<'}
                {tag('App')}
                {' />);'}
              </CodeLine>
            </code>
          </pre>
        </div>
        <p className={styles.benchNote} data-reveal>
          One component tree: window chrome, hint bar, knobs, and a native meter. Automation-safe
          host binding included. The arc you just dragged is a painted stroke — in the plugin,
          C++ paints it at 60fps.
        </p>
      </section>

      <section className={styles.signal} data-reveal>
        <h2 className={styles.sectionTitle}>How your tree becomes pixels</h2>
        <ol className={styles.signalRow}>
          {STEPS.map(([n, name, detail]) => (
            <li key={n}>
              <span className={styles.signalNum}>{n}</span>
              <strong>{name}</strong>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.ledger} data-reveal>
        <h2 className={styles.sectionTitle}>The rest of the toolkit</h2>
        <div className={styles.ledgerGrid}>
          {FEATURES.map(([title, body]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <Link className={styles.ledgerDocs} href="/docs">
          READ THE FULL DOCUMENTATION →
        </Link>
      </section>

      <section className={styles.proof} data-reveal>
        <div className={styles.proofPanel}>
          <span className={styles.proofTag}>SHIPPING — NOT A DEMO</span>
          <a className={styles.proofTitle} href={STASH}>
            StashTrack runs its whole UI on this.
          </a>
          <p>{SHOWCASE_BODY}</p>
          <div className={styles.proofRow}>
            <a className={styles.proofCta} href={STASH}>
              OPEN STASHTRACK ↗
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <Link className={styles.footCta} href="/docs">
          START BUILDING →
        </Link>
        <p>
          VSReacT — N9 Records Technologies · MIT ·{' '}
          <Link className={styles.footMail} href="/docs">
            Documentation
          </Link>{' '}
          ·{' '}
          <a className={styles.footMail} href="mailto:vsreact-support@n9records.com">
            vsreact-support@n9records.com
          </a>
        </p>
      </footer>
    </main>
  )
}
