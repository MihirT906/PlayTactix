import { useEffect, useState, useMemo } from 'react'
import TimelineStore from '../services/TimelineStore'
import { useStyleConfig } from '../context/StyleConfigContext'
import { APP_CONFIG } from '../config'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { TimelineOption } from '../types/TimelineOption'
import { getClipEvents } from '../services/timelineEvents'
import { buildTimelineRows, getRowHeight, type TimelineRow } from './event-timeline/rows'
import LaneTrack from './event-timeline/LaneTrack'
import ValueTrack from './event-timeline/ValueTrack'
import MetricTrack from './event-timeline/MetricTrack'
import PossessionBandTrack from './event-timeline/PossessionBandTrack'
import './EventDisplayComponent.css'

const TIMELINE_LABEL_WIDTH = 140
const TIMELINE_ROW_GAP = 12
const TIMELINE_MIN_TRACK_WIDTH = 960
const TIMELINE_PIXELS_PER_FRAME = 2

type EventDisplayProps = {
  eventsData: Map<number, Event[]> | null
  clipRange: { start: number; end: number }
  segmentStart: number
  clipFrame: number
  matchData: MatchData | null
  timelineStore: TimelineStore
}

const EventDisplayComponent: React.FC<EventDisplayProps> = ({
  eventsData,
  clipRange,
  segmentStart,
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

    return getComputedStyle(document.documentElement).getPropertyValue('--app-bg-accent').trim() || APP_CONFIG.theme.colors.accent
  }

  const visibleEvents = useMemo<Event[]>(
    () => getClipEvents(eventsData, { start: scaleStart, end: scaleEnd }, segmentStart),
    [eventsData, scaleEnd, scaleStart, segmentStart],
  )

  const timelineRows = useMemo<TimelineRow[]>(
    () => buildTimelineRows(timelines, visibleEvents, { start: scaleStart, end: scaleEnd }),
    [timelines, visibleEvents, scaleStart, scaleEnd],
  )

  const currentFrameOffset = ((clipFrame - scaleStart) / visibleFrameSpan) * 100


  return (
    <section className="event-display">
      <div className="event-display__header">
        <h3>Event Timelines</h3>
      </div>
      <div className="event-display__scroll">
        <div className="event-display__body" style={{ minWidth: `${timelineContentWidth}px` }}>
          {timelineRows.map((row) => {
            const trackHeight = getRowHeight(row)
            const clampedFrameOffset = Math.min(Math.max(currentFrameOffset, 0), 100)

            return (
              <div
                key={row.key}
                className="event-display__row"
                style={{ gridTemplateColumns: `${TIMELINE_LABEL_WIDTH}px ${timelineTrackWidth}px` }}
              >
                <div className="event-display__label-row" title={row.label}>{row.label}</div>
                <div className="event-display__track" style={{ height: `${trackHeight}px` }}>
                  <div
                    className="event-display__current-frame"
                    style={{ left: `${clampedFrameOffset}%` }}
                    aria-hidden="true"
                  />
                  {row.kind === 'lanes' ? (
                    <LaneTrack row={row} getEventColor={getEventColor} />
                  ) : row.kind === 'value' ? (
                    <ValueTrack row={row} timelineTrackWidth={timelineTrackWidth} getEventColor={getEventColor} />
                  ) : row.kind === 'possessionBand' ? (
                    <PossessionBandTrack row={row} scaleStart={scaleStart} visibleFrameSpan={visibleFrameSpan} timelineTrackWidth={timelineTrackWidth} />
                  ) : (
                    <MetricTrack row={row} scaleStart={scaleStart} visibleFrameSpan={visibleFrameSpan} timelineTrackWidth={timelineTrackWidth} />
                  )}
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
