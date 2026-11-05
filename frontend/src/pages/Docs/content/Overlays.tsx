import { Link } from 'react-router-dom'
import { docsPagePath } from '../docsNav'

export default function Overlays() {
  return (
    <>
      <p>
        Overlays add a layer of analysis on top of the play, from who controls the space to how the ball has moved.
        Open <strong>Overlays</strong> in the left panel to add them.
      </p>

      <h2>Turning overlays on and off</h2>
      <p>
        Click an overlay to turn it on from the current frame to the end of your clip, and click it again to turn it off
        from there. The ones showing right now are highlighted and marked <strong>On</strong>.
      </p>
      <p>
        Each overlay gets a bar under <strong>Overlays</strong> on the timeline. Drag and trim it to set exactly when
        it shows (see <Link to={docsPagePath('playback-and-the-timeline')}>Playback and the timeline</Link>). Event
        Map and Pass Network have settings, so clicking them opens those first.
      </p>

      <h2>The overlays</h2>

      <h3>Pitch</h3>
      <p>
        The pitch markings. It is on for the whole clip to start with; turn it off for a bare background.
      </p>

      <h3>Pitch Control</h3>
      <p>
        Shades the pitch by which team would win the ball if it arrived there. The pitch is split into one-metre
        squares, and each square is coloured by the team more likely to get to it first and take control: their colour
        where they have the upper hand, a blend of both where it is contested.
      </p>
      <p>
        Every player has an area of influence, strongest where they are and fading with distance. Its shape depends
        on:
      </p>
      <ul>
        <li>
          <strong>Where they are heading.</strong> It is centred half a second ahead of them, in the direction they are
          running.
        </li>
        <li>
          <strong>How fast they are running.</strong> The faster they go, the further it stretches ahead and the
          narrower it gets either side.
        </li>
        <li>
          <strong>How far they are from the ball.</strong> A player far from the ball covers a wider area, since they
          have longer to close the gap before the ball gets there.
        </li>
      </ul>
      <p>
        Each team's influence is added up square by square, and the team with more controls the square. It is worked
        out again every frame, using the model from Fernández and Bornn's <em>Wide Open Spaces</em> (2018).
      </p>
      <p>
        Pause and drag a player somewhere else, and the shading updates to show what would have changed if they had
        been there.
      </p>

      <h3>Pass Probability</h3>
      <p>
        Draws a line from the player on the ball to each of their passing options, labelled with the chance that pass
        would be completed. Passes with a 65% chance or better are drawn in the passing option colour; riskier ones in a
        contrasting colour.
      </p>

      <h3>Sequence Trails</h3>
      <p>
        Traces the move as it happens: carries as arrows, passes as comets, building up with each touch. The trail
        stays until the move ends, whether the ball is lost, play stops for a set piece, or there is a shot.
      </p>

      <h3>Voronoi</h3>
      <p>
        Splits the pitch into one cell per player, covering the area they are closer to than anyone else, shaded in
        their team's colour. It is a quick way to see the gaps between lines. Like Pitch Control, it follows a player
        you drag.
      </p>

      <h3>Event Map</h3>
      <p>
        Draws every carry, pass or off-ball run that matches your filters at once, in team colours: passes as comets,
        carries and runs as arrows. Filter by team, player, area of the pitch and whether the move led to a shot or a
        goal, across your clip or the whole match.
      </p>
      <p>
        Untick single events under <strong>Pick individually</strong>, and turn on <strong>Auto Disappear</strong> to
        clear each event from the pitch once it is over. The Event Map has no bar on the timeline: it is on whenever
        your filters draw something.
      </p>

      <h3>Pass Network</h3>
      <p>
        Joins team-mates with lines that get thicker the more they passed to each other. Count the passes over the
        whole match, just your clip, or a span of the match clock, and draw them all at once or add each pass as it
        happens. Show one team or both.
      </p>
      <p>The lines join players where they are now, so the network moves with the play.</p>
    </>
  )
}
