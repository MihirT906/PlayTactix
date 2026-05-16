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

function EventDisplayComponent({
  eventsData,
  scaleStart,
  scaleEnd,
  currentFrame,
  matchData,
}: EventDisplayProps) {
  const { homeTeamColor, awayTeamColor, eventStyles } = useStyleConfig()

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

  const getEventBackgroundColor = (eventType: string) => {
    const style = eventStyles["playerPossession"]
    return style ? style.color : '#F59E0B'
  }

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
        style={{ height: `${laneCount * 50}px` }}
      >
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
          const borderColor = getEventBackgroundColor(event.event_type)

          return (
            <div
              key={event.event_id}
              className="event-display__box"
              style={{
                background: backgroundColor,
                color,
                left: `${left}%`,
                width: `${width}%`,
                top: `${event.lane * 50}px`,
                // border: `1px solid ${borderColor}`,
              }}
              title={`Event ${event.event_id}`}
            >
              <span className="event-display__label">
                {event.player_name}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default EventDisplayComponent;