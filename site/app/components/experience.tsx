'use client'

// Motion core for the VSReacT site: Lenis + ScrollTrigger boot, the op-stream
// signature canvas (reconciler ops in, painted pixels out), custom cursor,
// magnetic elements, and scroll reveals.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

let motionBooted = false

export function useMotionReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(pointer: coarse)').matches

    if (reduced) return

    gsap.registerPlugin(ScrollTrigger)

    let lenis: Lenis | undefined
    let tick: ((time: number) => void) | undefined

    if (!motionBooted) {
      motionBooted = true

      if (!touch) {
        lenis = new Lenis({ lerp: 0.12 })
        lenis.on('scroll', ScrollTrigger.update)
        tick = (time: number) => lenis!.raf(time * 1000)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
      }
    }

    setReady(true)

    return () => {
      if (lenis) {
        if (tick) gsap.ticker.remove(tick)
        lenis.destroy()
        motionBooted = false
      }
    }
  }, [])

  return ready
}

const OPS = [
  '["create",7,"view"]',
  '["setProps",7,{"style":{...}}]',
  '["appendChild",0,7]',
  '["create",8,"text"]',
  '["setText",9,"READY"]',
  '["setProps",4,{"arcValueEnd":51}]',
  '["insertBefore",0,5,2]',
  '["create",11,"textinput"]',
  '["removeChild",3,6]',
]

type Particle = {
  text: string
  x: number
  y: number
  speed: number
  lane: number
}

/** The signature: reconciler ops fly in from the left as mono tokens; past
    the engine line they become painted lime bars — React in, pixels out. */
export function OpStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let raf = 0
    const particles: Particle[] = []
    const bars: number[] = []
    let spawnTimer = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const engineX = () => width * 0.58

    const spawn = () => {
      const lane = Math.floor(Math.random() * 7)
      particles.push({
        text: OPS[Math.floor(Math.random() * OPS.length)],
        x: -260,
        y: height * 0.22 + lane * (height * 0.08),
        speed: 1.4 + Math.random() * 1.6,
        lane,
      })
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)

      const ex = engineX()

      // Engine line.
      context.fillStyle = 'rgba(198, 241, 53, 0.16)'
      context.fillRect(ex, height * 0.14, 1.5, height * 0.72)

      // Ops flying in.
      context.font = '10px JetBrains Mono, monospace'

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.speed

        if (p.x >= ex) {
          bars.push(p.lane)
          if (bars.length > 220) bars.shift()
          particles.splice(i, 1)
          continue
        }

        const fade = Math.min(1, (p.x + 260) / 320)
        context.fillStyle = `rgba(118, 128, 107, ${0.16 + fade * 0.35})`
        context.fillText(p.text, p.x, p.y)
      }

      // Painted output: bars marching right of the engine line.
      const barWidth = 4
      const gap = 3
      const perRow = Math.floor((width - ex - 40) / (barWidth + gap))

      for (let i = 0; i < bars.length; i++) {
        const column = i % Math.max(1, perRow)
        const age = bars.length - i
        const amplitude = 12 + ((bars[i] * 37 + i * 13) % 46)
        const x = ex + 24 + column * (barWidth + gap)
        const y = height * 0.5
        const alpha = Math.max(0.1, 0.55 - age * 0.002)
        context.fillStyle = `rgba(198, 241, 53, ${alpha})`
        context.fillRect(x, y - amplitude, barWidth, amplitude * 2)
      }

      spawnTimer -= 1
      if (spawnTimer <= 0) {
        spawn()
        spawnTimer = 26 + Math.random() * 30
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduced) {
      // Static frame: a settled engine state.
      for (let i = 0; i < 140; i++) bars.push(i % 7)
      const ex = engineX()
      context.fillStyle = 'rgba(198, 241, 53, 0.16)'
      context.fillRect(ex, height * 0.14, 1.5, height * 0.72)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0.75,
        pointerEvents: 'none',
      }}
    />
  )
}

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    document.body.dataset.customCursor = 'true'

    const dot = dotRef.current!
    const ring = ringRef.current!
    dot.style.display = 'block'
    ring.style.display = 'block'

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' })
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' })
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' })
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' })

    const move = (e: MouseEvent) => {
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
    }

    const over = (e: MouseEvent) => {
      const interactive = (e.target as HTMLElement).closest('a, button, [data-hover]')
      gsap.to(ring, {
        scale: interactive ? 1.9 : 1,
        opacity: interactive ? 1 : 0.6,
        duration: 0.3,
        ease: 'back.out(1.7)',
      })
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      delete document.body.dataset.customCursor
    }
  }, [])

  const base = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    zIndex: 100,
    pointerEvents: 'none' as const,
    borderRadius: '50%',
    display: 'none',
    mixBlendMode: 'difference' as const,
  }

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{ ...base, width: 10, height: 10, marginLeft: -5, marginTop: -5, background: '#c6f135' }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          ...base,
          width: 38,
          height: 38,
          marginLeft: -19,
          marginTop: -19,
          border: '1.5px solid #c6f135',
          opacity: 0.6,
        }}
      />
    </>
  )
}

export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      gsap.to(el, {
        x: (e.clientX - rect.left - rect.width / 2) * 0.28,
        y: (e.clientY - rect.top - rect.height / 2) * 0.28,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })

    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)

    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [])

  return (
    <div ref={ref} className={className} style={{ display: 'inline-block' }}>
      {children}
    </div>
  )
}

export function useReveal(ready: boolean) {
  useEffect(() => {
    if (!ready) return

    const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]')

    const tweens = targets.map((el) =>
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        y: 90,
        opacity: 0,
        duration: 1.1,
        ease: 'power4.out',
      }),
    )

    return () => {
      tweens.forEach((t) => {
        t.scrollTrigger?.kill()
        t.kill()
      })
    }
  }, [ready])
}
