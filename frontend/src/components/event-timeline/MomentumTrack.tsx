import { useState } from 'react'
import { formatMetric } from '../../services/timelineEvents'
import { TIMELINE_CHART_HEIGHT, TIMELINE_CHART_PADDING, type MomentumBar, type MomentumRow } from './rows'

// Every possession keeps a sliver, so ordinary play still shows who had the ball.
const BAR_MIN_HEIGHT = 1.5
// Bars never overlap, so unlike event bars they are drawn nearly solid, and the hovered bar or the
// one at the playhead is picked out with an outline instead of a stronger fill.
const BAR_FILL_OPACITY = 0.85
const HIGHLIGHT_STROKE = 'rgba(248, 250, 252, 0.9)'
const TOOLTIP_CHAR_WIDTH = 6.7
const FRAME_RATE = 10 // Tracking frames per second

type MomentumTrackProps = {
  row: MomentumRow
  clipFrame: number
  timelineTrackWidth: number
  getTeamColor: (teamId: number) => string
  getTeamName: (teamId: number) => string
  onSeek: (frame: number) => void
}

const MomentumTrack: React.FC<MomentumTrackProps> = ({
  row,
  clipFrame,
  timelineTrackWidth,
  getTeamColor,
  getTeamName,
  onSeek,
}) => {
  const [hovered, setHovered] = useState<MomentumBar | null>(null)

  const middle = TIMELINE_CHART_HEIGHT / 2
  const halfHeight = middle - TIMELINE_CHART_PADDING

  const bars = row.bars.map((bar) => {
    const isUpper = row.upperTeamId === null || bar.teamId === row.upperTeamId
    const height = Math.max(bar.strength * halfHeight, BAR_MIN_HEIGHT)
    return {
      bar,
      x: (bar.leftPercent / 100) * timelineTrackWidth,
      width: (bar.widthPercent / 100) * timelineTrackWidth,
      y: isUpper ? middle - height : middle,
      height,
      color: getTeamColor(bar.teamId),
    }
  })

  const hoveredBar = bars.find(({ bar }) => bar.key === hovered?.key)
  const hoveredLabel = hovered
    ? `${getTeamName(hovered.teamId)} · ${Math.max(Math.round((hovered.frameEnd - hovered.frameStart) / FRAME_RATE), 1)} s · peak value ${formatMetric('decimal', hovered.peak)}`
    : ''
  const tooltipWidth = hoveredLabel.length * TOOLTIP_CHAR_WIDTH + 12
  const tooltipX = hoveredBar ? Math.max(Math.min(hoveredBar.x, timelineTrackWidth - tooltipWidth - 2), 2) : 0
  // Above the middle for a bar below it, and the other way round, so the tooltip never covers its bar.
  const tooltipY = hoveredBar && hoveredBar.y < middle ? middle + 4 : 2

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_CHART_HEIGHT}
      className="event-display__metric-svg"
      onMouseLeave={() => setHovered(null)}
    >
      <line x1={0} y1={middle} x2={timelineTrackWidth} y2={middle} className="event-display__value-baseline" />
      {bars.map(({ bar, x, y, width, height, color }) => {
        const isHighlighted = bar.key === hovered?.key || (bar.frameStart <= clipFrame && clipFrame <= bar.frameEnd)
        return (
          <rect
            key={bar.key}
            x={x} y={y}
            width={width} height={height}
            fill={color}
            fillOpacity={BAR_FILL_OPACITY}
            stroke={isHighlighted ? HIGHLIGHT_STROKE : 'none'}
            className="event-display__value-bar"
            // Pressing a bar jumps to the start of its possession.
            onPointerDown={(pointerEvent) => {
              if (pointerEvent.button !== 0) return
              pointerEvent.stopPropagation()
              onSeek(bar.frameStart)
            }}
            onMouseEnter={() => setHovered(bar)}
            onMouseLeave={() => setHovered(null)}
          />
        )
      })}
      {hovered ? (
        <>
          <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={18} rx={4} className="event-display__metric-tooltip-bg" />
          <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 13} textAnchor="middle" className="event-display__metric-tooltip">
            {hoveredLabel}
          </text>
        </>
      ) : null}
    </svg>
  )
}

export default MomentumTrack
