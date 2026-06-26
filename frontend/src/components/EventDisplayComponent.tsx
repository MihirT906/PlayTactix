import { useEffect, useState, useMemo } from 'react'
import TimelineStore from '../services/TimelineStore'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { MetricTimelineOption, TimelineOption } from '../types/TimelineOption'
import './EventDisplayComponent.css'

type TimelineEvent = Event & {
  laneIndex: number
  leftPercent: number
  widthPercent: number
}

type MetricPoint = { frame: number; value: number | null }

type FilterTimelineRow = {
  kind: 'filter'
  timeline: TimelineOption
  events: TimelineEvent[]
  laneCount: number
}

type MetricTimelineRow = {
  kind: 'metric'
  timeline: TimelineOption
  points: MetricPoint[]
  min: number
  max: number
}

type TimelineRow = FilterTimelineRow | MetricTimelineRow

const TIMELINE_LANE_HEIGHT = 22
const TIMELINE_LABEL_WIDTH = 220
const TIMELINE_ROW_GAP = 12
const TIMELINE_MIN_TRACK_WIDTH = 960
const TIMELINE_PIXELS_PER_FRAME = 2
const TIMELINE_METRIC_TRACK_HEIGHT = 64
const TIMELINE_METRIC_PADDING = 6

type MetricTrackProps = {
  row: MetricTimelineRow
  scaleStart: number
  visibleFrameSpan: number
  timelineTrackWidth: number
}

const MetricTrack: React.FC<MetricTrackProps> = ({ row, scaleStart, visibleFrameSpan, timelineTrackWidth }) => {
  const [hover, setHover] = useState<{ x: number; value: number } | null>(null)

  const { points, min, max } = row
  const range = max - min || 1
  const innerHeight = TIMELINE_METRIC_TRACK_HEIGHT - TIMELINE_METRIC_PADDING * 2

  type SvgPoint = { x: number; value: number; frame: number }
  const svgPoints: SvgPoint[] = []
  const segments: string[][] = []
  let current: string[] = []

  for (const { frame, value } of points) {
    if (value == null) {
      if (current.length > 0) { segments.push(current); current = [] }
      continue
    }
    const x = ((frame - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const y = TIMELINE_METRIC_PADDING + innerHeight - ((value - min) / range) * innerHeight
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    svgPoints.push({ x, value, frame })
  }
  if (current.length > 0) segments.push(current)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left
    if (svgPoints.length === 0) return

    const left = svgPoints.filter((p) => p.x <= mouseX)
    const right = svgPoints.filter((p) => p.x > mouseX)

    let value: number
    let displayX: number

    if (left.length === 0) {
      value = right[0].value; displayX = right[0].x
    } else if (right.length === 0) {
      const p = left[left.length - 1]; value = p.value; displayX = p.x
    } else {
      const p1 = left[left.length - 1]
      const p2 = right[0]
      const hasGap = points.some((p) => p.value == null && p.frame > p1.frame && p.frame < p2.frame)
      if (hasGap) {
        const nearest = mouseX - p1.x <= p2.x - mouseX ? p1 : p2
        value = nearest.value; displayX = nearest.x
      } else {
        const t = (mouseX - p1.x) / (p2.x - p1.x)
        value = p1.value + (p2.value - p1.value) * t
        displayX = mouseX
      }
    }

    setHover({ x: displayX, value })
  }

  const TOOLTIP_W = 64
  const tooltipX = hover != null
    ? (hover.x + 8 + TOOLTIP_W > timelineTrackWidth ? hover.x - 8 - TOOLTIP_W : hover.x + 8)
    : 0
  const hoverY = hover != null
    ? TIMELINE_METRIC_PADDING + innerHeight - ((hover.value - min) / range) * innerHeight
    : 0

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_METRIC_TRACK_HEIGHT}
      className="event-display__metric-svg"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      {segments.map((pts, i) => (
        <polyline key={i} points={pts.join(' ')} className="event-display__metric-line" />
      ))}
      {hover != null && (
        <>
          <line
            x1={hover.x} y1={TIMELINE_METRIC_PADDING}
            x2={hover.x} y2={TIMELINE_METRIC_TRACK_HEIGHT - TIMELINE_METRIC_PADDING}
            className="event-display__metric-crosshair"
          />
          <circle cx={hover.x} cy={hoverY} r={3.5} className="event-display__metric-dot" />
          <rect x={tooltipX} y={TIMELINE_METRIC_PADDING} width={TOOLTIP_W} height={18} rx={4} className="event-display__metric-tooltip-bg" />
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_METRIC_PADDING + 13} textAnchor="middle" className="event-display__metric-tooltip">
            {hover.value.toFixed(3)}
          </text>
        </>
      )}
    </svg>
  )
}

type EventDisplayProps = {
  eventsData: Map<number, Event[]> | null
  scaleStart: number
  scaleEnd: number
  currentFrame: number
  matchData: MatchData | null
  timelineStore: TimelineStore
}

const EventDisplayComponent: React.FC<EventDisplayProps> = ({
  eventsData,
  scaleStart,
  scaleEnd,
  currentFrame,
  matchData,
  timelineStore,
}) => {
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)
  const timelineTrackWidth = Math.max(visibleFrameSpan * TIMELINE_PIXELS_PER_FRAME, TIMELINE_MIN_TRACK_WIDTH)
  const timelineContentWidth = TIMELINE_LABEL_WIDTH + TIMELINE_ROW_GAP + timelineTrackWidth

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])

  const getEventColor = (teamId: number) => {
    if (teamId === matchData?.home_team.id) {
      return homeTeamColor
    }

    if (teamId === matchData?.away_team.id) {
      return awayTeamColor
    }

    return '#F59E0B'
  }

  const getEventLabel = (event: Event) => {
    return event.player_name
  }

  const visibleEvents = useMemo<Event[]>(() => {
    if (!eventsData) {
      return []
    }

    const uniqueEvents = new Map<string, Event>()

    for (const frameEvents of eventsData.values()) {
      for (const event of frameEvents) {
        uniqueEvents.set(event.event_id, event)
      }
    }

    return Array.from(uniqueEvents.values())
      .filter((event) => event.frame_end >= scaleStart && event.frame_start <= scaleEnd)
      .sort((left, right) => {
        if (left.frame_start !== right.frame_start) {
          return left.frame_start - right.frame_start
        }

        return left.frame_end - right.frame_end
      })
  }, [eventsData, scaleEnd, scaleStart])

  const computeTimelineEvents = (timeline: TimelineOption, sourceEvents: Event[]): TimelineEvent[] => {
    if (timeline.kind !== 'filter') {
      return []
    }

    const matchingEvents = sourceEvents.filter(
      (event) => event[timeline.condition.column as keyof Event] === timeline.condition.value,
    )
    const laneEndFrames: number[] = []

    return matchingEvents.map((event) => {
      let laneIndex = laneEndFrames.findIndex((endFrame) => endFrame <= event.frame_start)

      if (laneIndex === -1) {
        laneIndex = laneEndFrames.length
        laneEndFrames.push(event.frame_end)
      } else {
        laneEndFrames[laneIndex] = event.frame_end
      }

      const leftPercent = ((Math.max(event.frame_start, scaleStart) - scaleStart) / visibleFrameSpan) * 100
      const widthPercent =
        ((Math.min(event.frame_end, scaleEnd) - Math.max(event.frame_start, scaleStart)) / visibleFrameSpan) * 100

      return {
        ...event,
        laneIndex,
        leftPercent,
        widthPercent: Math.max(widthPercent, 0.6),
      }
    })
  }

  const computeMetricPoints = (
    timeline: MetricTimelineOption,
    sourceEvents: Event[],
  ): { points: MetricPoint[]; min: number; max: number } => {
    const column = timeline.column as keyof Event
    const eventsWithValue = sourceEvents.filter((e) => e[column] != null && typeof e[column] === 'number')

    if (eventsWithValue.length === 0) return { points: [], min: 0, max: 1 }

    const boundaries = new Set<number>([scaleStart, scaleEnd])
    for (const event of eventsWithValue) {
      if (event.frame_start >= scaleStart && event.frame_start <= scaleEnd) boundaries.add(event.frame_start)
      if (event.frame_end >= scaleStart && event.frame_end <= scaleEnd) boundaries.add(event.frame_end)
    }

    const points: MetricPoint[] = Array.from(boundaries)
      .sort((a, b) => a - b)
      .map((frame) => {
        const active = eventsWithValue.filter((e) => e.frame_start <= frame && e.frame_end >= frame)
        const values = active.map((e) => e[column] as number)

        if (values.length === 0) return { frame, value: null }

        let value: number
        if (timeline.aggregation === 'max') {
          value = Math.max(...values)
        } else if (timeline.aggregation === 'average') {
          value = values.reduce((sum, v) => sum + v, 0) / values.length
        } else {
          value = active.sort((a, b) => b.frame_start - a.frame_start)[0][column] as number
        }

        return { frame, value }
      })

    const nonNull = points.filter((p) => p.value != null).map((p) => p.value as number)
    return { points, min: Math.min(...nonNull), max: Math.max(...nonNull) }
  }

  const timelineRows = useMemo<TimelineRow[]>(() => {
    return timelines.map((timeline) => {
      if (timeline.kind === 'metric') {
        if (!eventsData) return { kind: 'metric', timeline, points: [], min: 0, max: 1 }
        const { points, min, max } = computeMetricPoints(timeline, visibleEvents)
        return { kind: 'metric', timeline, points, min, max }
      }

      if (!eventsData) return { kind: 'filter', timeline, events: [], laneCount: 1 }
      const events = computeTimelineEvents(timeline, visibleEvents)
      const laneCount = Math.max(...events.map((e) => e.laneIndex + 1), 1)
      return { kind: 'filter', timeline, events, laneCount }
    })
  }, [eventsData, timelines, visibleEvents])

  const currentFrameOffset = ((currentFrame - scaleStart) / visibleFrameSpan) * 100


  return (
    <section className="event-display">
      <div className="event-display__header">
        <h3>Event Timelines</h3>
      </div>
      <div className="event-display__scroll">
        <div className="event-display__body" style={{ minWidth: `${timelineContentWidth}px` }}>
          {timelineRows.map((row) => {
            const trackHeight =
              row.kind === 'filter' ? row.laneCount * TIMELINE_LANE_HEIGHT : TIMELINE_METRIC_TRACK_HEIGHT
            const clampedFrameOffset = Math.min(Math.max(currentFrameOffset, 0), 100)

            return (
              <div
                key={row.timeline.id}
                className="event-display__row"
                style={{ gridTemplateColumns: `${TIMELINE_LABEL_WIDTH}px ${timelineTrackWidth}px` }}
              >
                <div className="event-display__label-row">{row.timeline.label}</div>
                <div className="event-display__track" style={{ height: `${trackHeight}px` }}>
                  <div
                    className="event-display__current-frame"
                    style={{ left: `${clampedFrameOffset}%` }}
                    aria-hidden="true"
                  />
                  {row.kind === 'filter'
                    ? row.events.map((event) => {
                        const eventLabel = getEventLabel(event)
                        return (
                          <div
                            key={event.event_id}
                            className="event-display__event"
                            data-label={eventLabel}
                            style={{
                              background: getEventColor(event.team_id),
                              left: `${event.leftPercent}%`,
                              width: `${event.widthPercent}%`,
                              top: `${event.laneIndex * TIMELINE_LANE_HEIGHT + 2}px`,
                            }}
                            title={eventLabel}
                          >
                            <span className="event-display__event-label">{eventLabel}</span>
                          </div>
                        )
                      })
                    : <MetricTrack row={row} scaleStart={scaleStart} visibleFrameSpan={visibleFrameSpan} timelineTrackWidth={timelineTrackWidth} />
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default EventDisplayComponent;