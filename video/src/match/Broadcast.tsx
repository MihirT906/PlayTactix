// The match picture on the laptop in Act 2, and under Act 3's app until a moment is picked.
// A real 3D camera over a 105x68m pitch: tilt 0 is a broadcast angle, tilt 1 is Tapp'd's top-down plot.
// Player positions are pure functions of game time, so scrubbing and stepping look right.
import type { Pt } from '../anim'
import { clamp01, lerp } from '../anim'

export const BW = 640
export const BH = 356

// ---------------- Players (metres; x along the pitch, y across, attack goes +x) ----------------

type Team = 'b' | 'r'
const PLAYERS: { x: number; y: number; team: Team; num: number }[] = [
  { x: 12, y: -4, team: 'b', num: 8 }, // 0 passer
  { x: 24, y: -20, team: 'b', num: 11 }, // 1 runner
  { x: 30, y: 4, team: 'b', num: 9 },
  { x: 26, y: 18, team: 'b', num: 7 },
  { x: 5, y: 10, team: 'b', num: 10 },
  { x: 2, y: -14, team: 'b', num: 6 },
  { x: -18, y: -22, team: 'b', num: 2 },
  { x: -22, y: -6, team: 'b', num: 4 },
  { x: -22, y: 8, team: 'b', num: 5 },
  { x: -16, y: 24, team: 'b', num: 3 },
  { x: -46, y: 0, team: 'b', num: 1 },
  { x: 50, y: 0, team: 'r', num: 1 },
  { x: 38, y: -16, team: 'r', num: 2 },
  { x: 40, y: -5, team: 'r', num: 4 },
  { x: 40, y: 7, team: 'r', num: 5 },
  { x: 36, y: 20, team: 'r', num: 3 },
  { x: 26, y: -8, team: 'r', num: 6 }, // presses the passer
  { x: 24, y: 8, team: 'r', num: 8 },
  { x: 18, y: -1, team: 'r', num: 10 },
  { x: 14, y: 14, team: 'r', num: 7 },
  { x: 6, y: -2, team: 'r', num: 9 },
  { x: -4, y: 6, team: 'r', num: 11 },
]
export const PASSER = 0
export const RUNNER = 1
export const PASS_AT = 4029.15
const GOAL_TIME = 67 * 60 + 12 // the score bar shows 1–0 from here
const OFF_BALL_RUNNER = 2

/** Who has the ball: the passer until the pass arrives, then the runner. */
function holderAt(gt: number) {
  const ball = ballPos(gt)
  const r = playerPos(RUNNER, gt)
  return gt > PASS_AT && Math.hypot(ball.x - r.x, ball.y - r.y) < 1 ? RUNNER : PASSER
}

/** The n players of a team nearest to player i. */
function nearest(i: number, gt: number, team: Team, n: number) {
  const p = playerPos(i, gt)
  return PLAYERS.map((_, j) => j)
    .filter((j) => j !== i && j !== OFF_BALL_RUNNER && PLAYERS[j].team === team)
    .sort((a, b) => {
      const pa = playerPos(a, gt)
      const pb = playerPos(b, gt)
      return Math.hypot(pa.x - p.x, pa.y - p.y) - Math.hypot(pb.x - p.x, pb.y - p.y)
    })
    .slice(0, n)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function playerPos(i: number, gt: number): Pt {
  const b = PLAYERS[i]
  const amp = i === 10 || i === 11 ? 1.5 : 6
  let x = b.x + amp * Math.sin(gt * 0.11 + i * 1.7)
  let y = b.y + amp * 0.5 * Math.sin(gt * 0.07 + i * 2.3)
  if (i === RUNNER) {
    // The runner bursts in behind once the pass is played.
    const run = clamp(gt - (PASS_AT - 1), 0, 4) * 5
    x += run
    y += run * 0.45
  }
  return { x: clamp(x, -52, 52), y: clamp(y, -33, 33) }
}

export function ballPos(gt: number): Pt {
  if (gt > PASS_AT - 3 && gt < PASS_AT + 9) {
    const passer = playerPos(PASSER, gt)
    const foot = { x: passer.x + 0.6, y: passer.y }
    const runner = playerPos(RUNNER, gt)
    const d = Math.hypot(runner.x - foot.x, runner.y - foot.y) || 1
    const travel = Math.min(d, Math.max(0, gt - PASS_AT) * 18)
    return { x: foot.x + ((runner.x - foot.x) / d) * travel, y: foot.y + ((runner.y - foot.y) / d) * travel }
  }
  // Away from the pass, the ball goes round the players: each holds it for a few seconds, then passes it on.
  const slot = Math.floor(gt / 5)
  const at = (n: number) => {
    const p = playerPos(n % 22, gt)
    return { x: p.x + 0.6, y: p.y }
  }
  const t = clamp01((gt - slot * 5 - 4.3) / 0.7)
  const a = at(slot)
  const b = at(slot + 1)
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

// ---------------- Camera ----------------

const FOCAL = 1000
type Cam = { pos: [number, number, number]; right: [number, number, number]; up: [number, number, number]; fwd: [number, number, number]; cx: number; cy: number }

function makeCam(tilt: number): Cam {
  const t = tilt
  const phi = (lerp(24, 90, t) * Math.PI) / 180
  const d = lerp(95, 238, t)
  const target = [lerp(22, 0, t), lerp(2, 0, t), 0]
  const fwd: [number, number, number] = [0, Math.cos(phi), -Math.sin(phi)]
  const up: [number, number, number] = [0, Math.sin(phi), Math.cos(phi)]
  const pos: [number, number, number] = [target[0], target[1] - d * Math.cos(phi), d * Math.sin(phi)]
  return { pos, right: [1, 0, 0], up, fwd, cx: BW / 2, cy: BH / 2 + lerp(0, 14, t) }
}

const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Project a pitch point (metres) to screen; also returns pixels-per-metre at that depth. */
function project(cam: Cam, x: number, y: number, z = 0) {
  const v = [x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]]
  const depth = Math.max(0.1, dot3(v, cam.fwd))
  const s = FOCAL / depth
  return { x: cam.cx + dot3(v, cam.right) * s, y: cam.cy - dot3(v, cam.up) * s, s }
}

// ---------------- Colours (muted broadcast → full-colour app) ----------------

export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`
}

export const APP = {
  navy: '#233d4d',
  frame: '#1b2b36',
  accent: '#fe7f2d',
  possession: '#FFD60A',
  option: '#32D7FF',
  press: '#FF4D9D',
  run: '#FF6B3D',
}

// ---------------- Drawing ----------------

const poly = (cam: Cam, pts: [number, number][]) =>
  pts
    .map(([x, y]) => {
      const p = project(cam, x, y)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')

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
  return [
    [
      [-L, -W],
      [L, -W],
      [L, W],
      [-L, W],
      [-L, -W],
    ],
    [
      [0, -W],
      [0, W],
    ],
    circle,
    box(1, 16.5, 20.16),
    box(-1, 16.5, 20.16),
    box(1, 5.5, 9.16),
    box(-1, 5.5, 9.16),
  ]
}
const LINES = pitchLines()

const Stands = ({ cam, opacity }: { cam: Cam; opacity: number }) => {
  if (opacity <= 0) return null
  const wall = (y: number, z0: number, z1: number) => {
    const a = project(cam, -90, y, z0)
    const b = project(cam, 90, y, z0)
    const c = project(cam, 90, y, z1)
    const d = project(cam, -90, y, z1)
    return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`
  }
  const dots = []
  const colors = ['#4b525c', '#5a616b', '#6a5f5a', '#525a66']
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 60; c++) {
      const p = project(cam, -75 + c * 2.5 + (r % 2) * 1.25, 40 + r * 1.2, 2.5 + r * 2.2)
      dots.push(<circle key={`${r}-${c}`} cx={p.x} cy={p.y} r={Math.max(1, 0.55 * p.s)} fill={colors[(r * 7 + c * 3) % 4]} />)
    }
  return (
    <g opacity={opacity}>
      <polygon points={wall(40, 0, 16)} fill="#2b3138" />
      {dots}
      <polygon points={wall(36.5, 0, 1)} fill="#3a424c" />
    </g>
  )
}

/** The match clock, m:ss. */
function fmt(gt: number) {
  const total = Math.floor(gt)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const SANS = 'Helvetica Neue, Arial, sans-serif'

/** Tapp'd's top bar, dropping in over the plot. */
export const APP_BAR_H = 30

/** `saved` turns the Save Project button's dot into a tick and lights its outline. */
export const AppBar = ({ show, saved = 0 }: { show: number; saved?: number }) => {
  if (show <= 0) return null
  const y = lerp(-34, 0, show)
  return (
    <g transform={`translate(0 ${y})`}>
      <rect width={BW} height={30} fill={APP.navy} />
      <rect y={29} width={BW} height={1} fill="#36566a" />
      <path d="M14 21 L22 9 M18 9 L26 21" stroke={APP.accent} strokeWidth={2.5} strokeLinecap="round" />
      <text x={32} y={21} fontFamily={SANS} fontSize={15} fontWeight={800} fontStyle="italic" fill="#fff">
        TAPP'D
      </text>
      <text x={112} y={20} fontFamily={SANS} fontSize={10} fill="#c7d3db">
        Choose Match
      </text>
      <rect x={498} y={7} width={70} height={16} rx={3} fill="none" stroke={saved > 0 ? mix('#4d6b7d', APP.accent, saved) : '#4d6b7d'} />
      {saved < 1 && <circle cx={506} cy={15} r={2 * (1 - saved)} fill={APP.accent} />}
      {saved > 0 && (
        <path d="M503 15 L505.5 17.5 L509.5 12" stroke="#5fd68f" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={saved} />
      )}
      <text x={536} y={18.5} fontFamily={SANS} fontSize={8.5} fill="#e4ecf0" textAnchor="middle">
        Save Project
      </text>
      <text x={600} y={18.5} fontFamily={SANS} fontSize={8.5} fill="#e4ecf0" textAnchor="middle">
        Docs
      </text>
    </g>
  )
}

export const Broadcast = ({
  gt,
  tilt = 0,
  markers = 0,
  appBar = 0,
}: {
  gt: number
  tilt?: number // 0 broadcast angle → 1 Tapp'd top-down
  markers?: number // Tapp'd markers fade-in
  appBar?: number // Tapp'd top bar slide-in
}) => {
  const cam = makeCam(tilt)
  const app = clamp01((tilt - 0.35) / 0.65) // how far colours have moved to the app palette
  const hud = 1 - clamp01(tilt * 4)
  const figureOpacity = 1 - clamp01((tilt - 0.55) / 0.3)
  const dotOpacity = clamp01((tilt - 0.6) / 0.3)

  const grass = mix('#557159', '#3d7a33', app)
  const stripe = mix('#5d7a61', '#478a3b', app)
  const line = mix('#a9c7b0', '#e6efe6', app)
  const teamColor = (t: Team) => (t === 'b' ? mix('#5f7fa6', '#2f6fdb', app) : mix('#b5645c', '#e03b3b', app))

  const stripes = []
  for (let k = 0; k < 12; k += 2) {
    const x0 = -52.5 + k * 8.75
    stripes.push(<polygon key={k} points={poly(cam, [[x0, -34], [x0 + 8.75, -34], [x0 + 8.75, 34], [x0, 34]])} fill={stripe} />)
  }

  const people = PLAYERS.map((p, i) => {
    const pos = playerPos(i, gt)
    const feet = project(cam, pos.x, pos.y, 0)
    const head = project(cam, pos.x, pos.y, 1.75)
    return { i, team: p.team, num: p.num, feet, head, depth: feet.s }
  }).sort((a, b) => a.depth - b.depth)

  const ball = ballPos(gt)
  const bp = project(cam, ball.x, ball.y, 0.11)
  const pxm = project(cam, 0, 0).s // pixels per metre near the centre
  const dotR = Math.max(3.5, 1.15 * pxm)
  const goal = gt >= GOAL_TIME

  const at = (i: number) => project(cam, playerPos(i, gt).x, playerPos(i, gt).y)
  const holder = holderAt(gt)
  const options = nearest(holder, gt, 'b', 2)
  const presser = nearest(holder, gt, 'r', 1)[0]
  const mover = playerPos(OFF_BALL_RUNNER, gt)
  const runFrom = project(cam, mover.x, mover.y)
  const runTo = project(cam, mover.x + 10, mover.y - 3)

  return (
    <g>
      <rect width={BW} height={BH} fill={mix('#557159', APP.frame, app)} />
      <polygon points={poly(cam, [[-58, -38], [58, -38], [58, 38], [-58, 38]])} fill={mix('#557159', '#2f5f2a', app)} />
      <polygon points={poly(cam, [[-52.5, -34], [52.5, -34], [52.5, 34], [-52.5, 34]])} fill={grass} />
      {stripes}
      <Stands cam={cam} opacity={1 - clamp01(tilt * 2.2)} />
      <g fill="none" stroke={line} strokeWidth={lerp(2.5, 1.4, app)} strokeLinejoin="round">
        {LINES.map((l, i) => (
          <polyline key={i} points={poly(cam, l)} />
        ))}
      </g>

      {/* Tapp'd markers: off-ball run, passing options, pressure, possession */}
      {markers > 0 && (
        <g opacity={markers}>
          <line x1={runFrom.x} y1={runFrom.y} x2={runTo.x} y2={runTo.y} stroke={APP.run} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
        </g>
      )}

      {people.map(({ i, team, num, feet, head }) => {
        const w = Math.max(2, 0.55 * feet.s)
        return (
          <g key={i}>
            {figureOpacity > 0 && (
              <g opacity={figureOpacity}>
                <ellipse cx={feet.x} cy={feet.y} rx={0.5 * feet.s} ry={0.16 * feet.s} fill="#000" opacity={0.25} />
                <line x1={feet.x} y1={feet.y - w / 2} x2={head.x} y2={head.y + w} stroke={teamColor(team)} strokeWidth={w * 1.6} strokeLinecap="round" />
                <circle cx={head.x} cy={head.y} r={w * 0.9} fill={teamColor(team)} />
              </g>
            )}
            {dotOpacity > 0 && (
              <g opacity={dotOpacity}>
                <circle cx={feet.x} cy={feet.y} r={dotR} fill={teamColor(team)} stroke="#0d1a22" strokeWidth={0.8} />
                <text x={feet.x} y={feet.y + dotR * 0.38} fontFamily={SANS} fontSize={dotR * 1.05} fontWeight={700} fill="#fff" textAnchor="middle">
                  {num}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {markers > 0 && (
        <g opacity={markers} fill="none" strokeWidth={1.8}>
          <circle cx={at(holder).x} cy={at(holder).y} r={dotR + 3} stroke={APP.possession} />
          {options.map((i) => (
            <circle key={i} cx={at(i).x} cy={at(i).y} r={dotR + 3} stroke={APP.option} />
          ))}
          <circle cx={at(presser).x} cy={at(presser).y} r={dotR + 3} stroke={APP.press} />
        </g>
      )}

      <circle cx={bp.x} cy={bp.y} r={Math.max(2.4, 0.32 * bp.s)} fill="#ffffff" stroke="#1d2128" strokeWidth={0.8} />

      {/* The broadcast's score bar, gone as the camera tilts up. */}
      {hud > 0 && (
        <g opacity={hud}>
          <rect x={12} y={72} width={176} height={26} rx={4} fill="#1d2128" opacity={0.9} />
          <text x={22} y={90} fontFamily={SANS} fontSize={14} fontWeight={700} fill="#f2efe6">
            BLU {goal ? 1 : 0} – 0 RED
          </text>
          <text x={178} y={90} fontFamily="Menlo, monospace" fontSize={14} fontWeight={700} fill="#e9d38a" textAnchor="end">
            {fmt(gt)}
          </text>
        </g>
      )}

      <AppBar show={appBar} />
    </g>
  )
}
