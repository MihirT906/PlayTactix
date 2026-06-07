import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import './KeyMomentFinderComponent.css'

interface KeyMomentFinderComponentProps {
  episodeRange: { start: number; end: number }
  onAddCustomEpisodeRange: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

// type KeyMomentItem = KeyMomentsData['goals'][number] | KeyMomentsData['shots'][number] | KeyMomentsData['pops'][number]
type KeyMomentItem = KeyMomentsData['pops'][number]

type FilterValue = true | false | 'any'

interface FilterConfig {
  lead_to_goal: FilterValue
  lead_to_shot: FilterValue
}

const FILTER_LABELS: Record<keyof FilterConfig, string> = {
  lead_to_goal: 'Lead to Goal',
  lead_to_shot: 'Lead to Shot',
}

function KeyMomentFinderComponent({ episodeRange, onAddCustomEpisodeRange, keyMomentsData, matchData }: KeyMomentFinderComponentProps) {
  const [startFrame, setStartFrame] = useState(episodeRange.start.toString())
  const [endFrame, setEndFrame] = useState(episodeRange.end.toString())
  const [expandedGroups, setExpandedGroups] = useState({
    // Goals: false,
    // Shots: false,
    'Phases of Play': false,
  })
  const [filters, setFilters] = useState<FilterConfig>({
    lead_to_goal: 'any',
    lead_to_shot: 'any',
  })

  const handleAddCustomEpisodeRange = () => {
    const start = Number.parseInt(startFrame, 10)
    const end = Number.parseInt(endFrame, 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }

    onAddCustomEpisodeRange(start, end)
  }

  const applyFilters = (moments: KeyMomentItem[]) =>
    moments.filter((moment) => {
      if (filters.lead_to_goal !== 'any' && moment.lead_to_goal !== filters.lead_to_goal) return false
      if (filters.lead_to_shot !== 'any' && moment.lead_to_shot !== filters.lead_to_shot) return false
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
                      onAddCustomEpisodeRange(moment.frame_start, moment.frame_end)
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
            {(Object.keys(filters) as (keyof FilterConfig)[]).map((key) => (
              <div key={key} className="key-moment-filter-row">
                <span className="key-moment-filter-label">{FILTER_LABELS[key]}</span>
                <div className="key-moment-filter-group">
                  {(['any', true, false] as const).map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`key-moment-filter-btn${filters[key] === value ? ' is-active' : ''}`}
                      onClick={() => setFilters((f) => ({ ...f, [key]: value }))}
                    >
                      {value === 'any' ? 'Any' : value ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
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
          <button type="button" className="key-moment-submit" onClick={handleAddCustomEpisodeRange}>
            Submit
          </button>
        </div>
      </section>
    </section>
  )
}

export default KeyMomentFinderComponent
