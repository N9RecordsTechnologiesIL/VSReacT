'use client'

// THE COMPONENT LIBRARY — every SDK control family, live, in six
// aesthetics. Each variant strip is ONE component with one shared value:
// drag any skin and they all move. In your DAW the same geometry is
// painted by juce::Graphics; colors come from props and theme tokens.

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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const THEMES: Array<[key: string, label: string]> = [
  ['inst', 'INSTRUMENT'],
  ['metal', 'METAL'],
  ['std', 'STANDARD'],
  ['plast', 'PLASTIC'],
  ['vint', 'VINTAGE'],
  ['neon', 'NEON'],
]

const CATS: Array<[id: string, label: string]> = [
  ['macro', 'Macro & pads'],
  ['knobs', 'Knobs'],
  ['sliders', 'Sliders & faders'],
  ['switches', 'Switches'],
  ['choices', 'Choices'],
  ['fields', 'Fields & inputs'],
  ['buttons', 'Buttons'],
  ['visualizers', 'Meters & visualizers'],
  ['feedback', 'Feedback'],
  ['overlays', 'Overlays & editors'],
]

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

function arcPath(value: number): string {
  const start = (-135 * Math.PI) / 180
  const end = ((-135 + 270 * clamp01(value)) * Math.PI) / 180
  const r = 40
  const large = 270 * clamp01(value) > 180 ? 1 : 0
  return `M ${50 + r * Math.sin(start)} ${50 - r * Math.cos(start)} A ${r} ${r} 0 ${large} 1 ${50 + r * Math.sin(end)} ${50 - r * Math.cos(end)}`
}

/* ── theme-agnostic twins (skins come from the tile's CSS vars) ─────── */

function KnobTwin({
  value,
  onChange,
  size = 74,
  defaultValue = 0.7,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
  defaultValue?: number
}) {
  const drag = useDrag((_dx, dy) => onChange(clamp01(value - dy * 0.006)))
  const angle = -135 + 270 * clamp01(value)

  return (
    <div
      className={styles.knob}
      style={{ width: size, height: size }}
      {...drag}
      onDoubleClick={() => onChange(defaultValue)}
      onWheel={(e) => onChange(clamp01(value - Math.sign(e.deltaY) * 0.04))}
      role="slider"
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={arcPath(1)} className={styles.arcTrack} />
        <path d={arcPath(value)} className={styles.arcValue} />
      </svg>
      <i style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
    </div>
  )
}

function HWKnobTwin({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const drag = useDrag((_dx, dy) => onChange(clamp01(value - dy * 0.006)))
  const angle = -135 + 270 * clamp01(value)

  return (
    <div
      className={styles.hwKnob}
      {...drag}
      onDoubleClick={() => onChange(0.66)}
      onWheel={(e) => onChange(clamp01(value - Math.sign(e.deltaY) * 0.04))}
      role="slider"
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={arcPath(1)} className={styles.hwTicks} />
      </svg>
      <i />
      <u style={{ transform: `rotate(${angle}deg)` }} />
    </div>
  )
}

function SliderTwin({
  value,
  onChange,
  vertical,
  length = 130,
}: {
  value: number
  onChange: (v: number) => void
  vertical?: boolean
  length?: number
}) {
  const drag = useDrag((dx, dy) => onChange(clamp01(value + (vertical ? -dy : dx) / length)))

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
            ? { bottom: `calc(${value * 100}% - 7px)` }
            : { left: `calc(${value * 100}% - 7px)` }
        }
      />
    </div>
  )
}

function CrossfaderTwin({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const TRAVEL = 170 - 24 - 6
  const drag = useDrag((dx) => onChange(clamp01(value + dx / TRAVEL)))

  return (
    <div className={styles.xfade} {...drag} onDoubleClick={() => onChange(0.5)}>
      <span>DRY</span>
      <b style={{ left: 3 + value * TRAVEL }}>
        <i />
        <i />
      </b>
      <span className={styles.xfadeEnd}>WET</span>
    </div>
  )
}

function ToggleTwin({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.toggleWrap}>
      <em className={on ? '' : styles.sideOn}>OFF</em>
      <button
        type="button"
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <i />
      </button>
      <em className={on ? styles.sideOn : ''}>ON</em>
    </div>
  )
}

function CheckboxTwin({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.checkStack}>
      <button type="button" className={styles.checkRow} onClick={() => onChange(!on)}>
        <i className={on ? styles.checkOn : ''}>{on ? '✓' : ''}</i>
        <span>Oversample</span>
      </button>
      <button type="button" className={styles.checkRow} onClick={() => onChange(!on)}>
        <i className={on ? '' : styles.checkOn}>{on ? '' : '✓'}</i>
        <span>Dither</span>
      </button>
    </div>
  )
}

function RadioTwin({ index, onChange }: { index: number; onChange: (i: number) => void }) {
  return (
    <div className={styles.checkStack}>
      {['OFF', '2X', '4X'].map((option, i) => (
        <button type="button" key={option} className={styles.checkRow} onClick={() => onChange(i)}>
          <u className={i === index ? styles.radioOn : ''} />
          <span>{option}</span>
        </button>
      ))}
    </div>
  )
}

function SegmentedTwin({ index, onChange }: { index: number; onChange: (i: number) => void }) {
  return (
    <div className={styles.segmented}>
      {['SIN', 'SAW', 'SQR'].map((option, i) => (
        <button
          type="button"
          key={option}
          className={i === index ? styles.segOn : ''}
          onClick={() => onChange(i)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function SelectTwin({ index, onChange }: { index: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false)
  const options = ['CLEAN', 'TAPE', 'TUBE', 'FUZZ']

  return (
    <div className={styles.selectWrap}>
      <button type="button" className={styles.select} onClick={() => setOpen(!open)}>
        <span>{options[index]}</span>
        <em>{open ? '▲' : '▼'}</em>
      </button>
      {open ? (
        <div className={styles.selectMenu}>
          {options.map((option, i) => (
            <button
              type="button"
              key={option}
              className={i === index ? styles.selOn : ''}
              onClick={() => {
                onChange(i)
                setOpen(false)
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function XYTwin({
  xy,
  onChange,
}: {
  xy: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
}) {
  const drag = useDrag((dx, dy) =>
    onChange({ x: clamp01(xy.x + dx / 110), y: clamp01(xy.y - dy / 84) }),
  )

  return (
    <div className={styles.xy} {...drag} onDoubleClick={() => onChange({ x: 0.5, y: 0.5 })}>
      <i style={{ top: `calc(${(1 - xy.y) * 100}% - 0.5px)` }} />
      <u style={{ left: `calc(${xy.x * 100}% - 0.5px)` }} />
      <b style={{ left: `calc(${xy.x * 100}% - 6px)`, top: `calc(${(1 - xy.y) * 100}% - 6px)` }} />
    </div>
  )
}

function ButtonTwin({ onClick }: { onClick: () => void }) {
  return (
    <div className={styles.btnStack}>
      <button type="button" className={styles.btnSolid} onClick={onClick}>
        APPLY
      </button>
      <button type="button" className={styles.btnOutline} onClick={onClick}>
        RESET
      </button>
    </div>
  )
}

function NumberBoxTwin({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clampBpm = (v: number) => Math.min(240, Math.max(40, Math.round(v)))
  const drag = useDrag((_dx, dy) => onChange(clampBpm(value - dy / 4)))

  return (
    <div
      className={styles.numBox}
      {...drag}
      onDoubleClick={() => onChange(120)}
      onWheel={(e) => onChange(clampBpm(value - Math.sign(e.deltaY)))}
      role="spinbutton"
      aria-valuenow={value}
      tabIndex={0}
    >
      {value} BPM
    </div>
  )
}

function InputTwin() {
  const [text, setText] = useState('')
  return (
    <input
      className={styles.input}
      placeholder="Preset name…"
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  )
}

function MeterTwin({ level, tick }: { level: number; tick: number }) {
  const peak = useRef({ value: 0, held: 0 })
  if (level >= peak.current.value) peak.current = { value: level, held: tick }
  else if (tick - peak.current.held > 30)
    peak.current.value = Math.max(level, peak.current.value - 0.012)

  return (
    <div className={styles.meterTrack}>
      <i style={{ height: `${Math.min(level, 0.85) * 100}%` }} />
      {level > 0.85 ? <u style={{ bottom: '85%', height: `${(level - 0.85) * 100}%` }} /> : null}
      <b style={{ bottom: `calc(${clamp01(peak.current.value) * 100}% - 1px)` }} />
    </div>
  )
}

function BarsTwin({ values }: { values: number[] }) {
  return (
    <div className={styles.barsDemo}>
      {values.map((v, i) => (
        <i key={i} className={v >= 0.85 ? styles.hot : ''} style={{ height: `${v * 100}%` }} />
      ))}
    </div>
  )
}

function WaveTwin({ values }: { values: number[] }) {
  return (
    <div className={styles.waveDemo}>
      <span />
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(2, Math.abs(v) * 100)}%` }} />
      ))}
    </div>
  )
}

function ProgressTwin({ value }: { value: number }) {
  return (
    <div className={styles.progressDemo}>
      <div className={styles.progressTrack}>
        <i style={{ width: `${value * 100}%` }} />
      </div>
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}

function OrbTwin({ level }: { level: number }) {
  return (
    <div className={styles.orb} style={{ ['--orbLevel' as never]: level }}>
      <span />
      <span />
      <b />
    </div>
  )
}

function MacroPadDemo({
  value,
  onChange,
  tick,
}: {
  value: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
  tick: number
}) {
  const SIZE = 240
  const drag = useDrag((dx, dy) =>
    onChange({ x: clamp01(value.x + dx / SIZE), y: clamp01(value.y - dy / SIZE) }),
  )

  const rings = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 9
    const spread = 0.3 + 0.7 * Math.pow(t, 1.6 - value.x * 1.2)
    const breathe = 1 + 0.02 * Math.sin(tick / 18 + i * 0.9)
    const size = Math.min(SIZE - 2, SIZE * spread * breathe)
    const opacity = clamp01(
      (0.12 + 0.5 * value.y) * (1.15 - t) * (0.8 + 0.2 * Math.sin(tick / 27 + i)),
    )
    return { size, opacity }
  })

  return (
    <div
      className={styles.macro}
      style={{ width: SIZE, height: SIZE }}
      {...drag}
      onDoubleClick={() => onChange({ x: 0.5, y: 0.5 })}
      role="slider"
      aria-label="Macro pad"
      aria-valuenow={Math.round(value.x * 100)}
      tabIndex={0}
    >
      {rings.map((ring, i) => (
        <i
          key={i}
          style={{
            width: ring.size,
            height: ring.size,
            left: (SIZE - ring.size) / 2,
            top: (SIZE - ring.size) / 2,
            opacity: ring.opacity,
          }}
        />
      ))}
      <b style={{ left: `calc(${value.x * 100}% - 6px)`, top: `calc(${(1 - value.y) * 100}% - 6px)` }} />
      <span className={styles.macroLabelY}>DEEP FX</span>
      <span className={styles.macroLabelX}>GRANULATION</span>
    </div>
  )
}

/* ── layout scaffolding ─────────────────────────────────────────────── */

function Variants({ children }: { children: ReactNode }) {
  return <div className={styles.variantRow}>{children}</div>
}

function Tile({ theme, label, children }: { theme: string; label: string; children: ReactNode }) {
  return (
    <div className={`${styles.tile} ${styles[`t_${theme}`]}`}>
      <span className={styles.tileLabel}>{label}</span>
      <div className={styles.tilePreview}>{children}</div>
    </div>
  )
}

function AllThemes({ render }: { render: (theme: string) => ReactNode }) {
  return (
    <Variants>
      {THEMES.map(([key, label]) => (
        <Tile key={key} theme={key} label={label}>
          {render(key)}
        </Tile>
      ))}
    </Variants>
  )
}

function Family({
  id,
  title,
  blurb,
  imports,
  docs,
  children,
}: {
  id?: string
  title: string
  blurb: string
  imports: string
  docs: string
  children: ReactNode
}) {
  return (
    <article id={id} className={styles.family}>
      <div className={styles.familyHead}>
        <h2>{title}</h2>
        <p>{blurb}</p>
        <div className={styles.familyMeta}>
          <code>{imports}</code>
          <Link href={docs}>DOCS →</Link>
        </div>
      </div>
      {children}
    </article>
  )
}

/* ── the page ───────────────────────────────────────────────────────── */

export default function ComponentsPage() {
  const [gain, setGain] = useState(0.7)
  const [hw, setHw] = useState(0.66)
  const [mix, setMix] = useState(0.6)
  const [level, setLevel] = useState(0.75)
  const [xfade, setXfade] = useState(0.5)
  const [bypass, setBypass] = useState(false)
  const [oversample, setOversample] = useState(true)
  const [osMode, setOsMode] = useState(1)
  const [shape, setShape] = useState(1)
  const [mode, setMode] = useState(1)
  const [xy, setXy] = useState({ x: 0.6, y: 0.4 })
  const [bpm, setBpm] = useState(120)
  const [clicks, setClicks] = useState(0)
  const [macro, setMacro] = useState({ x: 0.62, y: 0.55 })
  const [modalOpen, setModalOpen] = useState(false)

  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf = 0
    let t = 0
    const loop = () => {
      t += 1
      if (t % 3 === 0) setTick(t)
      raf = requestAnimationFrame(loop)
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const meterLevel =
    0.55 + 0.4 * Math.abs(Math.sin(tick / 40)) * (0.6 + 0.4 * Math.sin(tick / 9))
  const bars = Array.from({ length: 14 }, (_, i) =>
    clamp01(0.25 + 0.7 * Math.abs(Math.sin(tick / 25 + i * 0.55)) * Math.abs(Math.sin(tick / 60 + i * 0.21))),
  )
  const wave = Array.from({ length: 26 }, (_, i) =>
    Math.sin((tick - i * 3) / 14) * Math.abs(Math.sin((tick - i * 3) / 47)),
  )
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
          Every control. Six worlds. <span>Live.</span>
        </h1>
        <p>
          Each strip below is <strong>one component</strong> with one shared value — drag any
          skin and they all move. Instrument, metal, standard, plastic, vintage, neon: same
          API, different props and theme tokens. In your DAW, <code>juce::Graphics</code>{' '}
          paints the same geometry natively.
        </p>
      </section>

      <div className={styles.shell}>
        <nav className={styles.side} aria-label="Component categories">
          <span className={styles.sideHead}>CATEGORIES</span>
          {CATS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.content}>
          {/* ── MACRO & PADS ─────────────────────────────────────────── */}
          <section id="macro" className={styles.cat}>
            <h3 className={styles.catTitle}>MACRO &amp; PADS</h3>

            <Family
              title="MacroPad"
              blurb="The centerpiece — a circular 2D pad whose rings breathe with the values. One drag, two parameters."
              imports={`<ParamMacroPad paramX="granulation" paramY="deepFx" />`}
              docs="/docs/components#controls"
            >
              <div className={styles.showcase}>
                <MacroPadDemo value={macro} onChange={setMacro} tick={tick} />
              </div>
            </Family>

            <Family
              title="XYPad"
              blurb="Two values from one drag — cutoff/resonance, pan/depth. Double-click recenters."
              imports={`<ParamXYPad paramX="cutoff" paramY="res" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <XYTwin xy={xy} onChange={setXy} />} />
            </Family>
          </section>

          {/* ── KNOBS ────────────────────────────────────────────────── */}
          <section id="knobs" className={styles.cat}>
            <h3 className={styles.catTitle}>KNOBS</h3>

            <Family
              title="Knob"
              blurb="The arc knob — drag, wheel, double-click reset; bipolar mode for pan-style params."
              imports={`<ParamKnob paramId="gain" trackColor valueColor />`}
              docs="/docs/parameters#controls"
            >
              <AllThemes render={() => <KnobTwin value={gain} onChange={setGain} />} />
            </Family>

            <Family
              title="HardwareKnob"
              blurb="The skeuomorphic cap with a pointer riding the rim over a faint tick track."
              imports={`<ParamHardwareKnob paramId="drive" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <HWKnobTwin value={hw} onChange={setHw} />} />
            </Family>
          </section>

          {/* ── SLIDERS & FADERS ─────────────────────────────────────── */}
          <section id="sliders" className={styles.cat}>
            <h3 className={styles.catTitle}>SLIDERS &amp; FADERS</h3>

            <Family
              title="Slider"
              blurb="Horizontal track — drag, wheel, double-click recenters."
              imports={`<ParamSlider paramId="mix" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <SliderTwin value={mix} onChange={setMix} />} />
            </Family>

            <Family
              title="Fader"
              blurb="The vertical variant — drag up for more, fill rises from the bottom; barThumb for the flat hardware thumb."
              imports={`<ParamSlider paramId="level" vertical barThumb />`}
              docs="/docs/components#controls"
            >
              <AllThemes
                render={() => <SliderTwin value={level} onChange={setLevel} vertical length={96} />}
              />
            </Family>

            <Family
              title="Crossfader"
              blurb="The DRY/WET strip with a grippy rectangular handle."
              imports={`<ParamCrossfader paramId="mix" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <CrossfaderTwin value={xfade} onChange={setXfade} />} />
            </Family>
          </section>

          {/* ── SWITCHES ─────────────────────────────────────────────── */}
          <section id="switches" className={styles.cat}>
            <h3 className={styles.catTitle}>SWITCHES</h3>

            <Family
              title="Toggle"
              blurb="Spring-loaded thumb with hardware OFF/ON side captions."
              imports={`<ParamToggle paramId="bypass" offLabel="OFF" onLabel="ON" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <ToggleTwin on={bypass} onChange={setBypass} />} />
            </Family>

            <Family
              title="Checkbox"
              blurb="Settings-panel rows; ParamCheckbox binds bool parameters."
              imports={`<ParamCheckbox paramId="oversample" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <CheckboxTwin on={oversample} onChange={setOversample} />} />
            </Family>

            <Family
              title="RadioGroup"
              blurb="Vertical exclusive options with dots — the settings-panel sibling of Segmented."
              imports={`<ParamRadioGroup paramId="os" options={…} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <RadioTwin index={osMode} onChange={setOsMode} />} />
            </Family>
          </section>

          {/* ── CHOICES ──────────────────────────────────────────────── */}
          <section id="choices" className={styles.cat}>
            <h3 className={styles.catTitle}>CHOICES</h3>

            <Family
              title="Segmented"
              blurb="Exclusive options in a row — oscillator shapes, filter modes."
              imports={`<ParamSegmented paramId="shape" options={…} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <SegmentedTwin index={shape} onChange={setShape} />} />
            </Family>

            <Family
              title="Select"
              blurb="The dropdown — menu in the overlay layer, positioned via onLayout, click-away closes."
              imports={`<ParamSelect paramId="mode" options={…} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <SelectTwin index={mode} onChange={setMode} />} />
            </Family>
          </section>

          {/* ── FIELDS & INPUTS ──────────────────────────────────────── */}
          <section id="fields" className={styles.cat}>
            <h3 className={styles.catTitle}>FIELDS &amp; INPUTS</h3>

            <Family
              title="NumberBox"
              blurb="The draggable number — BPM, ms, semitones. Drag, wheel-step, double-click reset."
              imports={`<NumberBox value={bpm} min={40} max={240} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <NumberBoxTwin value={bpm} onChange={setBpm} />} />
            </Family>

            <Family
              title="TextInput"
              blurb="A real chrome-stripped juce::TextEditor — caret, selection, IME — with painted chrome."
              imports={`<TextInput placeholder="Preset name…" />`}
              docs="/docs/components#textinput"
            >
              <AllThemes render={() => <InputTwin />} />
            </Family>
          </section>

          {/* ── BUTTONS ──────────────────────────────────────────────── */}
          <section id="buttons" className={styles.cat}>
            <h3 className={styles.catTitle}>BUTTONS</h3>

            <Family
              title="Button"
              blurb={`Solid + outline variants (ghost too), three sizes, hover/active baked in. Pressed ${clicks} times across all six worlds.`}
              imports={`<Button label="APPLY" variant="solid|outline|ghost" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <ButtonTwin onClick={() => setClicks((c) => c + 1)} />} />
            </Family>
          </section>

          {/* ── METERS & VISUALIZERS ─────────────────────────────────── */}
          <section id="visualizers" className={styles.cat}>
            <h3 className={styles.catTitle}>METERS &amp; VISUALIZERS</h3>

            <Family
              title="Meter"
              blurb="Hot zone above the threshold, peak-hold line that holds then falls."
              imports={`<Meter value={level} label="OUT" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <MeterTwin level={meterLevel} tick={tick} />} />
            </Family>

            <Family
              title="Bars"
              blurb="Bottom-anchored bars with a hot zone — spectrum analyzers, band meters."
              imports={`<Bars values={spectrum} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <BarsTwin values={bars} />} />
            </Family>

            <Family
              title="Waveform"
              blurb="Centre-mirrored bars — pair with useRollingBuffer for scrolling history."
              imports={`<Waveform values={useRollingBuffer(level)} />`}
              docs="/docs/hooks#audio"
            >
              <AllThemes render={() => <WaveTwin values={wave} />} />
            </Family>

            <Family
              title="PulseOrb"
              blurb="A value-reactive orb — echo rings emit faster and brighter as the level rises."
              imports={`<PulseOrb value={level} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <OrbTwin level={meterLevel} />} />
            </Family>
          </section>

          {/* ── FEEDBACK ─────────────────────────────────────────────── */}
          <section id="feedback" className={styles.cat}>
            <h3 className={styles.catTitle}>FEEDBACK</h3>

            <Family
              title="ProgressBar"
              blurb="Determinate progress with optional percent — downloads, renders, analysis."
              imports={`<ProgressBar value={ratio} showPercent />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <ProgressTwin value={progress} />} />
            </Family>

            <Family
              title="Spinner"
              blurb="Indeterminate loading — an arc chasing its own tail on the native arc keys."
              imports={`<Spinner size={28} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={() => <div className={styles.spinner} aria-label="Loading" />} />
            </Family>
          </section>

          {/* ── OVERLAYS & EDITORS ───────────────────────────────────── */}
          <section id="overlays" className={styles.cat}>
            <h3 className={styles.catTitle}>OVERLAYS &amp; EDITORS</h3>

            <Family
              title="Tooltip"
              blurb="Wrap any child; the tip shows below after a hover dwell, via the overlay layer."
              imports={`<Tooltip label="Resets to 0 dB">…</Tooltip>`}
              docs="/docs/components#controls"
            >
              <div className={styles.showcase}>
                <span className={styles.tipAnchor} tabIndex={0}>
                  HOVER ME
                  <span className={styles.tip}>Resets to 0 dB</span>
                </span>
              </div>
            </Family>

            <Family
              title="Modal"
              blurb="Centered dialog over a click-away backdrop; panel clicks are swallowed."
              imports={`<Modal open onClose={…} title="ABOUT">…</Modal>`}
              docs="/docs/components#controls"
            >
              <div className={styles.showcase}>
                <button type="button" className={styles.btnOutline} onClick={() => setModalOpen(true)}>
                  OPEN MODAL
                </button>
              </div>
            </Family>

            <Family
              title="GenericEditor"
              blurb="One knob per APVTS parameter with live value labels — render(<GenericEditor/>) is a complete plugin UI."
              imports={`render(<GenericEditor />)   // that's the whole editor`}
              docs="/docs/parameters#generic"
            >
              <div className={styles.showcase}>
                <div className={styles.geRow}>
                  {(
                    [
                      ['GAIN', gain, setGain],
                      ['MIX', mix, setMix],
                      ['LEVEL', level, setLevel],
                    ] as Array<[string, number, (v: number) => void]>
                  ).map(([name, value, set]) => (
                    <div key={name} className={styles.kv}>
                      <KnobTwin value={value} onChange={set} size={58} />
                      <b>{Math.round(value * 100)}%</b>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Family>
          </section>
        </div>
      </div>

      <section className={styles.footer}>
        <p>Every world above ships in one package — colors are props, tokens are yours.</p>
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
              This dialog is the web twin of <code>&lt;Modal&gt;</code> — in a plugin it renders
              through the overlay layer, painted natively.
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
