import { useEffect, useState, useMemo } from 'react'
import TimelineStore from '../services/TimelineStore'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { TimelineOption } from '../types/TimelineOption'
import './EventDisplayComponent.css'

type TimelineEvent = Event & {
  laneIndex: number
  leftPercent: number
  widthPercent: number
}

type TimelineRow = {
  timeline: TimelineOption
  events: TimelineEvent[]
  laneCount: number
}

const TIMELINE_LANE_HEIGHT = 22
const TIMELINE_LABEL_WIDTH = 220
const TIMELINE_ROW_GAP = 12
const TIMELINE_MIN_TRACK_WIDTH = 960
const TIMELINE_PIXELS_PER_FRAME = 2

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

  const timelineRows = useMemo<TimelineRow[]>(() => {
    if (!eventsData) {
      return timelines.map((timeline) => ({ timeline, events: [], laneCount: 1 }))
    }

    return timelines.map((timeline) => {
      const events = computeTimelineEvents(timeline, visibleEvents)
      const laneCount = Math.max(...events.map((event) => event.laneIndex + 1), 1)

      return {
        timeline,
        events,
        laneCount,
      }
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
          {timelineRows.map(({ timeline, events, laneCount }) => (
            <div
              key={timeline.id}
              className="event-display__row"
              style={{
                gridTemplateColumns: `${TIMELINE_LABEL_WIDTH}px ${timelineTrackWidth}px`,
              }}
            >
              <div className="event-display__label-row">{timeline.label}</div>
              <div
                className="event-display__track"
                style={{
                  height: `${laneCount * TIMELINE_LANE_HEIGHT}px`,
                }}
              >
                <div
                  className="event-display__current-frame"
                  style={{ left: `${Math.min(Math.max(currentFrameOffset, 0), 100)}%` }}
                  aria-hidden="true"
                />
                {events.map((event) => {
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
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default EventDisplayComponent;