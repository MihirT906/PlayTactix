import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import {
  IN_POSSESSION_PHASE_TYPES,
  OUT_OF_POSSESSION_PHASE_TYPES,
  LEAD_TO_GOAL_VALUES,
  LEAD_TO_SHOT_VALUES,
  formatEventValue,
} from '../constants/eventData'
import type { InPossessionPhaseType, OutOfPossessionPhaseType } from '../constants/eventData'
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

interface FilterConfig {
  lead_to_goal: boolean[]
  lead_to_shot: boolean[]
  team_id: number[]
  team_in_possession_phase_type: InPossessionPhaseType[]
  team_out_of_possession_phase_type: OutOfPossessionPhaseType[]
}

const CHIP_FILTERS: Array<{
  key: keyof Omit<FilterConfig, 'team_id'>
  label: string
  values: readonly (string | boolean)[]
}> = [
  { key: 'lead_to_goal', label: 'Lead to Goal', values: LEAD_TO_GOAL_VALUES },
  { key: 'lead_to_shot', label: 'Lead to Shot', values: LEAD_TO_SHOT_VALUES },
  { key: 'team_in_possession_phase_type', label: 'In Possession', values: IN_POSSESSION_PHASE_TYPES },
  { key: 'team_out_of_possession_phase_type', label: 'Out of Possession', values: OUT_OF_POSSESSION_PHASE_TYPES },
]

function KeyMomentFinderComponent({ segmentRange, onAddSegment, keyMomentsData, matchData }: KeyMomentFinderComponentProps) {
  const [startFrame, setStartFrame] = useState(segmentRange.start.toString())
  const [endFrame, setEndFrame] = useState(segmentRange.end.toString())
  const [expandedGroups, setExpandedGroups] = useState({
    // Goals: false,
    // Shots: false,
    'Phases of Play': false,
  })
  const [filters, setFilters] = useState<FilterConfig>({
    lead_to_goal: [],
    lead_to_shot: [],
    team_id: [],
    team_in_possession_phase_type: [],
    team_out_of_possession_phase_type: [],
  })

  const handleAddSegment = () => {
    const start = Number.parseInt(startFrame, 10)
    const end = Number.parseInt(endFrame, 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }

    onAddSegment(start, end)
  }

  const applyFilters = (moments: KeyMomentItem[]) =>
    moments.filter((moment) => {
      if (filters.lead_to_goal.length > 0 && !filters.lead_to_goal.includes(moment.lead_to_goal)) return false
      if (filters.lead_to_shot.length > 0 && !filters.lead_to_shot.includes(moment.lead_to_shot)) return false
      if (filters.team_id.length > 0 && !filters.team_id.includes(moment.team_id)) return false
      if (
        filters.team_in_possession_phase_type.length > 0 &&
        !filters.team_in_possession_phase_type.includes(moment.team_in_possession_phase_type as InPossessionPhaseType)
      ) return false
      if (
        filters.team_out_of_possession_phase_type.length > 0 &&
        !filters.team_out_of_possession_phase_type.includes(moment.team_out_of_possession_phase_type as OutOfPossessionPhaseType)
      ) return false
      return true
    })

  const renderMomentGroup = (title: keyof typeof expandedGroups, moments: KeyMomentItem[]) => {
    const isExpanded = expandedGroups[title]
    const home_team_id = matchData?.home_team.id
    const home_team_name = matchData?.home_team.short_name
    const away_team_id = matchData?.away_team.id
    const away_team_name = matchData?.away_team.short_name

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
                {filteredMoments.map((moment) => (
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
                    <span className="key-moment-primary">Phase {moment.phase_index}</span>
                    <span className="key-moment-meta">Time {moment.time_end}</span>

                    <span className="key-moment-meta">{home_team_name} : {moment.team_id === home_team_id ? moment.team_in_possession_phase_type : moment.team_out_of_possession_phase_type}</span>
                    <span className="key-moment-meta">{away_team_name} : {moment.team_id === away_team_id ? moment.team_in_possession_phase_type : moment.team_out_of_possession_phase_type}</span>
                  </button>
                ))}
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
          <div className="key-moment-filters">
            {matchData && (
              <MultiSelectDropdown
                label="Team"
                options={[matchData.home_team, matchData.away_team]}
                selected={[matchData.home_team, matchData.away_team].filter((team) => filters.team_id.includes(team.id))}
                onChange={(teams) => setFilters((f) => ({ ...f, team_id: teams.map((team) => team.id) }))}
                formatOption={(team) => team.short_name}
                getKey={(team) => String(team.id)}
              />
            )}

            {CHIP_FILTERS.map(({ key, label, values }) => (
              <MultiSelectDropdown
                key={key}
                label={label}
                options={values}
                selected={filters[key] as (string | boolean)[]}
                onChange={(selected) => setFilters((f) => ({ ...f, [key]: selected }))}
                formatOption={formatEventValue}
                getKey={String}
              />
            ))}
          </div>
          {/* {renderMomentGroup('Goals', keyMomentsData.goals)}
          {renderMomentGroup('Shots', keyMomentsData.shots)} */}
          {renderMomentGroup('Phases of Play', keyMomentsData.pops)}
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
