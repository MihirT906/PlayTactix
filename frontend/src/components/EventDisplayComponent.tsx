import { useMemo, useState } from 'react'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import { useStyleConfig } from '../context/StyleConfigContext'
import './EventDisplayComponent.css'

type EventDisplayProps = {
  eventsData: Map<number, Event[]> | null
  scaleStart: number
  scaleEnd: number
  currentFrame: number
  matchData: MatchData | null
}

type EventDisplayConfig = {
  title: string
  eventType: string
  metricLabel: string
  metricRange: [number, number]
  getMetricValue: (event: Event) => number | null
  getEventLabel?: (event: Event) => string
}

type TimelineEvent = Event & {
  lane: number
}

type ChartPoint = {
  x: number
  y: number
}

type LaneChart = {
  lane: number
  points: string
}

type EventDisplayTrackProps = {
  config: EventDisplayConfig
  eventsData: Map<number, Event[]> | null
  scaleStart: number
  scaleEnd: number
  totalFrames: number
  currentFramePercent: number
  matchData: MatchData | null
  homeTeamColor: string
  awayTeamColor: string
  isExpanded: boolean
  onToggle: () => void
}

const LANE_HEIGHT = 50
const XLOSS_LINE_THICKNESS = 2
const CHART_VERTICAL_PADDING = 6

const EVENT_DISPLAY_CONFIGS: EventDisplayConfig[] = [
  {
    title: 'Player Possession Timeline',
    eventType: 'player_possession',
    metricLabel: 'n_opponents_overtaken',
    metricRange: [0, 10],
    getMetricValue: (event) => (event.n_opponents_overtaken === -1 ? null : event.n_opponents_overtaken),
    getEventLabel: (event) => `${event.player_name} (${event.player_position})`,
  },
  {
    title: 'Passing Options Timeline',
    eventType: 'passing_option',
    metricLabel: 'xThreat',
    metricRange: [0, 1],
    getMetricValue: (event) => (event.xthreat === -1 ? null : event.xthreat),
    getEventLabel: (event) => `${event.player_name} (${event.player_position})`,
  },
  {
    title: 'On Ball Engagement Timeline',
    eventType: 'on_ball_engagement',
    metricLabel: 'xloss_player_possession_max',
    metricRange: [0, 1],
    getMetricValue: (event) => (event.xloss_player_possession_max === -1 ? null : event.xloss_player_possession_max),
    getEventLabel: (event) => `${event.player_name} (${event.player_position})`,
  },
]

function EventDisplayTrack({
  config,
  eventsData,
  scaleStart,
  scaleEnd,
  totalFrames,
  currentFramePercent,
  matchData,
  homeTeamColor,
  awayTeamColor,
  isExpanded,
  onToggle,
}: EventDisplayTrackProps) {
  const [rangeStart, rangeEnd] = config.metricRange
  const metricMin = Math.min(rangeStart, rangeEnd)
  const metricMax = Math.max(rangeStart, rangeEnd)
  const chartMin = Math.min(metricMin, 0)
  const chartMax = Math.max(metricMax, 0)

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const uniqueEvents = new Map<string, Event>()

    if (eventsData) {
      for (const frameEvents of eventsData.values()) {
        for (const event of frameEvents) {
          if (event.event_type !== config.eventType) {
            continue
          }

          if (!uniqueEvents.has(event.event_id)) {
            uniqueEvents.set(event.event_id, event)
          }
        }
      }
    }

    const sortedEvents = Array.from(uniqueEvents.values())
      .filter((event) => event.frame_end >= scaleStart && event.frame_start <= scaleEnd)
      .sort((left, right) => {
        if (left.frame_start !== right.frame_start) {
          return left.frame_start - right.frame_start
        }

        return left.frame_end - right.frame_end
      })

    const laneEndFrames: number[] = []

    return sortedEvents.map((event) => {
      let laneIndex = laneEndFrames.findIndex((endFrame) => endFrame < event.frame_start)

      if (laneIndex === -1) {
        laneIndex = laneEndFrames.length
        laneEndFrames.push(event.frame_end)
      } else {
        laneEndFrames[laneIndex] = event.frame_end
      }

      return {
        ...event,
        lane: laneIndex,
      }
    })
  }, [config.eventType, eventsData, scaleEnd, scaleStart])

  const laneCount = timelineEvents.length > 0
    ? Math.max(...timelineEvents.map((event) => event.lane)) + 1
    : 1

  const getEventColor = (teamId: number) => {
    if (teamId === matchData?.home_team.id) {
      return homeTeamColor
    }

    if (teamId === matchData?.away_team.id) {
      return awayTeamColor
    }

    return '#F59E0B'
  }

  const getEventTextColor = (backgroundColor: string) => {
    const normalized = backgroundColor.replace('#', '')

    if (normalized.length !== 6) {
      return '#111827'
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000

    return brightness > 150 ? '#111827' : '#F8FAFC'
  }

  const getClampedMetricValue = (event: Event) => {
    const metricValue = config.getMetricValue(event)

    if (metricValue === null) {
      return null
    }

    return Math.min(Math.max(metricValue, metricMin), metricMax)
  }

  const getEventLabel = (event: Event) => {
    if (config.getEventLabel) {
      return config.getEventLabel(event)
    }

    return event.player_name
  }

  const trackHeight = laneCount * LANE_HEIGHT

  const laneCharts = useMemo<LaneChart[]>(() => {
    const metricSpan = Math.max(chartMax - chartMin, 1)
    const laneHeight = Math.max(LANE_HEIGHT - (CHART_VERTICAL_PADDING * 2), 1)
    const toX = (frame: number) => ((frame - scaleStart) / totalFrames) * 100
    const toY = (value: number, lane: number) => {
      const normalizedValue = (value - chartMin) / metricSpan
      const laneTop = lane * LANE_HEIGHT

      return laneTop + LANE_HEIGHT - CHART_VERTICAL_PADDING - (normalizedValue * laneHeight)
    }

    const laneEvents = new Map<number, TimelineEvent[]>()

    for (const event of timelineEvents) {
      const eventsForLane = laneEvents.get(event.lane) ?? []
      eventsForLane.push(event)
      laneEvents.set(event.lane, eventsForLane)
    }

    return Array.from({ length: laneCount }, (_, lane) => {
      const eventsForLane = laneEvents.get(lane) ?? []
      const boundaries = new Set<number>([scaleStart, scaleEnd])

      for (const event of eventsForLane) {
        boundaries.add(Math.max(event.frame_start, scaleStart))
        boundaries.add(Math.min(event.frame_end, scaleEnd))
      }

      const sortedBoundaries = Array.from(boundaries)
        .filter((frame) => frame >= scaleStart && frame <= scaleEnd)
        .sort((left, right) => left - right)

      if (sortedBoundaries.length === 1) {
        sortedBoundaries.push(scaleEnd)
      }

      const getValueAtFrame = (frame: number) => {
        for (const event of eventsForLane) {
          if (event.frame_start <= frame && event.frame_end >= frame) {
            return getClampedMetricValue(event) ?? 0
          }
        }

        return 0
      }

      const points: ChartPoint[] = []
      let previousValue = getValueAtFrame(scaleStart)
      points.push({ x: toX(scaleStart), y: toY(previousValue, lane) })

      for (let index = 1; index < sortedBoundaries.length; index += 1) {
        const boundary = sortedBoundaries[index]
        points.push({ x: toX(boundary), y: toY(previousValue, lane) })

        if (boundary === scaleEnd) {
          continue
        }

        const nextBoundary = sortedBoundaries[index + 1] ?? scaleEnd
        const sampleFrame = boundary + ((nextBoundary - boundary) / 2)
        const nextValue = getValueAtFrame(sampleFrame)

        if (nextValue !== previousValue) {
          points.push({ x: toX(boundary), y: toY(nextValue, lane) })
          previousValue = nextValue
        }
      }

      return {
        lane,
        points: points.map((point) => `${point.x},${point.y}`).join(' '),
      }
    })
  }, [chartMax, chartMin, laneCount, metricMax, metricMin, scaleEnd, scaleStart, timelineEvents, totalFrames])

  return (
    <div className="event-display__section">
      <div className="event-display__section-header">
        <button
          type="button"
          className="event-display__section-toggle"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <span
            className={`event-display__section-arrow${isExpanded ? ' event-display__section-arrow--expanded' : ''}`}
            aria-hidden="true"
          />
          <h3>{config.title}</h3>
        </button>
      </div>

      {isExpanded && (
        <div
          className="event-display__track"
          style={{ height: `${trackHeight}px` }}
        >
          <svg
            className="event-display__xloss-chart"
            viewBox={`0 0 100 ${trackHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {laneCharts.map((laneChart) => (
              <polyline
                key={laneChart.lane}
                className="event-display__xloss-line"
                points={laneChart.points}
                style={{ strokeWidth: XLOSS_LINE_THICKNESS }}
              />
            ))}
          </svg>
          <div
            className="event-display__current-marker event-display__current-marker--track"
            style={{ left: `${currentFramePercent}%` }}
          />
          {timelineEvents.map((event) => {
            const visibleStart = Math.max(event.frame_start, scaleStart)
            const visibleEnd = Math.min(event.frame_end, scaleEnd)
            const left = ((visibleStart - scaleStart) / totalFrames) * 100
            const width = Math.max(((visibleEnd - visibleStart) / totalFrames) * 100, 2)
            const backgroundColor = getEventColor(event.team_id)
            const color = getEventTextColor(backgroundColor)
            const eventLabel = getEventLabel(event)
            const metricValue = getClampedMetricValue(event)
            const metricText = metricValue === null ? 'N/A' : metricValue.toFixed(2)

            return (
              <div
                key={event.event_id}
                className="event-display__box"
                style={{
                  background: backgroundColor,
                  color,
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${event.lane * LANE_HEIGHT}px`,
                }}
                title={`${eventLabel} | ${config.metricLabel}: ${metricText}`}
              >
                <span className="event-display__label">
                  {eventLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventDisplayComponent({
  eventsData,
  scaleStart,
  scaleEnd,
  currentFrame,
  matchData,
}: EventDisplayProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [expandedEventTypes, setExpandedEventTypes] = useState<string[]>([])

  const totalFrames = Math.max(scaleEnd - scaleStart, 1)

  const tickInterval = 100
  const firstTick = Math.ceil(scaleStart / tickInterval) * tickInterval
  const ticks = Array.from(
    { length: Math.max(Math.floor((scaleEnd - firstTick) / tickInterval) + 1, 0) },
    (_, index) => firstTick + index * tickInterval,
  )
  const currentFramePercent = ((Math.min(Math.max(currentFrame, scaleStart), scaleEnd) - scaleStart) / totalFrames) * 100
  const hasExpandedTracks = expandedEventTypes.length > 0

  const toggleEventType = (eventType: string) => {
    setExpandedEventTypes((current) => (
      current.includes(eventType)
        ? current.filter((value) => value !== eventType)
        : [...current, eventType]
    ))
  }

  return (
    <section className="event-display">
      <div className="event-display__header">
        <h3>Event Timelines</h3>
      </div>

      {hasExpandedTracks && (
        <div className="event-display__tick-row" aria-hidden="true">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="event-display__tick"
              style={{
                left: `${((tick - scaleStart) / totalFrames) * 100}%`,
              }}
            >
              {tick}
            </div>
          ))}
          <div
            className="event-display__current-marker event-display__current-marker--ticks"
            style={{ left: `${currentFramePercent}%` }}
          >
            <span className="event-display__current-label">{currentFrame}</span>
          </div>
        </div>
      )}

      {EVENT_DISPLAY_CONFIGS.map((config) => (
        <EventDisplayTrack
          key={config.title}
          config={config}
          eventsData={eventsData}
          scaleStart={scaleStart}
          scaleEnd={scaleEnd}
          totalFrames={totalFrames}
          currentFramePercent={currentFramePercent}
          matchData={matchData}
          homeTeamColor={homeTeamColor}
          awayTeamColor={awayTeamColor}
          isExpanded={expandedEventTypes.includes(config.eventType)}
          onToggle={() => toggleEventType(config.eventType)}
        />
      ))}
    </section>
  )
}

export default EventDisplayComponent;