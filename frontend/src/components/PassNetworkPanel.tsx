import { useMemo } from 'react'
import { useMatchSession } from '../context/MatchSessionContext'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import {
  buildCompletedPasses,
  countPassEdges,
  passIndexRanges,
  passNetworkFrameRanges,
  type PassNetworkConfig,
} from '../plot/overlays/passNetworkOverlay'
import { FilterRow, SegmentedControl } from './KeyMomentFinderComponent'
import './KeyMomentFinderComponent.css'

type PassNetworkPanelProps = {
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
  isOn: boolean // Whether the overlay is showing at the current frame
  onToggle: () => void // Turns it on or off from the current frame
}

const WINDOW_OPTIONS: Array<{ value: PassNetworkConfig['window']; label: string; title: string }> = [
  { value: 'match', label: 'Match', title: 'Every pass of the match' },
  { value: 'clip', label: 'Clip', title: "Only the passes in the clip's match segments" },
  { value: 'custom', label: 'Custom', title: 'The passes between two minutes of the match clock' },
]

const BUILD_OPTIONS: Array<{ value: PassNetworkConfig['build']; label: string; title: string }> = [
  { value: 'full', label: 'All at once', title: 'Draw every pass of the window straight away' },
  { value: 'progressive', label: 'As play goes', title: 'Add each pass to the network as it is received' },
]

// The match clock minutes are entered as whole numbers; anything else typed is ignored.
const minuteFrom = (input: HTMLInputElement) => (Number.isFinite(input.valueAsNumber) ? Math.max(0, Math.round(input.valueAsNumber)) : null)

function PassNetworkPanel({ keyMomentsData, matchData, isOn, onToggle }: PassNetworkPanelProps) {
  const { session, updatePassNetworkConfig } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const config = session.overlays.passNetworkConfig
  const { currentMatchFrame, currentClipFrame, clip } = session.playback

  const teamOptions = [
    { value: null, label: 'Both', title: 'Both teams' },
    ...(matchData ? [matchData.home_team, matchData.away_team] : []).map((team, index) => ({
      value: team.id,
      label: team.acronym ?? team.short_name,
      title: team.short_name,
      color: index === 0 ? homeTeamColor : awayTeamColor,
    })),
  ]

  // How many passes the whole window counts, built up or not.
  const passes = useMemo(() => buildCompletedPasses(keyMomentsData?.events), [keyMomentsData])
  const passCount = useMemo(() => {
    const ranges = passIndexRanges(
      passes,
      passNetworkFrameRanges(
        { ...config, build: 'full' },
        { currentFrame: currentMatchFrame, clipFrame: currentClipFrame, matchSegments: clip.matchSegments },
      ),
    )
    return countPassEdges(passes, ranges, config).reduce((sum, edge) => sum + edge.count, 0)
  }, [passes, config, currentMatchFrame, currentClipFrame, clip.matchSegments])

  return (
    <div className="key-moment-groups">
      <div className="event-map-summary" role="status">
        <span>{isOn ? 'Showing at this frame' : 'Not showing at this frame'}</span>
        <button type="button" className="key-moment-toggle" onClick={onToggle}>
          {isOn ? 'Turn off from here' : 'Turn on from here'}
        </button>
      </div>

      <section className="key-moment-filter-section" aria-label="Pass network settings">
        <FilterRow label="Count passes over">
          <SegmentedControl
            ariaLabel="Count passes over"
            options={WINDOW_OPTIONS}
            value={config.window}
            onChange={(window) => updatePassNetworkConfig({ window })}
          />
        </FilterRow>

        {config.window === 'custom' && (
          <FilterRow label="Match clock">
            <div className="pass-network-minutes">
              <label className="key-moment-input-group">
                <span className="key-moment-input-label">From minute</span>
                <input
                  type="number"
                  min={0}
                  className="key-moment-input"
                  value={config.rangeStartMinute}
                  onChange={(e) => {
                    const minute = minuteFrom(e.target)
                    if (minute !== null) updatePassNetworkConfig({ rangeStartMinute: minute })
                  }}
                />
              </label>
              <label className="key-moment-input-group">
                <span className="key-moment-input-label">To minute</span>
                <input
                  type="number"
                  min={0}
                  className="key-moment-input"
                  value={config.rangeEndMinute}
                  onChange={(e) => {
                    const minute = minuteFrom(e.target)
                    if (minute !== null) updatePassNetworkConfig({ rangeEndMinute: minute })
                  }}
                />
              </label>
            </div>
          </FilterRow>
        )}

        <FilterRow label="Build">
          <SegmentedControl
            ariaLabel="Build"
            options={BUILD_OPTIONS}
            value={config.build}
            onChange={(build) => updatePassNetworkConfig({ build })}
          />
        </FilterRow>

        {matchData && (
          <FilterRow label="Team">
            <SegmentedControl<number | null>
              ariaLabel="Team"
              options={teamOptions}
              value={config.teamId}
              onChange={(teamId) => updatePassNetworkConfig({ teamId })}
            />
          </FilterRow>
        )}

      </section>

      <p className="event-map-note" role="status">
        {passCount} completed {passCount === 1 ? 'pass' : 'passes'} in this window
        {config.build === 'progressive' ? ', added as each is received.' : '.'}
      </p>
      <p className="event-map-note">
        Lines join team-mates where they are now, thicker for more passes. A player off the pitch has no lines.
      </p>
    </div>
  )
}

export default PassNetworkPanel
