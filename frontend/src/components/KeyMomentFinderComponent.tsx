import { useEffect, useState, type ReactNode } from 'react'
import { FaArrowRight, FaFilter } from 'react-icons/fa'
import { useStyleConfig } from '../context/StyleConfigContext'
import { useMatchSession } from '../context/MatchSessionContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import {
  IN_POSSESSION_PHASE_TYPES,
  OUT_OF_POSSESSION_PHASE_TYPES,
  formatEventValue,
} from '../constants/eventData'
import { FRAME_RATE, findMatchClock, formatBroadcastClock, formatMatchClockAt, parseBroadcastClock } from '../services/matchClock'
import MultiSelectDropdown from './MultiSelectDropdown'
import './KeyMomentFinderComponent.css'

interface KeyMomentFinderComponentProps {
  onAddSegment: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

type KeyMomentItem = KeyMomentsData['pops'][number]

type LedTo = 'any' | 'shot' | 'goal'

interface FilterConfig {
  // The team in possession; the other one is defending.
  attacking_team_id: number | null
  attacking_phase_types: string[]
  defending_phase_types: string[]
  period: number | null
  led_to: LedTo
}

const DEFAULT_FILTERS: FilterConfig = {
  attacking_team_id: null,
  attacking_phase_types: [],
  defending_phase_types: [],
  period: null,
  led_to: 'any',
}

// How long a passage just added reads "Added" before settling to "In clip".
const ADDED_NOTICE_MS = 3000

const momentKey = (moment: KeyMomentItem) => `${moment.phase_index}-${moment.frame_start}-${moment.frame_end}`

const LED_TO_OPTIONS: Array<{ value: LedTo; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'shot', label: 'Shot' },
  { value: 'goal', label: 'Goal' },
]

const PERIOD_LABELS: Record<number, string> = { 1: '1st', 2: '2nd' }

// How long a custom moment runs unless the user says otherwise.
const DEFAULT_CUSTOM_DURATION_SECONDS = 20

const formatDuration = (seconds: number) => {
  const rounded = Math.round(seconds)
  if (rounded < 1) return '<1s'
  if (rounded < 60) return `${rounded}s`
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, '0')}s`
}

// How a passage began and ended, where that says more than "received a pass" / "passed it on".
const START_LABELS: Record<string, string> = {
  recovery: 'won ball',
  pass_interception: 'intercepted',
  throw_in_reception: 'from throw-in',
  free_kick_reception: 'from free kick',
  goal_kick_reception: 'from goal kick',
  corner_reception: 'from corner',
  throw_in_interception: 'intercepted throw-in',
  free_kick_interception: 'intercepted free kick',
  goal_kick_interception: 'intercepted goal kick',
  corner_interception: 'intercepted corner',
}

const END_LABELS: Record<string, string> = {
  shot: 'shot',
  possession_loss: 'lost possession',
  foul_suffered: 'won foul',
  clearance: 'cleared',
}

const MAX_CHAIN_PLAYERS = 4

type ChainStep = { name: string; action?: string } | { skipped: number }

// Everyone who had the ball, in order. Long chains keep both ends and count the middle.
const buildChain = (moment: KeyMomentItem): ChainStep[] => {
  const players = moment.players ?? []
  if (players.length === 0) return []

  const startAction = START_LABELS[moment.start_type ?? '']
  const endAction = END_LABELS[moment.end_type ?? '']
  const last = players.length - 1
  const steps: ChainStep[] = players.map((name, i) => ({
    name,
    action: i === 0 ? startAction : i === last ? endAction : undefined,
  }))

  // One player on the ball throughout: the end action has no second name to sit on.
  if (last === 0) return endAction ? [...steps, { name: '', action: endAction }] : steps

  if (players.length <= MAX_CHAIN_PLAYERS) return steps
  return [...steps.slice(0, 2), { skipped: players.length - MAX_CHAIN_PLAYERS }, ...steps.slice(-2)]
}

export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="key-moment-filter-row">
      <span className="key-moment-filter-row-label">{label}</span>
      {children}
    </div>
  )
}

export function SegmentedControl<T extends string | number | null>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string
  options: Array<{ value: T; label: string; title?: string; color?: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="key-moment-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`key-moment-segment${option.value === value ? ' is-active' : ''}`}
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.color ? <span className="key-moment-segment-dot" style={{ background: option.color }} aria-hidden="true" /> : null}
          {option.label}
        </button>
      ))}
    </div>
  )
}

function KeyMomentFinderComponent({ onAddSegment, keyMomentsData, matchData }: KeyMomentFinderComponentProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const { session, setCurrentClipFrame, stopPlayback } = useMatchSession()
  // A custom moment, as the match clock it starts at ("52:10", "45+1:30") and its length in seconds.
  const [customStart, setCustomStart] = useState('')
  const [customDuration, setCustomDuration] = useState(String(DEFAULT_CUSTOM_DURATION_SECONDS))
  const [customError, setCustomError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterConfig>(DEFAULT_FILTERS)
  // Folded away to start with, leaving the panel to the moments themselves.
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null)

  useEffect(() => {
    if (justAddedKey === null) return
    const timeout = setTimeout(() => setJustAddedKey(null), ADDED_NOTICE_MS)
    return () => clearTimeout(timeout)
  }, [justAddedKey])

  const periods = matchData?.match_periods ?? []

  // The button stays enabled; a moment that can't be added says why instead.
  const handleAddSegment = () => {
    if (periods.length === 0) {
      setCustomError("This match's times haven't loaded yet.")
      return
    }
    const clock = parseBroadcastClock(customStart)
    const durationSeconds = Number(customDuration)
    if (clock === null) {
      setCustomError('Enter a start time like 52:10, or 45+1:30 for stoppage time.')
      return
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      setCustomError('Enter a duration in seconds.')
      return
    }

    const found = findMatchClock(clock, periods)
    if (!found) {
      setCustomError(`${customStart.trim()} isn't in this match.`)
      return
    }
    const end = found.frame + Math.round(durationSeconds * FRAME_RATE)
    if (end > found.period.end_frame) {
      const halfName = `${PERIOD_LABELS[found.period.period] ?? formatEventValue(found.period.name)} half`
      setCustomError(`That runs past the end of the ${halfName} at ${formatMatchClockAt(found.period.end_frame, periods)}.`)
      return
    }

    setCustomError(null)
    onAddSegment(found.frame, end)
  }

  // A passage counts as in the clip while a segment still covers exactly its frames; one resized since no longer does.
  const matchSegments = session.playback.clip.matchSegments
  const segmentFor = (moment: KeyMomentItem) =>
    matchSegments.find(
      (segment) => !segment.isDefault && segment.sourceFrameStart === moment.frame_start && segment.sourceFrameEnd === moment.frame_end
    )

  const handleMomentClick = (moment: KeyMomentItem) => {
    const segment = segmentFor(moment)
    // Already in the clip: go to it rather than add it a second time.
    if (segment) {
      setCurrentClipFrame(segment.clipStart)
      stopPlayback()
      return
    }
    onAddSegment(moment.frame_start, moment.frame_end)
    setJustAddedKey(momentKey(moment))
  }

  const isFiltered =
    filters.attacking_team_id !== null ||
    filters.attacking_phase_types.length > 0 ||
    filters.defending_phase_types.length > 0 ||
    filters.period !== null ||
    filters.led_to !== 'any'
  const teams = matchData ? [matchData.home_team, matchData.away_team] : []
  const teamOptions = [
    { value: null, label: 'Any' },
    ...teams.map((team) => ({ value: team.id, label: team.acronym ?? team.short_name, title: team.short_name })),
  ]
  const periodOf = (moment: KeyMomentItem) => {
    // Frame ranges are padded at both ends, so place the passage by its midpoint.
    const midFrame = (moment.frame_start + moment.frame_end) / 2
    return periods.find((p) => midFrame >= p.start_frame && midFrame <= p.end_frame)
  }

  // The data writes a passage's start on the running clock ("46:10"); shown as a broadcast would ("45+1:10").
  const momentClock = (moment: KeyMomentItem) => {
    const [minutes, seconds] = moment.time_start.split(':').map(Number)
    const period = periodOf(moment)
    if (!period || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return moment.time_start
    return formatBroadcastClock(minutes * 60 + seconds, period.period)
  }

  const applyFilters = (moments: KeyMomentItem[]) =>
    moments.filter((moment) => {
      if (filters.led_to === 'goal' && !moment.lead_to_goal) return false
      if (filters.led_to === 'shot' && !moment.lead_to_shot && !moment.lead_to_goal && !moment.has_shot) return false

      // moment.team_id is the team on the ball.
      if (filters.attacking_team_id !== null && moment.team_id !== filters.attacking_team_id) return false

      if (
        filters.attacking_phase_types.length > 0 &&
        !filters.attacking_phase_types.includes(moment.team_in_possession_phase_type)
      ) return false
      if (
        filters.defending_phase_types.length > 0 &&
        !filters.defending_phase_types.includes(moment.team_out_of_possession_phase_type)
      ) return false

      if (filters.period !== null && periodOf(moment)?.period !== filters.period) return false
      return true
    })

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  // The filters, shown between the Moments heading and the list once the filter icon opens them.
  const filterRows = (
    <>
      {matchData && (
        <FilterRow label="Team in possession">
          <SegmentedControl<number | null>
            ariaLabel="Team in possession"
            options={teamOptions}
            value={filters.attacking_team_id}
            onChange={(attacking_team_id) => setFilters((f) => ({ ...f, attacking_team_id }))}
          />
        </FilterRow>
      )}
      <FilterRow label="Attacking phase">
        <MultiSelectDropdown
          ariaLabel="Attacking phase"
          options={IN_POSSESSION_PHASE_TYPES}
          selected={filters.attacking_phase_types}
          onChange={(attacking_phase_types) => setFilters((f) => ({ ...f, attacking_phase_types }))}
          formatOption={formatEventValue}
        />
      </FilterRow>
      <FilterRow label="Defending phase">
        <MultiSelectDropdown
          ariaLabel="Defending phase"
          options={OUT_OF_POSSESSION_PHASE_TYPES}
          selected={filters.defending_phase_types}
          onChange={(defending_phase_types) => setFilters((f) => ({ ...f, defending_phase_types }))}
          formatOption={formatEventValue}
        />
      </FilterRow>
      {periods.length > 1 && (
        <FilterRow label="Half">
          <SegmentedControl<number | null>
            ariaLabel="Half"
            options={[
              { value: null, label: 'Any' },
              ...periods.map((p) => ({ value: p.period, label: PERIOD_LABELS[p.period] ?? formatEventValue(p.name) })),
            ]}
            value={filters.period}
            onChange={(period) => setFilters((f) => ({ ...f, period }))}
          />
        </FilterRow>
      )}
      <FilterRow label="Led to">
        <SegmentedControl
          ariaLabel="Led to"
          options={LED_TO_OPTIONS}
          value={filters.led_to}
          onChange={(led_to) => setFilters((f) => ({ ...f, led_to }))}
        />
      </FilterRow>
    </>
  )

  // The moments the filters leave, under a heading that says how many of the match's they are once any filter is on.
  const renderMomentList = (moments: KeyMomentItem[]) => {
    const filteredMoments = applyFilters(moments)

    return (
      <section className="key-moment-results" aria-labelledby="key-moment-results-count">
        <div className="key-moment-results-header">
          <p id="key-moment-results-count" className="key-moment-results-count" aria-live="polite">
            Moments{isFiltered ? ` · ${filteredMoments.length} of ${moments.length}` : null}
          </p>
          <div className="key-moment-filter-actions">
            {isFiltered ? (
              <button type="button" className="key-moment-toggle" onClick={resetFilters}>
                Reset
              </button>
            ) : null}
            <button
              type="button"
              className={`key-moment-filter-button${areFiltersOpen ? ' is-open' : ''}${isFiltered ? ' is-filtering' : ''}`}
              onClick={() => setAreFiltersOpen((open) => !open)}
              aria-expanded={areFiltersOpen}
              aria-controls="key-moment-filter-rows"
              aria-label={areFiltersOpen ? 'Hide filters' : 'Show filters'}
              title={areFiltersOpen ? 'Hide filters' : 'Filters'}
            >
              <FaFilter aria-hidden="true" />
            </button>
          </div>
        </div>
        {areFiltersOpen ? (
          <div id="key-moment-filter-rows" className="key-moment-filter-section">
            {filterRows}
          </div>
        ) : null}
        {filteredMoments.length > 0 ? (
          <div className="key-moment-list key-moment-list--moments">
            {filteredMoments.map((moment) => {
              const isHomeAttacking = moment.team_id === matchData?.home_team.id
              const attackingTeam = isHomeAttacking ? matchData?.home_team : matchData?.away_team
              const defendingTeam = isHomeAttacking ? matchData?.away_team : matchData?.home_team
              const chain = buildChain(moment)
              const key = momentKey(moment)
              const isInClip = segmentFor(moment) !== undefined

              return (
              <button
                key={key}
                type="button"
                className="key-moment-button"
                title={isInClip ? 'Already in your clip. Click to jump to it.' : 'Add to your clip'}
                onClick={() => handleMomentClick(moment)}
              >
                <span className="key-moment-row key-moment-headline">
                  <span className="key-moment-when">
                    <span className="key-moment-primary">{momentClock(moment)}</span>
                    <span className="key-moment-meta">{formatDuration(moment.duration_seconds)}</span>
                  </span>
                  {/* "Led to" marks an earlier passage of a move whose shot came later. */}
                  {moment.lead_to_goal ? (
                    <span className="key-moment-outcome">
                      {moment.has_shot ? 'Goal' : 'Led to goal'}
                    </span>
                  ) : moment.lead_to_shot || moment.has_shot ? (
                    <span className="key-moment-outcome">
                      {moment.has_shot ? 'Shot' : 'Led to shot'}
                    </span>
                  ) : null}
                  {isInClip ? (
                    <span className="key-moment-outcome key-moment-outcome--in-clip">
                      {justAddedKey === key ? 'Added' : 'In clip'}
                    </span>
                  ) : null}
                </span>
                <span className="key-moment-row key-moment-story">
                  <span className="key-moment-side">
                    <span
                      className="key-moment-team"
                      style={{ borderLeftColor: isHomeAttacking ? homeTeamColor : awayTeamColor }}
                      title={attackingTeam?.short_name}
                    >
                      {attackingTeam?.acronym ?? attackingTeam?.short_name}
                    </span>
                    <span className="key-moment-phase">{formatEventValue(moment.team_in_possession_phase_type)}</span>
                  </span>
                  <span className="key-moment-side is-defending">
                    <span className="key-moment-phase">{formatEventValue(moment.team_out_of_possession_phase_type)}</span>
                    <span
                      className="key-moment-team"
                      style={{ borderRightColor: isHomeAttacking ? awayTeamColor : homeTeamColor }}
                      title={defendingTeam?.short_name}
                    >
                      {defendingTeam?.acronym ?? defendingTeam?.short_name}
                    </span>
                  </span>
                </span>
                {chain.length > 0 ? (
                  <span className="key-moment-row key-moment-chain">
                    {chain.map((step, i) => (
                      <span key={i} className="key-moment-chain-step">
                        {i > 0 ? <FaArrowRight className="key-moment-versus-arrow" aria-hidden="true" /> : null}
                        {'skipped' in step ? (
                          <span className="key-moment-chain-skipped">+{step.skipped}</span>
                        ) : (
                          <>
                            {step.name ? <span>{step.name}</span> : null}
                            {step.action ? <span className="key-moment-chain-action">{step.action}</span> : null}
                          </>
                        )}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
              )
            })}
          </div>
        ) : (
          <p className="key-moment-empty">
            No moments match these filters.{' '}
            <button type="button" className="key-moment-reset-link" onClick={resetFilters}>
              Reset filters
            </button>
          </p>
        )}
      </section>
    )
  }

  return (
    <section className="key-moment-finder-panel" aria-labelledby="key-moment-finder-heading">
      <div className="key-moment-finder-header">
        <h2 id="key-moment-finder-heading" className="key-moment-finder-title">
          Moments
        </h2>
        <p className="key-moment-finder-description">Click a moment to add it to your clip, or create your own below.</p>
      </div>

      {keyMomentsData ? (
        <div className="key-moment-groups">
          {renderMomentList(keyMomentsData.pops)}
        </div>
      ) : (
        <p className="key-moment-empty">No moments loaded.</p>
      )}

      <section className="key-moment-custom-section" aria-labelledby="custom-moment-heading">
        <h3 id="custom-moment-heading" className="key-moment-custom-title">
          Create Custom Moment
        </h3>
        <div className="key-moment-custom-fields">
          <label className="key-moment-filter-row">
            <span className="key-moment-filter-row-label">Start (match clock)</span>
            <input
              type="text"
              className="key-moment-input"
              placeholder="52:10 or 45+1:30"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value)
                setCustomError(null)
              }}
            />
          </label>
          <label className="key-moment-filter-row">
            <span className="key-moment-filter-row-label">Duration (seconds)</span>
            <input
              type="number"
              min={1}
              className="key-moment-input"
              value={customDuration}
              onChange={(e) => {
                setCustomDuration(e.target.value)
                setCustomError(null)
              }}
            />
          </label>
          {customError ? (
            <p className="key-moment-custom-error" role="alert">
              {customError}
            </p>
          ) : null}
          <button type="button" className="key-moment-submit" onClick={handleAddSegment}>
            Add to clip
          </button>
        </div>
      </section>
    </section>
  )
}

export default KeyMomentFinderComponent
