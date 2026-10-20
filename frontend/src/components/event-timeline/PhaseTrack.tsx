import { formatEventValue } from '../../constants/eventData'
import type { ClipPhase } from '../../services/timelineEvents'
import { EVENT_FILL_OPACITY, type PhaseRow } from './rows'

const FRAMES_PER_SECOND = 10 // Tracking data is 10 frames per second
// Fill of the phase going on at the playhead.
const ACTIVE_FILL_OPACITY = 0.6

type PhaseTrackProps = {
  row: PhaseRow
  clipFrame: number
  getTeamColor: (teamId: number) => string
  getTeamName: (teamId: number) => string
  onPhaseSeek: (phase: ClipPhase) => void
}

// The full account of a phase, for its tooltip: who had the ball, against what, for how long, how it
// started and ended, and whether it led to a shot.
function describePhase(phase: ClipPhase, teamName: string): string {
  const seconds = (phase.frameEnd - phase.frameStart) / FRAMES_PER_SECOND
  const lines = [
    `${teamName} in possession · ${seconds.toFixed(1)}s`,
    `${formatEventValue(phase.inPossessionType)} vs ${formatEventValue(phase.outOfPossessionType)}`,
  ]

  if (phase.startType || phase.endType) {
    lines.push(`${formatEventValue(phase.startType ?? 'unknown')} → ${formatEventValue(phase.endType ?? 'unknown')}`)
  }
  if (phase.leadToGoal) lines.push('Led to a goal')
  else if (phase.leadToShot) lines.push('Led to a shot')

  return lines.join('\n')
}

/** The clip's phases of play as blocks in the colour of the team in possession. Pressing one jumps to its start. */
const PhaseTrack: React.FC<PhaseTrackProps> = ({ row, clipFrame, getTeamColor, getTeamName, onPhaseSeek }) => (
  <>
    {row.phases.map((phase) => {
      const teamColor = getTeamColor(phase.teamId)
      const isActive = phase.frameStart <= clipFrame && clipFrame <= phase.frameEnd
      const outcome = phase.leadToGoal ? 'Goal' : phase.leadToShot ? 'Shot' : null

      return (
        <div
          key={phase.key}
          className={`event-display__event event-display__phase${isActive ? ' is-active' : ''}`}
          style={{
            background: `color-mix(in srgb, ${teamColor} ${(isActive ? ACTIVE_FILL_OPACITY : EVENT_FILL_OPACITY) * 100}%, transparent)`,
            borderColor: teamColor,
            left: `${phase.leftPercent}%`,
            width: `${phase.widthPercent}%`,
            top: '2px',
          }}
          title={describePhase(phase, getTeamName(phase.teamId))}
          onPointerDown={(pointerEvent) => {
            if (pointerEvent.button !== 0) return
            pointerEvent.stopPropagation()
            onPhaseSeek(phase)
          }}
        >
          <span className="event-display__event-label">{formatEventValue(phase.inPossessionType)}</span>
          {outcome ? (
            <span className={`event-display__phase-outcome event-display__phase-outcome--${outcome.toLowerCase()}`}>
              {outcome}
            </span>
          ) : null}
        </div>
      )
    })}
  </>
)

export default PhaseTrack
