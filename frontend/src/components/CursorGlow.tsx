import { useEffect, useRef } from 'react'
import { APP_CONFIG } from '../config'
import './CursorGlow.css'

const THEMES = APP_CONFIG.theme.themeCycle
let themeIndex = 0

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) return
    const target = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    let raf = 0
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.18
      pos.y += (target.y - pos.y) * 0.18
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      el.style.opacity = '1'
    }
    const onLeave = () => { el.style.opacity = '0' }
    const onClick = () => {
      themeIndex = (themeIndex + 1) % THEMES.length
      const { primary, accent } = THEMES[themeIndex]
      const root = document.documentElement
      root.style.setProperty('--app-bg-primary', primary)
      root.style.setProperty('--app-bg-accent', accent)
      root.style.setProperty('--app-bg-accent-light', `${accent}be`)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('click', onClick)
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('click', onClick)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <div className="cursor-glow" ref={ref} aria-hidden="true" />
}
