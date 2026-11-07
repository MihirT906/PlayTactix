import { Link } from 'react-router-dom'
import { docsPagePath } from '../docsNav'

export default function ClipsAndSegments() {
  return (
    <>
      <p>
        Your clip has a timeline of its own, built from <strong>segments</strong>: stretches of match footage placed one
        after another. That is how a single clip can show moments from opposite ends of the match side by side.
      </p>

      <h2>Adding segments</h2>
      <p>
        A match opens with one segment, its first two minutes. The first moment you add from{' '}
        <Link to={docsPagePath('moments')}>Moments</Link> replaces it, and each one after that goes on the end of
        the clip.
      </p>

      <h2>Arranging segments</h2>
      <p>Each segment is a bar in the <strong>Match Segments</strong> row under the pitch.</p>
      <ul>
        <li>Drag a bar to move it along the clip. The footage inside it stays the same.</li>
        <li>Drag either end to trim it, or pull it outwards to take in more of the match before or after.</li>
        <li>
          Hover it and press ✕, or right-click it and choose <strong>Delete</strong>, to remove it.
        </li>
      </ul>
      <p>
        The clip always ends where its last segment ends, so trimming or removing that one shortens the clip. Overlays
        that run the length of the clip, like the pitch, stretch and shrink with it.
      </p>

      <h2>Overlays and drawings stay put</h2>
      <p>
        Overlays and drawings are pinned to the clip's timeline, not to the footage. If you move a segment, move its
        overlays and drawings with it so they still line up with the play.
      </p>
    </>
  )
}
