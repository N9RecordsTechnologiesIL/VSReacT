'use client'

// THE COMPONENT LIBRARY — every SDK control family, live, in eight
// worlds. Each variant strip is ONE component with one shared value:
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
  ['metal', 'STEALTH'],
  ['steel', 'STEEL'],
  ['std', 'STANDARD'],
  ['glass', 'ETHER'],
  ['carbon', 'EMBER'],
  ['neon', 'NEON'],
  ['bp', 'BLUEPRINT'],
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
  ['perform', 'Perform'],
  ['structure', 'Structure'],
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
  theme = 'inst',
  value,
  onChange,
  size = 74,
  defaultValue = 0.7,
}: {
  theme?: string
  value: number
  onChange: (v: number) => void
  size?: number
  defaultValue?: number
}) {
  const drag = useDrag((_dx, dy) => onChange(clamp01(value - dy * 0.006)))
  const angle = -135 + 270 * clamp01(value)
  const wheel = (e: { deltaY: number }) => onChange(clamp01(value - Math.sign(e.deltaY) * 0.04))
  const h = {
    ...drag,
    onDoubleClick: () => onChange(defaultValue),
    onWheel: wheel,
    role: 'slider' as const,
    'aria-valuenow': Math.round(value * 100),
    tabIndex: 0,
  }

  // STANDARD — flat gauge ring with a big numeric readout, no cap at all
  if (theme === 'std') {
    return (
      <div className={styles.knobStd} style={{ width: size, height: size }} {...h}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={arcPath(1)} className={styles.gaugeTrack} />
          <path d={arcPath(value)} className={styles.gaugeVal} />
        </svg>
        <b>{Math.round(value * 100)}</b>
      </div>
    )
  }

  // METAL — machined knurled cap, engraved pointer line, center screw
  if (theme === 'metal') {
    return (
      <div className={styles.knobMetal} style={{ width: size, height: size }} {...h}>
        <i aria-hidden="true" />
        <u style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
        <em aria-hidden="true" />
      </div>
    )
  }

  // GLASS — glossy dome on a wide skirt, wedge pointer
  if (theme === 'glass') {
    return (
      <div className={styles.knobPlast} style={{ width: size, height: size }} {...h}>
        <s aria-hidden="true" />
        <i aria-hidden="true" />
        <u style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
    )
  }

  // CARBON — chicken-head pointer knob over a printed tick scale
  if (theme === 'carbon') {
    return (
      <div className={styles.knobVint} style={{ width: size + 16, height: size + 16 }} {...h}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {Array.from({ length: 11 }, (_, i) => {
            const a = ((-135 + 27 * i) * Math.PI) / 180
            return (
              <line
                key={i}
                x1={50 + 41 * Math.sin(a)}
                y1={50 - 41 * Math.cos(a)}
                x2={50 + 47 * Math.sin(a)}
                y2={50 - 47 * Math.cos(a)}
              />
            )
          })}
        </svg>
        <i style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
    )
  }

  // NEON — discrete LED segment ring with a glowing readout, no moving parts
  if (theme === 'neon') {
    const SEG = 20
    return (
      <div className={styles.knobNeon} style={{ width: size, height: size }} {...h}>
        {Array.from({ length: SEG }, (_, i) => {
          const a = -135 + (270 * i) / (SEG - 1)
          return (
            <i
              key={i}
              className={i / (SEG - 1) <= clamp01(value) ? styles.segLit : ''}
              style={{ transform: `rotate(${a}deg) translateY(-${size / 2 - 4}px)` }}
              aria-hidden="true"
            />
          )
        })}
        <b>{Math.round(value * 100)}</b>
      </div>
    )
  }

  // STEEL — spun stainless: printed tick ring, turned face, hairline pointer
  if (theme === 'steel') {
    return (
      <div className={styles.knobSteel} style={{ width: size + 16, height: size + 16 }} {...h}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {Array.from({ length: 13 }, (_, i) => {
            const a = ((-135 + 22.5 * i) * Math.PI) / 180
            return (
              <line
                key={i}
                x1={50 + 43 * Math.sin(a)}
                y1={50 - 43 * Math.cos(a)}
                x2={50 + 48 * Math.sin(a)}
                y2={50 - 48 * Math.cos(a)}
              />
            )
          })}
        </svg>
        <i aria-hidden="true" />
        <u style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
    )
  }

  // BLUEPRINT — a drafted dial: dashed construction circle, value arc,
  // radius pointer, center point, mono readout
  if (theme === 'bp') {
    return (
      <div className={styles.knobBp} style={{ width: size + 16, height: size + 16 }} {...h}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47" className={styles.bpDash} />
          <circle cx="50" cy="50" r="33" className={styles.bpSolid} />
          <path d={arcPath(value)} className={styles.bpArc} />
        </svg>
        <u style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
        <b>{Math.round(value * 100)}</b>
      </div>
    )
  }

  // INSTRUMENT — the arc knob with the pointer cap
  return (
    <div className={styles.knob} style={{ width: size, height: size }} {...h}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={arcPath(1)} className={styles.arcTrack} />
        <path d={arcPath(value)} className={styles.arcValue} />
      </svg>
      <i style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
    </div>
  )
}

function HWKnobTwin({
  theme = 'inst',
  value,
  onChange,
}: {
  theme?: string
  value: number
  onChange: (v: number) => void
}) {
  const drag = useDrag((_dx, dy) => onChange(clamp01(value - dy * 0.006)))
  const angle = -135 + 270 * clamp01(value)
  const h = {
    ...drag,
    onDoubleClick: () => onChange(0.66),
    onWheel: (e: { deltaY: number }) =>
      onChange(clamp01(value - Math.sign(e.deltaY) * 0.04)),
    role: 'slider' as const,
    'aria-valuenow': Math.round(value * 100),
    tabIndex: 0,
  }

  // Structural spread: bezel ring (metal), knurled rim (steel), dot
  // indicator (std), ribbed cap + wedge (glass), fluted cap (carbon),
  // glow slit + halo (neon), drafted circles (bp).
  return (
    <div className={`${styles.hwKnob} ${styles[`hw_${theme}`] ?? ''}`} {...h}>
      {theme === 'metal' || theme === 'steel' ? <s aria-hidden="true" /> : null}
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={arcPath(1)} className={styles.hwTicks} />
      </svg>
      <i />
      {theme === 'std' ? (
        <span className={styles.hwDotArm} style={{ transform: `rotate(${angle}deg)` }}>
          <b />
        </span>
      ) : (
        <u style={{ transform: `rotate(${angle}deg)` }} />
      )}
    </div>
  )
}

function SliderTwin({
  theme = 'inst',
  value,
  onChange,
  vertical,
  length = 130,
}: {
  theme?: string
  value: number
  onChange: (v: number) => void
  vertical?: boolean
  length?: number
}) {
  const drag = useDrag((dx, dy) => onChange(clamp01(value + (vertical ? -dy : dx) / length)))
  const h = {
    ...drag,
    onDoubleClick: () => onChange(0.5),
    onWheel: (e: { deltaY: number }) =>
      onChange(clamp01(value - Math.sign(e.deltaY) * 0.04)),
  }

  // NEON — a discrete LED ladder; no thumb, no track line, just lit cells
  if (theme === 'neon') {
    const CELLS = 14
    return (
      <div
        className={`${styles.ladder} ${vertical ? styles.ladderV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={(i + 0.5) / CELLS <= clamp01(value) ? styles.cellLit : ''} />
        ))}
      </div>
    )
  }

  // CARBON — console fader: slot + printed tick scale + cream cap handle
  if (theme === 'carbon') {
    return (
      <div
        className={`${styles.fadeVint} ${vertical ? styles.fadeVintV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <i aria-hidden="true" />
        <b
          style={
            vertical
              ? { bottom: `calc(${value * 100}% - 11px)` }
              : { left: `calc(${value * 100}% - 11px)` }
          }
        >
          <u />
        </b>
      </div>
    )
  }

  // STEEL — console fader: thin black slot, printed side ticks, ribbed
  // black cap with one white index line (no colored fill, like the desk)
  if (theme === 'steel') {
    return (
      <div
        className={`${styles.fadeSteel} ${vertical ? styles.fadeSteelV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <em>+12</em>
        <em>0</em>
        <em>-12</em>
        <b style={vertical ? { bottom: `calc(${value * 100}% - 19px)` } : { left: `calc(${value * 100}% - 19px)` }}>
          <i aria-hidden="true" />
        </b>
      </div>
    )
  }

  // BLUEPRINT — a dimension line: dashed rail, measured solid run,
  // open square thumb, mono callout
  if (theme === 'bp') {
    return (
      <div
        className={`${styles.fadeBp} ${vertical ? styles.fadeBpV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <u
          aria-hidden="true"
          style={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
        />
        <b style={vertical ? { bottom: `calc(${value * 100}% - 7px)` } : { left: `calc(${value * 100}% - 7px)` }} />
        <em>{Math.round(value * 100)}</em>
      </div>
    )
  }

  // METAL — recessed slot, red value line, matte cap with an index line
  if (theme === 'metal') {
    return (
      <div
        className={`${styles.fadeMetal} ${vertical ? styles.fadeMetalV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <u
          className={styles.fadeMetalFill}
          aria-hidden="true"
          style={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
        />
        <b
          style={
            vertical
              ? { bottom: `calc(${value * 100}% - 13px)` }
              : { left: `calc(${value * 100}% - 13px)` }
          }
        >
          <i />
          <i />
          <i />
        </b>
      </div>
    )
  }

  // GLASS — chunky inset channel with a glossy rectangular thumb
  if (theme === 'glass') {
    return (
      <div
        className={`${styles.fadePlast} ${vertical ? styles.fadePlastV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <i
          className={styles.fadePlastFill}
          style={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
        />
        <b
          style={
            vertical
              ? { bottom: `calc(${value * 100}% - 9px)` }
              : { left: `calc(${value * 100}% - 9px)` }
          }
        />
      </div>
    )
  }

  // STANDARD — the web slider: thick rounded track, bordered round thumb
  if (theme === 'std') {
    return (
      <div
        className={`${styles.fadeStd} ${vertical ? styles.fadeStdV : ''}`}
        style={vertical ? { height: length } : { width: length }}
        {...h}
      >
        <i
          className={styles.fadeStdFill}
          style={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
        />
        <b
          style={
            vertical
              ? { bottom: `calc(${value * 100}% - 9px)` }
              : { left: `calc(${value * 100}% - 9px)` }
          }
        />
      </div>
    )
  }

  // INSTRUMENT — hairline track + glowing dot
  return (
    <div
      className={vertical ? styles.sliderV : styles.sliderH}
      style={vertical ? { height: length } : { width: length }}
      {...h}
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

function CrossfaderTwin({
  theme = 'inst',
  value,
  onChange,
}: {
  theme?: string
  value: number
  onChange: (v: number) => void
}) {
  const TRAVEL = 170 - 24 - 6
  const drag = useDrag((dx) => onChange(clamp01(value + dx / TRAVEL)))
  const h = { ...drag, onDoubleClick: () => onChange(0.5) }

  // NEON — center meridian, glow handle, LED end dots that dim/brighten
  if (theme === 'neon') {
    return (
      <div className={`${styles.xfade} ${styles.xfNeon}`} {...h}>
        <em style={{ opacity: 0.25 + (1 - value) * 0.75 }} />
        <i aria-hidden="true" />
        <b style={{ left: 3 + value * TRAVEL }} />
        <em className={styles.xfNeonR} style={{ opacity: 0.25 + value * 0.75 }} />
      </div>
    )
  }

  // CARBON — screened panel labels + tick ruler + bakelite handle
  if (theme === 'carbon') {
    return (
      <div className={`${styles.xfade} ${styles.xfVint}`} {...h}>
        <span>DRY</span>
        <u aria-hidden="true" />
        <b style={{ left: 3 + value * TRAVEL }} />
        <span className={styles.xfadeEnd}>WET</span>
      </div>
    )
  }

  // STEEL — console strip: black slot, printed tick scale above, ribbed
  // cap with the white index line
  if (theme === 'steel') {
    return (
      <div className={`${styles.xfade} ${styles.xfSteel}`} {...h}>
        <span>DRY</span>
        <u aria-hidden="true" />
        <b style={{ left: 3 + value * TRAVEL }}>
          <i aria-hidden="true" />
        </b>
        <span className={styles.xfadeEnd}>WET</span>
      </div>
    )
  }

  // BLUEPRINT — a measurement: double-arrow dimension line, square thumb,
  // A/B station labels
  if (theme === 'bp') {
    return (
      <div className={`${styles.xfade} ${styles.xfBp}`} {...h}>
        <span>A</span>
        <u aria-hidden="true" />
        <b style={{ left: 3 + value * TRAVEL }} />
        <span className={styles.xfadeEnd}>B</span>
      </div>
    )
  }

  // METAL — engraved ruler ticks + machined handle with a center scribe
  if (theme === 'metal') {
    return (
      <div className={`${styles.xfade} ${styles.xfMetal}`} {...h}>
        <u aria-hidden="true" />
        <b style={{ left: 3 + value * TRAVEL }}>
          <s />
        </b>
      </div>
    )
  }

  // GLASS — A/B rocker-look: two halves fill toward the handle
  if (theme === 'glass') {
    return (
      <div className={`${styles.xfade} ${styles.xfPlast}`} {...h}>
        <i className={styles.xfPlastA} style={{ width: `${value * 100}%` }} />
        <b style={{ left: 3 + value * TRAVEL }} />
        <span>A</span>
        <span className={styles.xfadeEnd}>B</span>
      </div>
    )
  }

  // STANDARD — minimal strip with a thin center notch + round thumb
  if (theme === 'std') {
    return (
      <div className={`${styles.xfade} ${styles.xfStd}`} {...h}>
        <i aria-hidden="true" />
        <b style={{ left: 6 + value * (TRAVEL - 6) }} />
      </div>
    )
  }

  // INSTRUMENT — the grippy handle strip
  return (
    <div className={styles.xfade} {...h}>
      <span>DRY</span>
      <b style={{ left: 3 + value * TRAVEL }}>
        <i />
        <i />
      </b>
      <span className={styles.xfadeEnd}>WET</span>
    </div>
  )
}

function ToggleTwin({
  theme = 'inst',
  on,
  onChange,
}: {
  theme?: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  // STEEL — rack bypass button: machined bevel frame, black well, square
  // amber lamp that ignites when engaged (MIXED RACK reference)
  if (theme === 'steel') {
    return (
      <div className={styles.steelTogWrap}>
        <em className={on ? styles.steelTogSide : ''}>BYPASS</em>
        <button
          type="button"
          className={styles.steelTog}
          onClick={() => onChange(!on)}
          aria-pressed={on}
        >
          <s aria-hidden="true" />
          <i aria-hidden="true" />
        </button>
      </div>
    )
  }

  // BLUEPRINT — a schematic SPST switch: two contacts, the lever line
  // closes the circuit when on
  if (theme === 'bp') {
    return (
      <button
        type="button"
        className={styles.bpSwitch}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <s aria-hidden="true" />
        <i style={{ transform: `rotate(${on ? 0 : -38}deg)` }} aria-hidden="true" />
        <u aria-hidden="true" />
        <span>{on ? 'CLOSED' : 'OPEN'}</span>
      </button>
    )
  }

  // METAL — a real bat-lever toggle on a hex-nut collar; the lever tilts
  if (theme === 'metal') {
    return (
      <button
        type="button"
        className={styles.batToggle}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <s aria-hidden="true" />
        <i style={{ transform: `rotate(${on ? 24 : -24}deg)` }}>
          <b />
        </i>
      </button>
    )
  }

  // GLASS — a rocker switch: the pressed half sinks, I/O printed on it
  if (theme === 'glass') {
    return (
      <button
        type="button"
        className={styles.rocker}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <b className={!on ? styles.rockerDown : ''}>O</b>
        <b className={on ? styles.rockerDown : ''}>I</b>
      </button>
    )
  }

  // CARBON — a slide lever on a screwed panel plate, UP/DOWN
  if (theme === 'carbon') {
    return (
      <button
        type="button"
        className={styles.plateToggle}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <em className={styles.screwTL} />
        <em className={styles.screwBR} />
        <i style={{ top: on ? '10%' : '55%' }} />
        <span>{on ? 'ON' : 'OFF'}</span>
      </button>
    )
  }

  // STANDARD — labels INSIDE the track, thumb reveals the active word
  if (theme === 'std') {
    return (
      <button
        type="button"
        className={`${styles.wordToggle} ${on ? styles.wordToggleOn : ''}`}
        onClick={() => onChange(!on)}
        aria-pressed={on}
      >
        <span>ON</span>
        <span>OFF</span>
        <i />
      </button>
    )
  }

  // NEON — pill + status LED that ignites above it
  if (theme === 'neon') {
    return (
      <div className={styles.ledToggleWrap}>
        <u className={on ? styles.ledLit : ''} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
          onClick={() => onChange(!on)}
          aria-pressed={on}
        >
          <i />
        </button>
      </div>
    )
  }

  // INSTRUMENT — pill with hardware side captions
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

function CheckboxTwin({
  theme = 'inst',
  on,
  onChange,
}: {
  theme?: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  // CARBON — illuminated jewel lamps instead of boxes
  if (theme === 'carbon') {
    return (
      <div className={styles.checkStack}>
        {(
          [
            ['Oversample', on],
            ['Dither', !on],
          ] as Array<[string, boolean]>
        ).map(([label, lit]) => (
          <button key={label} type="button" className={styles.jewelRow} onClick={() => onChange(!on)}>
            <i className={lit ? styles.jewelLit : ''} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // NEON — terminal brackets: [ x ] / [   ]
  if (theme === 'neon') {
    return (
      <div className={styles.checkStack}>
        {(
          [
            ['OVERSAMPLE', on],
            ['DITHER', !on],
          ] as Array<[string, boolean]>
        ).map(([label, lit]) => (
          <button key={label} type="button" className={styles.brkRow} onClick={() => onChange(!on)}>
            <i>[{lit ? 'x' : ' '}]</i>
            <span>{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // STEEL — engraved rows with real red pilot LEDs in drilled bezels
  if (theme === 'steel') {
    return (
      <div className={styles.checkStack}>
        {(
          [
            ['OVERSAMPLE', on],
            ['DITHER', !on],
          ] as Array<[string, boolean]>
        ).map(([label, lit]) => (
          <button
            key={label}
            type="button"
            className={styles.steelLedRow}
            onClick={() => onChange(!on)}
          >
            <i className={lit ? styles.steelLedOn : ''} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // METAL — latching push-buttons with an inset LED window
  if (theme === 'metal') {
    return (
      <div className={styles.checkStack}>
        {(
          [
            ['OVERSAMPLE', on],
            ['DITHER', !on],
          ] as Array<[string, boolean]>
        ).map(([label, lit]) => (
          <button
            key={label}
            type="button"
            className={`${styles.latchBtn} ${lit ? styles.latchDown : ''}`}
            onClick={() => onChange(!on)}
          >
            <i className={lit ? styles.latchLedOn : ''} />
            {label}
          </button>
        ))}
      </div>
    )
  }

  // PLASTIC / STANDARD / INSTRUMENT — box rows (beveled vs flat vs ink)
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

function RadioTwin({
  theme = 'inst',
  index,
  onChange,
}: {
  theme?: string
  index: number
  onChange: (i: number) => void
}) {
  const options = ['OFF', '2X', '4X']

  // CARBON — a latching piano-key pushbutton bank (the pressed key stays down)
  if (theme === 'carbon') {
    return (
      <div className={styles.pianoBank}>
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={`${styles.pianoKey} ${i === index ? styles.pianoDown : ''}`}
            onClick={() => onChange(i)}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  // NEON — LED strip selector: dots + connecting rail, active glows
  if (theme === 'neon') {
    return (
      <div className={styles.ledRail}>
        <i aria-hidden="true" />
        {options.map((option, i) => (
          <button key={option} type="button" onClick={() => onChange(i)}>
            <u className={i === index ? styles.railLit : ''} />
            <span>{option}</span>
          </button>
        ))}
      </div>
    )
  }

  // STEEL — a 3-position slide switch, engraved labels beside the slot
  if (theme === 'steel') {
    return (
      <button
        type="button"
        className={styles.slide3}
        onClick={() => onChange((index + 1) % options.length)}
        aria-label={`Mode: ${options[index]}`}
      >
        <s aria-hidden="true">
          <i style={{ top: `${6 + index * 30}%` }} />
        </s>
        <span>
          {options.map((option, i) => (
            <em key={option} className={i === index ? styles.slide3On : ''}>
              {option}
            </em>
          ))}
        </span>
      </button>
    )
  }

  // METAL — a rotary selector: small knob whose pointer clicks between
  // engraved positions
  if (theme === 'metal') {
    const angle = -50 + (100 * index) / (options.length - 1)
    return (
      <button
        type="button"
        className={styles.rotarySel}
        onClick={() => onChange((index + 1) % options.length)}
        aria-label={`Mode: ${options[index]}`}
      >
        <span className={styles.rotL}>{options[0]}</span>
        <i>
          <u style={{ transform: `rotate(${angle}deg)` }} />
        </i>
        <span className={styles.rotR}>{options[2]}</span>
        <em>{options[index]}</em>
      </button>
    )
  }

  // PLASTIC / STANDARD / INSTRUMENT — dot rows (beveled vs flat vs ink)
  return (
    <div className={styles.checkStack}>
      {options.map((option, i) => (
        <button type="button" key={option} className={styles.checkRow} onClick={() => onChange(i)}>
          <u className={i === index ? styles.radioOn : ''} />
          <span>{option}</span>
        </button>
      ))}
    </div>
  )
}

function SegmentedTwin({
  theme = 'inst',
  index,
  onChange,
}: {
  theme?: string
  index: number
  onChange: (i: number) => void
}) {
  const options = ['SIN', 'SAW', 'SQR']

  // STANDARD — text tabs with a sliding underline indicator
  if (theme === 'std') {
    return (
      <div className={styles.tabs}>
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={i === index ? styles.tabOn : ''}
            onClick={() => onChange(i)}
          >
            {option}
          </button>
        ))}
        <i style={{ left: `${(100 / options.length) * index}%` }} aria-hidden="true" />
      </div>
    )
  }

  // NEON — bare glowing glyph row, active one ignites with an underglow bar
  if (theme === 'neon') {
    return (
      <div className={styles.glowSeg}>
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={i === index ? styles.glowSegOn : ''}
            onClick={() => onChange(i)}
          >
            {option}
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    )
  }

  // CARBON — round typewriter keys, the active key sits pressed
  if (theme === 'carbon') {
    return (
      <div className={styles.typeKeys}>
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={i === index ? styles.typeKeyDown : ''}
            onClick={() => onChange(i)}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  // METAL — one machined block, engraved separators, active window lights
  if (theme === 'metal') {
    return (
      <div className={styles.machSeg}>
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={i === index ? styles.machSegOn : ''}
            onClick={() => onChange(i)}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  // PLASTIC / INSTRUMENT — the pill strip (beveled vs flat via theme vars)
  return (
    <div className={styles.segmented}>
      {options.map((option, i) => (
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

function SelectTwin({
  theme = 'inst',
  index,
  onChange,
}: {
  theme?: string
  index: number
  onChange: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const options = ['CLEAN', 'TAPE', 'TUBE', 'FUZZ']

  // CARBON — no dropdown at all: a program wheel you click to advance,
  // value shown in a punched window
  if (theme === 'carbon') {
    return (
      <button
        type="button"
        className={styles.progWheel}
        onClick={() => onChange((index + 1) % options.length)}
        aria-label={`Program: ${options[index]}`}
      >
        <i aria-hidden="true" />
        <b>{options[index]}</b>
        <span>PROGRAM ▸</span>
      </button>
    )
  }

  // METAL — stepper window: machined [−]/[+] arrows flank an inset window
  if (theme === 'metal') {
    return (
      <div className={styles.stepSel}>
        <button
          type="button"
          onClick={() => onChange((index + options.length - 1) % options.length)}
          aria-label="Previous"
        >
          ◂
        </button>
        <b>{options[index]}</b>
        <button type="button" onClick={() => onChange((index + 1) % options.length)} aria-label="Next">
          ▸
        </button>
      </div>
    )
  }

  // NEON / STANDARD / PLASTIC / INSTRUMENT — dropdown with themed chrome
  return (
    <div className={`${styles.selectWrap} ${styles[`sel_${theme}`] ?? ''}`}>
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
  theme = 'inst',
  xy,
  onChange,
}: {
  theme?: string
  xy: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
}) {
  const drag = useDrag((dx, dy) =>
    onChange({ x: clamp01(xy.x + dx / 110), y: clamp01(xy.y - dy / 84) }),
  )
  const h = { ...drag, onDoubleClick: () => onChange({ x: 0.5, y: 0.5 }) }
  const left = `calc(${xy.x * 100}% - 6px)`
  const top = `calc(${(1 - xy.y) * 100}% - 6px)`

  // METAL — engineering grid + live coordinate readout, square reticle
  if (theme === 'metal') {
    return (
      <div className={`${styles.xy} ${styles.xyMetal}`} {...h}>
        <b style={{ left, top }} />
        <em>{`${Math.round(xy.x * 100)},${Math.round(xy.y * 100)}`}</em>
      </div>
    )
  }

  // STEEL — a smoked scope window recessed into the plate, silver reticle
  if (theme === 'steel') {
    return (
      <div className={`${styles.xy} ${styles.xySteel}`} {...h}>
        <i style={{ top: `calc(${(1 - xy.y) * 100}% - 0.5px)` }} />
        <u style={{ left: `calc(${xy.x * 100}% - 0.5px)` }} />
        <b style={{ left, top }} />
      </div>
    )
  }

  // CARBON — chart-recorder paper: ruled grid, two pen needles, no dot
  if (theme === 'carbon') {
    return (
      <div className={`${styles.xy} ${styles.xyVint}`} {...h}>
        <i style={{ top: `calc(${(1 - xy.y) * 100}% - 1px)` }} />
        <u style={{ left: `calc(${xy.x * 100}% - 1px)` }} />
      </div>
    )
  }

  // NEON — dark glass with a comet cursor (glow trail), no crosshair
  if (theme === 'neon') {
    return (
      <div className={`${styles.xy} ${styles.xyNeon}`} {...h}>
        <b style={{ left, top }} />
      </div>
    )
  }

  // GLASS — glossy trackpad with a big dome cursor
  if (theme === 'glass') {
    return (
      <div className={`${styles.xy} ${styles.xyPlast}`} {...h}>
        <b style={{ left: `calc(${xy.x * 100}% - 10px)`, top: `calc(${(1 - xy.y) * 100}% - 10px)` }} />
      </div>
    )
  }

  // STANDARD — clean axes + dot
  if (theme === 'std') {
    return (
      <div className={`${styles.xy} ${styles.xyStd}`} {...h}>
        <i style={{ top: '50%' }} />
        <u style={{ left: '50%' }} />
        <b style={{ left, top }} />
      </div>
    )
  }

  // INSTRUMENT — crosshair follows the cursor
  return (
    <div className={styles.xy} {...h}>
      <i style={{ top: `calc(${(1 - xy.y) * 100}% - 0.5px)` }} />
      <u style={{ left: `calc(${xy.x * 100}% - 0.5px)` }} />
      <b style={{ left, top }} />
    </div>
  )
}

function ButtonTwin({ theme = 'inst', onClick }: { theme?: string; onClick: () => void }) {
  // STEEL — machined silver caps that physically depress, engraved legends
  if (theme === 'steel') {
    return (
      <div className={styles.btnRowGap}>
        <button type="button" className={styles.steelBtn} onClick={onClick}>
          APPLY
        </button>
        <button type="button" className={`${styles.steelBtn} ${styles.steelBtnDark}`} onClick={onClick}>
          RESET
        </button>
      </div>
    )
  }

  // METAL — a momentary machined button with a status LED window
  if (theme === 'metal') {
    return (
      <div className={styles.btnStack}>
        <button type="button" className={styles.machBtn} onClick={onClick}>
          <i />
          APPLY
        </button>
        <button type="button" className={styles.machBtnRound} onClick={onClick} aria-label="Reset" />
      </div>
    )
  }

  // CARBON — round typewriter action keys
  if (theme === 'carbon') {
    return (
      <div className={styles.btnRowGap}>
        <button type="button" className={styles.typeAction} onClick={onClick}>
          GO
        </button>
        <button type="button" className={`${styles.typeAction} ${styles.typeActionAlt}`} onClick={onClick}>
          RST
        </button>
      </div>
    )
  }

  // NEON — bracket buttons: [ APPLY ] with corner ticks that ignite
  if (theme === 'neon') {
    return (
      <div className={styles.btnStack}>
        <button type="button" className={styles.brkBtn} onClick={onClick}>
          APPLY
        </button>
        <button type="button" className={`${styles.brkBtn} ${styles.brkBtnDim}`} onClick={onClick}>
          RESET
        </button>
      </div>
    )
  }

  // GLASS — 2000s raised buttons that physically depress
  if (theme === 'glass') {
    return (
      <div className={styles.btnStack}>
        <button type="button" className={styles.xpBtn} onClick={onClick}>
          APPLY
        </button>
        <button type="button" className={`${styles.xpBtn} ${styles.xpBtnGrey}`} onClick={onClick}>
          RESET
        </button>
      </div>
    )
  }

  // STANDARD / INSTRUMENT — solid + outline pair
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

function NumberBoxTwin({
  theme = 'inst',
  value,
  onChange,
}: {
  theme?: string
  value: number
  onChange: (v: number) => void
}) {
  const clampBpm = (v: number) => Math.min(240, Math.max(40, Math.round(v)))
  const drag = useDrag((_dx, dy) => onChange(clampBpm(value - dy / 4)))
  const h = {
    ...drag,
    onDoubleClick: () => onChange(120),
    onWheel: (e: { deltaY: number }) => onChange(clampBpm(value - Math.sign(e.deltaY))),
    role: 'spinbutton' as const,
    'aria-valuenow': value,
    tabIndex: 0,
  }

  // STANDARD — a stepper field with real −/+ buttons
  if (theme === 'std') {
    return (
      <div className={styles.stepperBox}>
        <button type="button" onClick={() => onChange(clampBpm(value - 1))} aria-label="Decrease">
          −
        </button>
        <b {...h}>{value}</b>
        <button type="button" onClick={() => onChange(clampBpm(value + 1))} aria-label="Increase">
          +
        </button>
      </div>
    )
  }

  // CARBON — a mechanical flip counter: each digit in its own drum cell
  if (theme === 'carbon') {
    return (
      <div className={styles.flipCounter} {...h}>
        {String(value).padStart(3, '0').split('').map((digit, i) => (
          <b key={i}>{digit}</b>
        ))}
        <span>BPM</span>
      </div>
    )
  }

  // NEON — seven-seg style glowing readout with a ghost "888" behind
  if (theme === 'neon') {
    return (
      <div className={styles.sevenSeg} {...h}>
        <s aria-hidden="true">888</s>
        <b>{value}</b>
        <span>BPM</span>
      </div>
    )
  }

  // GLASS — an LCD pocket-gear window
  if (theme === 'glass') {
    return (
      <div className={styles.lcdBox} {...h}>
        {value} <span>BPM</span>
      </div>
    )
  }

  // BLUEPRINT — a dimension callout: boxed value with leader ticks
  if (theme === 'bp') {
    return (
      <div className={`${styles.numBox} ${styles.numBp}`} {...h}>
        {value} BPM
      </div>
    )
  }

  // STEEL / METAL / INSTRUMENT — inset machined vs ink chip
  return (
    <div
      className={`${styles.numBox} ${theme === 'metal' ? styles.numMetal : ''} ${theme === 'steel' ? styles.numSteel : ''}`}
      {...h}
    >
      {value} BPM
    </div>
  )
}

function InputTwin({ theme = 'inst' }: { theme?: string }) {
  const [text, setText] = useState('')

  // NEON — terminal prompt with a block caret hint
  if (theme === 'neon') {
    return (
      <div className={styles.termInput}>
        <b>&gt;</b>
        <input
          placeholder="preset_name"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <i aria-hidden="true" />
      </div>
    )
  }

  // CARBON — a typewriter underline field on paper
  if (theme === 'carbon') {
    return (
      <div className={styles.typedInput}>
        <label>NAME:</label>
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    )
  }

  // STANDARD — floating-label material field
  if (theme === 'std') {
    return (
      <div className={`${styles.matInput} ${text ? styles.matFilled : ''}`}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder=" " />
        <label>Preset name</label>
      </div>
    )
  }

  // METAL / PLASTIC / INSTRUMENT — themed chrome box
  return (
    <input
      className={`${styles.input} ${styles[`in_${theme}`] ?? ''}`}
      placeholder="Preset name…"
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  )
}

function MeterTwin({ theme = 'inst', level, tick }: { theme?: string; level: number; tick: number }) {
  const peak = useRef({ value: 0, held: 0 })
  if (level >= peak.current.value) peak.current = { value: level, held: tick }
  else if (tick - peak.current.held > 30)
    peak.current.value = Math.max(level, peak.current.value - 0.012)

  // CARBON — an analog VU: cream dial, printed scale arc, swinging needle
  if (theme === 'carbon') {
    const needle = -46 + clamp01(level) * 92
    return (
      <div className={styles.vu}>
        <svg viewBox="0 0 100 60" aria-hidden="true">
          <path d="M 14 50 A 42 42 0 0 1 86 50" className={styles.vuArc} />
          <path d="M 71 24 A 42 42 0 0 1 86 50" className={styles.vuArcHot} />
          {Array.from({ length: 7 }, (_, i) => {
            const a = ((-46 + (92 * i) / 6) * Math.PI) / 180
            return (
              <line
                key={i}
                x1={50 + 36 * Math.sin(a)}
                y1={52 - 36 * Math.cos(a)}
                x2={50 + 42 * Math.sin(a)}
                y2={52 - 42 * Math.cos(a)}
              />
            )
          })}
        </svg>
        <i style={{ transform: `rotate(${needle}deg)` }} />
        <span>VU</span>
      </div>
    )
  }

  // NEON — a discrete LED stack, top cells run hot
  if (theme === 'neon') {
    const CELLS = 12
    return (
      <div className={styles.ledStack}>
        {Array.from({ length: CELLS }, (_, i) => {
          const lit = (i + 0.5) / CELLS <= clamp01(level)
          const hot = i >= CELLS - 3
          return <i key={i} className={lit ? (hot ? styles.stackHot : styles.stackLit) : ''} />
        })}
      </div>
    )
  }

  // GLASS — chunky block segments in an inset well
  if (theme === 'glass') {
    const CELLS = 8
    return (
      <div className={styles.blockMeter}>
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={(i + 0.5) / CELLS <= clamp01(level) ? styles.blockLit : ''} />
        ))}
      </div>
    )
  }

  // STEEL — an LED bridge: real lamp cells in a recessed smoked window,
  // green run / amber shoulder / red clip
  if (theme === 'steel') {
    const CELLS = 12
    return (
      <div className={styles.ledBridge}>
        {Array.from({ length: CELLS }, (_, i) => {
          const lit = (i + 0.5) / CELLS <= clamp01(level)
          const zone = i >= CELLS - 2 ? styles.bridgeRed : i >= CELLS - 5 ? styles.bridgeAmber : ''
          return <i key={i} className={`${lit ? styles.bridgeLit : ''} ${zone}`} />
        })}
      </div>
    )
  }

  // BLUEPRINT — a drafted bar: outlined column, section-hatched fill,
  // dimension ticks
  if (theme === 'bp') {
    return (
      <div className={styles.bpMeter}>
        <u aria-hidden="true" />
        <div>
          <i style={{ height: `${clamp01(level) * 100}%` }} />
        </div>
      </div>
    )
  }

  // METAL — machined slot with a ruler scale beside it
  if (theme === 'metal') {
    return (
      <div className={styles.slotMeter}>
        <u aria-hidden="true" />
        <div>
          <i style={{ height: `${clamp01(level) * 100}%` }} />
        </div>
      </div>
    )
  }

  // STANDARD — thin bar with side ticks
  if (theme === 'std') {
    return (
      <div className={styles.stdMeter}>
        <div>
          <i style={{ height: `${clamp01(level) * 100}%` }} />
        </div>
        <u aria-hidden="true" />
      </div>
    )
  }

  // INSTRUMENT — bar + hot zone + peak-hold line
  return (
    <div className={styles.meterTrack}>
      <i style={{ height: `${Math.min(level, 0.85) * 100}%` }} />
      {level > 0.85 ? <u style={{ bottom: '85%', height: `${(level - 0.85) * 100}%` }} /> : null}
      <b style={{ bottom: `calc(${clamp01(peak.current.value) * 100}% - 1px)` }} />
    </div>
  )
}

function BarsTwin({ theme = 'inst', values }: { theme?: string; values: number[] }) {
  // CARBON — a pen-plotter line chart on ruled paper
  if (theme === 'carbon') {
    const points = values
      .map((v, i) => `${(i / (values.length - 1)) * 100},${60 - clamp01(v) * 52}`)
      .join(' ')
    return (
      <div className={styles.plotter}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points} />
        </svg>
      </div>
    )
  }

  // NEON — bars + a mirrored reflection fading below the baseline
  if (theme === 'neon') {
    return (
      <div className={styles.mirrorBars}>
        <div>
          {values.map((v, i) => (
            <i key={i} style={{ height: `${v * 100}%` }} />
          ))}
        </div>
        <div className={styles.mirror}>
          {values.map((v, i) => (
            <i key={i} style={{ height: `${v * 100}%` }} />
          ))}
        </div>
      </div>
    )
  }

  // METAL / STANDARD / PLASTIC / INSTRUMENT — bar field, themed cells
  return (
    <div className={`${styles.barsDemo} ${styles[`bars_${theme}`] ?? ''}`}>
      {values.map((v, i) => (
        <i key={i} className={v >= 0.85 ? styles.hot : ''} style={{ height: `${v * 100}%` }} />
      ))}
    </div>
  )
}

function WaveTwin({ theme = 'inst', values }: { theme?: string; values: number[] }) {
  // NEON / VINTAGE — a real oscilloscope trace (continuous path), phosphor
  // glow vs pen-on-paper
  if (theme === 'neon' || theme === 'carbon') {
    const path = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * 100} ${30 - v * 24}`)
      .join(' ')
    return (
      <div className={theme === 'neon' ? styles.scopeNeon : styles.scopeVint}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} />
        </svg>
      </div>
    )
  }

  // others — centre-mirrored bars, themed cells
  return (
    <div className={`${styles.waveDemo} ${styles[`wave_${theme}`] ?? ''}`}>
      <span />
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(2, Math.abs(v) * 100)}%` }} />
      ))}
    </div>
  )
}

function ProgressTwin({ theme = 'inst', value }: { theme?: string; value: number }) {
  // GLASS — the XP block bar: discrete green chunks marching across
  if (theme === 'glass') {
    const CELLS = 10
    return (
      <div className={styles.xpProgress}>
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={(i + 0.5) / CELLS <= value ? styles.xpChunk : ''} />
        ))}
      </div>
    )
  }

  // CARBON — a rotating tape-reel with a percent counter card
  if (theme === 'carbon') {
    return (
      <div className={styles.reelProgress}>
        <i style={{ transform: `rotate(${value * 720}deg)` }}>
          <b />
          <b />
          <b />
        </i>
        <span>{Math.round(value * 100)}%</span>
      </div>
    )
  }

  // NEON — a thin scanline bar with a glow head + readout above it
  if (theme === 'neon') {
    return (
      <div className={styles.scanProgress}>
        <em>{`LOADING ${String(Math.round(value * 100)).padStart(3, '0')}%`}</em>
        <div>
          <i style={{ width: `${value * 100}%` }} />
        </div>
      </div>
    )
  }

  // METAL / STANDARD / INSTRUMENT — track bar, themed chrome
  return (
    <div className={styles.progressDemo}>
      <div className={`${styles.progressTrack} ${styles[`prog_${theme}`] ?? ''}`}>
        <i style={{ width: `${value * 100}%` }} />
      </div>
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}

function PianoTwin({ theme = 'inst' }: { theme?: string }) {
  const [note, setNote] = useState<number | null>(null)
  const whites = [48, 50, 52, 53, 55, 57, 59, 60]
  const blacks: Array<[note: number, whitesLeft: number]> = [
    [49, 1],
    [51, 2],
    [54, 4],
    [56, 5],
    [58, 6],
  ]
  const off = () => setNote(null)

  return (
    <div
      className={`${styles.piano} ${styles[`piano_${theme}`] ?? ''}`}
      onMouseUp={off}
      onMouseLeave={off}
      role="group"
      aria-label="Piano keyboard"
    >
      {whites.map((n) => (
        <b
          key={n}
          className={note === n ? styles.pianoOn : ''}
          onMouseDown={() => setNote(n)}
          onMouseEnter={(e) => {
            if (e.buttons === 1) setNote(n)
          }}
        />
      ))}
      {blacks.map(([n, i]) => (
        <s
          key={n}
          style={{ left: i * 26 - 8 }}
          className={note === n ? styles.pianoOn : ''}
          onMouseDown={() => setNote(n)}
          onMouseEnter={(e) => {
            if (e.buttons === 1) setNote(n)
          }}
        />
      ))}
      <em style={{ left: 0 }}>C3</em>
      <em style={{ left: 26 * 7 }}>C4</em>
    </div>
  )
}

function SeqTwin({ theme = 'inst', step }: { theme?: string; step: number }) {
  const [pattern, setPattern] = useState(() => [
    [true, false, false, false, true, false, false, false],
    [false, false, true, false, false, false, true, false],
    [true, false, true, true, true, false, true, true],
  ])
  const labels = ['KICK', 'SNR', 'HAT']

  return (
    <div className={`${styles.seq} ${styles[`seq_${theme}`] ?? ''}`}>
      {pattern.map((row, r) => (
        <div key={r} className={styles.seqRow}>
          <em>{labels[r]}</em>
          {row.map((on, s) => (
            <b
              key={s}
              className={[
                on ? styles.seqOn : '',
                s === step ? styles.seqPh : '',
                s % 4 === 0 ? styles.seqDown : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() =>
                setPattern((p) =>
                  p.map((rw, ri) => (ri === r ? rw.map((c, si) => (si === s ? !c : c)) : rw)),
                )
              }
              aria-label={`${labels[r]} step ${s + 1}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function AdsrTwin({ theme = 'inst' }: { theme?: string }) {
  const [env, setEnv] = useState({ a: 0.35, d: 0.45, s: 0.55, r: 0.4 })
  const W = 208
  const H = 84
  const SEG = W * 0.27
  const PAD = 5
  const SPAN = H - PAD * 2

  const level = (x: number) => {
    const ax = env.a * SEG
    const dw = env.d * SEG
    const rx = W - env.r * SEG
    if (x <= ax) return ax === 0 ? 1 : x / ax
    if (x <= ax + dw) return 1 - (1 - env.s) * ((x - ax) / (dw || 1))
    if (x <= rx) return env.s
    return env.r === 0 ? 0 : Math.max(0, env.s * (1 - (x - rx) / (env.r * SEG)))
  }

  const dragA = useDrag((dx) => setEnv((e) => ({ ...e, a: clamp01(e.a + dx / SEG) })))
  const dragDS = useDrag((dx, dy) =>
    setEnv((e) => ({ ...e, d: clamp01(e.d + dx / SEG), s: clamp01(e.s - dy / SPAN) })),
  )
  const dragR = useDrag((dx) => setEnv((e) => ({ ...e, r: clamp01(e.r - dx / SEG) })))

  const dots: Array<[x: number, y: number, drag: ReturnType<typeof useDrag>]> = [
    [env.a * SEG, PAD, dragA],
    [env.a * SEG + env.d * SEG, PAD + (1 - env.s) * SPAN, dragDS],
    [W - env.r * SEG, PAD + (1 - env.s) * SPAN, dragR],
  ]

  return (
    <div className={`${styles.adsr} ${styles[`adsr_${theme}`] ?? ''}`} style={{ width: W, height: H }}>
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={{ height: `${Math.max(2, level(((i + 0.5) / 36) * W) * 92)}%` }}
        />
      ))}
      {dots.map(([x, y, drag], i) => (
        <b key={i} style={{ left: x - 8, top: y - 8 }} {...drag} />
      ))}
    </div>
  )
}

function EqTwin({ theme = 'inst' }: { theme?: string }) {
  const [bands, setBands] = useState([
    { x: 0.22, gain: 4.5, w: 0.14 },
    { x: 0.62, gain: -6, w: 0.09 },
  ])
  const W = 208
  const H = 84
  const RANGE = 12

  const dbAt = (x: number) =>
    bands.reduce((sum, b) => sum + b.gain * Math.exp(-(((x - b.x) / b.w) ** 2)), 0)
  const yOf = (db: number) => (0.5 - Math.max(-RANGE, Math.min(RANGE, db)) / (RANGE * 2)) * (H - 8) + 4

  const drag0 = useDrag((dx, dy) =>
    setBands((bs) =>
      bs.map((b, i) =>
        i === 0
          ? { ...b, x: clamp01(b.x + dx / W), gain: Math.max(-RANGE, Math.min(RANGE, b.gain - (dy / (H - 8)) * RANGE * 2)) }
          : b,
      ),
    ),
  )
  const drag1 = useDrag((dx, dy) =>
    setBands((bs) =>
      bs.map((b, i) =>
        i === 1
          ? { ...b, x: clamp01(b.x + dx / W), gain: Math.max(-RANGE, Math.min(RANGE, b.gain - (dy / (H - 8)) * RANGE * 2)) }
          : b,
      ),
    ),
  )
  const drags = [drag0, drag1]

  return (
    <div className={`${styles.eq} ${styles[`eq_${theme}`] ?? ''}`} style={{ width: W, height: H }}>
      <u />
      {Array.from({ length: 36 }, (_, i) => {
        const db = dbAt((i + 0.5) / 36)
        const h = Math.max(1, (Math.abs(db) / (RANGE * 2)) * (H - 8))
        return (
          <i
            key={i}
            style={{ left: (i / 36) * W + 1, width: W / 36 - 1.5, top: db >= 0 ? H / 2 - h : H / 2, height: h }}
          />
        )
      })}
      {bands.map((b, i) => (
        <b key={i} style={{ left: b.x * W - 8, top: yOf(b.gain) - 8 }} {...drags[i]} />
      ))}
    </div>
  )
}

function RingTwin({ theme = 'inst', level }: { theme?: string; level: number }) {
  const v = clamp01(level)
  const deg = v * 270

  return (
    <div className={`${styles.ring} ${styles[`ring_${theme}`] ?? ''}`}>
      <i
        style={{
          background: `conic-gradient(from 225deg, var(--acc) ${deg}deg, rgba(255,255,255,0.09) ${deg}deg 270deg, transparent 270deg 360deg)`,
        }}
      />
      <em>{Math.round(v * 100)}</em>
    </div>
  )
}

function TabsTwin({ theme = 'inst' }: { theme?: string }) {
  const [tab, setTab] = useState(0)
  const labels = ['MAIN', 'FX', 'MOD']
  const content = ['CUTOFF · RES · DRIVE', 'DELAY · VERB · WIDTH', 'LFO · ENV · KEYS']

  return (
    <div className={`${styles.tabs} ${styles[`tabs_${theme}`] ?? ''}`}>
      <div>
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            className={i === tab ? styles.tabOn : ''}
            onClick={() => setTab(i)}
          >
            {label}
            <i />
          </button>
        ))}
      </div>
      <p>{content[tab]}</p>
    </div>
  )
}

function DiscTwin({ theme = 'inst' }: { theme?: string }) {
  const [open, setOpen] = useState([true, false])
  const rows: Array<[string, string]> = [
    ['ADVANCED', 'OVERSAMPLE · DITHER · PHASE'],
    ['MODULATION', 'RATE · DEPTH · SHAPE'],
  ]

  return (
    <div className={`${styles.disc} ${styles[`disc_${theme}`] ?? ''}`}>
      {rows.map(([title, body], i) => (
        <div key={title}>
          <button
            type="button"
            onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}
          >
            <s>{open[i] ? '▾' : '▸'}</s>
            {title}
          </button>
          {open[i] ? <p>{body}</p> : null}
        </div>
      ))}
    </div>
  )
}

function WheelsTwin({ theme = 'inst' }: { theme?: string }) {
  const [bend, setBend] = useState(0)
  const [bending, setBending] = useState(false)
  const [mod, setMod] = useState(0.62)
  const TRAVEL = 76

  const bendDrag = useDrag((_dx, dy) => setBend((b) => Math.max(-1, Math.min(1, b - dy / (TRAVEL / 2)))))
  const modDrag = useDrag((_dx, dy) => setMod((m) => clamp01(m - dy / TRAVEL)))

  return (
    <div className={`${styles.wheels} ${styles[`wheels_${theme}`] ?? ''}`}>
      <div className={styles.wheel}>
        <div
          {...bendDrag}
          onPointerDown={(e) => {
            setBending(true)
            bendDrag.onPointerDown(e)
          }}
          onPointerUp={(e) => {
            setBending(false)
            setBend(0)
            bendDrag.onPointerUp(e)
          }}
        >
          <u />
          <b
            className={bending ? '' : styles.wheelSnap}
            style={{ top: `calc(${(1 - (bend + 1) / 2) * 100}% - ${(1 - (bend + 1) / 2) * 18}px)` }}
          >
            <i />
          </b>
        </div>
        <em>PITCH</em>
      </div>
      <div className={styles.wheel}>
        <div {...modDrag}>
          <b style={{ top: `calc(${(1 - mod) * 100}% - ${(1 - mod) * 18}px)` }}>
            <i />
          </b>
        </div>
        <em>MOD</em>
      </div>
    </div>
  )
}

function OrbTwin({ theme = 'inst', level, tick }: { theme?: string; level: number; tick: number }) {
  // METAL — a radar scope: machined bezel, rotating sweep, fixed blips
  if (theme === 'metal') {
    return (
      <div className={styles.radar}>
        <i style={{ transform: `rotate(${(tick * 3) % 360}deg)` }} />
        <b style={{ left: '30%', top: '38%' }} />
        <b style={{ left: '64%', top: '58%', opacity: 0.6 }} />
      </div>
    )
  }

  // CARBON — a jewel pilot lamp that breathes with the level
  if (theme === 'carbon') {
    return (
      <div className={styles.pilotLamp}>
        <i style={{ opacity: 0.35 + clamp01(level) * 0.65 }} />
        <span>SIGNAL</span>
      </div>
    )
  }

  // STEEL — a drilled pilot LED under a chrome bezel ring
  if (theme === 'steel') {
    return (
      <div className={styles.steelLamp}>
        <i style={{ opacity: 0.3 + clamp01(level) * 0.7 }} />
        <span>SIG</span>
      </div>
    )
  }

  // STANDARD — a minimal pulsing status dot
  if (theme === 'std') {
    return (
      <div className={styles.statusDot}>
        <i style={{ transform: `scale(${1 + clamp01(level) * 0.5})` }} />
      </div>
    )
  }

  // GLASS — a glossy bubble that inflates with the level
  if (theme === 'glass') {
    return (
      <div className={styles.bubbleOrb}>
        <i style={{ transform: `scale(${0.7 + clamp01(level) * 0.45})` }} />
      </div>
    )
  }

  // NEON / INSTRUMENT — echo rings
  return (
    <div className={styles.orb} style={{ ['--orbLevel' as never]: level }}>
      <span />
      <span />
      <b />
    </div>
  )
}

function MacroPadTwin({
  theme = 'inst',
  value,
  onChange,
  tick,
}: {
  theme?: string
  value: { x: number; y: number }
  onChange: (v: { x: number; y: number }) => void
  tick: number
}) {
  const SIZE = 150
  const drag = useDrag((dx, dy) =>
    onChange({ x: clamp01(value.x + dx / SIZE), y: clamp01(value.y - dy / SIZE) }),
  )
  const h = {
    ...drag,
    onDoubleClick: () => onChange({ x: 0.5, y: 0.5 }),
    role: 'slider' as const,
    'aria-label': 'Macro pad',
    'aria-valuenow': Math.round(value.x * 100),
    tabIndex: 0,
  }
  const cursor = {
    left: `calc(${value.x * 100}% - 6px)`,
    top: `calc(${(1 - value.y) * 100}% - 6px)`,
  }

  // METAL — a radar scope: rotating sweep, range rings, target reticle
  if (theme === 'metal') {
    return (
      <div className={`${styles.macroPad} ${styles.mpRadar}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <i style={{ transform: `rotate(${(tick * 3) % 360}deg)` }} aria-hidden="true" />
        <b style={cursor} />
        <em>{`${Math.round(value.x * 100)}·${Math.round(value.y * 100)}`}</em>
      </div>
    )
  }

  // CARBON — a chart recorder: ruled paper disc, two pen arms crossing
  if (theme === 'carbon') {
    return (
      <div className={`${styles.macroPad} ${styles.mpChart}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <i style={{ top: `calc(${(1 - value.y) * 100}% - 1px)` }} aria-hidden="true" />
        <u style={{ left: `calc(${value.x * 100}% - 1px)` }} aria-hidden="true" />
        <s aria-hidden="true" />
      </div>
    )
  }

  // STEEL — a turntable platter: spun disc, strobe dots on the rim,
  // crosshair reticle + coordinate window
  if (theme === 'steel') {
    return (
      <div className={`${styles.macroPad} ${styles.mpPlatter}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <s style={{ transform: `rotate(${(tick * 1.2) % 360}deg)` }} aria-hidden="true" />
        <b style={cursor} />
        <em>{`${Math.round(value.x * 100)}·${Math.round(value.y * 100)}`}</em>
      </div>
    )
  }

  // BLUEPRINT — a survey plot: dashed range rings, crosshair station lines,
  // plotted point with coordinates
  if (theme === 'bp') {
    return (
      <div className={`${styles.macroPad} ${styles.mpSurvey}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <i style={{ top: `calc(${(1 - value.y) * 100}% - 0.5px)` }} aria-hidden="true" />
        <u style={{ left: `calc(${value.x * 100}% - 0.5px)` }} aria-hidden="true" />
        <b style={cursor} />
        <em>{`x ${value.x.toFixed(2)}  y ${value.y.toFixed(2)}`}</em>
      </div>
    )
  }

  // NEON — a starfield: fixed pseudo-random stars whose glow follows y,
  // comet cursor
  if (theme === 'neon') {
    const stars = Array.from({ length: 26 }, (_, i) => {
      const gx = ((i * 37) % 89) / 89
      const gy = ((i * 53) % 97) / 97
      return { left: `${8 + gx * 84}%`, top: `${8 + gy * 84}%`, o: 0.15 + ((i * 29) % 10) / 14 }
    })
    return (
      <div className={`${styles.macroPad} ${styles.mpStars}`} style={{ width: SIZE, height: SIZE }} {...h}>
        {stars.map((star, i) => (
          <i key={i} style={{ left: star.left, top: star.top, opacity: star.o * (0.4 + value.y) }} />
        ))}
        <b style={cursor} />
      </div>
    )
  }

  // GLASS — a glossy trackpad bubble with a dome cursor
  if (theme === 'glass') {
    return (
      <div className={`${styles.macroPad} ${styles.mpBubble}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <b style={{ left: `calc(${value.x * 100}% - 11px)`, top: `calc(${(1 - value.y) * 100}% - 11px)` }} />
      </div>
    )
  }

  // STANDARD — a clean instrument dial: quadrant lines + dot + twin readouts
  if (theme === 'std') {
    return (
      <div className={`${styles.macroPad} ${styles.mpClean}`} style={{ width: SIZE, height: SIZE }} {...h}>
        <i aria-hidden="true" />
        <u aria-hidden="true" />
        <b style={cursor} />
        <em>{`${Math.round(value.x * 100)}% · ${Math.round(value.y * 100)}%`}</em>
      </div>
    )
  }

  // INSTRUMENT — the breathing concentric rings
  const rings = Array.from({ length: 8 }, (_, i) => {
    const t = (i + 1) / 8
    const spread = 0.3 + 0.7 * Math.pow(t, 1.6 - value.x * 1.2)
    const breathe = 1 + 0.02 * Math.sin(tick / 18 + i * 0.9)
    const size = Math.min(SIZE - 2, SIZE * spread * breathe)
    const opacity = clamp01(
      (0.12 + 0.5 * value.y) * (1.15 - t) * (0.8 + 0.2 * Math.sin(tick / 27 + i)),
    )
    return { size, opacity }
  })

  return (
    <div className={styles.macro} style={{ width: SIZE, height: SIZE }} {...h}>
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
      <b style={cursor} />
    </div>
  )
}

function TooltipTwin({ theme = 'inst' }: { theme?: string }) {
  const tips: Record<string, string> = {
    inst: 'Resets to 0 dB',
    metal: 'CAL: −6 dB PAD',
    steel: 'TRIM ±12 dB',
    std: 'Resets to default',
    glass: 'Hold Shift for fine',
    carbon: 'LAUNCH CONTROL',
    neon: 'reset://0.0dB',
    bp: 'REF: 0 dB DATUM',
  }

  return (
    <span className={`${styles.tipAnchor} ${styles[`tip_${theme}`] ?? ''}`} tabIndex={0}>
      HOVER ME
      <span className={styles.tip}>{tips[theme] ?? tips.inst}</span>
    </span>
  )
}

function GenericEditorTwin({
  theme = 'inst',
  params,
}: {
  theme?: string
  params: Array<[string, number, (v: number) => void]>
}) {
  // STANDARD — a settings form: label · slider · value rows
  if (theme === 'std') {
    return (
      <div className={styles.geForm}>
        {params.map(([name, value, set]) => (
          <div key={name}>
            <label>{name}</label>
            <SliderTwin theme="std" value={value} onChange={set} length={86} />
            <b>{Math.round(value * 100)}%</b>
          </div>
        ))}
      </div>
    )
  }

  // STEEL — a 500-series module: brushed strip, engraved title, spun knobs
  if (theme === 'steel') {
    return (
      <div className={styles.geModule}>
        <b>SAT-500</b>
        {params.map(([name, value, set]) => (
          <div key={name} className={styles.geCell}>
            <KnobTwin theme="steel" value={value} onChange={set} size={36} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    )
  }

  // BLUEPRINT — a title block: ruled rows, dimension sliders, mono values
  if (theme === 'bp') {
    return (
      <div className={styles.geTitleBlock}>
        <b>UNIT-01 / REV C</b>
        {params.map(([name, value, set]) => (
          <div key={name}>
            <label>{name}</label>
            <SliderTwin theme="bp" value={value} onChange={set} length={74} />
            <em>{value.toFixed(2)}</em>
          </div>
        ))}
      </div>
    )
  }

  // METAL — a rack strip: corner screws, engraved labels, machined knobs
  if (theme === 'metal') {
    return (
      <div className={styles.geRack}>
        <em className={styles.rackScrewTL} />
        <em className={styles.rackScrewTR} />
        <em className={styles.rackScrewBL} />
        <em className={styles.rackScrewBR} />
        {params.map(([name, value, set]) => (
          <div key={name} className={styles.geCell}>
            <KnobTwin theme="metal" value={value} onChange={set} size={44} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    )
  }

  // CARBON — a cream radio panel with chicken-head knobs
  if (theme === 'carbon') {
    return (
      <div className={styles.gePanel}>
        {params.map(([name, value, set]) => (
          <div key={name} className={styles.geCell}>
            <KnobTwin theme="carbon" value={value} onChange={set} size={40} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    )
  }

  // NEON — a console row of segment rings with glowing readouts
  if (theme === 'neon') {
    return (
      <div className={styles.geConsole}>
        {params.map(([name, value, set]) => (
          <div key={name} className={styles.geCell}>
            <KnobTwin theme="neon" value={value} onChange={set} size={48} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    )
  }

  // GLASS — chunky beveled tray of dome knobs
  if (theme === 'glass') {
    return (
      <div className={styles.geTray}>
        {params.map(([name, value, set]) => (
          <div key={name} className={styles.geCell}>
            <KnobTwin theme="glass" value={value} onChange={set} size={42} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    )
  }

  // INSTRUMENT — arc knobs with live value labels
  return (
    <div className={styles.geRowTight}>
      {params.map(([name, value, set]) => (
        <div key={name} className={styles.kv}>
          <KnobTwin theme="inst" value={value} onChange={set} size={44} />
          <b>{Math.round(value * 100)}%</b>
          <span>{name}</span>
        </div>
      ))}
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
  const [modalOpen, setModalOpen] = useState<string | null>(null)

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
  const seqStep = Math.floor(tick / 9) % 8

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
          Every control. Eight worlds. <span>Live.</span>
        </h1>
        <p>
          Each strip below is <strong>one component</strong> with one shared value — drag any
          skin and they all move. Instrument, stealth, steel, standard, ether, ember, neon, blueprint: same
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
              blurb="Eight machines for the same two values: breathing rings, a radar sweep, a turntable platter, a clean dial, a particle void, a contour field, a starfield, a survey plot — one drag drives them all."
              imports={`<ParamMacroPad paramX="granulation" paramY="deepFx" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <MacroPadTwin theme={t} value={macro} onChange={setMacro} tick={tick} />} />
            </Family>

            <Family
              title="XYPad"
              blurb="Two values from one drag — cutoff/resonance, pan/depth. Double-click recenters."
              imports={`<ParamXYPad paramX="cutoff" paramY="res" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <XYTwin theme={t} xy={xy} onChange={setXy} />} />
            </Family>
          </section>

          {/* ── KNOBS ────────────────────────────────────────────────── */}
          <section id="knobs" className={styles.cat}>
            <h3 className={styles.catTitle}>KNOBS</h3>

            <Family
              title="Knob"
              blurb="Eight shapes of the same control: arc dial, matte gear cap, spun stainless, flat gauge, hairline gradient ring, tick-scale ember, LED segment ring, drafted dial — one shared value."
              imports={`<ParamKnob paramId="gain" trackColor valueColor />`}
              docs="/docs/parameters#controls"
            >
              <AllThemes render={(t) => <KnobTwin theme={t} value={gain} onChange={setGain} />} />
            </Family>

            <Family
              title="HardwareKnob"
              blurb="The skeuomorphic cap with a pointer riding the rim over a faint tick track."
              imports={`<ParamHardwareKnob paramId="drive" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <HWKnobTwin theme={t} value={hw} onChange={setHw} />} />
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
              <AllThemes render={(t) => <SliderTwin theme={t} value={mix} onChange={setMix} />} />
            </Family>

            <Family
              title="Fader"
              blurb="The vertical variant — drag up for more, fill rises from the bottom; barThumb for the flat hardware thumb."
              imports={`<ParamSlider paramId="level" vertical barThumb />`}
              docs="/docs/components#controls"
            >
              <AllThemes
                render={(t) => (
                  <SliderTwin theme={t} value={level} onChange={setLevel} vertical length={96} />
                )}
              />
            </Family>

            <Family
              title="Crossfader"
              blurb="The DRY/WET strip with a grippy rectangular handle."
              imports={`<ParamCrossfader paramId="mix" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <CrossfaderTwin theme={t} value={xfade} onChange={setXfade} />} />
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
              <AllThemes render={(t) => <ToggleTwin theme={t} on={bypass} onChange={setBypass} />} />
            </Family>

            <Family
              title="Checkbox"
              blurb="Settings-panel rows; ParamCheckbox binds bool parameters."
              imports={`<ParamCheckbox paramId="oversample" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <CheckboxTwin theme={t} on={oversample} onChange={setOversample} />} />
            </Family>

            <Family
              title="RadioGroup"
              blurb="Vertical exclusive options with dots — the settings-panel sibling of Segmented."
              imports={`<ParamRadioGroup paramId="os" options={…} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <RadioTwin theme={t} index={osMode} onChange={setOsMode} />} />
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
              <AllThemes render={(t) => <SegmentedTwin theme={t} index={shape} onChange={setShape} />} />
            </Family>

            <Family
              title="Select"
              blurb="The dropdown — menu in the overlay layer, positioned via onLayout, click-away closes."
              imports={`<ParamSelect paramId="mode" options={…} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <SelectTwin theme={t} index={mode} onChange={setMode} />} />
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
              <AllThemes render={(t) => <NumberBoxTwin theme={t} value={bpm} onChange={setBpm} />} />
            </Family>

            <Family
              title="TextInput"
              blurb="A real chrome-stripped juce::TextEditor — caret, selection, IME — with painted chrome."
              imports={`<TextInput placeholder="Preset name…" />`}
              docs="/docs/components#textinput"
            >
              <AllThemes render={(t) => <InputTwin theme={t} />} />
            </Family>
          </section>

          {/* ── BUTTONS ──────────────────────────────────────────────── */}
          <section id="buttons" className={styles.cat}>
            <h3 className={styles.catTitle}>BUTTONS</h3>

            <Family
              title="Button"
              blurb={`Solid + outline variants (ghost too), three sizes, hover/active baked in. Pressed ${clicks} times across all eight worlds.`}
              imports={`<Button label="APPLY" variant="solid|outline|ghost" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <ButtonTwin theme={t} onClick={() => setClicks((c) => c + 1)} />} />
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
              <AllThemes render={(t) => <MeterTwin theme={t} level={meterLevel} tick={tick} />} />
            </Family>

            <Family
              title="Bars"
              blurb="Bottom-anchored bars with a hot zone — spectrum analyzers, band meters."
              imports={`<Bars values={spectrum} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <BarsTwin theme={t} values={bars} />} />
            </Family>

            <Family
              title="Waveform"
              blurb="Centre-mirrored bars — pair with useRollingBuffer for scrolling history."
              imports={`<Waveform values={useRollingBuffer(level)} />`}
              docs="/docs/hooks#audio"
            >
              <AllThemes render={(t) => <WaveTwin theme={t} values={wave} />} />
            </Family>

            <Family
              title="EQCurve"
              blurb="The real summed biquad response — drag a band node for freq/gain, wheel for Q."
              imports={`<EQCurve bands={bands} onChange={setBand} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <EqTwin theme={t} />} />
            </Family>

            <Family
              title="RingMeter"
              blurb="A circular level meter on the native arc keys — hot zone, optional center readout."
              imports={`<RingMeter value={level} format={formatPercent} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <RingTwin theme={t} level={meterLevel} />} />
            </Family>

            <Family
              title="PulseOrb"
              blurb="A value-reactive orb — echo rings emit faster and brighter as the level rises."
              imports={`<PulseOrb value={level} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <OrbTwin theme={t} level={meterLevel} tick={tick} />} />
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
              <AllThemes render={(t) => <ProgressTwin theme={t} value={progress} />} />
            </Family>

            <Family
              title="Spinner"
              blurb="Indeterminate loading — an arc chasing its own tail on the native arc keys."
              imports={`<Spinner size={28} />`}
              docs="/docs/components#controls"
            >
              <AllThemes
                render={(t) => (
                  <div className={`${styles.spinner} ${styles[`sp_${t}`] ?? ''}`} aria-label="Loading">
                    {t === 'carbon' || t === 'steel' ? <i /> : null}
                  </div>
                )}
              />
            </Family>
          </section>

          {/* ── PERFORM ──────────────────────────────────────────────── */}
          <section id="perform" className={styles.cat}>
            <h3 className={styles.catTitle}>PERFORM</h3>

            <Family
              title="PianoKeyboard"
              blurb="The playable keyboard — press for note-on, drag across keys for glissando, heldNotes paints host MIDI in."
              imports={`<PianoKeyboard octaves={2} onNoteOn={play} onNoteOff={stop} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <PianoTwin theme={t} />} />
            </Family>

            <Family
              title="StepSequencer"
              blurb="The pattern grid — click cells on and off, downbeat tinting, a playhead column the host drives."
              imports={`<StepSequencer pattern={pattern} playhead={step} onToggle={flip} />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <SeqTwin theme={t} step={seqStep} />} />
            </Family>

            <Family
              title="ADSREnvelope"
              blurb="The four-corner envelope editor — drag the attack peak, the decay/sustain corner, and the release corner."
              imports={`<ParamADSREnvelope attackId="a" decayId="d" sustainId="s" releaseId="r" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <AdsrTwin theme={t} />} />
            </Family>

            <Family
              title="PitchBend / ModWheel"
              blurb="The performance wheels — pitch springs back to center on release, mod stays where you leave it."
              imports={`<PitchBend onChange={bend} />  <ParamModWheel paramId="mod" />`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <WheelsTwin theme={t} />} />
            </Family>
          </section>

          {/* ── STRUCTURE ────────────────────────────────────────────── */}
          <section id="structure" className={styles.cat}>
            <h3 className={styles.catTitle}>STRUCTURE</h3>

            <Family
              title="Tabs"
              blurb="The page switcher — a themed tab bar with an underline indicator that renders the active panel."
              imports={`<Tabs labels={['MAIN', 'FX', 'MOD']}>{panels}</Tabs>`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <TabsTwin theme={t} />} />
            </Family>

            <Family
              title="Disclosure"
              blurb="The collapsible settings row — click the header to fold content in and out."
              imports={`<Disclosure title="ADVANCED">{rows}</Disclosure>`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <DiscTwin theme={t} />} />
            </Family>
          </section>

          {/* ── OVERLAYS & EDITORS ───────────────────────────────────── */}
          <section id="overlays" className={styles.cat}>
            <h3 className={styles.catTitle}>OVERLAYS &amp; EDITORS</h3>

            <Family
              title="Tooltip"
              blurb="Eight voices for the same hint: ink chip, engraved plate, stamped steel tag, arrow bubble, black-glass card, ember chip, terminal readout, leader-line callout."
              imports={`<Tooltip label="Resets to 0 dB">…</Tooltip>`}
              docs="/docs/components#controls"
            >
              <AllThemes render={(t) => <TooltipTwin theme={t} />} />
            </Family>

            <Family
              title="Modal"
              blurb="Open each world's dialog: red-bar panel, machine plate, clean card with footer actions, a black-glass sheet, an ember telemetry panel, a scanlined terminal."
              imports={`<Modal open onClose={…} title="ABOUT">…</Modal>`}
              docs="/docs/components#controls"
            >
              <AllThemes
                render={(t) => (
                  <button type="button" className={styles.openBtn} onClick={() => setModalOpen(t)}>
                    OPEN MODAL
                  </button>
                )}
              />
            </Family>

            <Family
              title="GenericEditor"
              blurb="The one-line editor in eight layouts: value-labelled knobs, a screwed rack strip, a 500-series module, a settings form, an ether deck, an ember rack, a glowing console, a title block."
              imports={`render(<GenericEditor />)   // that's the whole editor`}
              docs="/docs/parameters#generic"
            >
              <AllThemes
                render={(t) => (
                  <GenericEditorTwin
                    theme={t}
                    params={
                      [
                        ['GAIN', gain, setGain],
                        ['MIX', mix, setMix],
                        ['LEVEL', level, setLevel],
                      ] as Array<[string, number, (v: number) => void]>
                    }
                  />
                )}
              />
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
        <div className={styles.modalBackdrop} onClick={() => setModalOpen(null)} role="presentation">
          {modalOpen === 'metal' ? (
            // METAL — machine plate with a red index bar and inset body
            <div className={`${styles.mBase} ${styles.mMetal}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <header>
                <em />
                <em />
                ABOUT
                <em />
                <em />
              </header>
              <div>
                <p>Machine plate dialog — soft-touch panel, red index bar, inset body.</p>
                <button type="button" className={styles.machBtn} onClick={() => setModalOpen(null)}>
                  <i />
                  CLOSE
                </button>
              </div>
            </div>
          ) : modalOpen === 'steel' ? (
            // STEEL — a brushed faceplate: corner screws, engraved title,
            // smoked readout body, machined close cap
            <div className={`${styles.mBase} ${styles.mSteel}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <em className={styles.mScrewTL} />
              <em className={styles.mScrewTR} />
              <em className={styles.mScrewBL} />
              <em className={styles.mScrewBR} />
              <header>ABOUT</header>
              <p>Brushed steel plate — engraved legend, smoked window, drilled screws.</p>
              <button type="button" onClick={() => setModalOpen(null)}>
                CLOSE
              </button>
            </div>
          ) : modalOpen === 'bp' ? (
            // BLUEPRINT — a drawing sheet: border frame, title block footer
            <div className={`${styles.mBase} ${styles.mBp}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <p>Sheet 1 of 1 — dialog drawn to scale. All dimensions in dB unless noted.</p>
              <footer>
                <span>VSREACT / ABOUT</span>
                <span>SCALE 1:1</span>
                <button type="button" onClick={() => setModalOpen(null)}>
                  APPROVE
                </button>
              </footer>
            </div>
          ) : modalOpen === 'std' ? (
            // STANDARD — clean card: header / body / footer with two actions
            <div className={`${styles.mBase} ${styles.mStd}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <header>About</header>
              <p>A clean product dialog — title, body, and a footer with paired actions.</p>
              <footer>
                <button type="button" onClick={() => setModalOpen(null)}>
                  Cancel
                </button>
                <b>
                  <button type="button" onClick={() => setModalOpen(null)}>
                    OK
                  </button>
                </b>
              </footer>
            </div>
          ) : modalOpen === 'glass' ? (
            // GLASS — a frosted sheet floating over glowing color
            <div className={`${styles.mBase} ${styles.mGlass}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <i aria-hidden="true" />
              <h4>About</h4>
              <p>A sheet of black glass — hairline gradient edge, light from the void behind.</p>
              <button type="button" onClick={() => setModalOpen(null)}>
                Close
              </button>
            </div>
          ) : modalOpen === 'carbon' ? (
            // CARBON — a telemetry panel on woven carbon
            <div className={`${styles.mBase} ${styles.mCarbon}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <header>
                <i />
                SYSTEM / ABOUT
              </header>
              <p>Ember panel — contour field, heat-gradient header, telemetry footer.</p>
              <footer>
                <span>TEMP 42°</span>
                <span>LOAD 07%</span>
                <button type="button" onClick={() => setModalOpen(null)}>
                  DISMISS
                </button>
              </footer>
            </div>
          ) : modalOpen === 'neon' ? (
            // NEON — a scanlined terminal window with a prompt
            <div className={`${styles.mBase} ${styles.mNeon}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <header>&gt;_ ABOUT</header>
              <p>
                sys.dialog(&quot;overlay&quot;) — scanlines, glow border, blinking cursor
                <i />
              </p>
              <button type="button" className={styles.brkBtn} onClick={() => setModalOpen(null)}>
                EXIT
              </button>
            </div>
          ) : (
            // INSTRUMENT — the red-bar panel
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <h3>ABOUT</h3>
              <p>
                This dialog is the web twin of <code>&lt;Modal&gt;</code> — in a plugin it renders
                through the overlay layer, painted natively.
              </p>
              <button type="button" className={styles.btnSolid} onClick={() => setModalOpen(null)}>
                CLOSE
              </button>
            </div>
          )}
        </div>
      ) : null}
    </main>
  )
}
