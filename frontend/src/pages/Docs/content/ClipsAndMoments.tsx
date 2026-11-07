import { Link } from 'react-router-dom'
import { docsPagePath } from '../docsNav'

export default function ClipsAndMoments() {
  return (
    <>
      <p>
        Your clip has a timeline of its own, built from <strong>moments</strong>: stretches of match footage placed one
        after another. That is how a single clip can show moments from opposite ends of the match side by side.
      </p>

      <h2>Adding moments</h2>
      <p>
        A match opens on its first two minutes, marked <strong>Opening clip</strong>. The first moment you add from{' '}
        <Link to={docsPagePath('moments')}>Moments</Link> replaces it, and each one after that goes on the end of
        the clip. If you've already worked on the opening two minutes, you'll be asked whether to keep them.
      </p>

      <h2>Arranging moments</h2>
      <p>Each moment is a bar in the <strong>Moments</strong> row under the pitch.</p>
      <ul>
        <li>Drag a bar to move it along the clip. The footage inside it stays the same.</li>
        <li>Drag either end to trim it, or pull it outwards to take in more of the match before or after.</li>
        <li>
          Hover it and press ✕, or right-click it and choose <strong>Delete</strong>, to remove it.
        </li>
      </ul>
      <p>
        The clip always ends where its last moment ends, so trimming or removing that one shortens the clip. Overlays
        that run the length of the clip stretch and shrink with it.
      </p>

      <h2>Overlays and drawings stay put</h2>
      <p>
        Overlays and drawings are pinned to the clip's timeline, not to the footage. If you move a moment, move its
        overlays and drawings with it so they still line up with the play.
      </p>
    </>
  )
}
