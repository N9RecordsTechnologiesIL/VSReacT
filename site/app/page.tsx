'use client'

// THE INSTRUMENT — vsreact.n9records.com
// The hero is a working plugin UI. Every zone of the mock is live: knobs
// drive the code's ParamKnob lines, the canvas maps to <View>, the window
// chrome maps to render(<App/>), the meter reads out like real hardware.

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
import { REPO, STASH, STEPS, FEATURES, SHOWCASE_BODY } from './variants/content'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const GAIN_DEFAULT = 10 / 11 // 0.0 dB on the -60..+6 range
const PAN_DEFAULT = 0.5 // centre

type Zone = 'gain' | 'pan' | 'meter' | 'view' | 'app' | null

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
  onChange,
  onActive,
}: {
  label: string
  value: number
  text: string
  defaultValue: number
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
    <div className={styles.knobGroup}>
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

export default function Home() {
  const [gain, setGain] = useState(GAIN_DEFAULT)
  const [pan, setPan] = useState(PAN_DEFAULT)
  const [knobZone, setKnobZone] = useState<'gain' | 'pan' | null>(null)
  const [meterHover, setMeterHover] = useState(false)
  const [canvasHover, setCanvasHover] = useState(false)
  const [windowHover, setWindowHover] = useState(false)
  useReveal()

  // Zone priority mirrors real plugin hit-testing: control > meter > canvas > window.
  const zone: Zone = knobZone ?? (meterHover ? 'meter' : canvasHover ? 'view' : windowHover ? 'app' : null)

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
        <p className={styles.claim}>React in. Native VST out. No webview.</p>
        <nav className={styles.headNav}>
          <Link className={styles.headLink} href="/docs">
            DOCS
          </Link>
          <a className={styles.headCta} href={REPO}>
            GET IT ON GITHUB
          </a>
        </nav>
      </header>

      <section className={styles.stage}>
        <h1 className={`${styles.thesis} ${styles.rise}`}>
          This UI is React.<span> Drag it.</span>
        </h1>
        <p className={`${styles.thesisSub} ${styles.rise} ${styles.d1}`}>
          The window below is the exact component tree from{' '}
          <code>examples/gain</code> — in your DAW, VSReacT paints it with
          juce::Graphics. Here, the same React runs in your browser. Grab a
          knob. Scroll it. Hover everything. Watch the code.
        </p>

        <div className={`${styles.bench} ${styles.rise} ${styles.d2}`}>
          <div
            className={`${styles.plugin} ${zone === 'app' ? styles.zoneOn : ''}`}
            onMouseEnter={() => setWindowHover(true)}
            onMouseLeave={() => setWindowHover(false)}
          >
            <div className={styles.pluginBar}>
              <i aria-hidden="true" />
              <span>VSReacT Gain — examples/gain</span>
              <em>NATIVE</em>
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
                  onChange={setGain}
                  onActive={(a) => setKnobZone(a ? 'gain' : null)}
                />
                <Knob
                  label="PAN"
                  value={pan}
                  text={panText}
                  defaultValue={PAN_DEFAULT}
                  onChange={setPan}
                  onActive={(a) => setKnobZone(a ? 'pan' : null)}
                />
              </div>
              <div
                className={`${styles.meter} ${meterHover ? styles.meterOn : ''}`}
                onMouseEnter={() => setMeterHover(true)}
                onMouseLeave={() => setMeterHover(false)}
                role="img"
                aria-label={`Output level — left ${meterLDb} dB, right ${meterRDb} dB`}
              >
                <div className={styles.meterCol}>
                  <span className={styles.meterVal} data-show={meterHover ? 'true' : undefined}>
                    {meterLDb}
                  </span>
                  <i style={{ height: `${8 + meterL * 88}%` }} data-hot={meterL > 0.92 ? 'true' : undefined} />
                  <span>L</span>
                </div>
                <div className={styles.meterCol}>
                  <span className={styles.meterVal} data-show={meterHover ? 'true' : undefined}>
                    {meterRDb}
                  </span>
                  <i style={{ height: `${8 + meterR * 88}%` }} data-hot={meterR > 0.92 ? 'true' : undefined} />
                  <span>R</span>
                </div>
              </div>
            </div>
            <div className={styles.pluginFoot} data-live={zone ? 'true' : undefined}>
              {zone === 'gain' && `param "gain" · ${gainText} — automation-safe host binding`}
              {zone === 'pan' && `param "pan" · ${panText} — automation-safe host binding`}
              {zone === 'meter' && 'output meter — painted by juce::Graphics at 60fps'}
              {zone === 'view' && '<View> — Yoga flexbox layout, styled by className'}
              {zone === 'app' && 'plugin window — render(<App />) mounts your tree'}
              {zone === null && 'hover any zone to trace it to the code →'}
            </div>
          </div>

          <pre className={styles.code}>
            <code>
              <CodeLine>
                {kw('import')}
                {' { render, View, ParamKnob } '}
                {kw('from')} {str('"@vsreact/core"')};
              </CodeLine>
              <CodeLine />
              <CodeLine hl={zone === 'app'}>
                {kw('function')} {fn('App')}
                {'() {'}
              </CodeLine>
              <CodeLine>
                {'  '}
                {kw('return')}
                {' ('}
              </CodeLine>
              <CodeLine hl={zone === 'view'}>
                {'    <'}
                {tag('View')} {attr('className')}
                {'='}
                {str('"flex-1 items-center justify-center')}
              </CodeLine>
              <CodeLine hl={zone === 'view'}>
                {'                     '}
                {str('bg-zinc-950 gap-10 flex-row"')}
                {'>'}
              </CodeLine>
              <CodeLine hl={zone === 'gain'} live={zone === 'gain' ? gainText : undefined}>
                {'      <'}
                {tag('ParamKnob')} {attr('paramId')}
                {'='}
                {str('"gain"')} {attr('size')}
                {'={88} />'}
              </CodeLine>
              <CodeLine hl={zone === 'pan'} live={zone === 'pan' ? panText : undefined}>
                {'      <'}
                {tag('ParamKnob')} {attr('paramId')}
                {'='}
                {str('"pan"')} {attr('size')}
                {'={88} />'}
              </CodeLine>
              <CodeLine hl={zone === 'view'}>
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
        <p className={`${styles.benchNote} ${styles.rise} ${styles.d3}`}>
          14 lines. Automation-safe host binding included. The arc you just
          dragged is a painted stroke — in the plugin, C++ paints it at 60fps.
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
            <span className={styles.proofPlatforms}>WINDOWS · MACOS · LINUX</span>
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <a className={styles.footCta} href={REPO}>
          START BUILDING →
        </a>
        <p>
          VSReacT — N9 Records Technologies · MIT ·{' '}
          <Link className={styles.footMail} href="/docs">
            Documentation
          </Link>{' '}
          · QuickJS + react-reconciler + Yoga + JUCE ·{' '}
          <a className={styles.footMail} href="mailto:vsreact-support@n9records.com">
            vsreact-support@n9records.com
          </a>
        </p>
      </footer>
    </main>
  )
}
