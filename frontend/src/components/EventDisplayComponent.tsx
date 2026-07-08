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

type PossessionBand = {
  frameStart: number
  frameEnd: number
  start: number
  end: number
  max: number
}

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

type PossessionBandRow = {
  kind: 'possessionBand'
  timeline: TimelineOption
  bands: PossessionBand[]
  min: number
  max: number
}

type TimelineRow = FilterTimelineRow | MetricTimelineRow | PossessionBandRow

const POSSESSION_BAND_MIN_WIDTH = 6

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

type PossessionBandTrackProps = {
  row: PossessionBandRow
  scaleStart: number
  visibleFrameSpan: number
  timelineTrackWidth: number
}

const PossessionBandTrack: React.FC<PossessionBandTrackProps> = ({
  row,
  scaleStart,
  visibleFrameSpan,
  timelineTrackWidth,
}) => {
  const [hover, setHover] = useState<{ x: number; band: PossessionBand } | null>(null)

  const { bands, min, max } = row
  const range = max - min || 1
  const innerHeight = TIMELINE_METRIC_TRACK_HEIGHT - TIMELINE_METRIC_PADDING * 2
  const yFor = (value: number) => TIMELINE_METRIC_PADDING + innerHeight - ((value - min) / range) * innerHeight
  const yZero = yFor(0)

  const bars = bands.map((band) => {
    const xStart = ((band.frameStart - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const xEndRaw = ((band.frameEnd - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const xEnd = Math.max(xEndRaw, xStart + POSSESSION_BAND_MIN_WIDTH)
    const centerX = (xStart + xEnd) / 2
    const yStart = yFor(band.start)
    const yEnd = yFor(band.end)
    const wickTop = yFor(band.max)
    const wickBottom = Math.min(yStart, yEnd)
    const hasSignal = band.start !== 0 || band.end !== 0 || band.max !== 0

    return { band, xStart, xEnd, centerX, yStart, yEnd, wickTop, wickBottom, hasSignal }
  })

  type LineSegment = { x1: number; y1: number; x2: number; y2: number; hasSignal: boolean }
  const segments: LineSegment[] = []

  bars.forEach((bar, index) => {
    segments.push({ x1: bar.xStart, y1: bar.yStart, x2: bar.xEnd, y2: bar.yEnd, hasSignal: bar.hasSignal })

    const next = bars[index + 1]
    if (next) {
      segments.push({ x1: bar.xEnd, y1: bar.yEnd, x2: bar.xEnd, y2: yZero, hasSignal: false })
      segments.push({ x1: bar.xEnd, y1: yZero, x2: next.xStart, y2: yZero, hasSignal: false })
      segments.push({ x1: next.xStart, y1: yZero, x2: next.xStart, y2: next.yStart, hasSignal: false })
    }
  })

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (bars.length === 0) return
    const mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left

    let nearest = bars[0]
    let nearestDistance = Math.abs(bars[0].centerX - mouseX)
    for (const bar of bars) {
      const distance = Math.abs(bar.centerX - mouseX)
      if (distance < nearestDistance) {
        nearest = bar
        nearestDistance = distance
      }
    }

    setHover({ x: nearest.centerX, band: nearest.band })
  }

  const TOOLTIP_W = 96
  const TOOLTIP_H = 44
  const tooltipX = hover != null
    ? (hover.x + 8 + TOOLTIP_W > timelineTrackWidth ? hover.x - 8 - TOOLTIP_W : hover.x + 8)
    : 0

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_METRIC_TRACK_HEIGHT}
      className="event-display__metric-svg"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      {segments.map((segment, index) => (
        <line
          key={index}
          x1={segment.x1} y1={segment.y1}
          x2={segment.x2} y2={segment.y2}
          className={[
            'event-display__band-line',
            segment.hasSignal ? 'event-display__band--signal' : 'event-display__band--flat',
          ].join(' ')}
        />
      ))}
      {bars.map((bar, index) => (
        <g key={index} className={bar.hasSignal ? 'event-display__band--signal' : 'event-display__band--flat'}>
          <line
            x1={bar.centerX} y1={bar.wickTop}
            x2={bar.centerX} y2={bar.wickBottom}
            className="event-display__band-wick"
          />
          <circle cx={bar.centerX} cy={bar.wickTop} r={bar.hasSignal ? 2.5 : 1.5} className="event-display__band-max-dot" />
        </g>
      ))}
      {hover != null && (
        <>
          <rect
            x={tooltipX} y={TIMELINE_METRIC_PADDING}
            width={TOOLTIP_W} height={TOOLTIP_H}
            rx={4} className="event-display__metric-tooltip-bg"
          />
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_METRIC_PADDING + 13} textAnchor="middle" className="event-display__metric-tooltip">
            start {hover.band.start.toFixed(2)}
          </text>
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_METRIC_PADDING + 26} textAnchor="middle" className="event-display__metric-tooltip">
            end {hover.band.end.toFixed(2)}
          </text>
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_METRIC_PADDING + 39} textAnchor="middle" className="event-display__metric-tooltip">
            max {hover.band.max.toFixed(2)}
          </text>
        </>
      )}
    </svg>
  )
}

type EventDisplayProps = {
  eventsData: Map<number, Event[]> | null
  clipRange: { start: number; end: number }
  episodeStart: number
  clipFrame: number
  matchData: MatchData | null
  timelineStore: TimelineStore
}

const EventDisplayComponent: React.FC<EventDisplayProps> = ({
  eventsData,
  clipRange,
  episodeStart,
  clipFrame,
  matchData,
  timelineStore,
}) => {
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const scaleStart = clipRange.start
  const scaleEnd = clipRange.end
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
        uniqueEvents.set(event.event_id, {
          ...event,
          frame_start: event.frame_start - episodeStart,
          frame_end: event.frame_end - episodeStart,
        })
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
  }, [eventsData, scaleEnd, scaleStart, episodeStart])

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
    const eventsWithValue = sourceEvents.filter(
      (e) => e[column] != null && typeof e[column] === 'number' && e[column] !== -1,
    )

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

        if (active.length === 0) return { frame, value: null }

        const values = active.map((e) => e[column] as number)
        const value =
          timeline.aggregation === 'max'
            ? Math.max(...values)
            : timeline.aggregation === 'latest'
              ? values[values.length - 1]
              : values.reduce((sum, v) => sum + v, 0) / values.length

        return { frame, value }
      })

    return { points, min: 0, max: 1 }
  }

  const computePossessionBands = (
    column: string,
    sourceEvents: Event[],
  ): { bands: PossessionBand[]; min: number; max: number } => {
    const startKey = `${column}_start` as keyof Event
    const endKey = `${column}_end` as keyof Event
    const maxKey = `${column}_max` as keyof Event
    const bands: PossessionBand[] = []

    for (const event of sourceEvents) {
      const start = event[startKey]
      const end = event[endKey]
      const max = event[maxKey]

      if (typeof start !== 'number' || typeof end !== 'number' || typeof max !== 'number') continue
      if (start === -1 || end === -1 || max === -1) continue

      bands.push({ frameStart: event.frame_start, frameEnd: event.frame_end, start, end, max })
    }

    if (bands.length === 0) return { bands: [], min: 0, max: 1 }

    return { bands, min: 0, max: 1 }
  }

  const timelineRows = useMemo<TimelineRow[]>(() => {
    return timelines.map((timeline) => {
      if (timeline.kind === 'metric' && timeline.aggregation === 'band') {
        if (!eventsData) return { kind: 'possessionBand', timeline, bands: [], min: 0, max: 1 }
        const { bands, min, max } = computePossessionBands(timeline.column, visibleEvents)
        return { kind: 'possessionBand', timeline, bands, min, max }
      }

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

  const currentFrameOffset = ((clipFrame - scaleStart) / visibleFrameSpan) * 100


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
                    : row.kind === 'possessionBand'
                    ? <PossessionBandTrack row={row} scaleStart={scaleStart} visibleFrameSpan={visibleFrameSpan} timelineTrackWidth={timelineTrackWidth} />
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
