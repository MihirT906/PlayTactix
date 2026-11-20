// CH 7: a basketball studio show. A pundit walks along the stage and points up at the giant screen; the play
// freezes and a ring pops round a player. Drawn in TV space (1600x900). Every team, name and channel is made up.
import { armPath, lerp, progress, smooth, type Pt } from '../../anim'
import { seeded } from '../random'
import { Bug } from './Broadcast'

// The giant screen on the back wall of the studio.
const WALL = { x: 230, y: 60, w: 1140, h: 470 }
const FREEZE = 30 // frame (from the channel coming on) the play freezes
const RING_AT = 34
const ARROW = { from: 42, to: 52 }

type Team = { jersey: string; num: string; skin: string }
const RED: Team = { jersey: '#c0493a', num: '#f2efe6', skin: '#8a6248' }
const DARK: Team = { jersey: '#2b2d33', num: '#c9a640', skin: '#6e4c38' }

type P = { x: number; y: number; vx: number; vy: number; team: Team; num: number }
const PLAYERS: P[] = [
  { x: 470, y: 330, vx: 30, vy: 4, team: RED, num: 7 },
  { x: 640, y: 300, vx: 22, vy: 0, team: RED, num: 23 },
  { x: 1020, y: 432, vx: 55, vy: -8, team: RED, num: 2 }, // the one that gets ringed
  { x: 900, y: 290, vx: 18, vy: 6, team: RED, num: 11 },
  { x: 1240, y: 360, vx: 10, vy: 0, team: RED, num: 4 },
  { x: 560, y: 470, vx: 26, vy: -4, team: DARK, num: 0 },
  { x: 820, y: 360, vx: 34, vy: 0, team: DARK, num: 13 },
  { x: 1120, y: 330, vx: 20, vy: 4, team: DARK, num: 9 },
  { x: 1300, y: 440, vx: 12, vy: -6, team: DARK, num: 3 },
]
const TARGET = 2

const playT = (c: number) => Math.min(c, FREEZE) / 30
const posOf = (p: P, c: number): Pt => ({ x: p.x + p.vx * playT(c), y: p.y + p.vy * playT(c) })
const scaleAt = (y: number) => 0.55 + ((y - 230) / 300) * 0.5

const CourtPlayer = ({ p, c }: { p: P; c: number }) => {
  const { x, y } = posOf(p, c)
  const run = c < FREEZE ? Math.sin(c * 0.6 + p.num) * 8 : 4
  return (
    <g transform={`translate(${x} ${y}) scale(${scaleAt(y)})`}>
      <ellipse rx={26} ry={6} fill="#000" opacity={0.15} />
      <path d={`M-8 -46 L${-10 - run} 0 M8 -46 L${10 + run} 0`} stroke={p.team.skin} strokeWidth={10} strokeLinecap="round" />
      <rect x={-17} y={-66} width={34} height={26} rx={6} fill={p.team.jersey} />
      <path d="M-20 -120 L20 -120 L16 -64 L-16 -64 Z" fill={p.team.jersey} />
      <path d={`M-20 -114 L${-28} -78 M20 -114 L28 -78`} stroke={p.team.skin} strokeWidth={9} strokeLinecap="round" />
      <text y={-84} fontFamily="Helvetica Neue, Arial, sans-serif" fontSize={22} fontWeight={800} fill={p.team.num} textAnchor="middle">
        {p.num}
      </text>
      <circle cy={-136} r={15} fill={p.team.skin} />
    </g>
  )
}

const rand = seeded(7)
const CROWD = Array.from({ length: 9 }, (_, row) =>
  Array.from({ length: 92 }, (_, col) => ({
    x: WALL.x + col * 12.5 + (row % 2) * 6,
    y: WALL.y + 12 + row * 13 + rand() * 3,
    c: ['#d9b23a', '#e2c45a', '#c0493a', '#e9e4d8', '#5a5f6a'][Math.floor(rand() * 5)],
  })),
).flat()

const SKYLINE = Array.from({ length: 9 }, (_, i) => ({ x: i * 26, h: 180 + ((i * 73) % 5) * 60 }))

const Studio = () => (
  <g>
    <rect width={1600} height={900} fill="#1f3354" />
    {/* city skyline panels either side of the screen */}
    {[0, 1380].map((x0) => (
      <g key={x0}>
        <rect x={x0} y={0} width={220} height={620} fill="#2c4a78" />
        {SKYLINE.map((b) => (
          <rect key={b.x} x={x0 + b.x} y={620 - b.h} width={22} height={b.h} fill="#20375c" />
        ))}
        {SKYLINE.map((b) =>
          Array.from({ length: Math.floor(b.h / 40) }, (_, j) => (
            <rect key={`${b.x}-${j}`} x={x0 + b.x + 8} y={620 - b.h + 14 + j * 40} width={6} height={8} fill="#9ec3ef" opacity={0.6} />
          )),
        )}
      </g>
    ))}
    {/* the stage: a metal lip under the screen, two steps, then the studio floor */}
    <rect x={0} y={540} width={1600} height={40} fill="#9aa3ae" />
    <rect x={0} y={580} width={1600} height={70} fill="#15181e" />
    <rect x={0} y={646} width={1600} height={4} fill="#c3ccd8" opacity={0.6} />
    <rect x={0} y={650} width={1600} height={70} fill="#1c2027" />
    <rect x={0} y={716} width={1600} height={4} fill="#c3ccd8" opacity={0.6} />
    <rect x={0} y={720} width={1600} height={180} fill="#4a3e36" />
    <path d="M0 800 L1600 800 M200 720 L60 900 M1400 720 L1540 900" stroke="#b5352f" strokeWidth={10} />
  </g>
)

const Court = ({ c }: { c: number }) => (
  <g>
    <rect x={WALL.x - 18} y={WALL.y - 18} width={WALL.w + 36} height={WALL.h + 36} rx={6} fill="#b8c0ca" />
    <svg x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} viewBox={`${WALL.x} ${WALL.y} ${WALL.w} ${WALL.h}`}>
      <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} fill="#5a4a3a" />
      {CROWD.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={p.c} />
      ))}
      <rect x={WALL.x} y={190} width={WALL.w} height={30} fill="#7a2a24" />
      {[300, 620, 940].map((x) => (
        <rect key={x} x={x} y={195} width={240} height={20} rx={3} fill="#e9e4d8" opacity={0.5} />
      ))}
      <rect x={WALL.x} y={220} width={WALL.w} height={WALL.h} fill="#d8b88a" />
      <rect x={WALL.x} y={220} width={WALL.w} height={50} fill="#cfae7f" />
      <path d="M800 220 L800 530" stroke="#f2ede0" strokeWidth={4} />
      <ellipse cx={800} cy={380} rx={170} ry={62} fill="none" stroke="#f2ede0" strokeWidth={4} />
      <path d="M800 330 L900 380 L800 430 L700 380 Z" fill="#2b2d33" opacity={0.35} />
      <path d={`M${WALL.x} 330 Q420 380 ${WALL.x} 470`} fill="none" stroke="#f2ede0" strokeWidth={4} />
      {PLAYERS.map((p) => posOf(p, c))
        .map((pos, i) => ({ pos, i }))
        .sort((a, b) => a.pos.y - b.pos.y)
        .map(({ i }) => (
          <CourtPlayer key={i} p={PLAYERS[i]} c={c} />
        ))}
      {/* the play freezes with a little flash */}
      <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} fill="#fff" opacity={0.35 * (progress(c, FREEZE, FREEZE + 1) - progress(c, FREEZE + 1, FREEZE + 6))} />
    </svg>
  </g>
)

/** The pundit, from behind: walks along the stage, then points up at the screen. */
const Pundit = ({ c }: { c: number }) => {
  const walkT = progress(c, 4, 26)
  const x = lerp(640, 780, walkT)
  const feet = 860
  const walking = c >= 4 && c < 26
  const stride = walking ? Math.sin((c - 4) * 0.55) * 18 : 0
  const shoulderR = { x: x + 40, y: feet - 268 }
  const shoulderL = { x: x - 40, y: feet - 268 }
  const target = posOf(PLAYERS[TARGET], c)
  const pointT = progress(c, 22, 30, smooth)
  const restR = { x: x + 52, y: feet - 130 }
  const pointAt = { x: lerp(shoulderR.x, target.x, 0.5), y: lerp(shoulderR.y, target.y - 60, 0.6) }
  const handR = { x: lerp(restR.x, pointAt.x, pointT), y: lerp(restR.y, pointAt.y, pointT) }
  const handL = { x: x - 60, y: feet - 128 }
  const SUIT = '#c9ccd2'
  const SKIN = '#8a6248'
  return (
    <g>
      <ellipse cx={x} cy={feet} rx={70} ry={12} fill="#000" opacity={0.3} />
      <path d={`M${x - 16} ${feet - 140} L${x - 18 - stride} ${feet - 8} M${x + 16} ${feet - 140} L${x + 18 + stride} ${feet - 8}`} stroke="#b7bac1" strokeWidth={30} strokeLinecap="round" />
      <ellipse cx={x - 20 - stride} cy={feet - 4} rx={20} ry={9} fill="#2a2420" />
      <ellipse cx={x + 20 + stride} cy={feet - 4} rx={20} ry={9} fill="#2a2420" />
      <path d={armPath(shoulderL, handL, 70)} stroke={SUIT} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={handL.x} cy={handL.y} r={11} fill={SKIN} />
      <path d={`M${x - 52} ${feet - 278} Q${x} ${feet - 292} ${x + 52} ${feet - 278} L${x + 44} ${feet - 130} L${x - 44} ${feet - 130} Z`} fill={SUIT} />
      <path d={`M${x} ${feet - 200} L${x} ${feet - 130}`} stroke="#a9adb5" strokeWidth={3} />
      <path d={armPath(shoulderR, handR, 70)} stroke={SUIT} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={handR.x} cy={handR.y} r={11} fill={SKIN} />
      <rect x={x - 12} y={feet - 306} width={24} height={26} fill={SKIN} />
      <circle cx={x} cy={feet - 322} r={28} fill={SKIN} />
      <ellipse cx={x - 8} cy={feet - 334} rx={10} ry={6} fill="#a07658" opacity={0.6} />
    </g>
  )
}

/** The ring and arrow drawn on the giant screen once the play freezes. */
const Ink = ({ c }: { c: number }) => {
  const p = posOf(PLAYERS[TARGET], c)
  const s = scaleAt(p.y)
  const pop = progress(c, RING_AT, RING_AT + 5)
  const over = 1 + 0.25 * Math.sin(Math.PI * pop)
  const arrowT = progress(c, ARROW.from, ARROW.to)
  const cx = p.x
  const cy = p.y - 70 * s
  const a0 = { x: cx + 70 * s, y: p.y - 10 }
  const a1 = { x: cx + 230 * s, y: p.y - 30 }
  const ex = lerp(a0.x, a1.x, arrowT)
  const ey = lerp(a0.y, a1.y, arrowT)
  return (
    <g fill="none" strokeLinecap="round">
      {pop > 0 && (
        <ellipse cx={cx} cy={cy} rx={62 * s * pop * over} ry={92 * s * pop * over} stroke="#ffffff" strokeWidth={7} opacity={pop} />
      )}
      {arrowT > 0 && (
        <g stroke="#ffffff" strokeWidth={7} strokeLinejoin="round">
          <path d={`M${a0.x} ${a0.y} L${ex} ${ey}`} />
          {arrowT > 0.9 && <path d={`M${ex - 22} ${ey - 16} L${ex} ${ey} L${ex - 20} ${ey + 18}`} />}
        </g>
      )}
    </g>
  )
}

export const Basketball = {
  Picture: ({ c }: { c: number }) => (
    <g>
      <Studio />
      <Court c={c} />
      <Pundit c={c} />
      <Bug channel="SPORTS 7" show="COURTSIDE" />
    </g>
  ),
  Ink,
}
