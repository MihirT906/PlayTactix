// CH 4: an American football broadcast, frozen before the snap, with telestrator scribbles drawing themselves on.
// Drawn in TV space (1600x900). Every team, name and channel here is made up.
import { linear, progress } from '../../anim'
import { seeded } from '../random'
import { ScoreBar, Bug } from './Broadcast'

const HORIZON = 330 // top of the field
const BOTTOM = 900

// Bigger the nearer the camera (lower on screen).
const depth = (y: number) => 0.35 + ((y - HORIZON) / (BOTTOM - HORIZON)) * 0.9

type Team = { jersey: string; pants: string; helmet: string; num: string }
const OFFENSE: Team = { jersey: '#3e7c80', pants: '#e6e0d0', helmet: '#3e7c80', num: '#f2efe6' }
const DEFENSE: Team = { jersey: '#b5603c', pants: '#2d2f36', helmet: '#e6e0d0', num: '#f2efe6' }

type P = { x: number; y: number; team: Team; num: number; back: boolean }
const PLAYERS: P[] = [
  // defence, facing the camera
  { x: 470, y: 412, team: DEFENSE, num: 21, back: false },
  { x: 1250, y: 418, team: DEFENSE, num: 32, back: false },
  { x: 650, y: 462, team: DEFENSE, num: 54, back: false },
  { x: 930, y: 458, team: DEFENSE, num: 50, back: false },
  { x: 1150, y: 470, team: DEFENSE, num: 44, back: false },
  { x: 610, y: 512, team: DEFENSE, num: 91, back: false },
  { x: 740, y: 508, team: DEFENSE, num: 97, back: false },
  { x: 870, y: 508, team: DEFENSE, num: 93, back: false },
  { x: 1000, y: 512, team: DEFENSE, num: 99, back: false },
  // offence, backs to the camera
  { x: 610, y: 552, team: OFFENSE, num: 74, back: true },
  { x: 705, y: 548, team: OFFENSE, num: 66, back: true },
  { x: 800, y: 546, team: OFFENSE, num: 52, back: true },
  { x: 895, y: 548, team: OFFENSE, num: 63, back: true },
  { x: 990, y: 552, team: OFFENSE, num: 77, back: true },
  { x: 230, y: 570, team: OFFENSE, num: 18, back: true },
  { x: 1180, y: 590, team: OFFENSE, num: 88, back: true },
  { x: 800, y: 650, team: OFFENSE, num: 12, back: true },
  { x: 930, y: 700, team: OFFENSE, num: 28, back: true },
  { x: 1430, y: 760, team: OFFENSE, num: 15, back: true },
].sort((a, b) => a.y - b.y)

const Player = ({ x, y, team, num, back }: P) => (
  <g transform={`translate(${x} ${y}) scale(${depth(y)})`}>
    <ellipse cx={0} cy={0} rx={30} ry={7} fill="#000" opacity={0.18} />
    <rect x={-17} y={-52} width={13} height={50} rx={4} fill={team.pants} />
    <rect x={4} y={-52} width={13} height={50} rx={4} fill={team.pants} />
    <rect x={-19} y={-9} width={17} height={9} rx={3} fill="#1a1a1a" />
    <rect x={2} y={-9} width={17} height={9} rx={3} fill="#1a1a1a" />
    <rect x={-21} y={-84} width={42} height={38} rx={8} fill={team.pants} />
    <path d="M-38 -138 Q0 -146 38 -138 L24 -80 L-24 -80 Z" fill={team.jersey} />
    <path d="M-36 -130 L-42 -96" stroke="#8a6a55" strokeWidth={11} strokeLinecap="round" />
    <path d="M36 -130 L42 -96" stroke="#8a6a55" strokeWidth={11} strokeLinecap="round" />
    <text x={0} y={-94} fontFamily="Helvetica Neue, Arial, sans-serif" fontSize={30} fontWeight={800} fill={team.num} textAnchor="middle">
      {num}
    </text>
    <circle cx={0} cy={-158} r={23} fill={team.helmet} />
    {back ? (
      <rect x={-3} y={-180} width={6} height={36} fill={team.jersey} opacity={0.8} />
    ) : (
      <path d="M-14 -152 h28 M-12 -144 h24 M0 -152 v12" stroke="#9aa0a8" strokeWidth={3} strokeLinecap="round" />
    )}
  </g>
)

const rand = seeded(4)
const CROWD_COLOURS = ['#c9a640', '#b5603c', '#e9e4d8', '#3e7c80', '#8a8f99', '#d06a4a', '#5a5f6a']
const CROWD = Array.from({ length: 22 }, (_, row) =>
  Array.from({ length: 128 }, (_, col) => ({
    x: col * 12.6 + (row % 2) * 6 + rand() * 4,
    y: 18 + row * 12.5 + rand() * 3,
    c: CROWD_COLOURS[Math.floor(rand() * CROWD_COLOURS.length)],
  })),
).flat()

// Yard lines, receding towards the stands.
const YARD_LINES = [342, 362, 388, 420, 460, 512, 580, 670, 790]

const Field = () => (
  <g>
    <rect width={1600} height={HORIZON} fill="#3d424c" />
    {CROWD.map((p, i) => (
      <circle key={i} cx={p.x} cy={p.y} r={5} fill={p.c} />
    ))}
    {/* goalposts at the far end */}
    <path d="M770 300 V200 H830 V300 M770 200 V40 M830 200 V40 M800 300 V200" stroke="#d9c34a" strokeWidth={7} fill="none" />
    <rect y={292} width={1600} height={38} fill="#23272f" />
    {[60, 420, 780, 1140].map((x) => (
      <rect key={x} x={x} y={298} width={300} height={26} rx={3} fill="#3a4b6a" />
    ))}

    <rect y={HORIZON} width={1600} height={BOTTOM - HORIZON} fill="#4f8a4a" />
    {YARD_LINES.slice(0, -1).map((y, i) =>
      i % 2 === 0 ? <rect key={y} x={0} y={y} width={1600} height={YARD_LINES[i + 1] - y} fill="#57934f" /> : null,
    )}
    <ellipse cx={800} cy={440} rx={300} ry={46} fill="#3f7a3c" stroke="#e8e4d8" strokeWidth={3} opacity={0.75} />
    <path d="M800 404 L860 440 L800 476 L740 440 Z" fill="#c9a640" opacity={0.5} />
    {YARD_LINES.map((y) => {
      const s = depth(y)
      return (
        <g key={y}>
          <rect x={0} y={y - 1.5 * s} width={1600} height={3 * s} fill="#ece8dc" opacity={0.85} />
          {[-1, 1].map((side) => (
            <rect key={side} x={800 + side * 330 * s - 2} y={y + 8 * s} width={4 * s} height={14 * s} fill="#ece8dc" opacity={0.8} />
          ))}
        </g>
      )
    })}
  </g>
)

// ---------- Scribbles ----------

type Stroke = { d: string; from: number; to: number }

/** A loose circle scribbled round and round a point. */
function spiral(cx: number, cy: number, rx: number, ry: number, loops: number) {
  const n = Math.round(loops * 40)
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * loops * Math.PI * 2
    const wob = 1 + 0.12 * Math.sin(t * 1.7) + 0.06 * Math.sin(t * 4.3)
    const x = cx + rx * wob * Math.cos(t) + 10 * Math.sin(t * 0.5)
    const y = cy + ry * wob * Math.sin(t) + 6 * Math.cos(t * 0.7)
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

// Frames are counted from the moment the channel comes on.
const STROKES: Stroke[] = [
  { d: 'M330 372 Q600 560 870 700', from: 8, to: 17 },
  { d: 'M290 520 Q700 412 1030 448', from: 17, to: 25 },
  { d: 'M420 800 Q700 640 1010 480', from: 25, to: 32 },
  { d: 'M300 742 Q800 690 1260 768 Q1290 730 1268 690', from: 32, to: 40 },
  { d: spiral(1158, 420, 108, 58, 3.4), from: 40, to: 56 },
]

const Scribbles = ({ c }: { c: number }) => (
  <g strokeLinecap="round" strokeLinejoin="round" fill="none">
    {STROKES.map(({ d, from, to }) => {
      const t = progress(c, from, to, linear)
      if (t <= 0) return null
      const dash = { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - t }
      return (
        <g key={d}>
          <path d={d} stroke="#16181c" strokeWidth={15} opacity={0.85} {...dash} />
          <path d={d} stroke="#f4e23c" strokeWidth={8} {...dash} />
        </g>
      )
    })}
  </g>
)

/** The picture itself (washed out by the TV), and the ink drawn over it (kept bright). */
export const Football = {
  Picture: (_: { c: number }) => (
    <g>
      <Field />
      {PLAYERS.map((p) => (
        <Player key={p.num} {...p} />
      ))}
      <Bug channel="SPORTS 4" show="THE BREAKDOWN" />
      <ScoreBar left={['PIKES', '14']} right={['OTTERS', '16']} clock="4TH  12:29" extra="3RD & 8" />
    </g>
  ),
  Ink: Scribbles,
}
