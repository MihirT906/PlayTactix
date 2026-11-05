import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../../config'
import { docsPagePath } from '../docsNav'
import Screenshot from './Screenshot'

const brand = APP_CONFIG.brand.title

export default function QuickStart() {
  return (
    <>
      <p>
        In this walkthrough you will find a move that ended in a shot, show which team controlled the space, highlight
        the player who made the difference, and save it all as a project you can share. It takes about five minutes.
      </p>

      <h2>1. Pick a match</h2>
      <p>
        Press <strong>Choose Game</strong> in the top bar. Each card is a match from the Australian A-League, taken
        from SkillCorner's open tracking data. Click one to open it in the workspace. The match downloads first, which
        can take a few seconds.
      </p>
      <Screenshot caption="the match list" />

      <h2>2. Find a moment</h2>
      <p>
        Open <strong>Search</strong> in the left sidebar. It lists every passage of play in the match. Under{' '}
        <strong>Led to</strong>, pick <strong>Shot</strong> to keep only the moves that ended in one.
      </p>
      <p>
        Click a passage to add it to your clip. It appears as a bar in <strong>Match Segments</strong> under the pitch.
        A passage tagged <strong>Led to shot</strong> is an earlier phase of a move whose shot came later, so it is
        worth adding too if you want the whole build-up.
      </p>
      <Screenshot caption="the Search panel with Led to set to Shot" />

      <h2>3. Play it back</h2>
      <p>
        Press play above the pitch to watch the move. The buttons either side of it halve or double the speed. The
        slider covers the whole clip: red has played, dark grey is loaded, and light grey is still loading. Drag it to
        scrub.
      </p>
      <p>Find the frame just before the key pass or run, and pause there.</p>

      <h2>4. Show who controlled the space</h2>
      <p>
        Open <strong>Overlays</strong> in the left sidebar and click <strong>Pitch Control</strong>. The pitch is
        shaded by which team controls each area, from the current frame to the end of the clip. A bar appears in the{' '}
        <strong>Overlays</strong> row under the pitch; drag its ends to change when it shows.
      </p>
      <Screenshot caption="Pitch Control switched on during the move" />

      <h2>5. Draw on the play</h2>
      <p>
        With playback paused, click <strong>Player Focus</strong> under Annotations in the sidebar, then click the
        player who made the difference. They stay highlighted from this frame on, and follow the play as it moves.
      </p>
      <p>
        Then pick <strong>Draw Arrow</strong> and drag on the pitch to show where the ball or the run went. Each
        drawing gets its own bar in the <strong>Annotations</strong> row under the pitch, so you can drag it to set
        when it shows. Press play to watch the move with your analysis on top.
      </p>
      <Screenshot caption="a focused player and an arrow on the pitch" />

      <h2>6. Save it</h2>
      <p>
        Press <strong>Save Project</strong> in the top bar. It downloads a <code>.playtactix.json</code> file holding
        your clip, overlays, drawings and colours. <strong>Load Project</strong> opens it again on any machine, and
        anyone you send the file to sees exactly what you built.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link to={docsPagePath('key-concepts')}>Key concepts</Link>: what matches, clips, segments and frames are in{' '}
          {brand}.
        </li>
        <li>
          <Link to={docsPagePath('the-workspace')}>The workspace</Link>: every panel and control, including Insights
          tracks.
        </li>
        <li>
          <Link to={docsPagePath('overlays')}>Overlays</Link>: what each overlay shows and how it is worked out.
        </li>
        <li>
          <Link to={docsPagePath('annotations')}>Annotations</Link>: every drawing tool, and how to select, move and
          erase.
        </li>
      </ul>
    </>
  )
}
