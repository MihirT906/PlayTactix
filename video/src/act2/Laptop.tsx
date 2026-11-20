// Act 2's set: the same viewer, now seen over their right shoulder with a laptop on their lap. The TV from Act 0
// sits switched off in the background, so the laptop's screen is the only light.
import type { ReactNode } from 'react'
import { HAIR, HOODIE, HOODIE_DARK, INK, SKIN, TV_H, TV_W } from '../act0/LivingRoom'

/** The laptop's screen in room space (16:9, like the TV). Screen content draws in TV space (TV_W x TV_H). */
export const LAPTOP_SCREEN = { x: 760, y: 200, w: 720, h: 405 }
const S = LAPTOP_SCREEN
const BEZEL = 16
const HINGE_Y = S.y + S.h + BEZEL + 3
const LID = { x0: S.x - BEZEL, x1: S.x + S.w + BEZEL, top: S.y - BEZEL }
const LID_CX = (LID.x0 + LID.x1) / 2
const LID_W = LID.x1 - LID.x0
const DECK_FRONT = { y: 800, x0: 640, x1: 1600 }

const SHELL = '#5d6470'
const DECK = '#3b404b'
const KEY = '#2a2e36'

export const LaptopDefs = ({ glowColor }: { glowColor: string }) => (
  <defs>
    <linearGradient id="lpWall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#222833" />
      <stop offset="1" stopColor="#2c3340" />
    </linearGradient>
    <linearGradient id="lpRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.5" stopColor={glowColor} stopOpacity="0" />
      <stop offset="1" stopColor={glowColor} stopOpacity="0.9" />
    </linearGradient>
    <radialGradient id="lpGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={glowColor} stopOpacity="0.5" />
      <stop offset="1" stopColor={glowColor} stopOpacity="0" />
    </radialGradient>
    <filter id="lpSoft" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation={3} />
    </filter>
    <clipPath id="lpNotScreen">
      <path d={`M-400 -300 H2320 V1380 H-400 Z M${S.x} ${S.y} V${S.y + S.h} H${S.x + S.w} V${S.y} Z`} clipRule="evenodd" />
    </clipPath>
    <clipPath id="lpScreen">
      <rect x={S.x} y={S.y} width={S.w} height={S.h} />
    </clipPath>
  </defs>
)

/** The room behind the laptop, softly out of focus: wall, window, and the TV, switched off. */
const Background = () => (
  <g filter="url(#lpSoft)">
    <rect x={-400} y={-300} width={2720} height={1680} fill="url(#lpWall)" />
    <rect x={-400} y={560} width={2720} height={820} fill="#1c2028" />
    <rect x={-400} y={554} width={2720} height={8} fill="#171a20" />
    {/* window with the blinds half down */}
    <rect x={150} y={70} width={170} height={250} rx={6} fill="#18202e" stroke="#1a1d23" strokeWidth={10} />
    <circle cx={270} cy={240} r={17} fill="#cfcab2" opacity={0.8} />
    <circle cx={279} cy={233} r={15} fill="#18202e" />
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x={155} y={75 + i * 14} width={160} height={9} fill="#2c3240" />
    ))}
    {/* the TV, off, on its console */}
    <rect x={1000} y={20} width={660} height={372} rx={8} fill={INK} />
    <rect x={1012} y={32} width={636} height={348} fill="#06070a" />
    <path d="M1030 32 L1150 32 L1060 380 L1012 380 L1012 120 Z" fill="#fff" opacity={0.035} />
    <rect x={960} y={420} width={740} height={50} rx={5} fill="#2a2622" />
  </g>
)

/** The lid at `open` (0 closed, 1 open): its back while it faces down, then its face. */
const Lid = ({ open, children }: { open: number; children: ReactNode }) => {
  if (open >= 1) {
    return (
      <g>
        <rect x={LID.x0} y={LID.top} width={LID_W} height={HINGE_Y - LID.top} rx={12} fill={INK} />
        <rect x={S.x} y={S.y} width={S.w} height={S.h} fill="#000" />
        <g clipPath="url(#lpScreen)">
          <g transform={`translate(${S.x} ${S.y}) scale(${S.w / TV_W})`}>{children}</g>
        </g>
      </g>
    )
  }
  // Seen from above and behind: closed, the lid lies over the deck; open, it stands up from the hinge.
  const a = (open * Math.PI) / 2
  const closedLen = DECK_FRONT.y - HINGE_Y
  const openLen = HINGE_Y - LID.top
  const top = HINGE_Y + closedLen * Math.cos(a) - openLen * Math.sin(a)
  const w = LID_W + (DECK_FRONT.x1 - DECK_FRONT.x0 - LID_W) * Math.cos(a)
  const quad = (inset: number, t0: number, t1: number) => {
    const y0 = HINGE_Y + (top - HINGE_Y) * t0
    const y1 = HINGE_Y + (top - HINGE_Y) * t1
    const half = (t: number) => (LID_W + (w - LID_W) * t) / 2 - inset
    return `${LID_CX - half(t0)},${y0} ${LID_CX + half(t0)},${y0} ${LID_CX + half(t1)},${y1} ${LID_CX - half(t1)},${y1}`
  }
  if (top >= HINGE_Y) {
    return (
      <g>
        <polygon points={quad(0, 0, 1)} fill={SHELL} />
        <circle cx={LID_CX} cy={(HINGE_Y + top) / 2} r={Math.max(0, (top - HINGE_Y) * 0.09)} fill="#727a87" />
      </g>
    )
  }
  return (
    <g>
      <polygon points={quad(0, 0, 1)} fill={INK} />
      <polygon points={quad(BEZEL, 0.05, 0.96)} fill="#0b0d11" />
    </g>
  )
}

/** Keys and trackpad on the deck. */
const Deck = () => {
  const rows = 5
  const cols = 14
  const keyTop = HINGE_Y + 16
  const keyRow = 17
  const widthAt = (y: number) => LID_W + ((DECK_FRONT.x1 - DECK_FRONT.x0 - LID_W) * (y - HINGE_Y)) / (DECK_FRONT.y - HINGE_Y)
  return (
    <g>
      <polygon points={`${LID.x0},${HINGE_Y} ${LID.x1},${HINGE_Y} ${DECK_FRONT.x1},${DECK_FRONT.y} ${DECK_FRONT.x0},${DECK_FRONT.y}`} fill={DECK} />
      <polygon points={`${DECK_FRONT.x0},${DECK_FRONT.y} ${DECK_FRONT.x1},${DECK_FRONT.y} ${DECK_FRONT.x1 - 4},${DECK_FRONT.y + 14} ${DECK_FRONT.x0 + 4},${DECK_FRONT.y + 14}`} fill="#2a2e36" />
      {Array.from({ length: rows }, (_, r) => {
        const y = keyTop + r * keyRow
        const span = widthAt(y) * 0.8
        const kw = span / cols
        return Array.from({ length: cols }, (_, c) => (
          <rect key={`${r}-${c}`} x={LID_CX - span / 2 + c * kw + 2} y={y} width={kw - 4} height={keyRow - 5} rx={2} fill={KEY} />
        ))
      })}
      <rect x={LID_CX - 120} y={keyTop + rows * keyRow + 8} width={240} height={DECK_FRONT.y - (keyTop + rows * keyRow + 8) - 10} rx={8} fill="#353a44" />
    </g>
  )
}

const Hand = ({ x, y, rot }: { x: number; y: number; rot: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={-44} y={-26} width={88} height={52} rx={22} fill={SKIN} />
    <path d="M-20 -24 v-10 M-4 -26 v-12 M12 -24 v-10" stroke={SKIN} strokeWidth={14} strokeLinecap="round" />
  </g>
)

/**
 * The scene. `open` is the lid, `glow` how much the screen lights things, `lean` how far the viewer has leaned in,
 * and `dim` darkens everything but the screen. `children` is the screen picture, in TV space.
 */
export const LaptopScene = ({
  open,
  glow,
  lean,
  dim,
  children,
}: {
  open: number
  glow: number
  lean: number
  dim: number
  children: ReactNode
}) => (
  <g>
    <Background />
    <rect x={-400} y={-300} width={2720} height={1680} fill="#000" opacity={0.42} />

    {/* the viewer's lap and middle, under the front of the laptop */}
    <path d="M600 1180 L630 840 Q1100 790 1580 840 L1640 1180 Z" fill={HOODIE_DARK} />
    <Deck />
    <Lid open={open}>{children}</Lid>

    {/* left arm, mostly behind the shoulder, to the left hand on the keys */}
    <path d={`M600 900 Q800 800 ${985 - lean * 4} 752`} stroke={HOODIE_DARK} strokeWidth={62} strokeLinecap="round" fill="none" />
    <Hand x={995} y={748} rot={-14} />

    {/* head and shoulders, from behind; `lean` brings them towards the screen */}
    <g transform={`translate(${lean * 14} ${-lean * 10})`}>
      <path d="M230 1180 Q240 860 430 800 L620 800 Q860 830 930 1180 Z" fill={HOODIE} />
      <path d="M410 815 Q520 860 640 815 L630 790 Q520 830 420 790 Z" fill={HOODIE_DARK} />
      <rect x={484} y={700} width={74} height={110} rx={18} fill={SKIN} />
      {/* the jaw and ear on the screen side */}
      <path d="M600 640 Q640 700 600 760 L580 760 Q600 700 585 640 Z" fill={SKIN} />
      <ellipse cx={622} cy={652} rx={15} ry={27} fill={SKIN} />
      {/* screen light catching the side of the head */}
      <ellipse cx={536} cy={616} rx={124} ry={145} fill="url(#lpRim)" opacity={glow} />
      <ellipse cx={528} cy={620} rx={120} ry={142} fill={HAIR} />
      <ellipse cx={634} cy={630} rx={22} ry={70} fill={HAIR} />
    </g>

    {/* right arm, nearest the camera, to the right hand on the keys */}
    <path d={`M820 1080 Q1060 900 ${1310 - lean * 4} 772`} stroke={HOODIE} strokeWidth={76} strokeLinecap="round" fill="none" />
    <Hand x={1325} y={760} rot={12} />

    {/* Everything but the screen is darker until the screen comes on, and then catches its light. Once the lid
        is open, the screen itself is left out of both. */}
    <g clipPath={open >= 1 ? 'url(#lpNotScreen)' : undefined}>
      <rect x={-400} y={-300} width={2720} height={1680} fill="#000" opacity={dim} />
      <ellipse cx={LID_CX} cy={780} rx={720} ry={300} fill="url(#lpGlow)" opacity={glow} />
    </g>
  </g>
)
