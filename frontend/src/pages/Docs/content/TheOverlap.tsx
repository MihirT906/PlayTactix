import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../../config'
import { docsPagePath } from '../docsNav'
import Media from './Media'

const brand = APP_CONFIG.brand.title

export default function TheOverlap() {
  return (
    <>
      <p>
        Two overlaps from the same match, one by each team. Both times the full-back runs round his winger. One ends in
        a goal and the other goes backwards, and the difference is where the winger carries the ball.
      </p>

      <Media src="breakdown-overlap.mp4" caption="The overlap: same run, different carry." />

      <h2>How it was made</h2>
      <p>
        Everything on the pitch was made in {brand}: the clip, the overlays, the drawings and the dragged players. It is
        a screen recording of the app.
      </p>
      <p>
        The coach and his speech bubbles were added afterwards. They show how a coach might use a clip like this,
        pausing it to talk their wingers through what happened and what could have.
      </p>

      <h2>The moments</h2>
      <p>Brisbane Roar 0–1 Perth Glory, A-League 2024/25, Round 9.</p>
      <ul>
        <li>
          <strong>Brisbane, 76:52.</strong> Jelacic carries it toward the touchline, and Hingert's overlap gets nowhere.
        </li>
        <li>
          <strong>Perth, 68:13.</strong> Carluccio carries it at goal, and Risdon's overlap sets up the only goal.
        </li>
      </ul>

      <h2>Tools used</h2>
      <ul>
        <li>
          <strong>Event Map</strong> for the full-backs' runs and the wingers' carries, and <strong>Voronoi</strong>{' '}
          for the space each player controls. See <Link to={docsPagePath('overlays')}>Overlays</Link>.
        </li>
        <li>
          <strong>Player Focus</strong> on each full-back and winger, <strong>Draw Arrow</strong> for where Jelacic
          should have gone, and <strong>Draw Rectangle</strong> for the space each runner gets. See{' '}
          <Link to={docsPagePath('annotations')}>Annotations</Link>.
        </li>
        <li>
          <strong>Dragging players</strong> to show what would have happened if Jelacic had carried it at goal. See{' '}
          <Link to={docsPagePath('annotations')}>Annotations</Link>.
        </li>
      </ul>

      <h2>Try it yourself</h2>
      <p>
        Download <a href="/docs-media/the-overlap.tappd.json" download>the project</a>, then press{' '}
        <strong>Load Project</strong> in the top bar and pick the file. The clip opens as it was built, ready for you to
        explore or change. See <Link to={docsPagePath('saving-and-loading-projects')}>Saving and loading projects</Link>.
      </p>
    </>
  )
}
