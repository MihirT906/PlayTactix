import { useState } from 'react'
import { EVENT_FILL_OPACITY, TIMELINE_CHART_HEIGHT, TIMELINE_CHART_PADDING, getEventLabel, type ValueRow } from './rows'

// Events with no value still get a sliver, so they stay visible and hoverable.
const VALUE_BAR_MIN_HEIGHT = 2
const TOOLTIP_CHAR_WIDTH = 6.7

type ValueTrackProps = {
  row: ValueRow
  timelineTrackWidth: number
  getEventColor: (teamId: number) => string
}

const ValueTrack: React.FC<ValueTrackProps> = ({ row, timelineTrackWidth, getEventColor }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const innerHeight = TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING * 2
  const baseline = TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING

  // Tallest first, so shorter bars that overlap them stay on top and hoverable.
  const bars = row.events
    .map((event) => {
      const strength = event.value != null && row.max > 0 ? Math.max(event.value, 0) / row.max : 0
      const height = Math.max(strength * innerHeight, VALUE_BAR_MIN_HEIGHT)

      return {
        event,
        x: (event.leftPercent / 100) * timelineTrackWidth,
        width: (event.widthPercent / 100) * timelineTrackWidth,
        y: baseline - height,
        height,
        color: getEventColor(event.team_id),
      }
    })
    .sort((left, right) => right.height - left.height)

  const hovered = bars.find((bar) => bar.event.event_id === hoveredId)
  const hoveredLabel = hovered ? getEventLabel(hovered.event, row.showSubtype, hovered.event.value) : ''
  const tooltipWidth = hoveredLabel.length * TOOLTIP_CHAR_WIDTH + 12
  const tooltipX = hovered ? Math.max(Math.min(hovered.x, timelineTrackWidth - tooltipWidth - 2), 2) : 0

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_CHART_HEIGHT}
      className="event-display__metric-svg"
      onMouseLeave={() => setHoveredId(null)}
    >
      <text x={4} y={10} className="event-display__metric-scale">{row.max.toFixed(3)}</text>
      <line x1={0} y1={baseline} x2={timelineTrackWidth} y2={baseline} className="event-display__value-baseline" />
      {bars.map((bar) => (
        <rect
          key={bar.event.event_id}
          x={bar.x} y={bar.y}
          width={bar.width} height={bar.height}
          fill={bar.color}
          fillOpacity={bar.event.event_id === hoveredId ? 0.8 : EVENT_FILL_OPACITY}
          stroke={bar.color}
          className="event-display__value-bar"
          onMouseEnter={() => setHoveredId(bar.event.event_id)}
          onMouseLeave={() => setHoveredId(null)}
        />
      ))}
      {hovered ? (
        <>
          <rect
            x={tooltipX} y={2}
            width={tooltipWidth} height={18}
            rx={4} className="event-display__metric-tooltip-bg"
          />
          <text x={tooltipX + tooltipWidth / 2} y={15} textAnchor="middle" className="event-display__metric-tooltip">
            {hoveredLabel}
          </text>
        </>
      ) : null}
    </svg>
  )
}

export default ValueTrack
