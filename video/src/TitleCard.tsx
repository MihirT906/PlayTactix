// A line of text centred on black, in the same style as Act 0's title cards. Act 3 puts one before each feature:
// the screen fades to black, the line is read, then the black fades away to the feature.
import { AbsoluteFill } from 'remotion'
import { progress } from './anim'

export const CARD_FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'
const ACCENT = '#fe7f2d'

/** Frame windows for a card that starts at `at`. Total length is CARD_LEN. */
export const CARD_LEN = 58
export const cardTimes = (at: number) => ({
  blackIn: [at, at + 10] as const,
  textIn: [at + 10, at + 18] as const,
  textOut: [at + 42, at + 48] as const,
  blackOut: [at + 46, at + 58] as const,
})

export type Card = { at: number; lead: string; accent: string; fromBlack?: boolean }

/** The black screen and its line. `fromBlack` cards start already black (the act opens on one). */
export const TitleCard = ({ f, card }: { f: number; card: Card }) => {
  const t = cardTimes(card.at)
  const black = (card.fromBlack ? 1 : progress(f, ...t.blackIn)) * (1 - progress(f, ...t.blackOut))
  if (black <= 0) return null
  const text = progress(f, ...t.textIn) * (1 - progress(f, ...t.textOut))
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', opacity: black }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <text
          x={960}
          y={560}
          opacity={text}
          transform={`translate(0 ${(1 - text) * 10})`}
          fontFamily={CARD_FONT}
          fontSize={80}
          fontWeight={700}
          textAnchor="middle"
        >
          <tspan fill="#f4f1ea">{card.lead} </tspan>
          <tspan fill={ACCENT}>{card.accent}</tspan>
        </text>
      </svg>
    </AbsoluteFill>
  )
}
