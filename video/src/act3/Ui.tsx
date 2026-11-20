// Act 3's interface pieces, in screen space (1920x1080): grid cell labels, the timeline, the xThreat readout, the
// cursor and the save toast. The left column (rail and panels) is in Sidebar.tsx.
import { clamp01 } from '../anim'
import { C, SANS } from './Pitch'
import { MOVE_END, SHOT, XT_MAX, xThreatCurve } from './play'

import { DISPLAY } from '../fonts'

export { DISPLAY }

const MUTED = '#7f97a6'
const TEXT = '#c7d3db'

// ---------------- Grid cell label ----------------

export const CellLabel = ({ x, y, text, color, opacity }: { x: number; y: number; text: string; color: string; opacity: number }) => {
  const w = text.length * 11.5 + 52
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={38} rx={8} fill={C.pill} opacity={0.86} />
      <circle cx={x + 20} cy={y + 19} r={6} fill={color} />
      <text x={x + 36} y={y + 26} fontFamily={SANS} fontSize={20} fontWeight={700} fill="#fff">
        {text}
      </text>
    </g>
  )
}

// ---------------- xThreat readout ----------------

export const XThreatCard = ({ x, y, value, pulse, opacity }: { x: number; y: number; value: number; pulse: number; opacity: number }) => {
  if (opacity <= 0) return null
  const s = 1 + 0.14 * pulse
  return (
    <g opacity={opacity} transform={`translate(${x} ${y})`}>
      <rect width={250} height={128} rx={14} fill={C.pill} opacity={0.9} />
      <rect width={250} height={128} rx={14} fill="none" stroke={C.accent} strokeOpacity={0.25 + 0.75 * pulse} strokeWidth={3} />
      <text x={22} y={38} fontFamily={SANS} fontSize={20} fontWeight={700} fill={TEXT} letterSpacing={1}>
        xThreat
      </text>
      <g transform={`translate(22 110) scale(${s}) translate(-22 -110)`}>
        <text x={22} y={110} fontFamily={DISPLAY} fontSize={78} fontWeight={800} fill={pulse > 0.05 ? C.accent : '#fff'}>
          {value.toFixed(2)}
        </text>
      </g>
    </g>
  )
}

// ---------------- Timeline ----------------

export const TRACK = { x0: 280, x1: 1880 }
export const mx = (m: number) => TRACK.x0 + (m / MOVE_END) * (TRACK.x1 - TRACK.x0)

export const CLIP_ROWS = ['Moments', 'Pitch Control', 'Pass Probability', 'Player Focus'] as const
export type ClipRow = (typeof CLIP_ROWS)[number]

const ROW = { ruler: 34, insightsHead: 26, xThreat: 66, events: 30, clipHead: 26, clip: 30 }
const Y = {
  insightsHead: ROW.ruler,
  xThreat: ROW.ruler + ROW.insightsHead,
  events: ROW.ruler + ROW.insightsHead + ROW.xThreat,
  clipHead: ROW.ruler + ROW.insightsHead + ROW.xThreat + ROW.events,
  clip: ROW.ruler + ROW.insightsHead + ROW.xThreat + ROW.events + ROW.clipHead,
}
/** Timeline heights: with only Insights showing, and with the Clip rows open too. */
export const TIMELINE_H = { insights: Y.clipHead, full: Y.clip + CLIP_ROWS.length * ROW.clip + 12 }

/** Bar colours, by kind of row. */
const BAR = { moment: '#3d8bfd', overlay: '#2bb5a8', annotation: C.accent }
const rowKind = (r: ClipRow) => (r === 'Moments' ? 'moment' : r === 'Pitch Control' || r === 'Pass Probability' ? 'overlay' : 'annotation')

export type Bar = { row: ClipRow; from: number; to: number; show: number; label?: string }

/** The play button, at the left end of the ruler. */
const PLAY = { x: 44, y: 17 }
export const playButton = (top: number): [number, number] => [PLAY.x, top + PLAY.y]

export const Timeline = ({ top, m, graphTo, goal, bars, playing }: { top: number; m: number; graphTo: number; goal: number; bars: Bar[]; playing: boolean }) => {
  if (top >= 1080) return null
  const label = (y: number, text: string, head = false) => (
    <text x={28} y={y} fontFamily={SANS} fontSize={head ? 15 : 19} fontWeight={head ? 700 : 500} fill={head ? MUTED : TEXT} letterSpacing={head ? 2 : 0}>
      {text}
    </text>
  )

  // The xThreat graph, drawn up to graphTo.
  const gy0 = Y.xThreat + ROW.xThreat - 8
  const gh = ROW.xThreat - 18
  const pts: string[] = []
  const end = Math.min(graphTo, MOVE_END)
  for (let t = 0; t <= end + 1e-6; t += 0.02) pts.push(`${mx(t).toFixed(1)},${(gy0 - (xThreatCurve(t) / XT_MAX) * gh).toFixed(1)}`)
  const area = pts.length > 1 ? `M${mx(0)},${gy0} L${pts.join(' L')} L${mx(end)},${gy0} Z` : ''

  return (
    <g transform={`translate(0 ${top})`}>
      <rect width={1920} height={1080} fill="#15222b" />
      <rect width={1920} height={2} fill="#2c4352" />

      {/* ruler */}
      {Array.from({ length: Math.floor(MOVE_END * 2) + 1 }, (_, i) => {
        const x = mx(i / 2)
        const whole = i % 2 === 0
        return (
          <g key={i}>
            <rect x={x - 1} y={whole ? 22 : 26} width={2} height={whole ? 10 : 6} fill={MUTED} opacity={0.7} />
            {whole && (
              <text x={x} y={17} fontFamily={SANS} fontSize={13} fill={MUTED} textAnchor="middle">
                {`0:0${i / 2}`}
              </text>
            )}
          </g>
        )
      })}

      {/* play / pause */}
      <circle cx={PLAY.x} cy={PLAY.y} r={14} fill={playing ? C.accent : '#2a4152'} />
      {playing ? (
        <path d={`M${PLAY.x - 4} ${PLAY.y - 6} v12 M${PLAY.x + 4} ${PLAY.y - 6} v12`} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      ) : (
        <path d={`M${PLAY.x - 4} ${PLAY.y - 7} L${PLAY.x + 7} ${PLAY.y} L${PLAY.x - 4} ${PLAY.y + 7} Z`} fill="#fff" />
      )}

      {label(Y.insightsHead + 18, 'INSIGHTS', true)}
      {label(Y.xThreat + 40, 'xThreat')}
      {label(Y.events + 21, 'Goals')}
      <rect x={TRACK.x0} y={Y.xThreat + 4} width={TRACK.x1 - TRACK.x0} height={ROW.xThreat - 8} rx={6} fill="#1b2b36" />
      {area && <path d={area} fill={C.accent} opacity={0.18} />}
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={C.accent} strokeWidth={3} strokeLinejoin="round" />}
      {goal > 0 && (
        <g opacity={goal} transform={`translate(${mx(SHOT.to)} ${Y.events + ROW.events / 2 - (1 - goal) * 16})`}>
          <rect x={-34} y={-12} width={68} height={24} rx={12} fill="#5fd68f" />
          <text y={6} fontFamily={SANS} fontSize={15} fontWeight={800} fill="#0d1a22" textAnchor="middle">
            GOAL
          </text>
        </g>
      )}

      {label(Y.clipHead + 18, 'CLIP', true)}
      {CLIP_ROWS.map((r, i) => (
        <g key={r}>
          {label(Y.clip + i * ROW.clip + 21, r)}
          <rect x={TRACK.x0} y={Y.clip + i * ROW.clip + 4} width={TRACK.x1 - TRACK.x0} height={ROW.clip - 8} rx={4} fill="#1b2b36" opacity={0.7} />
        </g>
      ))}
      {bars.map((b) => {
        if (b.show <= 0) return null
        const i = CLIP_ROWS.indexOf(b.row)
        const y = Y.clip + i * ROW.clip + 5 - (1 - b.show) * 18
        const x0 = mx(b.from)
        const x1 = mx(b.to)
        return (
          <g key={b.row} opacity={b.show}>
            <rect x={x0} y={y} width={x1 - x0} height={ROW.clip - 10} rx={5} fill={BAR[rowKind(b.row)]} />
            {/* trim handles at both ends */}
            <rect x={x0 + 5} y={y + 3} width={3} height={ROW.clip - 16} rx={1.5} fill="#fff" opacity={0.55} />
            <rect x={x1 - 8} y={y + 3} width={3} height={ROW.clip - 16} rx={1.5} fill="#fff" opacity={0.55} />
            {b.label && (
              <text x={x0 + 12} y={y + 15} fontFamily={SANS} fontSize={13} fontWeight={700} fill="#fff">
                {b.label}
              </text>
            )}
          </g>
        )
      })}

      {/* playhead */}
      <rect x={mx(m) - 1.5} y={10} width={3} height={1080} fill={C.accent} />
      <path d={`M${mx(m) - 8} 4 L${mx(m) + 8} 4 L${mx(m)} 14 Z`} fill={C.accent} />
    </g>
  )
}

// ---------------- Cursor and toast ----------------

export const Cursor = ({ x, y, opacity, down, clicks }: { x: number; y: number; opacity: number; down: boolean; clicks: number[] }) => {
  if (opacity <= 0) return null
  return (
    <g opacity={opacity}>
      {clicks.map((c, i) => {
        const t = clamp01(c)
        if (t <= 0 || t >= 1) return null
        return <circle key={i} cx={x} cy={y} r={8 + 26 * t} fill="none" stroke="#fff" strokeWidth={3} opacity={0.9 * (1 - t)} />
      })}
      <g transform={`translate(${x} ${y}) scale(${down ? 0.9 : 1})`}>
        <path d="M0 0 L0 34 L9 26 L15 39 L21 36 L15 24 L27 24 Z" fill="#fff" stroke="#0d1a22" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
    </g>
  )
}

export const Toast = ({ x, y, show }: { x: number; y: number; show: number }) => {
  if (show <= 0) return null
  return (
    <g opacity={show} transform={`translate(${x} ${y + (1 - show) * -12})`}>
      <rect x={-250} width={250} height={56} rx={12} fill={C.pill} opacity={0.94} />
      <circle cx={-218} cy={28} r={14} fill="#5fd68f" />
      <path d="M-225 28 L-220 33 L-211 23" stroke="#0d1a22" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x={-192} y={36} fontFamily={SANS} fontSize={21} fontWeight={700} fill="#fff">
        Project saved
      </text>
    </g>
  )
}
