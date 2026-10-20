import type { Event } from '../../types/FrameDataInterfaces'
import { EVENT_FILL_OPACITY, TIMELINE_LANE_HEIGHT, getEventLabel, type LaneRow } from './rows'

// Fill of an event going on at the playhead, or being hovered.
const ACTIVE_FILL_OPACITY = 0.75

type LaneTrackProps = {
  row: LaneRow
  clipFrame: number
  getEventColor: (teamId: number) => string
  onEventSeek: (event: Event) => void
  onEventHover: (event: Event | null) => void
}

const LaneTrack: React.FC<LaneTrackProps> = ({ row, clipFrame, getEventColor, onEventSeek, onEventHover }) => (
  <>
    {row.events.map((event) => {
      const eventLabel = getEventLabel(event, row.showSubtype)
      const teamColor = getEventColor(event.team_id)
      const isActive = event.frame_start <= clipFrame && clipFrame <= event.frame_end

      return (
        <div
          key={event.event_id}
          className={`event-display__event${isActive ? ' is-active' : ''}`}
          data-label={eventLabel}
          style={{
            background: `color-mix(in srgb, ${teamColor} ${(isActive ? ACTIVE_FILL_OPACITY : EVENT_FILL_OPACITY) * 100}%, transparent)`,
            borderColor: teamColor,
            left: `${event.leftPercent}%`,
            width: `${event.widthPercent}%`,
            top: `${event.laneIndex * TIMELINE_LANE_HEIGHT + 2}px`,
          }}
          title={eventLabel}
          // Pressing an event jumps to its start, rather than to where on the bar it was pressed.
          onPointerDown={(pointerEvent) => {
            if (pointerEvent.button !== 0) return
            pointerEvent.stopPropagation()
            onEventSeek(event)
          }}
          onMouseEnter={() => onEventHover(event)}
          onMouseLeave={() => onEventHover(null)}
        >
          <span className="event-display__event-label">{eventLabel}</span>
        </div>
      )
    })}
  </>
)

export default LaneTrack
