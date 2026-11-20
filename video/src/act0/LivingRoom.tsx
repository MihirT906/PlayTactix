// The Act 0 set: a living room at night seen from behind the couch. The TV is the only light.
import type { ReactNode } from 'react'

// The TV's screen in room space. Channels draw in TV space (TV_W x TV_H) and are scaled to fit.
export const SCREEN = { x: 460, y: 120, w: 1000, h: 562 }
export const TV_W = 1600
export const TV_H = 900

export const INK = '#15181e'
export const SKIN = '#b88a6c'
export const HAIR = '#2b2420'
export const HOODIE = '#55485f'
export const HOODIE_DARK = '#4a3e53'

export const RoomDefs = ({ glowColor }: { glowColor: string }) => (
  <defs>
    <linearGradient id="lrWall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#222833" />
      <stop offset="1" stopColor="#2c3340" />
    </linearGradient>
    <radialGradient id="lrGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={glowColor} stopOpacity="0.42" />
      <stop offset="1" stopColor={glowColor} stopOpacity="0" />
    </radialGradient>
    <linearGradient id="lrCouch" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3a4150" />
      <stop offset="1" stopColor="#262b35" />
    </linearGradient>
    <clipPath id="lrScreen">
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} />
    </clipPath>
  </defs>
)

/** Wall, floor, window, shelf and the TV's glow on the wall. */
export const RoomBack = ({ glow }: { glow: number }) => (
  <g>
    <rect width={1920} height={1080} fill="url(#lrWall)" />
    <ellipse cx={960} cy={420} rx={760} ry={470} fill="url(#lrGlow)" opacity={glow} />
    <rect y={760} width={1920} height={320} fill="#1c2028" />
    <rect y={754} width={1920} height={8} fill="#171a20" />

    {/* window with the blinds half down */}
    <rect x={1600} y={140} width={200} height={300} rx={6} fill="#18202e" stroke="#1a1d23" strokeWidth={10} />
    <circle cx={1740} cy={330} r={20} fill="#cfcab2" opacity={0.8} />
    <circle cx={1750} cy={322} r={18} fill="#18202e" />
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={1605} y={145 + i * 15} width={190} height={10} fill="#2c3240" />
    ))}

    {/* floor lamp, off */}
    <path d="M150 300 L250 300 L225 220 L175 220 Z" fill="#2f3542" />
    <rect x={196} y={300} width={8} height={455} fill="#262b35" />
    <ellipse cx={200} cy={758} rx={50} ry={9} fill="#262b35" />

    {/* media console under the TV */}
    <rect x={420} y={700} width={1080} height={70} rx={6} fill="#2a2622" />
    <rect x={440} y={716} width={300} height={40} rx={4} fill="#231f1c" />
    <rect x={1180} y={716} width={300} height={40} rx={4} fill="#231f1c" />
  </g>
)

/** The TV: bezel, the channel clipped to the screen, then a little stand. */
export const Tv = ({ children }: { children: ReactNode }) => (
  <g>
    <rect x={SCREEN.x - 16} y={SCREEN.y - 16} width={SCREEN.w + 32} height={SCREEN.h + 32} rx={10} fill={INK} />
    <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="#000" />
    <g clipPath="url(#lrScreen)">
      <g transform={`translate(${SCREEN.x} ${SCREEN.y}) scale(${SCREEN.w / TV_W})`}>{children}</g>
    </g>
    <rect x={SCREEN.x + SCREEN.w / 2 - 50} y={SCREEN.y + SCREEN.h + 16} width={100} height={6} fill={INK} />
  </g>
)

/** The viewer from behind, slouched on the couch, with the remote in their right hand. */
export const Viewer = ({ rim, press, led }: { rim: string; press: number; led: number }) => {
  // The remote points from the hand towards the TV.
  const hand = { x: 1520, y: 905 }
  const angle = -48
  const thumbDip = 5 * press
  return (
    <g>
      {/* head and shoulders above the couch back */}
      <g>
      <path d="M400 1080 Q405 900 560 875 L690 875 Q840 895 850 1080 Z" fill={HOODIE} />
      <path d="M520 890 Q625 940 735 890 L720 870 Q625 905 535 870 Z" fill={HOODIE_DARK} />
      <rect x={598} y={820} width={56} height={70} rx={14} fill={SKIN} />
      <ellipse cx={545} cy={790} rx={13} ry={24} fill={SKIN} />
      <ellipse cx={707} cy={790} rx={13} ry={24} fill={SKIN} />
      {/* TV light catching the top of the head: a thin crescent peeking out above the hair */}
      <ellipse cx={626} cy={754} rx={82} ry={98} fill={rim} opacity={0.4} />
      <ellipse cx={626} cy={760} rx={84} ry={98} fill={HAIR} />
      <path d="M548 800 Q626 870 704 800 L700 830 Q626 880 552 830 Z" fill={HAIR} />
      </g>

      {/* the couch back, in front of the body */}
      <path d="M-40 1080 L-40 990 Q-40 965 0 965 L1920 965 Q1960 965 1960 990 L1960 1080 Z" fill="url(#lrCouch)" />
      <path d="M0 972 L1920 972" stroke="#4a5262" strokeWidth={4} opacity={0.6} />

      {/* right arm along the couch back, hand up with the remote */}
      <path d="M790 960 Q960 1005 1260 985" stroke={HOODIE} strokeWidth={74} strokeLinecap="round" fill="none" />
      <path d="M1260 985 L1470 925" stroke={HOODIE} strokeWidth={66} strokeLinecap="round" fill="none" />
      <path d="M1200 978 L1270 972" stroke={HOODIE_DARK} strokeWidth={6} strokeLinecap="round" />

      <g transform={`translate(${hand.x} ${hand.y}) rotate(${angle})`}>
        {/* remote */}
        <rect x={-27} y={-235} width={54} height={250} rx={22} fill="#1a1d23" />
        <rect x={-21} y={-229} width={42} height={238} rx={18} fill="#22262e" />
        <circle cx={0} cy={-232} r={6} fill={led > 0 ? '#ff4d3d' : '#4a1e1b'} />
        {led > 0 && <circle cx={0} cy={-232} r={22} fill="#ff4d3d" opacity={0.35 * led} />}
        <circle cx={0} cy={-200} r={9} fill="#a83a32" />
        <circle cx={0} cy={-158} r={16} fill="#30353f" stroke="#3b414c" strokeWidth={3} />
        {[-126, -104, -82].map((y) => (
          <g key={y}>
            <rect x={-15} y={y} width={12} height={8} rx={3} fill="#3b414c" />
            <rect x={3} y={y} width={12} height={8} rx={3} fill="#3b414c" />
          </g>
        ))}
        {/* fingers wrapped round it, and the thumb on the channel button */}
        <rect x={-36} y={-70} width={72} height={86} rx={26} fill={SKIN} />
        <path d="M-36 -46 h30 M-36 -24 h30 M-36 -2 h30" stroke="#9c7158" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={8} cy={-132 + thumbDip} rx={15} ry={30} fill={SKIN} transform={`rotate(8 8 ${-132 + thumbDip})`} />
        <ellipse cx={10} cy={-150 + thumbDip} rx={8} ry={10} fill="#c99d80" />
      </g>
    </g>
  )
}
