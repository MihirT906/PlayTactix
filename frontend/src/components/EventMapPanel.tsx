import { useMemo, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { useMatchSession } from '../context/MatchSessionContext'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import { START_TYPES, END_TYPES, CHANNELS, THIRDS, formatEventValue } from '../constants/eventData'
import {
  EVENT_MAP_KINDS,
  MAX_EVENT_MAP_MARKS,
  buildEventMapItems,
  resolveEventMap,
  type EventMapFilters,
  type EventMapKind,
} from '../plot/overlays/eventMapOverlay'
import { FilterRow, SegmentedControl } from './KeyMomentFinderComponent'
import MultiSelectDropdown from './MultiSelectDropdown'
import './KeyMomentFinderComponent.css'

type EventMapPanelProps = {
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

// The one-word type shown on a list row.
const KIND_ROW_LABELS: Record<EventMapKind, string> = {
  carry: 'Carry',
  pass: 'Pass',
  off_ball_run: 'Run',
}

const KIND_LABELS: Record<EventMapKind, string> = {
  carry: 'Carries',
  pass: 'Passes',
  off_ball_run: 'Runs',
}

const SCOPE_OPTIONS: Array<{ value: EventMapFilters['scope']; label: string }> = [
  { value: 'clip', label: 'This clip' },
  { value: 'match', label: 'Whole match' },
]

const LED_TO_OPTIONS: Array<{ value: EventMapFilters['ledTo']; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'shot', label: 'Shot' },
  { value: 'goal', label: 'Goal' },
]

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort()

function EventMapPanel({ keyMomentsData, matchData }: EventMapPanelProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false)
  const { session, updateEventMapFilters, setEventMapExcludedIds, resetEventMap, setAutoDisappearEvents } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const { eventMapFilters: filters, eventMapExcludedIds: excludedIds, autoDisappearEvents } = session.overlays
  const matchSegments = session.playback.clip.matchSegments

  const allEvents = useMemo(() => buildEventMapItems(keyMomentsData?.events), [keyMomentsData])
  const { candidates, matched, drawn, overflow } = useMemo(
    () => resolveEventMap(allEvents, filters, excludedIds, matchSegments),
    [allEvents, filters, excludedIds, matchSegments],
  )

  const teams = matchData ? [matchData.home_team, matchData.away_team] : []
  const teamOptions = [
    { value: null, label: 'Any' },
    ...teams.map((team, index) => ({
      value: team.id,
      label: team.acronym ?? team.short_name,
      title: team.short_name,
      color: index === 0 ? homeTeamColor : awayTeamColor,
    })),
  ]
  const teamColor = (teamId: number) => (teamId === matchData?.away_team.id ? awayTeamColor : homeTeamColor)

  // The options a filter offers come from the match itself, so none of them can come up empty.
  const players = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; teamId: number }>()
    for (const event of allEvents) byId.set(event.playerId, { id: event.playerId, name: event.playerName, teamId: event.teamId })
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allEvents])
  const playerOptions = players.filter((player) => filters.teamId === null || player.teamId === filters.teamId)
  const playerPositions = uniqueValues(allEvents.map((event) => event.playerPosition))
  const runTypes = uniqueValues(allEvents.map((event) => event.subtype))

  const kindCount = (kind: EventMapKind) => candidates.filter((event) => event.kind === kind).length
  const toggleKind = (kind: EventMapKind) =>
    updateEventMapFilters({
      kinds: filters.kinds.includes(kind) ? filters.kinds.filter((k) => k !== kind) : [...filters.kinds, kind],
    })

  const excluded = new Set(excludedIds)
  const isAllTicked = matched.length > 0 && matched.every((event) => !excluded.has(event.id))

  const toggleEvent = (id: string) =>
    setEventMapExcludedIds(excluded.has(id) ? excludedIds.filter((excludedId) => excludedId !== id) : [...excludedIds, id])

  const handleTickAllToggle = () => {
    const matchedIds = new Set(matched.map((event) => event.id))
    const others = excludedIds.filter((id) => !matchedIds.has(id))
    setEventMapExcludedIds(isAllTicked ? [...others, ...matchedIds] : others)
  }

  return (
    <div className="key-moment-groups">
      <section className="key-moment-filter-section" aria-label="Event map filters">
        <FilterRow label="Scope">
          <SegmentedControl
            ariaLabel="Scope"
            options={SCOPE_OPTIONS}
            value={filters.scope}
            onChange={(scope) => updateEventMapFilters({ scope })}
          />
        </FilterRow>

        <FilterRow label="Show">
          <div className="key-moment-segmented" role="group" aria-label="Events to show">
            {EVENT_MAP_KINDS.map((kind) => {
              const isOn = filters.kinds.includes(kind)
              return (
                <button
                  key={kind}
                  type="button"
                  className={`key-moment-segment${isOn ? ' is-active' : ''}`}
                  aria-pressed={isOn}
                  onClick={() => toggleKind(kind)}
                >
                  {KIND_LABELS[kind]}
                  <span className="key-moment-segment-count">{kindCount(kind)}</span>
                </button>
              )
            })}
          </div>
        </FilterRow>

        {matchData && (
          <FilterRow label="Team">
            <SegmentedControl<number | null>
              ariaLabel="Team"
              options={teamOptions}
              value={filters.teamId}
              onChange={(teamId) => updateEventMapFilters({ teamId })}
            />
          </FilterRow>
        )}

        <FilterRow label="Player">
          <MultiSelectDropdown
            ariaLabel="Player"
            options={playerOptions}
            selected={players.filter((player) => filters.playerIds.includes(player.id))}
            onChange={(selected) => updateEventMapFilters({ playerIds: selected.map((player) => player.id) })}
            formatOption={(player) => player.name}
            getKey={(player) => String(player.id)}
          />
        </FilterRow>

        <FilterRow label="Led to">
          <SegmentedControl
            ariaLabel="Led to"
            options={LED_TO_OPTIONS}
            value={filters.ledTo}
            onChange={(ledTo) => updateEventMapFilters({ ledTo })}
          />
        </FilterRow>
      </section>

      <section className={`key-moment-group${isMoreOpen ? ' is-expanded' : ''}`}>
        <div className="key-moment-header">
          <span className="key-moment-label">More filters</span>
          <button
            type="button"
            className="key-moment-toggle"
            aria-expanded={isMoreOpen}
            aria-controls="event-map-more-filters"
            aria-label={isMoreOpen ? 'Hide more filters' : 'Show more filters'}
            onClick={() => setIsMoreOpen((previousValue) => !previousValue)}
          >
            <FaChevronDown className={`key-moment-arrow${isMoreOpen ? ' is-expanded' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {isMoreOpen ? (
          <div className="key-moment-filter-section" id="event-map-more-filters">
            <FilterRow label="Channel">
              <MultiSelectDropdown
                ariaLabel="Channel"
                options={CHANNELS}
                selected={filters.channels}
                onChange={(channels) => updateEventMapFilters({ channels })}
                formatOption={formatEventValue}
              />
            </FilterRow>
            <FilterRow label="Third">
              <MultiSelectDropdown
                ariaLabel="Third"
                options={THIRDS}
                selected={filters.thirds}
                onChange={(thirds) => updateEventMapFilters({ thirds })}
                formatOption={formatEventValue}
              />
            </FilterRow>
            <FilterRow label="Player position">
              <MultiSelectDropdown
                ariaLabel="Player position"
                options={playerPositions}
                selected={filters.positions}
                onChange={(positions) => updateEventMapFilters({ positions })}
              />
            </FilterRow>
            {/* A filter that only narrows one kind of event is offered while that kind is shown. */}
            {filters.kinds.includes('off_ball_run') && (
              <FilterRow label="Run type">
                <MultiSelectDropdown
                  ariaLabel="Run type"
                  options={runTypes}
                  selected={filters.runTypes}
                  onChange={(selected) => updateEventMapFilters({ runTypes: selected })}
                  formatOption={formatEventValue}
                />
              </FilterRow>
            )}
            {filters.kinds.includes('carry') && (
              <>
                <FilterRow label="Carry starts with">
                  <MultiSelectDropdown
                    ariaLabel="Carry starts with"
                    options={START_TYPES}
                    selected={filters.carryStartTypes}
                    onChange={(carryStartTypes) => updateEventMapFilters({ carryStartTypes })}
                    formatOption={formatEventValue}
                  />
                </FilterRow>
                <FilterRow label="Carry ends with">
                  <MultiSelectDropdown
                    ariaLabel="Carry ends with"
                    options={END_TYPES}
                    selected={filters.carryEndTypes}
                    onChange={(carryEndTypes) => updateEventMapFilters({ carryEndTypes })}
                    formatOption={formatEventValue}
                  />
                </FilterRow>
              </>
            )}
          </div>
        ) : null}
      </section>

      <div className="event-map-summary" role="status">
        <span>{filters.kinds.length === 0 ? 'Choose what to show.' : `${drawn.length} on the pitch`}</span>
        <button type="button" className="key-moment-toggle" onClick={resetEventMap}>
          Clear
        </button>
      </div>
      {overflow > 0 ? (
        <p className="event-map-note">
          {overflow} more match but only the first {MAX_EVENT_MAP_MARKS} are drawn. Narrow the filters to see the rest.
        </p>
      ) : null}
      <p className="event-map-note">
        Passes are comets. Carries and off ball runs are arrows, with runs drawn fainter. Colours follow the team.
      </p>

      <label className="key-moment-button key-moment-checkbox-row key-moment-auto-disappear-row">
        <input type="checkbox" checked={autoDisappearEvents} onChange={(e) => setAutoDisappearEvents(e.target.checked)} />
        <span className="key-moment-primary">Auto Disappear</span>
      </label>

      <section className={`key-moment-group${isListOpen ? ' is-expanded' : ''}`}>
        <div className="key-moment-header">
          <span className="key-moment-label">Pick individually</span>
          <button
            type="button"
            className="key-moment-toggle"
            aria-expanded={isListOpen}
            aria-controls="event-map-list"
            onClick={() => setIsListOpen((previousValue) => !previousValue)}
          >
            <span className="key-moment-count">{matched.length}</span>
            <FaChevronDown className={`key-moment-arrow${isListOpen ? ' is-expanded' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {isListOpen ? (
          matched.length > 0 ? (
            <div className="key-moment-list" id="event-map-list">
              <label className="key-moment-button key-moment-checkbox-row key-moment-select-all-row">
                <input type="checkbox" checked={isAllTicked} onChange={handleTickAllToggle} />
                <span className="key-moment-primary">Select All</span>
              </label>
              {matched.map((event) => (
                <label key={event.id} className="key-moment-button key-moment-checkbox-row event-map-row">
                  <input type="checkbox" checked={!excluded.has(event.id)} onChange={() => toggleEvent(event.id)} />
                  <span className="key-moment-primary event-map-row-time">{event.clock}</span>
                  <span className="key-moment-segment-dot" style={{ background: teamColor(event.teamId) }} aria-hidden="true" />
                  <span className="key-moment-primary">{KIND_ROW_LABELS[event.kind]}</span>
                  <span className="key-moment-meta event-map-row-who">
                    {event.playerName}
                    {event.receiverName ? ` to ${event.receiverName}` : ''}
                    {event.subtype ? ` · ${formatEventValue(event.subtype)}` : ''}
                  </span>
                  <span className="key-moment-meta event-map-row-distance">
                    {Math.round(Math.hypot(event.x2 - event.x, event.y2 - event.y))} m
                  </span>
                  {event.leadToGoal ? (
                    <span className="key-moment-outcome">Goal</span>
                  ) : event.leadToShot ? (
                    <span className="key-moment-outcome">Shot</span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="key-moment-empty" id="event-map-list">
              No events match the filters.
            </p>
          )
        ) : null}
      </section>
    </div>
  )
}

export default EventMapPanel
