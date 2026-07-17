'use client'

// THE COMPONENT LIBRARY — every SDK control as a live, interactive web
// twin. In your DAW the same components are painted by juce::Graphics;
// here they run in the browser so you can feel them before installing.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import styles from './components.module.css'
import { GitHubIcon } from '../GitHubIcon'
import { REPO } from '../variants/content'
import { VERSION } from '../version'

const RED = '#ff2e2e'
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/* ── shared drag helper ─────────────────────────────────────────────── */

function useDrag(onDelta: (dx: number, dy: number) => void) {
  const start = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      onDelta(e.clientX - start.current.x, e.clientY - start.current.y)
      start.current = { x: e.clientX, y: e.clientY }
    },
    [onDelta],
  )

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}

/* ── web twins ──────────────────────────────────────────────────────── */

function arcPath(value: number): string {
  const start = (-135 * Math.PI) / 180
  const end = ((-135 + 270 * clamp01(value)) * Math.PI) / 180
  const r = 40
  const large = 270 * clamp01(value) > 180 ? 1 : 0
  return `M ${50 + r * Math.sin(start)} ${50 - r * Math.cos(start)} A ${r} ${r} 0 ${large} 1 ${50 + r * Math.sin(end)} ${50 - r * Math.cos(end)}`
}

function DemoKnob({
  value,
  defaultValue = 0.7,
  bipolar,
  onChange,
  size = 84,
  label,
}: {
  value: number
  defaultValue?: number
  bipolar?: boolean
  onChange: (v: number) => void
  size?: number
  label?: string
}) {
  const drag = useDrag((_dx, dy) => onChange(clamp01(value - dy * 0.006)))
  const angle = -135 + 270 * clamp01(value)

  const valueArc = () => {
    if (!bipolar) return arcPath(value)
    const a0 = (Math.min(0, angle) * Math.PI) / 180
    const a1 = (Math.max(0, angle) * Math.PI) / 180
    const r = 40
    return `M ${50 + r * Math.sin(a0)} ${50 - r * Math.cos(a0)} A ${r} ${r} 0 0 1 ${50 + r * Math.sin(a1)} ${50 - r * Math.cos(a1)}`
  }

  return (
    <div className={styles.knobGroup}>
      <div
        className={styles.knob}
        style={{ width: size, height: size }}
        {...drag}
        onDoubleClick={() => onChange(defaultValue)}
        onWheel={(e) => onChange(clamp01(value - Math.sign(e.deltaY) * 0.04))}
        role="slider"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={arcPath(1)} className={styles.arcTrack} />
          <path d={valueArc()} className={styles.arcValue} />
        </svg>
        <i style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
      {label ? <span className={styles.miniLabel}>{label}</span> : null}
    </div>
  )
}

function DemoSlider({
  value,
  onChange,
  vertical,
  length = 150,
}: {
  value: number
  onChange: (v: number) => void
  vertical?: boolean
  length?: number
}) {
  const drag = useDrag((dx, dy) =>
    onChange(clamp01(value + (vertical ? -dy : dx) / length)),
  )

  return (
    <div
      className={vertical ? styles.sliderV : styles.sliderH}
      style={vertical ? { height: length } : { width: length }}
      {...drag}
      onDoubleClick={() => onChange(0.5)}
      onWheel={(e) => onChange(clamp01(value - Math.sign(e.deltaY) * 0.04))}
    >
      <i
        className={styles.sliderFill}
        style={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
      />
      <b
        className={styles.sliderThumb}
        style={
          vertical
            ? { bottom: `calc(${value * 100}% - 6px)` }
            : { left: `calc(${value * 100}% - 6px)` }
        }
      />
    </div>
  )
}

/* ── the cards ──────────────────────────────────────────────────────── */

function Card({
  name,
  blurb,
  imports,
  docs,
  children,
  wide,
}: {
  name: string
  blurb: string
  imports: string
  docs: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <article className={`${styles.card} ${wide ? styles.wide : ''}`}>
      <div className={styles.preview}>{children}</div>
      <div className={styles.cardBody}>
        <h2>{name}</h2>
        <p>{blurb}</p>
        <code>{imports}</code>
        <Link href={docs}>DOCS →</Link>
      </div>
    </article>
  )
}

export default function ComponentsPage() {
  const [gain, setGain] = useState(0.7)
  const [pan, setPan] = useState(0.5)
  const [mix, setMix] = useState(0.6)
  const [level, setLevel] = useState(0.75)
  const [bypass, setBypass] = useState(false)
  const [shape, setShape] = useState(1)
  const [mode, setMode] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [xy, setXy] = useState({ x: 0.6, y: 0.4 })
  const [clicks, setClicks] = useState(0)
  const [text, setText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [oversample, setOversample] = useState(true)
  const [dither, setDither] = useState(false)
  const [osMode, setOsMode] = useState(1)

  // animated feeds for meter/bars/waveform
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf = 0
    let t = 0
    const loop = () => {
      t += 1
      if (t % 3 === 0) setTick(t) // ~20fps is plenty
      raf = requestAnimationFrame(loop)
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const meterLevel = 0.55 + 0.4 * Math.abs(Math.sin(tick / 40)) * (0.6 + 0.4 * Math.sin(tick / 9))
  const peakRef = useRef({ peak: 0, held: 0 })
  if (meterLevel >= peakRef.current.peak) peakRef.current = { peak: meterLevel, held: tick }
  else if (tick - peakRef.current.held > 30)
    peakRef.current.peak = Math.max(meterLevel, peakRef.current.peak - 0.01)

  const bars = Array.from({ length: 20 }, (_, i) =>
    clamp01(
      0.25 +
        0.7 *
          Math.abs(Math.sin(tick / 25 + i * 0.55)) *
          Math.abs(Math.sin(tick / 60 + i * 0.21)),
    ),
  )
  const wave = Array.from({ length: 40 }, (_, i) =>
    Math.sin((tick - i * 3) / 14) * Math.abs(Math.sin((tick - i * 3) / 47)),
  )

  const dropdownOptions = ['CLEAN', 'TAPE', 'TUBE', 'FUZZ', 'BITCRUSH']
  const dbText = (v: number) => `${(-60 + v * 66) >= 0 ? '+' : ''}${(-60 + v * 66).toFixed(1)} dB`
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const panText = (v: number) =>
    Math.abs(v - 0.5) < 0.01 ? 'C' : v < 0.5 ? `L ${Math.round((0.5 - v) * 200)}` : `R ${Math.round((v - 0.5) * 200)}`
  const progress = (tick % 300) / 300

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href="/" className={styles.mark} aria-label="VSReacT — home">
          <b>VS</b>
          <svg viewBox="0 0 100 100" className={styles.markAtom} aria-hidden="true">
            <ellipse cx="50" cy="50" rx="46" ry="17" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(60 50 50)" />
            <ellipse cx="50" cy="50" rx="46" ry="17" transform="rotate(-60 50 50)" />
            <circle cx="50" cy="50" r="9" className={styles.markCore} />
          </svg>
          <b>T</b>
        </Link>
        <a className={styles.ver} href={`${REPO}/releases`}>
          v{VERSION}
        </a>
        <nav className={styles.headNav}>
          <Link className={styles.headLink} href="/docs">
            DOCS
          </Link>
          <a className={styles.ghBtn} href={REPO} aria-label="VSReacT on GitHub">
            <GitHubIcon size={19} />
          </a>
        </nav>
      </header>

      <section className={styles.hero}>
        <span className={styles.kicker}>THE COMPONENT LIBRARY</span>
        <h1>
          Every control. <span>Live.</span>
        </h1>
        <p>
          These are web twins of the native components — drag them, wheel them, double-click
          them. In your DAW, the same API is painted by <code>juce::Graphics</code>. Install
          with <code>bun add @vsreact/core</code> and every card below is one import away.
        </p>
      </section>

      <section className={styles.grid}>
        <Card
          name="Knob"
          blurb="Drag vertically, wheel to nudge, double-click to reset. ParamKnob binds it to a host parameter with automation-safe gestures."
          imports={`import { Knob, ParamKnob } from "@vsreact/core"`}
          docs="/docs/parameters#controls"
        >
          <div className={styles.row}>
            <DemoKnob value={gain} onChange={setGain} label={dbText(gain)} />
          </div>
        </Card>

        <Card
          name="Knob · bipolar"
          blurb="The value arc sweeps from 12 o'clock — the correct read for pan, tilt, and balance parameters."
          imports={`<ParamKnob paramId="pan" bipolar />`}
          docs="/docs/components#controls"
        >
          <div className={styles.row}>
            <DemoKnob
              value={pan}
              defaultValue={0.5}
              bipolar
              onChange={setPan}
              label={
                Math.abs(pan - 0.5) < 0.01
                  ? 'C'
                  : pan < 0.5
                    ? `L ${Math.round((0.5 - pan) * 200)}`
                    : `R ${Math.round((pan - 0.5) * 200)}`
              }
            />
          </div>
        </Card>

        <Card
          name="Slider &amp; Fader"
          blurb="Horizontal by default; vertical makes it a fader — drag up for more, fill rises from the bottom."
          imports={`<ParamSlider paramId="level" vertical />`}
          docs="/docs/components#controls"
        >
          <div className={styles.rowGap}>
            <DemoSlider value={mix} onChange={setMix} />
            <DemoSlider value={level} onChange={setLevel} vertical length={110} />
          </div>
        </Card>

        <Card
          name="Toggle"
          blurb="A switch with a spring-animated thumb. ParamToggle treats value ≥ 0.5 as on and writes clean gestures."
          imports={`<ParamToggle paramId="bypass" />`}
          docs="/docs/components#controls"
        >
          <button
            type="button"
            className={`${styles.toggle} ${bypass ? styles.toggleOn : ''}`}
            onClick={() => setBypass(!bypass)}
            aria-pressed={bypass}
          >
            <i />
          </button>
          <span className={styles.miniLabel}>{bypass ? 'BYPASSED' : 'ACTIVE'}</span>
        </Card>

        <Card
          name="Segmented"
          blurb="Exclusive options in a row — oscillator shapes, filter modes. Maps 1:1 onto AudioParameterChoice."
          imports={`<ParamSegmented paramId="shape" options={…} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.segmented}>
            {['SINE', 'SAW', 'SQR'].map((option, i) => (
              <button
                type="button"
                key={option}
                className={i === shape ? styles.segOn : ''}
                onClick={() => setShape(i)}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        <Card
          name="Select"
          blurb="The dropdown — its menu renders in the overlay layer, positioned under the trigger via onLayout, click-away closes."
          imports={`<ParamSelect paramId="mode" options={…} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.selectWrap}>
            <button type="button" className={styles.select} onClick={() => setMenuOpen(!menuOpen)}>
              <span>{dropdownOptions[mode]}</span>
              <em>{menuOpen ? '▲' : '▼'}</em>
            </button>
            {menuOpen ? (
              <div className={styles.selectMenu}>
                {dropdownOptions.map((option, i) => (
                  <button
                    type="button"
                    key={option}
                    className={i === mode ? styles.selOn : ''}
                    onClick={() => {
                      setMode(i)
                      setMenuOpen(false)
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card
          name="XYPad"
          blurb="Two values from one drag — cutoff/resonance, pan/depth. ParamXYPad opens both host gestures together."
          imports={`<ParamXYPad paramX="cutoff" paramY="res" />`}
          docs="/docs/components#controls"
        >
          <XYDemo xy={xy} onChange={setXy} />
        </Card>

        <Card
          name="Button"
          blurb="solid / outline / ghost, three sizes, hover and active states baked in natively."
          imports={`<Button label="APPLY" onClick={…} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.rowGap}>
            <button type="button" className={styles.btnSolid} onClick={() => setClicks(clicks + 1)}>
              APPLY{clicks > 0 ? ` ·${clicks}` : ''}
            </button>
            <button type="button" className={styles.btnOutline} onClick={() => setClicks(0)}>
              RESET
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setModalOpen(true)}>
              ABOUT
            </button>
          </div>
        </Card>

        <Card
          name="NumberBox"
          blurb="The draggable number — BPM, milliseconds, semitones. Drag vertically, wheel to step, double-click to reset."
          imports={`<NumberBox value={bpm} min={40} max={240} />`}
          docs="/docs/components#controls"
        >
          <NumberBoxDemo value={bpm} onChange={setBpm} />
        </Card>

        <Card
          name="Checkbox"
          blurb="Settings-panel rows. ParamCheckbox binds a bool parameter, checked = value ≥ 0.5."
          imports={`<ParamCheckbox paramId="oversample" />`}
          docs="/docs/components#controls"
        >
          <div className={styles.checkStack}>
            <button type="button" className={styles.checkRow} onClick={() => setOversample(!oversample)}>
              <i className={oversample ? styles.checkOn : ''}>{oversample ? '✓' : ''}</i>
              <span>Oversample</span>
            </button>
            <button type="button" className={styles.checkRow} onClick={() => setDither(!dither)}>
              <i className={dither ? styles.checkOn : ''}>{dither ? '✓' : ''}</i>
              <span>Dither output</span>
            </button>
          </div>
        </Card>

        <Card
          name="RadioGroup"
          blurb="Vertical exclusive options with dots — the settings-panel sibling of Segmented. Maps onto choice parameters."
          imports={`<ParamRadioGroup paramId="os" options={…} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.checkStack}>
            {['OFF', '2X', '4X'].map((option, i) => (
              <button type="button" key={option} className={styles.checkRow} onClick={() => setOsMode(i)}>
                <u className={i === osMode ? styles.radioOn : ''} />
                <span>{option}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card
          name="ProgressBar"
          blurb="Determinate progress — downloads, renders, analysis passes. Optional percent readout."
          imports={`<ProgressBar value={ratio} showPercent />`}
          docs="/docs/components#controls"
        >
          <div className={styles.progressDemo}>
            <div className={styles.progressTrack}>
              <i style={{ width: `${progress * 100}%` }} />
            </div>
            <span className={styles.miniLabel}>{Math.round(progress * 100)}%</span>
          </div>
        </Card>

        <Card
          name="Spinner"
          blurb="Indeterminate loading — a 100° arc chasing its own tail, painted with the same native arc keys as the knobs."
          imports={`<Spinner size={28} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.spinner} aria-label="Loading" />
        </Card>

        <Card
          name="Button · sizes &amp; states"
          blurb="Three sizes and a disabled state — same Button, one prop each."
          imports={`<Button label="GO" size="lg" disabled={busy} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.rowGap}>
            <button type="button" className={`${styles.btnSolid} ${styles.btnSm}`} onClick={() => {}}>
              SM
            </button>
            <button type="button" className={styles.btnSolid} onClick={() => {}}>
              MD
            </button>
            <button type="button" className={`${styles.btnSolid} ${styles.btnLg}`} onClick={() => {}}>
              LG
            </button>
            <button type="button" className={`${styles.btnSolid} ${styles.btnDisabled}`} disabled>
              DISABLED
            </button>
          </div>
        </Card>

        <Card
          name="Meter"
          blurb="Hot zone above the threshold, peak-hold line that holds then falls. Feed it levels from a native event."
          imports={`<Meter value={level} label="OUT" />`}
          docs="/docs/components#controls"
        >
          <div className={styles.meterDemo}>
            <div className={styles.meterTrack}>
              <i
                style={{
                  height: `${Math.min(meterLevel, 0.85) * 100}%`,
                }}
              />
              {meterLevel > 0.85 ? (
                <u style={{ bottom: '85%', height: `${(meterLevel - 0.85) * 100}%` }} />
              ) : null}
              <b style={{ bottom: `calc(${clamp01(peakRef.current.peak) * 100}% - 1px)` }} />
            </div>
            <span className={styles.miniLabel}>OUT</span>
          </div>
        </Card>

        <Card
          name="Bars"
          blurb="Bottom-anchored bar visualizer with a hot zone — spectrum analyzers, band meters. One bar per array entry."
          imports={`<Bars values={spectrum} />`}
          docs="/docs/components#controls"
        >
          <div className={styles.barsDemo}>
            {bars.map((v, i) => (
              <i
                key={i}
                style={{ height: `${v * 100}%`, background: v >= 0.85 ? '#ff4545' : RED }}
              />
            ))}
          </div>
        </Card>

        <Card
          name="Waveform"
          blurb="Centre-mirrored bars. Pair with useRollingBuffer to turn any live value into scrolling history."
          imports={`<Waveform values={useRollingBuffer(level)} />`}
          docs="/docs/hooks#audio"
        >
          <div className={styles.waveDemo}>
            <span />
            {wave.map((v, i) => (
              <i key={i} style={{ height: `${Math.max(2, Math.abs(v) * 100)}%` }} />
            ))}
          </div>
        </Card>

        <Card
          name="TextInput"
          blurb="A real chrome-stripped juce::TextEditor — caret, selection, IME — positioned by Yoga, painted chrome by VSReacT."
          imports={`<TextInput placeholder="Paste a link…" />`}
          docs="/docs/components#textinput"
        >
          <input
            className={styles.input}
            placeholder="Paste a link…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Card>

        <Card
          name="Tooltip"
          blurb="Wrap any child; the tip shows below it after a hover dwell, via the overlay layer."
          imports={`<Tooltip label="Resets to 0 dB">…</Tooltip>`}
          docs="/docs/components#controls"
        >
          <span className={styles.tipAnchor} tabIndex={0}>
            HOVER ME
            <span className={styles.tip}>Resets to 0 dB</span>
          </span>
        </Card>

        <Card
          name="Modal"
          blurb="Centered dialog over a click-away backdrop. Panel clicks are swallowed; the backdrop closes."
          imports={`<Modal open onClose={…} title="ABOUT">…</Modal>`}
          docs="/docs/components#controls"
        >
          <button type="button" className={styles.btnOutline} onClick={() => setModalOpen(true)}>
            OPEN MODAL
          </button>
        </Card>

        <Card
          name="GenericEditor"
          wide
          blurb="One knob per APVTS parameter with a live value label and name under each — render(<GenericEditor/>) is a complete plugin UI, before you've written a single component."
          imports={`render(<GenericEditor />)   // that's the whole editor`}
          docs="/docs/parameters#generic"
        >
          <div className={styles.rowGap}>
            {(
              [
                ['GAIN', gain, setGain, dbText(gain), false],
                ['PAN', pan, setPan, panText(pan), true],
                ['MIX', mix, setMix, pct(mix), false],
                ['LEVEL', level, setLevel, pct(level), false],
              ] as Array<[string, number, (v: number) => void, string, boolean]>
            ).map(([name, value, set, valueText, bipolar]) => (
              <div key={name} className={styles.kv}>
                <DemoKnob
                  value={value}
                  bipolar={bipolar}
                  defaultValue={bipolar ? 0.5 : 0.7}
                  onChange={set}
                  size={62}
                />
                <b>{valueText}</b>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className={styles.footer}>
        <p>
          Everything above ships in one package — hooks, styling, parameters included.
        </p>
        <div className={styles.footerRow}>
          <code>bun add @vsreact/core</code>
          <Link href="/docs/installation">INSTALL →</Link>
        </div>
      </section>

      {modalOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setModalOpen(false)} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>ABOUT</h3>
            <p>
              This dialog is the web twin of <code>&lt;Modal&gt;</code> — in a plugin it
              renders through the overlay layer, painted natively.
            </p>
            <button type="button" className={styles.btnSolid} onClick={() => setModalOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function NumberBoxDemo({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clampBpm = (v: number) => Math.min(240, Math.max(40, Math.round(v)))
  const drag = useDrag((_dx, dy) => onChange(clampBpm(value - dy / 4)))

  return (
    <div className={styles.knobGroup}>
      <div
        className={styles.numBox}
        {...drag}
        onDoubleClick={() => onChange(120)}
        onWheel={(e) => onChange(clampBpm(value - Math.sign(e.deltaY)))}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={40}
        aria-valuemax={240}
        tabIndex={0}
      >
        {value} BPM
      </div>
      <span className={styles.miniLabel}>TEMPO</span>
    </div>
  )
}

function XYDemo({
  xy,
  onChange,
}: {
  xy: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
}) {
  const drag = useDrag((dx, dy) =>
    onChange({ x: clamp01(xy.x + dx / 150), y: clamp01(xy.y - dy / 110) }),
  )

  return (
    <div className={styles.xy} {...drag} onDoubleClick={() => onChange({ x: 0.5, y: 0.5 })}>
      <i style={{ top: `calc(${(1 - xy.y) * 100}% - 0.5px)` }} />
      <u style={{ left: `calc(${xy.x * 100}% - 0.5px)` }} />
      <b style={{ left: `calc(${xy.x * 100}% - 7px)`, top: `calc(${(1 - xy.y) * 100}% - 7px)` }} />
    </div>
  )
}
