// Act 4: Close. Picks up on Act 3's saved project, shrunk into a card. The card settles while the finished clip
// replays inside it, the Tapp'd logo resolves above, then the headline and the call to action. Ends on black, so
// the video loops cleanly back into Act 0's black title card.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { LogoLockup } from '../Logo'
import { lerp, linear, progress, track } from '../anim'
import { ACT3_DURATION, AppCard, AppScreen, Backdrop, CARD_END } from '../act3/Act3'
import { C, SANS } from '../act3/Pitch'
import { DISPLAY } from '../act3/Ui'
import { MOVE_END } from '../act3/play'

export const ACT4_DURATION = 150 // 5.0s

const SETTLE = [4, 30] as const
const CARD = { scale: 0.5, cy: 500 }
const LOGO = [18, 38] as const
const HEADLINE = [40, 58] as const
const CTA = [64, 78] as const
const FADE_OUT = [135, 150] as const

// The clip replays from the start once the card begins to settle.
const REPLAY_FROM = 12
const moveTime = (f: number) => (f < REPLAY_FROM ? MOVE_END : track(f, [[REPLAY_FROM, 0], [REPLAY_FROM + 120, MOVE_END]], linear))

export const Act4 = () => {
  const f = useCurrentFrame()
  const settle = progress(f, ...SETTLE)
  const logo = progress(f, ...LOGO)
  const headline = progress(f, ...HEADLINE)
  const cta = progress(f, ...CTA)
  const dark = progress(f, ...FADE_OUT)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0e171e' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute' }}>
        <Backdrop />
        <AppCard scale={lerp(CARD_END.scale, CARD.scale, settle)} cy={lerp(CARD_END.cy, CARD.cy, settle)}>
          <AppScreen f={ACT3_DURATION - 1} m={moveTime(f)} toast={1 - progress(f, 0, 10)} />
        </AppCard>

        {/* Headline */}
        <g opacity={headline} transform={`translate(0 ${(1 - headline) * 18})`}>
          <text x={960} y={872} fontFamily={DISPLAY} fontSize={88} fontWeight={800} textAnchor="middle" letterSpacing={0.5}>
            <tspan fill="#fff">Turn Match Data Into </tspan>
            <tspan fill={C.accent}>Tactical Stories.</tspan>
          </text>
        </g>

        {/* Call to action */}
        <g opacity={cta} transform={`translate(960 975) scale(${0.9 + 0.1 * cta})`}>
          <rect x={-200} y={-38} width={400} height={76} rx={38} fill={C.accent} />
          <text x={-14} y={11} fontFamily={SANS} fontSize={31} fontWeight={700} fill="#fff" textAnchor="middle">
            Build your first clip
          </text>
          <path d="M150 0 h26 M164 -11 L176 0 L164 11" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>

      {/* Logo lockup: the Tapp'd mark and wordmark, above the card. */}
      <LogoLockup
        size={118}
        style={{
          position: 'absolute',
          top: 92,
          left: 0,
          width: 1920,
          opacity: logo,
          transform: `translateY(${(1 - logo) * -16}px) scale(${0.92 + 0.08 * logo})`,
        }}
      />

      {dark > 0 && <AbsoluteFill style={{ backgroundColor: '#000', opacity: dark }} />}
    </AbsoluteFill>
  )
}
