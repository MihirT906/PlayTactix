import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../../config'
import { docsPagePath } from '../docsNav'
import Legend from './Legend'
import Media from './Media'

const { events } = APP_CONFIG

// The markers drawn on players as the play unfolds, in their default colours.
const PITCH_MARKERS = [
  { color: events.offBallRun.color, name: 'Orange dashed line', meaning: 'an off-ball run' },
  { color: events.playerPossession.color, name: 'Yellow ring', meaning: 'the player on the ball' },
  { color: events.passingOption.color, name: 'Blue ring', meaning: 'a passing option' },
  { color: events.onBallEngagement.color, name: 'Pink ring', meaning: 'a defender pressing the ball' },
]

export default function TheWorkspace() {
  return (
    <>
      <p>
        Once a match is open, you're in the workspace, where you turn it into a clip. For a finished one, see{' '}
        <Link to={docsPagePath('the-overlap')}>The overlap</Link>.
      </p>

      <h2>Reading the pitch</h2>
      <p>A match opens on its first two minutes. Press play, and markers show what the players are doing:</p>
      <Media src="workspace-markers.mp4" caption="Markers following the play." />
      <Legend items={PITCH_MARKERS} />
      <p>
        Change their colours or hide them in <strong>Settings</strong>.
      </p>

      <h2>Building a clip</h2>

      <h3>1. Find a moment</h3>
      <p>
        Open <strong>Moments</strong>, filter the list, and click a moment to add it to your clip.{' '}
        <Link to={docsPagePath('moments')}>More on Moments</Link>
      </p>
      <Media src="workspace-moment.mp4" caption="Filtering Moments and adding one to the clip." />

      <h3>2. Add an overlay</h3>
      <p>
        Open <strong>Overlays</strong> and click one, such as Pass Probability.{' '}
        <Link to={docsPagePath('overlays')}>More on overlays</Link>
      </p>
      <Media src="overlays.mp4" caption="Opening Overlays and turning on each overlay in turn." />

      <h3>3. Draw on the play</h3>
      <p>
        Pause, pick a tool under <strong>Draw</strong>, and mark the pitch.{' '}
        <Link to={docsPagePath('annotations')}>More on annotations</Link>
      </p>
      <Media src="workspace-draw.mp4" caption="Each Draw tool in turn, then erasing a mark." />

      <h3>4. Set the timing</h3>
      <p>
        Everything you add gets a bar on the timeline. Drag a bar to move it, or drag its ends to trim it.{' '}
        <Link to={docsPagePath('playback-and-the-timeline')}>More on the timeline</Link>
      </p>
      <Media src="workspace-timeline.mp4" caption="Moving and trimming an overlay's bar." />

      <h3>5. Save</h3>
      <p>
        Press <strong>Save Project</strong> in the top bar to keep your clip.{' '}
        <Link to={docsPagePath('saving-and-loading-projects')}>More on saving</Link>
      </p>
    </>
  )
}
