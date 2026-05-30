import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import './KeyMomentFinderComponent.css'

interface KeyMomentFinderComponentProps {
  episodeRange: { start: number; end: number }
  onAddCustomEpisodeRange: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
}

type KeyMomentItem = KeyMomentsData['goals'][number] | KeyMomentsData['shots'][number]

function KeyMomentFinderComponent({ episodeRange, onAddCustomEpisodeRange, keyMomentsData }: KeyMomentFinderComponentProps) {
  const [startFrame, setStartFrame] = useState(episodeRange.start.toString())
  const [endFrame, setEndFrame] = useState(episodeRange.end.toString())
  const [expandedGroups, setExpandedGroups] = useState({
    Goals: false,
    Shots: false,
  })

  const handleAddCustomEpisodeRange = () => {
    const start = Number.parseInt(startFrame, 10)
    const end = Number.parseInt(endFrame, 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }

    onAddCustomEpisodeRange(start, end)
  }

  const renderMomentGroup = (title: keyof typeof expandedGroups, moments: KeyMomentItem[]) => {
    const isExpanded = expandedGroups[title]

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
            <span className="key-moment-count">{moments.length}</span>
            <FaChevronDown className={`key-moment-arrow${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {isExpanded ? (
          moments.length > 0 ? (
            <div className="key-moment-list" id={`key-moment-panel-${title.toLowerCase()}`}>
              {moments.map((moment) => (
                <button
                  key={`${title}-${moment.Sequence_ID}-${moment.frame_start}-${moment.frame_end}`}
                  type="button"
                  className="key-moment-button"
                  onClick={() => {
                    console.log('frame_start', moment.frame_start)
                    console.log('frame_end', moment.frame_end)
                    onAddCustomEpisodeRange(moment.frame_start, moment.frame_end)
                  }}
                >
                  <span className="key-moment-primary">Sequence {moment.Sequence_ID}</span>
                  <span className="key-moment-meta">Time {moment.time_end}</span>
                  <span className="key-moment-meta">Player {moment.player_name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="key-moment-empty" id={`key-moment-panel-${title.toLowerCase()}`}>
              No {title.toLowerCase()} available.
            </p>
          )
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
          {renderMomentGroup('Goals', keyMomentsData.goals)}
          {renderMomentGroup('Shots', keyMomentsData.shots)}
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
    // <section className="key-moment-finder" aria-labelledby="key-moment-finder-heading">
    //   <h2 id="key-moment-finder-heading">Key Moment Finder</h2>
    //   <input
    //     type="number"
    //     placeholder="Start Frame"
    //     value={startFrame}
    //     onChange={(e) => setStartFrame(e.target.value)}
    //   />
    //   <input
    //     type="number"
    //     placeholder="End Frame"
    //     value={endFrame}
    //     onChange={(e) => setEndFrame(e.target.value)}
    //   />
    //   <button onClick={handleAddCustomEpisodeRange}>Add Custom Episode Range</button>
    // </section>
  )
}

export default KeyMomentFinderComponent