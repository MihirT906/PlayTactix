import { useState, type ReactNode } from 'react'
import { FaArrowRight, FaChevronDown } from 'react-icons/fa'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import {
  IN_POSSESSION_PHASE_TYPES,
  OUT_OF_POSSESSION_PHASE_TYPES,
  formatEventValue,
} from '../constants/eventData'
import MultiSelectDropdown from './MultiSelectDropdown'
import './KeyMomentFinderComponent.css'

interface KeyMomentFinderComponentProps {
  segmentRange: { start: number; end: number }
  onAddSegment: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

// type KeyMomentItem = KeyMomentsData['goals'][number] | KeyMomentsData['shots'][number] | KeyMomentsData['pops'][number]
type KeyMomentItem = KeyMomentsData['pops'][number]

type LedTo = 'any' | 'shot' | 'goal'

interface FilterConfig {
  // The defending team is always the other one, so only the attacking side is stored.
  attacking_team_id: number | null
  attacking_phase_types: string[]
  defending_phase_types: string[]
  period: number | null
  led_to: LedTo
}

const LED_TO_OPTIONS: Array<{ value: LedTo; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'shot', label: 'Shot' },
  { value: 'goal', label: 'Goal' },
]

const PERIOD_LABELS: Record<number, string> = { 1: '1st', 2: '2nd' }

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

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="key-moment-filter-row">
      <span className="key-moment-filter-row-label">{label}</span>
      {children}
    </div>
  )
}

function SegmentedControl<T extends string | number | null>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string
  options: Array<{ value: T; label: string; title?: string }>
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
          {option.label}
        </button>
      ))}
    </div>
  )
}

function KeyMomentFinderComponent({ segmentRange, onAddSegment, keyMomentsData, matchData }: KeyMomentFinderComponentProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [startFrame, setStartFrame] = useState(segmentRange.start.toString())
  const [endFrame, setEndFrame] = useState(segmentRange.end.toString())
  const [expandedGroups, setExpandedGroups] = useState({
    // Goals: false,
    // Shots: false,
    'Passages of Play': false,
  })
  const [filters, setFilters] = useState<FilterConfig>({
    attacking_team_id: null,
    attacking_phase_types: [],
    defending_phase_types: [],
    period: null,
    led_to: 'any',
  })

  const handleAddSegment = () => {
    const start = Number.parseInt(startFrame, 10)
    const end = Number.parseInt(endFrame, 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }

    onAddSegment(start, end)
  }

  const periods = matchData?.match_periods ?? []
  const teams = matchData ? [matchData.home_team, matchData.away_team] : []
  const teamOptions = [
    { value: null, label: 'Any' },
    ...teams.map((team) => ({ value: team.id, label: team.acronym ?? team.short_name, title: team.short_name })),
  ]
  // Picking one side fixes the other: if a team attacks, the other one defends.
  const otherTeamId = (teamId: number | null) =>
    teamId === null ? null : (teams.find((team) => team.id !== teamId)?.id ?? null)

  const periodOf = (moment: KeyMomentItem) => {
    // Frame ranges are padded at both ends, so place the passage by its midpoint.
    const midFrame = (moment.frame_start + moment.frame_end) / 2
    return periods.find((p) => midFrame >= p.start_frame && midFrame <= p.end_frame)
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

  const renderMomentGroup = (title: keyof typeof expandedGroups, moments: KeyMomentItem[]) => {
    const isExpanded = expandedGroups[title]

    const filteredMoments = applyFilters(moments)

    return (
      <section className={`key-moment-group${isExpanded ? ' is-expanded' : ''}`}>
        <div className="key-moment-header">
          <span className="key-moment-label">{title}</span>
          <button
            type="button"
            className="key-moment-toggle"
            aria-expanded={isExpanded}
            aria-controls={`key-moment-panel-${title.toLowerCase()}`}
            onClick={() => {
              setExpandedGroups((current) => ({
                ...current,
                [title]: !current[title],
              }))
            }}
          >
            <span className="key-moment-count">{filteredMoments.length}</span>
            <FaChevronDown className={`key-moment-arrow${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {isExpanded ? (
          <>
            {filteredMoments.length > 0 ? (
              <div className="key-moment-list" id={`key-moment-panel-${title.toLowerCase()}`}>
                {filteredMoments.map((moment) => {
                  const isHomeAttacking = moment.team_id === matchData?.home_team.id
                  const attackingTeam = isHomeAttacking ? matchData?.home_team : matchData?.away_team
                  const defendingTeam = isHomeAttacking ? matchData?.away_team : matchData?.home_team
                  const chain = buildChain(moment)

                  return (
                  <button
                    key={`${title}-${moment.phase_index}-${moment.frame_start}-${moment.frame_end}`}
                    type="button"
                    className="key-moment-button"
                    onClick={() => {
                      console.log('frame_start', moment.frame_start)
                      console.log('frame_end', moment.frame_end)
                      onAddSegment(moment.frame_start, moment.frame_end)
                    }}
                  >
                    <span className="key-moment-row key-moment-headline">
                      <span className="key-moment-when">
                        <span className="key-moment-primary">{moment.time_start}</span>
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
              <p className="key-moment-empty" id={`key-moment-panel-${title.toLowerCase()}`}>
                No {title.toLowerCase()} match the current filters.
              </p>
            )}
          </>
        ) : null}
      </section>
    )
  }

  return (
    <section className="key-moment-finder-panel" aria-labelledby="key-moment-finder-heading">
      <div className="key-moment-finder-header">
        <h2 id="key-moment-finder-heading" className="key-moment-finder-title">
          Key Moments Finder
        </h2>
        <p className="key-moment-finder-description">Jump to saved moments or define a custom frame range.</p>
      </div>

      {keyMomentsData ? (
        <div className="key-moment-groups">
          <section className="key-moment-filter-section" aria-labelledby="key-moment-filter-heading">
            <h3 id="key-moment-filter-heading" className="key-moment-filter-title">
              Filters
            </h3>
            {matchData && (
              <>
                <FilterRow label="Attacking team">
                  <SegmentedControl<number | null>
                    ariaLabel="Attacking team"
                    options={teamOptions}
                    value={filters.attacking_team_id}
                    onChange={(attacking_team_id) => setFilters((f) => ({ ...f, attacking_team_id }))}
                  />
                </FilterRow>
                <FilterRow label="Defending team">
                  <SegmentedControl<number | null>
                    ariaLabel="Defending team"
                    options={teamOptions}
                    value={otherTeamId(filters.attacking_team_id)}
                    onChange={(defending_team_id) =>
                      setFilters((f) => ({ ...f, attacking_team_id: otherTeamId(defending_team_id) }))
                    }
                  />
                </FilterRow>
              </>
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
          </section>
          {/* {renderMomentGroup('Goals', keyMomentsData.goals)}
          {renderMomentGroup('Shots', keyMomentsData.shots)} */}
          {renderMomentGroup('Passages of Play', keyMomentsData.pops)}
        </div>
      ) : (
        <p className="key-moment-empty">No key moments loaded.</p>
      )}

      <section className="key-moment-custom-section" aria-labelledby="custom-moment-heading">
        <h3 id="custom-moment-heading" className="key-moment-custom-title">
          Create Custom Moment
        </h3>
        <div className="key-moment-custom-fields">
          <label className="key-moment-input-group">
            <span className="key-moment-input-label">Enter Frame Start</span>
            <input
              type="number"
              className="key-moment-input"
              placeholder="Start Frame"
              value={startFrame}
              onChange={(e) => setStartFrame(e.target.value)}
            />
          </label>
          <label className="key-moment-input-group">
            <span className="key-moment-input-label">Enter Frame End</span>
            <input
              type="number"
              className="key-moment-input"
              placeholder="End Frame"
              value={endFrame}
              onChange={(e) => setEndFrame(e.target.value)}
            />
          </label>
          <button type="button" className="key-moment-submit" onClick={handleAddSegment}>
            Submit
          </button>
        </div>
      </section>
    </section>
  )
}

export default KeyMomentFinderComponent
