// Tapp'd's pitch, drawn into any rectangle of the screen: the full-screen plot, a grid cell, or the smaller plot
// once the timeline and the Moments panel are open. Matches the look of Act 2's plot exactly at the full view.
import type { Pt } from '../anim'
import { clamp01 } from '../anim'
import {
  BACK_FOUR,
  BACK_SIX,
  KEY_PASS,
  PASSER,
  PASS_OPTIONS,
  PLAYERS,
  RUNNER,
  type Team,
  ballPos,
  holder,
  playerPos,
} from './play'

export const SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif'

export const C = {
  frame: '#1b2b36',
  navy: '#233d4d',
  margin: '#2f5f2a',
  grass: '#3d7a33',
  stripe: '#478a3b',
  line: '#e6efe6',
  blue: '#2f6fdb',
  red: '#e03b3b',
  homeShade: '#3B82F6',
  awayShade: '#EF4444',
  accent: '#fe7f2d',
  possession: '#FFD60A',
  option: '#32D7FF',
  risky: '#FF6B3D',
  mark: '#d85e1d',
  pill: '#14171c',
}

/** Where the pitch sits: centre of the pitch on screen and pixels per metre. */
export type View = { cx: number; cy: number; k: number }
export type Rect = { x: number; y: number; w: number; h: number }

export const lerpView = (a: View, b: View, t: number): View => ({
  cx: a.cx + (b.cx - a.cx) * t,
  cy: a.cy + (b.cy - a.cy) * t,
  k: a.k + (b.k - a.k) * t,
})
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
})

export type Layers = {
  pitchControl?: number
  teamShape?: number
  linkPlayers?: number
  playerFocus?: number
  passProb?: number // opacity
  passDraw?: number // 0 → 1, the lines drawing out from the passer
}

const teamColor = (t: Team) => (t === 'b' ? C.blue : C.red)

function pitchLines(): [number, number][][] {
  const L = 52.5
  const W = 34
  const circle: [number, number][] = []
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    circle.push([9.15 * Math.cos(a), 9.15 * Math.sin(a)])
  }
  const box = (s: number, depth: number, half: number): [number, number][] => [
    [s * L, -half],
    [s * (L - depth), -half],
    [s * (L - depth), half],
    [s * L, half],
  ]
  const goal = (s: number): [number, number][] => [
    [s * L, -3.66],
    [s * (L + 2), -3.66],
    [s * (L + 2), 3.66],
    [s * L, 3.66],
  ]
  return [
    [[-L, -W], [L, -W], [L, W], [-L, W], [-L, -W]],
    [[0, -W], [0, W]],
    circle,
    box(1, 16.5, 20.16),
    box(-1, 16.5, 20.16),
    box(1, 5.5, 9.16),
    box(-1, 5.5, 9.16),
    goal(1),
    goal(-1),
  ]
}
export const LINES = pitchLines()

/** A rounded label: dark pill, white text, centred on (x, y). */
export const Pill = ({ x, y, text, size, color = '#fff', bg = C.pill, opacity = 1 }: { x: number; y: number; text: string; size: number; color?: string; bg?: string; opacity?: number }) => {
  const w = text.length * size * 0.6 + size * 1.1
  const h = size * 1.55
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={bg} opacity={0.88} />
      <text x={x} y={y + size * 0.36} fontFamily={SANS} fontSize={size} fontWeight={700} fill={color} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Pt[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: Pt[] = []
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export const PitchView = ({ id, view, clip, m, layers = {} }: { id: string; view: View; clip: Rect; m: number; layers?: Layers }) => {
  const { cx, cy, k } = view
  const P = (x: number, y: number) => ({ x: cx + k * x, y: cy - k * y })
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const a = P(x0, y1)
    return { x: a.x, y: a.y, width: (x1 - x0) * k, height: (y1 - y0) * k }
  }
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${(cx + k * x).toFixed(1)},${(cy - k * y).toFixed(1)}`).join(' ')

  const pos = PLAYERS.map((_, i) => playerPos(i, m))
  const scr = pos.map((p) => P(p.x, p.y))
  const dotR = Math.max(9, 1.15 * k)
  const label = Math.min(22, Math.max(14, 1.45 * k))
  const ball = ballPos(m)
  const bp = P(ball.x, ball.y)
  const h = holder(m)

  const pc = layers.pitchControl ?? 0
  const shape = layers.teamShape ?? 0
  const link = layers.linkPlayers ?? 0
  const focus = layers.playerFocus ?? 0
  const pass = (layers.passProb ?? 0) * (1 - clamp01((m - KEY_PASS.from) / 0.15))

  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} />
        </clipPath>
        <clipPath id={`${id}-pitch`}>
          <rect {...rect(-52.5, -34, 52.5, 34)} />
        </clipPath>
        <filter id={`${id}-blur`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={k * 1.3} />
        </filter>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} fill={C.frame} />
        <rect {...rect(-58, -38, 58, 38)} fill={C.margin} />
        <rect {...rect(-52.5, -34, 52.5, 34)} fill={C.grass} />
        {[0, 2, 4, 6, 8, 10].map((s) => (
          <rect key={s} {...rect(-52.5 + s * 8.75, -34, -52.5 + (s + 1) * 8.75, 34)} fill={C.stripe} />
        ))}

        {pc > 0 && <PitchControl id={id} P={P} k={k} pos={pos} opacity={pc} />}

        <g fill="none" stroke={C.line} strokeWidth={Math.max(1.5, k / 3)} strokeLinejoin="round">
          {LINES.map((l, i) => (
            <polyline key={i} points={poly(l)} />
          ))}
        </g>

        {shape > 0 && <TeamShape pts={BACK_SIX.map((i) => pos[i])} P={P} k={k} dotR={dotR} label={label} opacity={shape} />}
        {link > 0 && <LinkPlayers pts={BACK_FOUR.map((i) => pos[i])} P={P} k={k} label={label} opacity={link} />}
        {focus > 0 && <FocusUnder m={m} P={P} k={k} opacity={focus} />}
        {pass > 0 && (
          <PassLines from={scr[PASSER]} to={PASS_OPTIONS.map((o) => ({ at: scr[o.to], p: o.p }))} k={k} draw={layers.passDraw ?? 1} opacity={pass} />
        )}

        {scr.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r={dotR} fill={teamColor(PLAYERS[i].team)} stroke="#0d1a22" strokeWidth={Math.max(1, k * 0.19)} />
            <text x={s.x} y={s.y + dotR * 0.38} fontFamily={SANS} fontSize={dotR * 1.05} fontWeight={700} fill="#fff" textAnchor="middle">
              {PLAYERS[i].num}
            </text>
          </g>
        ))}
        {h !== null && <circle cx={scr[h].x} cy={scr[h].y} r={dotR + 0.7 * k} fill="none" stroke={C.possession} strokeWidth={Math.max(2, 0.43 * k)} />}
        <circle cx={bp.x} cy={bp.y} r={Math.max(4, 0.57 * k)} fill="#fff" stroke="#1d2128" strokeWidth={Math.max(1, 0.19 * k)} />

        {focus > 0 && <FocusLabel at={scr[RUNNER]} dotR={dotR} label={label} opacity={focus} />}
        {pass > 0 && <PassLabels from={scr[PASSER]} to={PASS_OPTIONS.map((o) => ({ at: scr[o.to], p: o.p }))} label={label} draw={layers.passDraw ?? 1} opacity={pass} />}
      </g>
    </g>
  )
}

type Project = (x: number, y: number) => Pt

/** Who would win the ball if it arrived there: blue where blue gets there first, red where red does. */
export const PitchControl = ({ id, P, k, pos, opacity }: { id: string; P: Project; k: number; pos: Pt[]; opacity: number }) => {
  const NX = 42
  const NY = 28
  const dx = 105 / NX
  const dy = 68 / NY
  const cells = []
  for (let a = 0; a < NX; a++)
    for (let b = 0; b < NY; b++) {
      const x = -52.5 + (a + 0.5) * dx
      const y = -34 + (b + 0.5) * dy
      let tb = Infinity
      let tr = Infinity
      pos.forEach((p, i) => {
        const t = Math.hypot(p.x - x, p.y - y) / 7
        if (PLAYERS[i].team === 'b') tb = Math.min(tb, t)
        else tr = Math.min(tr, t)
      })
      const blue = 1 / (1 + Math.exp((tb - tr) / 0.3))
      const strength = Math.abs(blue - 0.5) * 2
      const tl = P(x - dx / 2 - 0.05, y + dy / 2 + 0.05)
      cells.push(
        <rect
          key={`${a}-${b}`}
          x={tl.x}
          y={tl.y}
          width={dx * k + 0.5}
          height={dy * k + 0.5}
          fill={blue > 0.5 ? C.homeShade : C.awayShade}
          fillOpacity={0.62 * strength}
        />,
      )
    }
  return (
    <g clipPath={`url(#${id}-pitch)`} opacity={opacity}>
      <g filter={`url(#${id}-blur)`}>{cells}</g>
    </g>
  )
}

/** Red's block outlined, with its width and depth. */
const TeamShape = ({ pts, P, k, dotR, label, opacity }: { pts: Pt[]; P: Project; k: number; dotR: number; label: number; opacity: number }) => {
  const rings = pts.map((p, i) => (
    <circle key={i} cx={P(p.x, p.y).x} cy={P(p.x, p.y).y} r={dotR + 0.9 * k} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={Math.max(1.5, k * 0.2)} />
  ))
  const hp = hull(pts)
  const ys = pts.map((p) => p.y)
  const xs = pts.map((p) => p.x)
  const width = Math.max(...ys) - Math.min(...ys)
  const depth = Math.max(...xs) - Math.min(...xs)
  // Strongest when compact, fading as the block stretches.
  const fill = 0.42 - clamp01((width * depth - 300) / 700) * 0.24
  const top = P((Math.max(...xs) + Math.min(...xs)) / 2, Math.max(...ys))
  return (
    <g opacity={opacity}>
      <polygon points={hp.map((p) => `${P(p.x, p.y).x},${P(p.x, p.y).y}`).join(' ')} fill={C.awayShade} fillOpacity={fill} stroke={C.awayShade} strokeWidth={Math.max(2, k * 0.28)} strokeLinejoin="round" />
      {rings}
      <Pill x={top.x} y={top.y - dotR - label * 1.4} text={`${Math.round(width)}m × ${Math.round(depth)}m`} size={label} />
    </g>
  )
}

/** Red's back four joined into a line, each link with its length. Links thin as players move apart. */
const LinkPlayers = ({ pts, P, k, label, opacity }: { pts: Pt[]; P: Project; k: number; label: number; opacity: number }) => {
  const links = pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    return { a: P(a.x, a.y), b: P(b.x, b.y), d }
  })
  return (
    <g opacity={opacity}>
      {links.map(({ a, b, d }, i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.mark} strokeWidth={Math.max(2, k * (0.75 - clamp01((d - 8) / 14) * 0.5))} strokeLinecap="round" />
      ))}
      {links.map(({ a, b, d }, i) => (
        <Pill key={i} x={(a.x + b.x) / 2 + label * 2.2} y={(a.y + b.y) / 2} text={`${Math.round(d)}m`} size={label} />
      ))}
    </g>
  )
}

/** Player Focus, under the players: a spotlight and the trail of where they've been. */
const FocusUnder = ({ m, P, k, opacity }: { m: number; P: Project; k: number; opacity: number }) => {
  const now = playerPos(RUNNER, m)
  const at = P(now.x, now.y)
  const N = 14
  const trail: Pt[] = []
  for (let j = N; j >= 0; j--) {
    const p = playerPos(RUNNER, Math.max(0, m - (j / N) * 1.4))
    trail.push(P(p.x, p.y))
  }
  return (
    <g opacity={opacity}>
      {trail.slice(1).map((p, j) => (
        <line key={j} x1={trail[j].x} y1={trail[j].y} x2={p.x} y2={p.y} stroke={C.mark} strokeOpacity={(j + 1) / N} strokeWidth={Math.max(2, k * 0.45)} strokeLinecap="round" />
      ))}
      <circle cx={at.x} cy={at.y} r={k * 4} fill="#fff" opacity={0.22} />
      <circle cx={at.x} cy={at.y} r={k * 2.6} fill="#fff" opacity={0.25} />
    </g>
  )
}

const FocusLabel = ({ at, dotR, label, opacity }: { at: Pt; dotR: number; label: number; opacity: number }) => (
  <g opacity={opacity}>
    <circle cx={at.x} cy={at.y} r={dotR * 1.6} fill="none" stroke={C.mark} strokeWidth={3} />
    <Pill x={at.x} y={at.y - dotR - label * 1.6} text="J. ARLO" size={label} />
  </g>
)

type Option = { at: Pt; p: number }
const optionColor = (p: number) => (p >= 0.65 ? C.option : C.risky)

const PassLines = ({ from, to, k, draw, opacity }: { from: Pt; to: Option[]; k: number; draw: number; opacity: number }) => (
  <g opacity={opacity}>
    {to.map(({ at, p }, i) => {
      const t = clamp01(draw * 1.6 - i * 0.3)
      return (
        <line key={i} x1={from.x} y1={from.y} x2={from.x + (at.x - from.x) * t} y2={from.y + (at.y - from.y) * t} stroke={optionColor(p)} strokeWidth={Math.max(2.5, k * 0.4)} strokeLinecap="round" />
      )
    })}
  </g>
)

const PassLabels = ({ from, to, label, draw, opacity }: { from: Pt; to: Option[]; label: number; draw: number; opacity: number }) => (
  <g opacity={opacity}>
    {to.map(({ at, p }, i) => {
      const t = clamp01((draw * 1.6 - i * 0.3 - 0.85) / 0.15)
      if (t <= 0) return null
      return <Pill key={i} x={from.x + (at.x - from.x) * 0.58} y={from.y + (at.y - from.y) * 0.58} text={`${Math.round(p * 100)}%`} size={label * 1.4} color={optionColor(p)} opacity={t} />
    })}
  </g>
)
