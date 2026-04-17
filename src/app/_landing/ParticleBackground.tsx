'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  baseVx: number
  baseVy: number
  size: number
  opacity: number
  phase: number
  phaseSpeed: number
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Capture non-null refs so nested functions can use them without narrowing issues
    const cvs = canvas
    const c = ctx

    let particles: Particle[] = []
    const COUNT = 120
    const MOUSE_RADIUS = 180
    const MOUSE_PULL = 0.022

    function makeParticle(w: number, h: number): Particle {
      const speed = Math.random() * 0.25 + 0.05
      const angle = Math.random() * Math.PI * 2
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseVx: Math.cos(angle) * speed,
        baseVy: Math.sin(angle) * speed,
        size: Math.random() * 1.4 + 0.4,
        opacity: Math.random() * 0.45 + 0.08,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.008 + 0.002,
      }
    }

    function resize() {
      cvs.width = window.innerWidth
      cvs.height = document.body.scrollHeight
      particles = Array.from({ length: COUNT }, () =>
        makeParticle(cvs.width, cvs.height)
      )
    }

    function tick() {
      c.clearRect(0, 0, cvs.width, cvs.height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y + window.scrollY

      // Soft cursor light
      if (mx > -1000) {
        const r = 320
        const grd = c.createRadialGradient(mx, my, 0, mx, my, r)
        grd.addColorStop(0, 'rgba(255,255,255,0.028)')
        grd.addColorStop(0.4, 'rgba(255,255,255,0.012)')
        grd.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = grd
        c.fillRect(mx - r, my - r, r * 2, r * 2)
      }

      for (const p of particles) {
        p.phase += p.phaseSpeed
        const flicker = 0.75 + 0.25 * Math.sin(p.phase)

        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_RADIUS && dist > 1) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * MOUSE_PULL
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.vx += (p.baseVx - p.vx) * 0.015
        p.vy += (p.baseVy - p.vy) * 0.015

        p.x += p.vx
        p.y += p.vy

        const w = cvs.width
        const h = cvs.height
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        if (p.y < -4) p.y = h + 4
        if (p.y > h + 4) p.y = -4

        const alpha = p.opacity * flicker

        c.beginPath()
        c.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        c.fillStyle = `rgba(255,255,255,${alpha * 0.08})`
        c.fill()

        c.beginPath()
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        c.fillStyle = `rgba(255,255,255,${alpha})`
        c.fill()
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
