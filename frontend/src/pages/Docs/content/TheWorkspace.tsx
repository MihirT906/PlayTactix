import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../../config'
import { docsPagePath } from '../docsNav'
import Legend from './Legend'

const { events } = APP_CONFIG

// The markers drawn on players as the play unfolds, in their default colours.
const PITCH_MARKERS = [
  { color: events.playerPossession.color, name: 'Yellow ring', meaning: 'the player on the ball' },
  { color: events.passingOption.color, name: 'Blue ring', meaning: 'a passing option' },
  { color: events.onBallEngagement.color, name: 'Pink ring', meaning: 'a defender pressing the ball' },
  { color: events.offBallRun.color, name: 'Orange dashed line', meaning: 'an off-ball run' },
]

export default function TheWorkspace() {
  return (
    <>
      <p>Once a match is open, you're in the workspace, where you turn it into a clip.</p>

      <h2>The layout</h2>
      <p>
        The match details run across the top: the teams, the score and who scored. Below them is the pitch, with the
        playback controls above it and the timeline beneath it. The navigation panel on the left holds the tools.
      </p>

      <h2>Reading the pitch</h2>
      <p>
        A match opens on its first two minutes. Press play and watch for a while to get a feel for it. As the play
        unfolds, markers show what the players are doing:
      </p>
      <Legend items={PITCH_MARKERS} />
      <p>
        Change their colours or hide them in <strong>Settings</strong>.
      </p>

      <h2>Building a clip</h2>
      <ol>
        <li>
          <strong>Find a moment.</strong> Open <strong>Moments</strong>, filter down to the moment you want,
          and click it. It replaces the opening two minutes and appears under <strong>Match Segments</strong>. Add more
          moments to build up the clip. <Link to={docsPagePath('moments')}>More on Moments</Link>
        </li>
        <li>
          <strong>Add overlays.</strong> Open <strong>Overlays</strong> and turn on the analysis you want, such as Pitch
          Control. <Link to={docsPagePath('overlays')}>More on overlays</Link>
        </li>
        <li>
          <strong>Draw on the play.</strong> Pause, pick a tool under <strong>Draw</strong>, and mark the pitch.{' '}
          <Link to={docsPagePath('annotations')}>More on annotations</Link>
        </li>
        <li>
          <strong>Save.</strong> <strong>Save Project</strong> in the top bar keeps your clip to come back to or
          share. <Link to={docsPagePath('saving-and-loading-projects')}>More on saving</Link>
        </li>
      </ol>
      <p>
        Every segment, overlay and drawing gets a bar on the timeline. Drag a bar to move it and drag its ends to trim
        it; that's how you set when each one shows.
      </p>
    </>
  )
}
