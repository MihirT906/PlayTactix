import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { Event } from '../types/FrameDataInterfaces'
import {
  EVENT_TYPES,
  EVENT_SUBTYPES,
  START_TYPES,
  END_TYPES,
  LEAD_TO_GOAL_VALUES,
  LEAD_TO_SHOT_VALUES,
  formatEventValue,
  type EventType,
} from '../constants/eventData'
import './KeyMomentFinderComponent.css'

type EventVisualisationTabProps = {
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
  selectedEvents: Event[]
  onToggleEvent: (event: Event) => void
  onSetSelectedEvents: (events: Event[]) => void
  autoDisappearEvents: boolean
  onToggleAutoDisappearEvents: (autoDisappear: boolean) => void
}

const MAX_SELECT_ALL_EVENTS = 100

function toggleValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function EventVisualisationTab({
  keyMomentsData,
  matchData,
  selectedEvents,
  onToggleEvent,
  onSetSelectedEvents,
  autoDisappearEvents,
  onToggleAutoDisappearEvents,
}: EventVisualisationTabProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType[]>([])
  const [eventSubtypeFilter, setEventSubtypeFilter] = useState<string[]>([])
  const [startTypeFilter, setStartTypeFilter] = useState<string[]>([])
  const [endTypeFilter, setEndTypeFilter] = useState<string[]>([])
  const [playerPositionFilter, setPlayerPositionFilter] = useState<string[]>([])
  const [teamIdFilter, setTeamIdFilter] = useState<number[]>([])
  const [leadToShotFilter, setLeadToShotFilter] = useState<boolean[]>([])
  const [leadToGoalFilter, setLeadToGoalFilter] = useState<boolean[]>([])
  const home_team_id = matchData?.home_team.id
  const away_team_id = matchData?.away_team.id
  const home_team_name = matchData?.home_team.short_name
  const away_team_name = matchData?.away_team.short_name

  const allEvents = keyMomentsData?.events ?? []

  const playerPositions = Array.from(
    new Set(allEvents.map((event) => event.player_position).filter((position): position is string => Boolean(position))),
  ).sort()

  const events = allEvents.filter(
    (event) =>
      (eventTypeFilter.length === 0 || eventTypeFilter.includes(event.event_type as EventType)) &&
      (eventSubtypeFilter.length === 0 || eventSubtypeFilter.includes(event.event_subtype)) &&
      (startTypeFilter.length === 0 || startTypeFilter.includes(event.start_type)) &&
      (endTypeFilter.length === 0 || endTypeFilter.includes(event.end_type)) &&
      (playerPositionFilter.length === 0 || playerPositionFilter.includes(event.player_position)) &&
      (teamIdFilter.length === 0 || teamIdFilter.includes(event.team_id)) &&
      (leadToShotFilter.length === 0 || leadToShotFilter.includes(event.lead_to_shot)) &&
      (leadToGoalFilter.length === 0 || leadToGoalFilter.includes(event.lead_to_goal)),
  )

  const teamName = (teamId: number) => {
    if (teamId === home_team_id) return home_team_name
    if (teamId === away_team_id) return away_team_name
    return undefined
  }

  const isAllSelected = events.length > 0 && events.every((event) => selectedEvents.some((e) => e.event_id === event.event_id))

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      const filteredIds = new Set(events.map((event) => event.event_id))
      onSetSelectedEvents(selectedEvents.filter((event) => !filteredIds.has(event.event_id)))
    } else {
      const selectedIds = new Set(selectedEvents.map((event) => event.event_id))
      const eventsToAdd = events
        .filter((event) => !selectedIds.has(event.event_id))
        .slice(0, Math.max(0, MAX_SELECT_ALL_EVENTS - selectedEvents.length))
      onSetSelectedEvents([...selectedEvents, ...eventsToAdd])
    }
  }

  return (
    <div className="key-moment-groups">
      <label className="key-moment-button key-moment-checkbox-row key-moment-auto-disappear-row">
        <input
          type="checkbox"
          checked={autoDisappearEvents}
          onChange={(e) => onToggleAutoDisappearEvents(e.target.checked)}
        />
        <span className="key-moment-primary">Auto Disappear</span>
      </label>
      <div className="key-moment-filters">
        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Event Type</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${eventTypeFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setEventTypeFilter([])}
            >
              Any
            </button>
            {EVENT_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`key-moment-chip${eventTypeFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setEventTypeFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Event Subtype</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${eventSubtypeFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setEventSubtypeFilter([])}
            >
              Any
            </button>
            {EVENT_SUBTYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`key-moment-chip${eventSubtypeFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setEventSubtypeFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Start Type</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${startTypeFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setStartTypeFilter([])}
            >
              Any
            </button>
            {START_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`key-moment-chip${startTypeFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setStartTypeFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">End Type</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${endTypeFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setEndTypeFilter([])}
            >
              Any
            </button>
            {END_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`key-moment-chip${endTypeFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setEndTypeFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Player Position</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${playerPositionFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setPlayerPositionFilter([])}
            >
              Any
            </button>
            {playerPositions.map((value) => (
              <button
                key={value}
                type="button"
                className={`key-moment-chip${playerPositionFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setPlayerPositionFilter((current) => toggleValue(current, value))}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {matchData && (
          <div className="key-moment-filter-chip-row">
            <span className="key-moment-filter-label">Team</span>
            <div className="key-moment-filter-chips">
              <button
                type="button"
                className={`key-moment-chip${teamIdFilter.length === 0 ? ' is-active' : ''}`}
                onClick={() => setTeamIdFilter([])}
              >
                Any
              </button>
              {[matchData.home_team, matchData.away_team].map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className={`key-moment-chip${teamIdFilter.includes(team.id) ? ' is-active' : ''}`}
                  onClick={() => setTeamIdFilter((current) => toggleValue(current, team.id))}
                >
                  {team.short_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Lead to Shot</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${leadToShotFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setLeadToShotFilter([])}
            >
              Any
            </button>
            {LEAD_TO_SHOT_VALUES.map((value) => (
              <button
                key={String(value)}
                type="button"
                className={`key-moment-chip${leadToShotFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setLeadToShotFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="key-moment-filter-chip-row">
          <span className="key-moment-filter-label">Lead to Goal</span>
          <div className="key-moment-filter-chips">
            <button
              type="button"
              className={`key-moment-chip${leadToGoalFilter.length === 0 ? ' is-active' : ''}`}
              onClick={() => setLeadToGoalFilter([])}
            >
              Any
            </button>
            {LEAD_TO_GOAL_VALUES.map((value) => (
              <button
                key={String(value)}
                type="button"
                className={`key-moment-chip${leadToGoalFilter.includes(value) ? ' is-active' : ''}`}
                onClick={() => setLeadToGoalFilter((current) => toggleValue(current, value))}
              >
                {formatEventValue(value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={`key-moment-group${isExpanded ? ' is-expanded' : ''}`}>
        <div className="key-moment-header">
          <span className="key-moment-label">Events</span>
          <button
            type="button"
            className="key-moment-toggle"
            aria-expanded={isExpanded}
            aria-controls="events-overlay-panel"
            onClick={() => setIsExpanded((previousValue) => !previousValue)}
          >
            <span className="key-moment-count">{events.length}</span>
            <FaChevronDown className={`key-moment-arrow${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {isExpanded ? (
          events.length > 0 ? (
            <div className="key-moment-list" id="events-overlay-panel">
              <label className="key-moment-button key-moment-checkbox-row key-moment-select-all-row">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAllToggle} />
                <span className="key-moment-primary">Select All</span>
              </label>
              {events.map((event) => {
                const isChecked = selectedEvents.some((e) => e.event_id === event.event_id)
                return (
                  <label key={event.event_id} className="key-moment-button key-moment-checkbox-row">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleEvent(event)}
                    />
                    <span className="key-moment-primary">
                      {event.event_type}
                      {event.event_subtype ? ` - ${event.event_subtype}` : ''}
                    </span>
                    <span className="key-moment-meta">{event.player_name}</span>
                    <span className="key-moment-meta">{teamName(event.team_id)}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="key-moment-empty" id="events-overlay-panel">
              No events available.
            </p>
          )
        ) : null}
      </section>
    </div>
  )
}

export default EventVisualisationTab
