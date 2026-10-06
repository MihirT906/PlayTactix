import { EVENT_FILL_OPACITY, TIMELINE_LANE_HEIGHT, getEventLabel, type LaneRow } from './rows'

type LaneTrackProps = {
  row: LaneRow
  getEventColor: (teamId: number) => string
}

const LaneTrack: React.FC<LaneTrackProps> = ({ row, getEventColor }) => (
  <>
    {row.events.map((event) => {
      const eventLabel = getEventLabel(event, row.showSubtype)
      const teamColor = getEventColor(event.team_id)

      return (
        <div
          key={event.event_id}
          className="event-display__event"
          data-label={eventLabel}
          style={{
            background: `color-mix(in srgb, ${teamColor} ${EVENT_FILL_OPACITY * 100}%, transparent)`,
            borderColor: teamColor,
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
  </>
)

export default LaneTrack
