import type { ReactNode } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import './FirstClipSteps.css'
import './WorkspaceGuide.css'

const RECIPE: { title: string; body: ReactNode }[] = [
  {
    title: 'Pull in a moment',
    body: (
      <>
        Open <strong>Search</strong> in the left sidebar. Use the filters to find the moment you're after, then click
        it to add it to your clip. Drag the ends of its bar in <strong>Match Segments</strong> under the pitch to
        adjust it, and add as many segments as you like.
      </>
    ),
  },
  {
    title: 'Add an overlay',
    body: (
      <>
        Open <strong>Overlays</strong>, press <strong>Add</strong> and pick Pitch Control or Pass Probability. Drag
        its bar under the pitch to choose when it shows.
      </>
    ),
  },
  {
    title: 'Draw on the play',
    body: (
      <>
        Pause on the frame where your point starts, pick a tool under <strong>Annotations</strong> and mark the
        pitch. Drag the annotation's bar under the pitch to set how long it stays.
      </>
    ),
  },
  {
    title: 'Save your work',
    body: (
      <>
        <strong>Save Project</strong> in the top bar downloads the clip as a file. <strong>Load Project</strong> opens
        it again, on any machine.
      </>
    ),
  },
]

const DOCS: { title: string; body: ReactNode }[] = [
  {
    title: 'Finding moments',
    body: (
      <>
        <p>
          <strong>Search</strong> lists every passage of play in the match. The filters at the top narrow the list.
        </p>
        <ul>
          <li>
            <strong>Attacking team</strong> and <strong>Defending team</strong>: who had the ball and who was
            defending. Picking one sets the other.
          </li>
          <li>
            <strong>Attacking phase</strong>: what the team on the ball was doing, such as building up or breaking
            quickly.
          </li>
          <li>
            <strong>Defending phase</strong>: how the other team was defending, such as a low block or a high block.
          </li>
          <li>
            <strong>Half</strong>: first or second half.
          </li>
          <li>
            <strong>Led to</strong>: keep only the passages that led to a shot or a goal.
          </li>
        </ul>
        <p>Clicking a passage adds it to the end of your clip as a new match segment.</p>
        <p>
          Know the frames already? Use <strong>Create Custom Moment</strong> at the bottom: enter a start and end
          frame and press Submit.
        </p>
      </>
    ),
  },
  {
    title: 'Playback',
    body: (
      <>
        <p>The play button sits above the pitch, with the current speed shown over it.</p>
        <p>
          The slider covers the whole clip. Red is what has played, dark grey is loaded and ready, light grey is
          still loading.
        </p>
        <p>The label on the right shows the frame in the match and the frame in your clip.</p>
      </>
    ),
  },
  {
    title: 'The clip timeline',
    body: (
      <>
        <p>The rows under the pitch are your clip laid out in time. The vertical line is the current frame.</p>
        <ul>
          <li>
            <strong>Match Segments</strong>: the passages of play in the clip.
          </li>
          <li>
            <strong>Overlays</strong>: when each overlay is visible.
          </li>
          <li>
            <strong>Annotations</strong>: when each line or shape is visible.
          </li>
        </ul>
        <p>Drag the middle of a bar to move it, or either end to resize it. Right-click a bar to delete it.</p>
      </>
    ),
  },
  {
    title: 'Overlays',
    body: (
      <>
        <p>
          Open <strong>Overlays</strong> and press <strong>Add</strong>. Click an overlay again to turn it off.
        </p>
        <ul>
          <li>
            <strong>Pitch</strong>: the pitch markings.
          </li>
          <li>
            <strong>Pitch Control</strong>: which team controls each area of the pitch.
          </li>
          <li>
            <strong>Pass Probability</strong>: how likely each passing option is to be completed.
          </li>
          <li>
            <strong>Events</strong>: filter the match events and tick the ones to show on the pitch. Auto Disappear
            removes each one once it is over.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Annotation tools',
    body: (
      <>
        <p>Click a tool to switch it on, and again to switch it off.</p>
        <ul>
          <li>
            <strong>Player Focus</strong>: click a player to highlight them. Click them again to remove it.
          </li>
          <li>
            <strong>Link Players</strong>: click two players to join them with a line that follows them as they
            move.
          </li>
          <li>
            <strong>Draw Rectangle</strong>: drag on the pitch to mark an area.
          </li>
          <li>
            <strong>Draw Line</strong>: drag on the pitch to draw a line.
          </li>
          <li>
            <strong>Erase</strong>: click a shape you drew to select it, then press Erase.
          </li>
        </ul>
        <p>
          With no tool on and playback paused, you can drag a player to show where they could have been. They snap
          back when the frame changes.
        </p>
      </>
    ),
  },
  {
    title: 'Event timelines',
    body: (
      <>
        <p>
          Press <strong>Event Timelines</strong> at the bottom of the pitch to see what was happening across the clip.
        </p>
        <p>
          Add rows from <strong>Timeline</strong> in the sidebar. A <strong>Filter</strong> row shows when a type of
          event happened, such as pressing or an overlap. A <strong>Metric</strong> row charts a value such as
          xthreat.
        </p>
      </>
    ),
  },
  {
    title: 'Colours and visibility',
    body: (
      <>
        <p>
          <strong>Settings</strong> changes how the pitch looks. Click a colour swatch to recolour a team or an event
          type, and use the eye to hide or show it.
        </p>
      </>
    ),
  },
  {
    title: 'Saving and loading',
    body: (
      <>
        <p>
          <strong>Save Project</strong> downloads a <code>.playtactix.json</code> file holding your clip, overlays,
          annotations, timelines and colours.
        </p>
        <p>
          <strong>Load Project</strong> reads that file back and opens the match it belongs to. Send the file to
          someone else and they see exactly what you built.
        </p>
      </>
    ),
  },
]

// Sits in the right column that .app-shell reserves; the parent must be position: relative.
export default function WorkspaceGuide() {
  return (
    <aside className="first-clip-steps workspace-guide">
      <h2 className="first-clip-steps-heading">Build your clip</h2>
      <ol className="first-clip-steps-list">
        {RECIPE.map((s) => (
          <li key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="first-clip-steps-heading workspace-guide-docs-heading">How it works</h2>
      <div className="workspace-guide-docs">
        {DOCS.map((d) => (
          <details key={d.title} className="workspace-guide-topic">
            <summary>
              <span>{d.title}</span>
              <FaChevronDown className="workspace-guide-arrow" aria-hidden="true" />
            </summary>
            <div className="workspace-guide-topic-body">{d.body}</div>
          </details>
        ))}
      </div>
    </aside>
  )
}
