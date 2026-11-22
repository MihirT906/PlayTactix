// The coach: a flat cartoon figure from the waist up, standing in the bottom-left corner beside the plot. Navy
// training top with orange trim, a cap and a whistle. His arms stay down and his mouth moves while a bubble is up.
// He doesn't point: the Palm below, a cartoon hand in his style, is the cursor that shows what he's talking about.
import type { Pt } from '../../anim'

const SKIN = '#c8987a'
const SKIN_SHADE = '#a9785c'
const TOP = '#233d4d'
const TOP_DARK = '#1a2f3c'
const TRIM = '#fe7f2d'
const CAP = '#14232d'
const HAIR = '#2b2420'
const INK = '#14232d'

const COACH = {
  head: { x: 205, y: 838 },
  mouth: { x: 222, y: 878 },
}

type Props = {
  /** 0..1, how open the mouth is right now. */
  talk: number
  /** A gentle bob, in px. */
  bob: number
}

export const Coach = ({ talk, bob }: Props) => {
  const { head } = COACH
  const mouthH = 3 + 9 * talk
  return (
    <g transform={`translate(0 ${bob})`}>
      {/* the far arm, hanging by his side */}
      <path d="M128 950 Q100 1010 104 1100" stroke={TOP_DARK} strokeWidth={50} strokeLinecap="round" fill="none" />

      {/* body: training top */}
      <path d="M92 1100 Q96 960 150 925 Q205 900 260 925 Q312 958 318 1100 Z" fill={TOP} />
      {/* shoulder trim and the zip */}
      <path d="M118 958 Q150 925 205 920 Q260 925 292 958" stroke={TRIM} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M205 935 L205 1100" stroke={TOP_DARK} strokeWidth={5} />
      <path d="M176 918 L205 952 L234 918" stroke={TOP_DARK} strokeWidth={10} fill="none" strokeLinejoin="round" />

      {/* whistle on a lanyard */}
      <path d="M178 916 Q182 990 214 1010 M232 916 Q228 980 214 1010" stroke={TRIM} strokeWidth={4} fill="none" />
      <g transform="translate(214 1018) rotate(-18)">
        <rect x={-16} y={-8} width={32} height={18} rx={8} fill="#c9d1d6" />
        <rect x={10} y={-6} width={16} height={10} rx={3} fill="#aeb7bd" />
        <circle cx={-6} cy={1} r={4} fill="#8d969c" />
      </g>

      {/* neck and head */}
      <rect x={186} y={880} width={40} height={44} rx={12} fill={SKIN_SHADE} />
      <ellipse cx={head.x - 56} cy={head.y + 6} rx={11} ry={17} fill={SKIN} />
      <ellipse cx={head.x + 56} cy={head.y + 6} rx={11} ry={17} fill={SKIN} />
      <ellipse cx={head.x} cy={head.y} rx={58} ry={66} fill={SKIN} />
      {/* hair at the sides, under the cap */}
      <path d={`M${head.x - 58} ${head.y - 8} Q${head.x - 60} ${head.y - 40} ${head.x - 40} ${head.y - 50} L${head.x - 46} ${head.y - 4} Z`} fill={HAIR} />
      <path d={`M${head.x + 58} ${head.y - 8} Q${head.x + 60} ${head.y - 40} ${head.x + 40} ${head.y - 50} L${head.x + 46} ${head.y - 4} Z`} fill={HAIR} />
      {/* cap, brim toward the pitch */}
      <path d={`M${head.x - 60} ${head.y - 22} Q${head.x - 58} ${head.y - 84} ${head.x} ${head.y - 86} Q${head.x + 58} ${head.y - 84} ${head.x + 60} ${head.y - 22} Z`} fill={CAP} />
      <path d={`M${head.x - 60} ${head.y - 24} L${head.x + 60} ${head.y - 24}`} stroke={TRIM} strokeWidth={6} />
      <path d={`M${head.x + 6} ${head.y - 26} Q${head.x + 70} ${head.y - 34} ${head.x + 98} ${head.y - 18} Q${head.x + 60} ${head.y - 12} ${head.x + 6} ${head.y - 16} Z`} fill={CAP} />
      {/* face */}
      <ellipse cx={head.x - 18} cy={head.y + 2} rx={6} ry={7.5} fill="#1d1d1d" />
      <ellipse cx={head.x + 24} cy={head.y + 2} rx={6} ry={7.5} fill="#1d1d1d" />
      <path d={`M${head.x - 30} ${head.y - 13} l16 -3 M${head.x + 14} ${head.y - 16} l16 3`} stroke={HAIR} strokeWidth={4} strokeLinecap="round" />
      <path d={`M${head.x + 4} ${head.y + 8} q6 12 -2 16`} stroke={SKIN_SHADE} strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={COACH.mouth.x - 14} cy={COACH.mouth.y - 4} rx={13} ry={mouthH / 2} fill="#5a2a22" />

      {/* the near arm, hanging by his side */}
      <path d="M282 950 Q310 1010 306 1100" stroke={TOP} strokeWidth={50} strokeLinecap="round" fill="none" />
    </g>
  )
}

/**
 * The palm cursor: an open cartoon hand with a sleeve cuff. Its fingertips sit at the origin; `angle` is the
 * direction from the fingertips back to the wrist, in degrees (45 = the hand trails down and to the right).
 */
export const Palm = ({ at, angle, opacity, scale = 1 }: { at: Pt; angle: number; opacity: number; scale?: number }) => {
  const skin = (
    <>
      <rect x={-17} y={7} width={11} height={44} rx={5.5} />
      <rect x={-6} y={0} width={11} height={50} rx={5.5} />
      <rect x={5} y={3} width={11} height={48} rx={5.5} />
      <rect x={16} y={11} width={10} height={40} rx={5} />
      <rect x={-18} y={38} width={44} height={42} rx={13} />
      <ellipse cx={-21} cy={56} rx={7.5} ry={17} transform="rotate(-32 -21 56)" />
    </>
  )
  return (
    <g opacity={opacity} transform={`translate(${at.x} ${at.y}) rotate(${angle - 90}) scale(${scale})`}>
      {/* outline: the same shapes, fattened in ink, under the skin */}
      <g fill={INK} stroke={INK} strokeWidth={6} strokeLinejoin="round">
        {skin}
        <rect x={-20} y={74} width={48} height={26} rx={6} />
      </g>
      <g fill={SKIN}>{skin}</g>
      {/* knuckle creases */}
      <path d="M-11 44 L-11 50 M0 42 L0 50 M10.5 43 L10.5 50" stroke={SKIN_SHADE} strokeWidth={2.5} strokeLinecap="round" />
      {/* cuff */}
      <rect x={-20} y={74} width={48} height={26} rx={6} fill={TOP} />
      <path d="M-18 79 L26 79" stroke={TRIM} strokeWidth={4.5} />
    </g>
  )
}
