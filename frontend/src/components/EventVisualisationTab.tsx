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
  CHANNELS,
  THIRDS,
  LEAD_TO_GOAL_VALUES,
  LEAD_TO_SHOT_VALUES,
  formatEventValue,
  type EventType,
} from '../constants/eventData'
import MultiSelectDropdown from './MultiSelectDropdown'
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
  const [channelFilter, setChannelFilter] = useState<string[]>([])
  const [thirdFilter, setThirdFilter] = useState<string[]>([])
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
      (channelFilter.length === 0 || channelFilter.includes(event.channel_start) || channelFilter.includes(event.channel_end)) &&
      (thirdFilter.length === 0 || thirdFilter.includes(event.third_start) || thirdFilter.includes(event.third_end)) &&
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
        <MultiSelectDropdown
          label="Event Type"
          options={EVENT_TYPES}
          selected={eventTypeFilter}
          onChange={setEventTypeFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="Event Subtype"
          options={EVENT_SUBTYPES}
          selected={eventSubtypeFilter}
          onChange={setEventSubtypeFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="Start Type"
          options={START_TYPES}
          selected={startTypeFilter}
          onChange={setStartTypeFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="End Type"
          options={END_TYPES}
          selected={endTypeFilter}
          onChange={setEndTypeFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="Channel"
          options={CHANNELS}
          selected={channelFilter}
          onChange={setChannelFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="Third"
          options={THIRDS}
          selected={thirdFilter}
          onChange={setThirdFilter}
          formatOption={formatEventValue}
        />

        <MultiSelectDropdown
          label="Player Position"
          options={playerPositions}
          selected={playerPositionFilter}
          onChange={setPlayerPositionFilter}
        />

        {matchData && (
          <MultiSelectDropdown
            label="Team"
            options={[matchData.home_team, matchData.away_team]}
            selected={[matchData.home_team, matchData.away_team].filter((team) => teamIdFilter.includes(team.id))}
            onChange={(teams) => setTeamIdFilter(teams.map((team) => team.id))}
            formatOption={(team) => team.short_name}
            getKey={(team) => String(team.id)}
          />
        )}

        <MultiSelectDropdown
          label="Lead to Shot"
          options={LEAD_TO_SHOT_VALUES}
          selected={leadToShotFilter}
          onChange={setLeadToShotFilter}
          formatOption={formatEventValue}
          getKey={String}
        />

        <MultiSelectDropdown
          label="Lead to Goal"
          options={LEAD_TO_GOAL_VALUES}
          selected={leadToGoalFilter}
          onChange={setLeadToGoalFilter}
          formatOption={formatEventValue}
          getKey={String}
        />
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
