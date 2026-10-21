import { useState } from 'react'
import { formatMetricValue } from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import { EVENT_FILL_OPACITY, TIMELINE_CHART_HEIGHT, TIMELINE_CHART_PADDING, getEventLabel, type ValueRow } from './rows'

// Events with no value still get a sliver, so they stay visible and hoverable.
const VALUE_BAR_MIN_HEIGHT = 2
const TOOLTIP_CHAR_WIDTH = 6.7

type ValueTrackProps = {
  row: ValueRow
  clipFrame: number
  timelineTrackWidth: number
  getEventColor: (teamId: number) => string
  onEventSeek: (event: Event) => void
  onEventHover: (event: Event | null) => void
}

const ValueTrack: React.FC<ValueTrackProps> = ({
  row,
  clipFrame,
  timelineTrackWidth,
  getEventColor,
  onEventSeek,
  onEventHover,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const hover = (event: Event | null) => {
    setHoveredId(event?.event_id ?? null)
    onEventHover(event)
  }

  const innerHeight = TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING * 2
  // A signed row draws up and down from the middle, so each side has half the room.
  const baseline = row.signed ? TIMELINE_CHART_HEIGHT / 2 : TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING
  const room = row.signed ? innerHeight / 2 : innerHeight

  // Tallest first, so shorter bars that overlap them stay on top and hoverable.
  const bars = row.events
    .map((event) => {
      const height = Math.max(Math.abs(event.strength) * room, VALUE_BAR_MIN_HEIGHT)

      return {
        event,
        x: (event.leftPercent / 100) * timelineTrackWidth,
        width: (event.widthPercent / 100) * timelineTrackWidth,
        y: event.strength < 0 ? baseline : baseline - height,
        height,
        color: getEventColor(event.team_id),
      }
    })
    .sort((left, right) => right.height - left.height)

  const hovered = bars.find((bar) => bar.event.event_id === hoveredId)
  const hoveredValue = hovered?.event.value
  const hoveredLabel = hovered
    ? getEventLabel(hovered.event, row.showSubtype, hoveredValue != null ? formatMetricValue(row.column, hoveredValue) : null)
    : ''
  const tooltipWidth = hoveredLabel.length * TOOLTIP_CHAR_WIDTH + 12
  const tooltipX = hovered ? Math.max(Math.min(hovered.x, timelineTrackWidth - tooltipWidth - 2), 2) : 0
  // On a signed row, on the other side of the middle line from the bar, so it never covers it.
  const tooltipY = row.signed && hovered && hovered.event.strength >= 0 ? baseline + 4 : 2

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_CHART_HEIGHT}
      className="event-display__metric-svg"
      onMouseLeave={() => hover(null)}
    >
      <text x={4} y={10} className="event-display__metric-scale">{formatMetricValue(row.column, row.max)}</text>
      {row.signed ? (
        <text x={4} y={TIMELINE_CHART_HEIGHT - 3} className="event-display__metric-scale">
          {formatMetricValue(row.column, -row.max)}
        </text>
      ) : null}
      <line x1={0} y1={baseline} x2={timelineTrackWidth} y2={baseline} className="event-display__value-baseline" />
      {bars.map((bar) => (
        <rect
          key={bar.event.event_id}
          x={bar.x} y={bar.y}
          width={bar.width} height={bar.height}
          fill={bar.color}
          fillOpacity={
            bar.event.event_id === hoveredId || (bar.event.frame_start <= clipFrame && clipFrame <= bar.event.frame_end)
              ? 0.8
              : EVENT_FILL_OPACITY
          }
          stroke={bar.color}
          className="event-display__value-bar"
          // Pressing a bar jumps to the start of its event.
          onPointerDown={(pointerEvent) => {
            if (pointerEvent.button !== 0) return
            pointerEvent.stopPropagation()
            onEventSeek(bar.event)
          }}
          onMouseEnter={() => hover(bar.event)}
          onMouseLeave={() => hover(null)}
        />
      ))}
      {hovered ? (
        <>
          <rect
            x={tooltipX} y={tooltipY}
            width={tooltipWidth} height={18}
            rx={4} className="event-display__metric-tooltip-bg"
          />
          <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 13} textAnchor="middle" className="event-display__metric-tooltip">
            {hoveredLabel}
          </text>
        </>
      ) : null}
    </svg>
  )
}

export default ValueTrack
