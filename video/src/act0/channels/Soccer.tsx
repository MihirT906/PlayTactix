// CH 9: a soccer tactics touchscreen. A pundit's arm reaches in and drags one player disc into space,
// leaving a dashed trail. Drawn in TV space (1600x900). Every team, name and channel is made up.
import { type Pt, lerp, lerpPt, progress, quadAt, type Quad } from '../../anim'
import { Bug } from './Broadcast'

const PITCH = { x: 275, y: 130, w: 1050, h: 680 } // 10px per metre on a 105x68 pitch
const m = (mx: number, my: number): Pt => ({ x: PITCH.x + PITCH.w / 2 + mx * 10, y: PITCH.y + PITCH.h / 2 + my * 10 })

const RED = '#c0493a'
const WHITE = '#e9e6dc'

const DISCS: { at: Pt; colour: string; num: number }[] = [
  { at: m(-48, 0), colour: RED, num: 1 },
  { at: m(-33, -24), colour: RED, num: 3 },
  { at: m(-36, -8), colour: RED, num: 5 },
  { at: m(-36, 8), colour: RED, num: 6 },
  { at: m(-33, 24), colour: RED, num: 2 },
  { at: m(-16, -26), colour: RED, num: 11 }, // the one that gets dragged
  { at: m(-19, -9), colour: RED, num: 8 },
  { at: m(-19, 9), colour: RED, num: 4 },
  { at: m(-16, 26), colour: RED, num: 7 },
  { at: m(-5, -8), colour: RED, num: 10 },
  { at: m(-5, 8), colour: RED, num: 9 },
  { at: m(48, 0), colour: WHITE, num: 1 },
  { at: m(33, -24), colour: WHITE, num: 2 },
  { at: m(36, -8), colour: WHITE, num: 5 },
  { at: m(36, 8), colour: WHITE, num: 4 },
  { at: m(33, 24), colour: WHITE, num: 3 },
  { at: m(20, -14), colour: WHITE, num: 8 },
  { at: m(22, 0), colour: WHITE, num: 6 },
  { at: m(20, 14), colour: WHITE, num: 10 },
  { at: m(9, -24), colour: WHITE, num: 7 },
  { at: m(7, 0), colour: WHITE, num: 9 },
  { at: m(9, 24), colour: WHITE, num: 11 },
]
const DRAGGED = 5
// The drag: up the wing and in behind the white full-back.
const DRAG: Quad = [DISCS[DRAGGED].at, m(4, -34), m(22, -27)]

// Frames from the channel coming on.
const REACH = { from: 4, to: 14 }
const PRESS = 15
const DRAG_T = { from: 17, to: 40 }
const DROP = 41
const ARROW = { from: 41, to: 47 }
const WITHDRAW = { from: 48, to: 60 }

const dragT = (c: number) => progress(c, DRAG_T.from, DRAG_T.to)
const draggedAt = (c: number) => quadAt(DRAG, dragT(c))

const Disc = ({ at, colour, num, lifted = 0 }: { at: Pt; colour: string; num: number; lifted?: number }) => {
  const dark = colour === RED ? '#8a3027' : '#a9a69c'
  const text = colour === RED ? '#f4f1ea' : '#2b2d33'
  return (
    <g transform={`translate(${at.x} ${at.y - lifted * 6}) scale(${1 + lifted * 0.12})`}>
      <ellipse cx={3} cy={8 + lifted * 6} rx={30} ry={14} fill="#000" opacity={0.25} />
      <circle r={28} fill={dark} />
      <circle cy={-4} r={26} fill={colour} />
      <ellipse cx={-8} cy={-14} rx={11} ry={6} fill="#fff" opacity={0.45} />
      <text y={4} fontFamily="Helvetica Neue, Arial, sans-serif" fontSize={22} fontWeight={800} fill={text} textAnchor="middle">
        {num}
      </text>
    </g>
  )
}

const Board = () => (
  <g>
    <rect width={1600} height={900} fill="#1d2a44" />
    <rect x={40} y={30} width={1520} height={840} rx={18} fill="#0f1218" />
    <rect x={70} y={60} width={1460} height={780} rx={8} fill="#2f6b38" />
    {Array.from({ length: 10 }, (_, i) => (
      <rect key={i} x={PITCH.x + i * 105} y={PITCH.y} width={52.5} height={PITCH.h} fill="#367a40" />
    ))}
    <g stroke="#e9f2e4" strokeWidth={4} fill="none" opacity={0.85}>
      <rect x={PITCH.x} y={PITCH.y} width={PITCH.w} height={PITCH.h} />
      <path d={`M800 ${PITCH.y} V${PITCH.y + PITCH.h}`} />
      <circle cx={800} cy={470} r={91.5} />
      <rect x={PITCH.x} y={470 - 201.5} width={165} height={403} />
      <rect x={PITCH.x + PITCH.w - 165} y={470 - 201.5} width={165} height={403} />
      <rect x={PITCH.x} y={470 - 91.5} width={55} height={183} />
      <rect x={PITCH.x + PITCH.w - 55} y={470 - 91.5} width={55} height={183} />
    </g>
    {/* toolbars down each side: pen, undo, pointer, clear */}
    {[150, 1450].map((x) => (
      <g key={x} stroke="#cfe0d0" strokeWidth={4} fill="none" opacity={0.7}>
        <rect x={x - 18} y={300} width={36} height={36} rx={4} />
        <path d={`M${x + 14} ${400} H${x - 10} M${x - 2} ${390} L${x - 12} ${400} L${x - 2} ${410}`} />
        <path d={`M${x - 12} ${460} L${x + 12} ${484} M${x - 12} ${460} V${478} M${x - 12} ${460} H${x + 6}`} />
        <path d={`M${x - 14} ${540} L${x + 14} ${568} M${x + 14} ${540} L${x - 14} ${568}`} />
      </g>
    ))}
  </g>
)

/** The pundit, from behind in the bottom-right corner, reaching up with the index finger out. */
const SUIT = '#2a2f3a'
const SHOULDER = { x: 1290, y: 930 }
const SEG = 470

function elbowFor(tip: Pt): Pt {
  // The elbow bends outwards, to the right of the line from shoulder to fingertip.
  const dx = tip.x - SHOULDER.x
  const dy = tip.y - SHOULDER.y
  const d = Math.hypot(dx, dy)
  const h = d < 2 * SEG ? Math.sqrt(SEG * SEG - (d / 2) ** 2) : 0
  let px = -dy / d
  let py = dx / d
  if (px < 0) {
    px = -px
    py = -py
  }
  return { x: (SHOULDER.x + tip.x) / 2 + px * h, y: (SHOULDER.y + tip.y) / 2 + py * h }
}

const Pundit = ({ tip }: { tip: Pt }) => {
  const elbow = elbowFor(tip)
  const d = Math.hypot(tip.x - elbow.x, tip.y - elbow.y)
  const u = { x: (tip.x - elbow.x) / d, y: (tip.y - elbow.y) / d }
  const along = (k: number) => ({ x: tip.x - u.x * k, y: tip.y - u.y * k })
  const knuckle = along(58)
  const palm = along(96)
  const wrist = along(134)
  const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI
  return (
    <g>
      {/* back and head, half out of frame */}
      <ellipse cx={1430} cy={1000} rx={300} ry={150} fill={SUIT} />
      <rect x={1405} y={790} width={60} height={70} fill="#8a6248" />
      <ellipse cx={1435} cy={765} rx={84} ry={96} fill="#2b2420" />
      {/* the arm: outline first so it reads against the board */}
      <path d={`M${SHOULDER.x} ${SHOULDER.y} L${elbow.x} ${elbow.y} L${wrist.x} ${wrist.y}`} stroke="#12151b" strokeWidth={104} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${SHOULDER.x} ${SHOULDER.y} L${elbow.x} ${elbow.y} L${wrist.x} ${wrist.y}`} stroke={SUIT} strokeWidth={92} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={wrist.x} cy={wrist.y} r={36} fill="#e9e6dc" />
      <ellipse cx={palm.x} cy={palm.y} rx={46} ry={34} fill="#c99a7b" transform={`rotate(${angle} ${palm.x} ${palm.y})`} />
      <path d={`M${knuckle.x} ${knuckle.y} L${tip.x} ${tip.y}`} stroke="#c99a7b" strokeWidth={24} strokeLinecap="round" />
      <path d={`M${palm.x - u.y * 30} ${palm.y + u.x * 30} L${knuckle.x - u.y * 22 - u.x * 6} ${knuckle.y + u.x * 22 - u.y * 6}`} stroke="#b88a6c" strokeWidth={20} strokeLinecap="round" />
    </g>
  )
}

const tipAt = (c: number): Pt => {
  const start = { x: 1150, y: 1000 }
  const disc = DISCS[DRAGGED].at
  if (c < REACH.to) return lerpPt(start, disc, progress(c, REACH.from, REACH.to))
  if (c < WITHDRAW.from) return draggedAt(c)
  const end = DRAG[2]
  return lerpPt(end, { x: end.x + 40, y: end.y + 300 }, progress(c, WITHDRAW.from, WITHDRAW.to))
}

const Picture = ({ c }: { c: number }) => {
  const lifted = c >= PRESS && c < DROP ? 1 : 0
  return (
    <g>
      <Board />
      {DISCS.map((d, i) => (i === DRAGGED ? null : <Disc key={i} {...d} />))}
      <Disc {...DISCS[DRAGGED]} at={draggedAt(c)} lifted={lifted} />
      <Pundit tip={tipAt(c)} />
      <Bug channel="SPORTS 9" show="MATCH NIGHT" />
    </g>
  )
}

/** The selection ring while the disc is held, then a dashed trail and an arrowhead where it lands. */
const Ink = ({ c }: { c: number }) => {
  const t = dragT(c)
  const held = c >= PRESS && c < DROP
  const at = draggedAt(c)
  const pts: string[] = []
  // The trail stops at the disc's edge, so it never draws over the disc.
  for (let i = 0; i <= 40; i++) {
    const p = quadAt(DRAG, (t * i) / 40)
    if (Math.hypot(p.x - at.x, p.y - at.y) > 36) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  }
  const arrow = progress(c, ARROW.from, ARROW.to)
  const end = DRAG[2]
  const back = quadAt(DRAG, 0.9)
  const dir = { x: Math.cos(Math.atan2(end.y - back.y, end.x - back.x)), y: Math.sin(Math.atan2(end.y - back.y, end.x - back.x)) }
  const tipPt = { x: end.x - dir.x * 36, y: end.y - dir.y * 36 }
  const head = (s: number) => ({
    x: tipPt.x - dir.x * 22 * arrow - dir.y * s * 16 * arrow,
    y: tipPt.y - dir.y * 22 * arrow + dir.x * s * 16 * arrow,
  })
  return (
    <g fill="none" strokeLinecap="round">
      {pts.length > 1 && <polyline points={pts.join(' ')} stroke="#f4f1ea" strokeWidth={6} strokeDasharray="14 14" opacity={0.9} />}
      {held && <circle cx={at.x} cy={at.y - 6} r={lerp(40, 44, Math.sin(c * 0.5) * 0.5 + 0.5)} stroke="#f4e23c" strokeWidth={6} />}
      {arrow > 0 && (
        <path d={`M${head(-1).x} ${head(-1).y} L${tipPt.x} ${tipPt.y} L${head(1).x} ${head(1).y}`} stroke="#f4f1ea" strokeWidth={7} strokeLinejoin="round" />
      )}
    </g>
  )
}

export const Soccer = { Picture, Ink }
