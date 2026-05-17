import { useMemo } from 'react'
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

type TimelineEvent = Event & {
  lane: number
}

type ChartPoint = {
  x: number
  y: number
}

const LANE_HEIGHT = 50
const XLOSS_LINE_THICKNESS = 2
const CHART_VERTICAL_PADDING = 6

function EventDisplayComponent({
  eventsData,
  scaleStart,
  scaleEnd,
  currentFrame,
  matchData,
}: EventDisplayProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()

  const possessionEvents = useMemo<TimelineEvent[]>(() => {
    const uniqueEvents = new Map<string, Event>()

    if (eventsData) {
      for (const frameEvents of eventsData.values()) {
        for (const event of frameEvents) {
          if (event.event_type !== 'player_possession') {
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
  }, [eventsData, scaleEnd, scaleStart])

  const totalFrames = Math.max(scaleEnd - scaleStart, 1)
  const laneCount = possessionEvents.length > 0
    ? Math.max(...possessionEvents.map((event) => event.lane)) + 1
    : 1

  const tickInterval = 100
  const firstTick = Math.ceil(scaleStart / tickInterval) * tickInterval
  const ticks = Array.from(
    { length: Math.max(Math.floor((scaleEnd - firstTick) / tickInterval) + 1, 0) },
    (_, index) => firstTick + index * tickInterval,
  )
  const currentFramePercent = ((Math.min(Math.max(currentFrame, scaleStart), scaleEnd) - scaleStart) / totalFrames) * 100

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

  const hasXlossValue = (event: Event) => event.player_targeted_xthreat !== -1

  const getClampedXlossValue = (event: Event) => {
    if (!hasXlossValue(event)) {
      return null
    }

    return Math.min(Math.max(event.player_targeted_xthreat, 0), 1)
  }

  const trackHeight = laneCount * LANE_HEIGHT

  const xlossLinePoints = useMemo(() => {
    const boundaries = new Set<number>([scaleStart, scaleEnd])

    for (const event of possessionEvents) {
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
      let activeValue = 0

      for (const event of possessionEvents) {
        if (event.frame_start <= frame && event.frame_end >= frame) {
          activeValue = Math.max(activeValue, getClampedXlossValue(event) ?? 0)
        }
      }

      return activeValue
    }

    const availableHeight = Math.max(trackHeight - (CHART_VERTICAL_PADDING * 2), 1)
    const toX = (frame: number) => ((frame - scaleStart) / totalFrames) * 100
    const toY = (value: number) => trackHeight - CHART_VERTICAL_PADDING - (value * availableHeight)

    const points: ChartPoint[] = []
    let previousValue = getValueAtFrame(scaleStart)
    points.push({ x: toX(scaleStart), y: toY(previousValue) })

    for (let index = 1; index < sortedBoundaries.length; index += 1) {
      const boundary = sortedBoundaries[index]
      points.push({ x: toX(boundary), y: toY(previousValue) })

      if (boundary === scaleEnd) {
        continue
      }

      const nextBoundary = sortedBoundaries[index + 1] ?? scaleEnd
      const sampleFrame = boundary + ((nextBoundary - boundary) / 2)
      const nextValue = getValueAtFrame(sampleFrame)

      if (nextValue !== previousValue) {
        points.push({ x: toX(boundary), y: toY(nextValue) })
        previousValue = nextValue
      }
    }

    return points
      .map((point) => `${point.x},${point.y}`)
      .join(' ')
  }, [possessionEvents, scaleEnd, scaleStart, totalFrames, trackHeight])

  return (
    <section className="event-display">
      <div className="event-display__header">
        <h3>Player Possession Timeline</h3>
      </div>

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
          <polyline
            className="event-display__xloss-line"
            points={xlossLinePoints}
            style={{ strokeWidth: XLOSS_LINE_THICKNESS }}
          />
        </svg>
        <div
          className="event-display__current-marker event-display__current-marker--track"
          style={{ left: `${currentFramePercent}%` }}
        />
        {possessionEvents.map((event) => {
          const visibleStart = Math.max(event.frame_start, scaleStart)
          const visibleEnd = Math.min(event.frame_end, scaleEnd)
          const left = ((visibleStart - scaleStart) / totalFrames) * 100
          const width = Math.max(((visibleEnd - visibleStart) / totalFrames) * 100, 2)
          const backgroundColor = getEventColor(event.team_id)
          const color = getEventTextColor(backgroundColor)

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
              title={`Event ${event.event_id}`}
            >
              <span className="event-display__label">
                {`${event.player_name} (${event.player_position})`}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default EventDisplayComponent;