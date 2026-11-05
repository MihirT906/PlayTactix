import { Link } from 'react-router-dom'
import { docsPagePath } from '../docsNav'

export default function Annotations() {
  return (
    <>
      <p>
        Annotations are your own marks on the play: spotlights, links between players, shapes and arrows. The tools are
        under <strong>Annotations</strong> in the left panel.
      </p>

      <h2>Using a tool</h2>
      <p>
        Pause playback, then click a tool to switch it on, and again to switch it off. It stays on while you step or
        scrub through the clip. The tools only work while paused, but the one you picked comes back as soon as you pause
        again.
      </p>
      <p>
        Every mark gets a bar in the <strong>Annotations</strong> row under the pitch. Drag and trim it to set when the
        mark shows.
      </p>

      <h2>The tools</h2>

      <h3>Player Focus</h3>
      <p>
        Click a player to put a spotlight on them, with their name and a trail of where they have been. Click them again
        to stop.
      </p>

      <h3>Link Players</h3>
      <p>
        Click two players to join them with a line that follows them as they move. It shows the distance between them
        and thins as they move apart.
      </p>

      <h3>Team Shape</h3>
      <p>
        Click three or more players to outline the shape they make, and click a player again to take them out. The shape
        follows them and shows its width and depth in metres. Its fill is strongest when the block is compact and fades
        as it stretches.
      </p>

      <h3>Draw Rectangle, Draw Line and Draw Arrow</h3>
      <p>
        Drag on the pitch to mark an area, draw a line, or draw an arrow from where you press to where you let go.
      </p>

      <h2>Editing and erasing</h2>
      <p>
        With no tool on, click a mark to select it. Drag a rectangle, line or arrow to move it, or drag its handles to
        reshape it. Press <strong>Erase</strong> to delete the selected mark.
      </p>

      <h2>Trying a different position</h2>
      <p>
        With no tool on and playback paused, drag a player to show where they could have been.{' '}
        <Link to={docsPagePath('overlays')}>Pitch Control and Voronoi</Link> update to match. The player snaps back
        when the frame changes.
      </p>
    </>
  )
}
