// The "Overlays" clip for the docs' Overlays page (frontend/public/docs-media/overlays.mp4). It opens on the
// workspace with the rail of tools: Overlays is clicked and its panel slides in. Then each overlay in turn: the cursor goes to its button, the button is boxed and a card names the overlay and
// says what it shows; then the button is clicked and the play runs for a few seconds with it on. Event Map opens its
// settings (already set) as it turns on; Pass Network opens its settings and is turned on from there.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { FPS, type Key, type Pt, clamp01, hump, lerp, progress, track } from '../anim'
import { C, Pill, SANS } from '../act3/Pitch'
import { Cursor } from '../act3/Ui'
import { KEY_PASS, PASSER, PASS_OPTIONS, PASS_1, PLAYERS, SHOT, ballPos, holder, idx, playerPos } from '../act3/play'
import { AWAY, AppBar, BAR_H, BG, BORDER, BOX, Controls, H, HOME, HOVER, MARK, MUTED, PITCH_TOP, Pitch, RAIL_W, Rail, Step, TEXT, W, type View, fmt, inside, railButton, railRect, toScreen } from './workspace'

// ---------------- Layout ----------------

const PANEL_W = 500
const VIEW: View = (() => {
  const pad = 14
  const k = Math.min((W - PANEL_W - 2 * pad) / 116, (H - PITCH_TOP - 2 * pad) / 76)
  return { cx: (PANEL_W + W) / 2, cy: (PITCH_TOP + H) / 2, k }
})()
const k = VIEW.k
// The pitch before the panel opens, beside the rail: same scale, further left.
const RAIL_VIEW: View = { ...VIEW, cx: (RAIL_W + W) / 2 }
const P = (p: Pt) => toScreen(VIEW, p)
const DOT_R = 1.25 * k

const CLIP_LEN = 34
const CLIP_AT = 12

// The panel: Back, the heading, the six buttons, and the settings that open below them.
const BACK = { x: 24, y: BAR_H + 20, w: 120, h: 46 }
const HEADING_Y = BAR_H + 124
const BTN = { x: 24, w: PANEL_W - 48, h: 62, step: 74, y0: BAR_H + 222 }
const SETTINGS_Y = BTN.y0 + 6 * BTN.step + 14

type Name = 'Pitch Control' | 'Pass Probability' | 'Sequence Trails' | 'Voronoi' | 'Event Map' | 'Pass Network'
const NAMES: Name[] = ['Pitch Control', 'Pass Probability', 'Sequence Trails', 'Voronoi', 'Event Map', 'Pass Network']
const btnRect = (n: Name) => ({ x: BTN.x, y: BTN.y0 + NAMES.indexOf(n) * BTN.step, w: BTN.w, h: BTN.h })
const btnCentre = (n: Name): Pt => ({ x: BTN.x + 170, y: btnRect(n).y + BTN.h / 2 })

// ---------------- What each overlay says ----------------

const COPY: Record<Name, { headline: string; sub: string }> = {
  'Pitch Control': { headline: 'Where each team is expected to control the ball.', sub: "Team colour where they're on top, a blend where it's contested." },
  'Pass Probability': { headline: 'Every passing option, with its chance of success.', sub: 'Safe passes in one colour, risky ones in another.' },
  'Sequence Trails': { headline: 'The move, traced touch by touch.', sub: 'Carries as arrows, passes as comets.' },
  Voronoi: { headline: "Each player's patch of the pitch.", sub: "The space they're closer to than anyone else. Spot the gaps between lines." },
  'Event Map': { headline: 'Every pass, carry or run that matches your filters.', sub: 'Filter by team, player, area, or moves that led to a shot.' },
  'Pass Network': { headline: 'Who passes to whom, and how often.', sub: 'Thicker lines mean more passes.' },
}

// ---------------- The script ----------------

const DIP = 7 // frames to fade to and from dark between overlays
const READ = 66 // frames the card is fully up
const PP_HOLD = 42 // Pass Probability: frames paused on the decision before play goes on

type Seg = {
  name: Name
  start: number
  boxIn: number
  click: number
  turnOn?: number // Pass Network: the click on "Turn on from here"
  on: number
  end: number
  m0: number
  hold: number // frames paused once on, before play
}

// The opening: the cursor goes to Overlays on the rail, it's outlined, it's clicked, and the panel slides in.
const OPEN = { stepIn: 16, click: 46, slide: [48, 62] as const }
const OPEN_LEN = 68
const OVERLAYS_BTN = railButton('Overlays')

const SEGS: Seg[] = []
const CLIP: Record<Name, { m0: number; frames: number; hold?: number }> = {
  'Pitch Control': { m0: 0.6, frames: 105 },
  'Pass Probability': { m0: 0.95, frames: 105, hold: PP_HOLD },
  'Sequence Trails': { m0: 0, frames: 138 },
  Voronoi: { m0: 0.6, frames: 105 },
  'Event Map': { m0: 0.6, frames: 105 },
  'Pass Network': { m0: 0.6, frames: 105 },
}
{
  let t = OPEN_LEN
  for (const name of NAMES) {
    const start = t
    const boxIn = start + 20
    const click = boxIn + 10 + READ
    const turnOn = name === 'Pass Network' ? click + 28 : undefined
    const on = turnOn ?? click
    const { m0, frames, hold = 0 } = CLIP[name]
    const end = on + frames
    SEGS.push({ name, start, boxIn, click, turnOn, on, end, m0, hold })
    t = end
  }
}
export const OVERLAYS_DURATION = SEGS[SEGS.length - 1].end + 4

const REST: Pt = { x: PANEL_W + 260, y: 640 }
const TURN_ON_BTN: Pt = { x: BTN.x + BTN.w - 110, y: SETTINGS_Y + 28 }
const TURN_ON_AIM: Pt = { x: TURN_ON_BTN.x + 70, y: TURN_ON_BTN.y + 6 } // the cursor's tip, clear of the label

const cursorAt = (f: number, s: Seg): Pt => {
  const b = btnCentre(s.name)
  const away = { x: b.x + 150, y: b.y + 46 }
  const from = s === SEGS[0] ? OVERLAYS_BTN : REST
  const keys: Key<Pt>[] = [
    [s.start, from],
    [s.start + 4, from],
    [s.boxIn - 2, b],
    [s.click + 4, b],
  ]
  if (s.turnOn !== undefined) keys.push([s.turnOn - 4, TURN_ON_AIM], [s.turnOn + 6, TURN_ON_AIM], [s.turnOn + 22, { x: TURN_ON_AIM.x + 20, y: TURN_ON_AIM.y + 90 }])
  else keys.push([s.click + 20, away])
  return {
    x: track(f, keys.map(([kf, p]) => [kf, p.x] as Key)),
    y: track(f, keys.map(([kf, p]) => [kf, p.y] as Key)),
  }
}

const moveTime = (f: number, s: Seg) => s.m0 + Math.max(0, f - s.on - s.hold) / FPS

// ---------------- Geometry helpers ----------------

const pts = (ps: Pt[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

/** A pass: a tapered streak from tail to head, fading in towards the head. */
const Comet = ({ id, a, b, color, width, opacity = 1 }: { id: string; a: Pt; b: Pt; color: string; width: number; opacity?: number }) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  if (d < 1) return null
  const n = { x: -(b.y - a.y) / d, y: (b.x - a.x) / d }
  const h = width / 2
  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
          <stop offset="0" stopColor={color} stopOpacity={0.12} />
          <stop offset="1" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>
      <polygon points={pts([a, { x: b.x + n.x * h, y: b.y + n.y * h }, { x: b.x - n.x * h, y: b.y - n.y * h }])} fill={`url(#${id})`} />
      <circle cx={b.x} cy={b.y} r={h} fill={color} />
    </g>
  )
}

/** A carry or a run: a line with a head. */
const Arrow = ({ a, b, color, width, head, opacity = 1 }: { a: Pt; b: Pt; color: string; width: number; head: number; opacity?: number }) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  if (d < 1) return null
  const u = { x: (b.x - a.x) / d, y: (b.y - a.y) / d }
  const hl = Math.min(head, d * 0.6)
  const base = { x: b.x - u.x * hl, y: b.y - u.y * hl }
  return (
    <g opacity={opacity}>
      <line x1={a.x} y1={a.y} x2={base.x} y2={base.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={pts([b, { x: base.x - u.y * hl * 0.55, y: base.y + u.x * hl * 0.55 }, { x: base.x + u.y * hl * 0.55, y: base.y - u.x * hl * 0.55 }])} fill={color} />
    </g>
  )
}

const teamOf = (i: number) => (PLAYERS[i].team === 'b' ? HOME : AWAY)

// ---------------- The overlays ----------------

/** Pitch Control: each team's colour where it would reach the ball first, blended where it's close. */
const PitchControlLayer = ({ pos, opacity }: { pos: Pt[]; opacity: number }) => {
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
      const tl = P({ x: x - dx / 2 - 0.05, y: y + dy / 2 + 0.05 })
      cells.push(<rect key={`${a}-${b}`} x={tl.x} y={tl.y} width={dx * k + 0.5} height={dy * k + 0.5} fill={blue > 0.5 ? HOME : AWAY} fillOpacity={0.62 * Math.abs(blue - 0.5) * 2} />)
    }
  return (
    <g clipPath="url(#ov-pitch)" opacity={opacity}>
      <g filter="url(#ov-blur)">{cells}</g>
    </g>
  )
}

/** Pass Probability: blue 8's options, each with its chance. Safe (65%+) in the option colour, risky in another. */
const optionColor = (p: number) => (p >= 0.65 ? MARK.option : C.risky)
const passLines = (pos: Pt[], draw: number) => {
  const from = P(pos[PASSER])
  return PASS_OPTIONS.map(({ to, p }, i) => ({ from, at: P(pos[to]), p, t: clamp01(draw * 1.6 - i * 0.3) }))
}
const PassLinesLayer = ({ pos, draw, opacity }: { pos: Pt[]; draw: number; opacity: number }) => (
  <g opacity={opacity}>
    {passLines(pos, draw).map(({ from, at, p, t }, i) => (
      <line key={i} x1={from.x} y1={from.y} x2={from.x + (at.x - from.x) * t} y2={from.y + (at.y - from.y) * t} stroke={optionColor(p)} strokeWidth={0.42 * k} strokeLinecap="round" />
    ))}
  </g>
)
const PassLabels = ({ pos, draw, opacity }: { pos: Pt[]; draw: number; opacity: number }) => (
  <g opacity={opacity}>
    {passLines(pos, draw).map(({ from, at, p, t }, i) =>
      t < 1 ? null : <Pill key={i} x={from.x + (at.x - from.x) * 0.58} y={from.y + (at.y - from.y) * 0.58} text={`${Math.round(p * 100)}%`} size={28} color={optionColor(p)} />,
    )}
  </g>
)

/** Sequence Trails: the move so far, passes as comets and carries as arrows, the one under way cut at the ball. */
const TRAIL: { kind: 'pass' | 'carry'; from: number; to: number }[] = [
  { kind: 'pass', from: PASS_1.from, to: PASS_1.to },
  { kind: 'carry', from: PASS_1.to, to: KEY_PASS.from },
  { kind: 'pass', from: KEY_PASS.from, to: KEY_PASS.to },
  { kind: 'carry', from: KEY_PASS.to, to: SHOT.from },
]
const TrailsLayer = ({ m, opacity }: { m: number; opacity: number }) => (
  <g opacity={opacity}>
    {TRAIL.map((l, i) => {
      if (m <= l.from) return null
      const a = P(ballPos(l.from))
      const b = P(ballPos(Math.min(m, l.to - 0.001)))
      return l.kind === 'pass' ? (
        <Comet key={i} id={`trail-${i}`} a={a} b={b} color={HOME} width={1.5 * k} />
      ) : (
        <Arrow key={i} a={a} b={b} color={HOME} width={0.55 * k} head={1.8 * k} />
      )
    })}
  </g>
)

/** Voronoi: one cell per player, the part of the pitch they're nearer than anyone else. */
const PITCH_RECT: Pt[] = [
  { x: -52.5, y: -34 },
  { x: 52.5, y: -34 },
  { x: 52.5, y: 34 },
  { x: -52.5, y: 34 },
]
/** Keep the part of `poly` nearer to `a` than to `b`. */
function clipNearer(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const n = { x: b.x - a.x, y: b.y - a.y }
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const side = (p: Pt) => (p.x - mid.x) * n.x + (p.y - mid.y) * n.y
  const out: Pt[] = []
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]
    const sp = side(p)
    const sq = side(q)
    if (sp <= 0) out.push(p)
    if (sp <= 0 !== sq <= 0) {
      const t = sp / (sp - sq)
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
    }
  })
  return out
}
const VoronoiLayer = ({ pos, opacity }: { pos: Pt[]; opacity: number }) => (
  <g opacity={opacity}>
    {pos.map((p, i) => {
      let cell = PITCH_RECT
      pos.forEach((q, j) => {
        if (j !== i && cell.length) cell = clipNearer(cell, p, q)
      })
      return <polygon key={i} points={pts(cell.map(P))} fill={teamOf(i)} fillOpacity={0.24} stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeLinejoin="round" />
    })}
  </g>
)

/** Event Map: whole match, passes, carries and runs that led to a shot. */
type Mark = { kind: 'pass' | 'carry' | 'run'; team: 'b' | 'r'; a: [number, number]; b: [number, number] }
const EVENTS: Mark[] = [
  { kind: 'pass', team: 'b', a: [5, -2], b: [20, 4] },
  { kind: 'pass', team: 'b', a: [10, 8], b: [24, -8] },
  { kind: 'carry', team: 'b', a: [24, -8], b: [32, -5] },
  { kind: 'pass', team: 'b', a: [18, -20], b: [34, -28] },
  { kind: 'carry', team: 'b', a: [34, -28], b: [43, -22] },
  { kind: 'pass', team: 'b', a: [30, -6], b: [41, -15] },
  { kind: 'run', team: 'b', a: [27, -12], b: [40, -18] },
  { kind: 'pass', team: 'b', a: [22, 12], b: [37, 19] },
  { kind: 'carry', team: 'b', a: [37, 19], b: [44, 14] },
  { kind: 'pass', team: 'b', a: [44, 14], b: [47, 3] },
  { kind: 'run', team: 'b', a: [33, 4], b: [45, 2] },
  { kind: 'pass', team: 'b', a: [28, 2], b: [42, -3] },
  { kind: 'pass', team: 'r', a: [-8, 4], b: [-24, 13] },
  { kind: 'carry', team: 'r', a: [-24, 13], b: [-35, 8] },
  { kind: 'pass', team: 'r', a: [-20, -10], b: [-37, -4] },
  { kind: 'run', team: 'r', a: [-15, -15], b: [-31, -12] },
]
const EventMapLayer = ({ show }: { show: number }) => (
  <g>
    {EVENTS.map((e, i) => {
      const o = clamp01(show * 2.2 - (i / EVENTS.length) * 1.2)
      if (o <= 0) return null
      const a = P({ x: e.a[0], y: e.a[1] })
      const b = P({ x: e.b[0], y: e.b[1] })
      const color = e.team === 'b' ? HOME : AWAY
      return e.kind === 'pass' ? (
        <Comet key={i} id={`em-${i}`} a={a} b={b} color={color} width={1.5 * k} opacity={o} />
      ) : (
        <Arrow key={i} a={a} b={b} color={color} width={0.55 * k} head={1.8 * k} opacity={o * (e.kind === 'run' ? 0.5 : 1)} />
      )
    })}
  </g>
)

/** Pass Network: team-mates joined by lines as thick as the passes between them, drawn where they are now. */
const NETWORK: [team: 'b' | 'r', a: number, b: number, count: number][] = [
  ['b', 1, 4, 8], ['b', 1, 5, 7], ['b', 4, 5, 12], ['b', 4, 2, 9], ['b', 5, 3, 10], ['b', 4, 6, 14], ['b', 5, 6, 11],
  ['b', 6, 10, 13], ['b', 6, 8, 16], ['b', 8, 10, 9], ['b', 2, 7, 8], ['b', 2, 8, 10], ['b', 3, 10, 7], ['b', 8, 11, 6],
  ['b', 10, 9, 5], ['b', 7, 8, 7], ['b', 11, 9, 4],
  ['r', 1, 4, 6], ['r', 1, 5, 6], ['r', 4, 5, 9], ['r', 4, 2, 7], ['r', 5, 3, 8], ['r', 6, 4, 8], ['r', 8, 5, 7],
  ['r', 6, 8, 11], ['r', 6, 10, 9], ['r', 8, 10, 8], ['r', 3, 7, 6], ['r', 10, 9, 5], ['r', 10, 11, 5], ['r', 7, 10, 6], ['r', 2, 6, 5],
]
const NET_MAX = Math.max(...NETWORK.map((e) => e[3]))
const NetworkLayer = ({ pos, opacity }: { pos: Pt[]; opacity: number }) => (
  <g opacity={opacity}>
    {[...NETWORK]
      .sort((x, y) => x[3] - y[3])
      .map(([team, a, b, count]) => {
        const t = count / NET_MAX
        const pa = P(pos[idx(team, a)])
        const pb = P(pos[idx(team, b)])
        return (
          <line
            key={`${team}${a}-${b}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={team === 'b' ? HOME : AWAY}
            strokeOpacity={0.35 + 0.55 * t}
            strokeWidth={1.5 + 11 * t}
            strokeLinecap="round"
          />
        )
      })}
  </g>
)

// ---------------- The panel ----------------

const Segmented = ({ y, label, options, picked }: { y: number; label: string; options: string[]; picked: string[] }) => {
  const w = BTN.w / options.length
  return (
    <g>
      <text x={BTN.x} y={y} fontFamily={SANS} fontSize={15} fontWeight={700} fill={MUTED} letterSpacing={1.5}>
        {label.toUpperCase()}
      </text>
      <rect x={BTN.x} y={y + 12} width={BTN.w} height={42} rx={9} fill="#253a4a" stroke="#33505f" strokeWidth={1.5} />
      {options.map((o, i) => {
        const on = picked.includes(o)
        return (
          <g key={o}>
            {on && <rect x={BTN.x + i * w + 3} y={y + 15} width={w - 6} height={36} rx={7} fill={C.accent} fillOpacity={0.22} stroke={C.accent} strokeWidth={2} />}
            <text x={BTN.x + i * w + w / 2} y={y + 39} fontFamily={SANS} fontSize={17} fontWeight={600} fill={on ? '#fff' : TEXT} textAnchor="middle">
              {o}
            </text>
          </g>
        )
      })}
    </g>
  )
}

const EventMapSettings = ({ show }: { show: number }) => (
  <g opacity={show} transform={`translate(0 ${(1 - show) * -12})`}>
    <Segmented y={SETTINGS_Y + 18} label="Scope" options={['This clip', 'Whole match', 'Period 1', 'Period 2']} picked={['Whole match']} />
    <Segmented y={SETTINGS_Y + 96} label="Show" options={['Passes', 'Carries', 'Runs']} picked={['Passes', 'Carries', 'Runs']} />
    <Segmented y={SETTINGS_Y + 174} label="Led to" options={['Any', 'Shot', 'Goal']} picked={['Shot']} />
    <text x={BTN.x} y={SETTINGS_Y + 270} fontFamily={SANS} fontSize={18} fontWeight={600} fill={TEXT}>
      {`${EVENTS.length} on the pitch`}
    </text>
  </g>
)

const PassNetworkSettings = ({ show, on, cursor }: { show: number; on: boolean; cursor: Pt }) => {
  const b = { x: TURN_ON_BTN.x - 100, y: SETTINGS_Y + 6, w: 200, h: 44 }
  return (
    <g opacity={show} transform={`translate(0 ${(1 - show) * -12})`}>
      <text x={BTN.x} y={SETTINGS_Y + 35} fontFamily={SANS} fontSize={18} fontWeight={600} fill={TEXT}>
        {on ? 'Showing at this frame' : 'Not showing at this frame'}
      </text>
      <rect {...{ x: b.x, y: b.y, width: b.w, height: b.h }} rx={9} fill={inside(cursor, b.x, b.y, b.w, b.h) ? HOVER : '#253a4a'} stroke={C.accent} strokeWidth={2} />
      <text x={b.x + b.w / 2} y={b.y + 29} fontFamily={SANS} fontSize={17} fontWeight={700} fill="#fff" textAnchor="middle">
        {on ? 'Turn off from here' : 'Turn on from here'}
      </text>
      <Segmented y={SETTINGS_Y + 84} label="Count passes over" options={['Match', 'Clip', 'Custom']} picked={['Match']} />
      <Segmented y={SETTINGS_Y + 162} label="Build" options={['All at once', 'As play goes']} picked={['All at once']} />
      <Segmented y={SETTINGS_Y + 240} label="Team" options={['Both', 'BLU', 'RED']} picked={['Both']} />
    </g>
  )
}

const OverlaysPanel = ({ cursor, on, settings }: { cursor: Pt; on: Partial<Record<Name, number>>; settings: React.ReactNode }) => {
  const backHover = inside(cursor, BACK.x, BACK.y, BACK.w, BACK.h)
  return (
    <g>
      <rect x={0} y={BAR_H} width={PANEL_W} height={H - BAR_H} fill={BG} />
      <rect x={PANEL_W - 2} y={BAR_H} width={2} height={H - BAR_H} fill={BORDER} />
      <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx={9} fill={backHover ? HOVER : 'none'} stroke={BORDER} strokeWidth={2} />
      <path d={`M${BACK.x + 22} ${BACK.y + 23} h16 M${BACK.x + 29} ${BACK.y + 16} l-7 7 l7 7`} stroke={TEXT} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x={BACK.x + 50} y={BACK.y + 30} fontFamily={SANS} fontSize={20} fontWeight={600} fill={TEXT}>
        Back
      </text>
      <text x={28} y={HEADING_Y} fontFamily={SANS} fontSize={36} fontWeight={800} fill="#fff">
        Overlays
      </text>
      <text fontFamily={SANS} fontSize={19} fill={MUTED}>
        <tspan x={28} y={HEADING_Y + 38}>
          Turn an overlay on or off from the current frame.
        </tspan>
        <tspan x={28} y={HEADING_Y + 64}>
          Highlighted ones are showing now.
        </tspan>
      </text>
      {NAMES.map((n) => {
        const r = btnRect(n)
        const t = on[n] ?? 0
        const hover = inside(cursor, r.x, r.y, r.w, r.h)
        return (
          <g key={n}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={11}
              fill={t > 0 ? C.accent : hover ? '#2d4658' : '#253a4a'}
              fillOpacity={t > 0 ? 0.08 + 0.14 * t : 1}
              stroke={t > 0 ? C.accent : '#33505f'}
              strokeOpacity={t > 0 ? t : 1}
              strokeWidth={t > 0 ? 3 : 1.5}
            />
            <text x={r.x + 22} y={r.y + 39} fontFamily={SANS} fontSize={23} fontWeight={700} fill={t > 0.5 ? '#fff' : TEXT}>
              {n}
            </text>
            {t > 0 && (
              <g opacity={t} transform={`translate(${r.x + r.w - 22} ${r.y + 17})`}>
                <rect x={-60} width={60} height={28} rx={14} fill={C.accent} />
                <text x={-30} y={20} fontFamily={SANS} fontSize={16} fontWeight={800} fill="#fff" textAnchor="middle">
                  On
                </text>
              </g>
            )}
          </g>
        )
      })}
      {settings}
    </g>
  )
}

// ---------------- The card ----------------

const CARD = { x: PANEL_W + 70, w: W - PANEL_W - 140, h: 236 }
const NameCard = ({ s, show }: { s: Seg; show: number }) => {
  if (show <= 0) return null
  const box = btnRect(s.name)
  const pad = 6 + 8 * (1 - show)
  const cy = VIEW.cy
  return (
    <g opacity={show}>
      <path d={`M0 0 H${W} V${H} H0 Z M${box.x - 6} ${box.y - 6} V${box.y + box.h + 6} H${box.x + box.w + 6} V${box.y - 6} Z`} fill="#000" fillOpacity={0.5} fillRule="evenodd" />
      <rect x={box.x - pad} y={box.y - pad} width={box.w + 2 * pad} height={box.h + 2 * pad} rx={14} fill="none" stroke={BOX} strokeWidth={6} />
      <g transform={`translate(0 ${(1 - show) * 14})`}>
        <rect x={CARD.x} y={cy - CARD.h / 2} width={CARD.w} height={CARD.h} rx={22} fill={C.pill} opacity={0.95} />
        <rect x={CARD.x} y={cy - CARD.h / 2} width={10} height={CARD.h} rx={5} fill={BOX} />
        <text x={CARD.x + 56} y={cy - 46} fontFamily={SANS} fontSize={52} fontWeight={800} fill={BOX}>
          {s.name}
        </text>
        <text x={CARD.x + 56} y={cy + 18} fontFamily={SANS} fontSize={38} fontWeight={700} fill="#fff">
          {COPY[s.name].headline}
        </text>
        <text x={CARD.x + 56} y={cy + 70} fontFamily={SANS} fontSize={28} fill={TEXT}>
          {COPY[s.name].sub}
        </text>
      </g>
    </g>
  )
}

// ---------------- The clip ----------------

const OPEN_CURSOR: Key<Pt>[] = [
  [0, REST],
  [6, REST],
  [OPEN.stepIn + 6, OVERLAYS_BTN],
]

/** The opening: the rail, then the Overlays panel sliding in over it as the pitch moves across. */
const Opening = ({ f }: { f: number }) => {
  const cursor = { x: track(f, OPEN_CURSOR.map(([kf, p]) => [kf, p.x] as Key)), y: track(f, OPEN_CURSOR.map(([kf, p]) => [kf, p.y] as Key)) }
  const slide = progress(f, ...OPEN.slide)
  const view = { ...VIEW, cx: lerp(RAIL_VIEW.cx, VIEW.cx, slide) }
  const m = SEGS[0].m0
  const pos = PLAYERS.map((_, i) => playerPos(i, m))
  const h = holder(m)
  const down = f >= OPEN.click && f < OPEN.click + 4
  const ring = h !== null ? toScreen(view, pos[h]) : null
  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Pitch view={view} bottom={H} players={pos} ball={ballPos(m)}>
          {ring && <circle cx={ring.x} cy={ring.y} r={DOT_R + 0.75 * k} fill="none" stroke={MARK.possession} strokeWidth={0.42 * k} />}
        </Pitch>
        <Controls playing={false} clip={CLIP_AT + m} clipLen={CLIP_LEN} match={fmt(67 * 60 + 5 + m)} cursor={cursor} left={lerp(RAIL_W, PANEL_W, slide)} />
        <Rail cursor={cursor} active={f >= OPEN.click ? 'Overlays' : null} />
        {slide > 0 && (
          <g transform={`translate(${-PANEL_W * (1 - slide)} 0)`}>
            <OverlaysPanel cursor={{ x: -1, y: -1 }} on={{}} settings={null} />
          </g>
        )}
        <AppBar />
        <Step
          box={railRect('Overlays')}
          label={{ x: RAIL_W + 30, y: OVERLAYS_BTN.y, text: 'Open Overlays', anchor: 'start' }}
          show={hump(f, OPEN.stepIn, OPEN.stepIn + 8, OPEN.click + 2, OPEN.click + 8)}
        />
        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1} down={down} clicks={[(f - OPEN.click) / 10]} />
        </g>
        <rect width={W} height={H} fill="#000" opacity={1 - progress(f, 0, DIP)} />
      </svg>
    </AbsoluteFill>
  )
}

export const Overlays = () => {
  const f = useCurrentFrame()
  if (f < OPEN_LEN) return <Opening f={f} />
  const s = SEGS.find((g) => f < g.end) ?? SEGS[SEGS.length - 1]
  const cursor = cursorAt(f, s)
  const m = moveTime(f, s)
  const pos = PLAYERS.map((_, i) => playerPos(i, m))
  const clip = CLIP_AT + m

  // How far the overlay has come on: 0 before the click, then up over a few frames.
  const onAt = (from: number, len = 8) => progress(f, from, from + len)
  const lit = onAt(s.on, 6)
  const layer = onAt(s.on + 2, 10)
  const settingsOpen = s.name === 'Event Map' || s.name === 'Pass Network' ? onAt(s.click + 1, 10) : 0
  const card = hump(f, s.boxIn, s.boxIn + 10, s.click - 8, s.click)

  const h = holder(m)
  const passDraw = progress(f, s.on + 2, s.on + 26, (t) => t)
  const passFade = 1 - clamp01((m - KEY_PASS.from) / 0.15)

  const clicks = [s.click, ...(s.turnOn !== undefined ? [s.turnOn] : [])]
  const down = clicks.some((c) => f >= c && f < c + 4)
  const dark = Math.max(s === SEGS[0] ? 0 : 1 - progress(f, s.start, s.start + DIP), progress(f, s.end - DIP, s.end))

  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <clipPath id="ov-pitch">
            <rect x={P({ x: -52.5, y: 34 }).x} y={P({ x: -52.5, y: 34 }).y} width={105 * k} height={68 * k} />
          </clipPath>
          <filter id="ov-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={k * 1.3} />
          </filter>
        </defs>

        <Pitch view={VIEW} bottom={H} players={pos} ball={ballPos(m)}>
          {s.name === 'Pitch Control' && layer > 0 && <PitchControlLayer pos={pos} opacity={layer} />}
          {s.name === 'Voronoi' && layer > 0 && <VoronoiLayer pos={pos} opacity={layer} />}
          {s.name === 'Pass Network' && layer > 0 && <NetworkLayer pos={pos} opacity={layer} />}
          {s.name === 'Event Map' && <EventMapLayer show={progress(f, s.on + 2, s.on + 30, (t) => t)} />}
          {s.name === 'Sequence Trails' && layer > 0 && <TrailsLayer m={m} opacity={layer} />}
          {s.name === 'Pass Probability' && layer > 0 && <PassLinesLayer pos={pos} draw={passDraw} opacity={layer * passFade} />}
          {h !== null && <circle cx={P(pos[h]).x} cy={P(pos[h]).y} r={DOT_R + 0.75 * k} fill="none" stroke={MARK.possession} strokeWidth={0.42 * k} />}
        </Pitch>
        {s.name === 'Pass Probability' && layer > 0 && <PassLabels pos={pos} draw={passDraw} opacity={layer * passFade} />}

        <Pill x={VIEW.cx} y={PITCH_TOP + 34} text={s.name} size={24} opacity={lit * (1 - card)} />

        <Controls playing={f >= s.on + s.hold && f < s.end} clip={clip} clipLen={CLIP_LEN} match={fmt(67 * 60 + 5 + m)} cursor={cursor} left={PANEL_W} />
        <OverlaysPanel
          cursor={cursor}
          on={{ [s.name]: lit }}
          settings={
            s.name === 'Event Map' ? <EventMapSettings show={settingsOpen} /> : s.name === 'Pass Network' ? <PassNetworkSettings show={settingsOpen} on={f >= s.on} cursor={cursor} /> : null
          }
        />
        <AppBar />

        <NameCard s={s} show={card} />

        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1} down={down} clicks={clicks.map((c) => (f - c) / 10)} />
        </g>

        <rect width={W} height={H} fill="#000" opacity={dark} />
      </svg>
    </AbsoluteFill>
  )
}

