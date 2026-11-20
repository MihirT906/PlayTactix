import { Easing } from 'remotion'

export const FPS = 30

export type Ease = (t: number) => number
export type Pt = { x: number; y: number }
export type Key<T = number> = readonly [frame: number, value: T]

export const smooth: Ease = Easing.inOut(Easing.cubic)
export const linear: Ease = (t) => t

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
export const addPt = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })

/** 0 → 1 across [from, to], eased. */
export function progress(f: number, from: number, to: number, ease: Ease = smooth) {
  return ease(clamp01((f - from) / (to - from)))
}

/** Rises 0 → 1 over [a, b], holds, falls back to 0 over [c, d]. */
export function hump(f: number, a: number, b: number, c: number, d: number) {
  return progress(f, a, b) * (1 - progress(f, c, d))
}

/** Piecewise interpolation between keyframes, eased per segment. */
export function track(f: number, keys: Key[], ease: Ease = smooth): number {
  if (f <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i]
    if (f <= f1) {
      const [f0, v0] = keys[i - 1]
      return lerp(v0, v1, ease(clamp01((f - f0) / (f1 - f0))))
    }
  }
  return keys[keys.length - 1][1]
}

export function trackPt(f: number, keys: Key<Pt>[], ease: Ease = smooth): Pt {
  return {
    x: track(f, keys.map(([k, p]) => [k, p.x] as const), ease),
    y: track(f, keys.map(([k, p]) => [k, p.y] as const), ease),
  }
}

/** The value of the most recent keyframe at or before f (no interpolation). */
export function latest<T>(f: number, keys: Key<T>[]): T {
  let v = keys[0][1]
  for (const [k, val] of keys) if (f >= k) v = val
  return v
}

export type Quad = readonly [Pt, Pt, Pt]

export function quadAt([p0, p1, p2]: Quad, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

/** SVG polyline points for the first `t` of a quadratic curve. */
export function quadPoints(q: Quad, t: number, n = 32): string {
  if (t <= 0) return ''
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const p = quadAt(q, (t * i) / n)
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  }
  return pts.join(' ')
}

/** Two-segment limb from shoulder to hand, elbow bending downward. */
export function armPath(shoulder: Pt, hand: Pt, seg = 80): string {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const d = Math.hypot(dx, dy) || 1
  const h = d < 2 * seg ? Math.sqrt(seg * seg - (d / 2) ** 2) : 0
  let px = -dy / d
  let py = dx / d
  if (py < 0) {
    px = -px
    py = -py
  }
  const ex = (shoulder.x + hand.x) / 2 + px * h
  const ey = (shoulder.y + hand.y) / 2 + py * h
  return `M${shoulder.x} ${shoulder.y} L${ex} ${ey} L${hand.x} ${hand.y}`
}

export function rotateAround(p: Pt, c: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) }
}
