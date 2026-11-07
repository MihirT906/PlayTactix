export default function KeyMoments() {
  return (
    <>
      <p>
        Open <strong>Moments</strong> in the left panel to see every moment in the match. A moment is a passage of play:
        a spell where one team has the ball and both teams keep the same shape, such as a build-up against a high block.
        Filter the list down, then click a moment to add it to your clip.
      </p>

      <h2>Reading a moment</h2>
      <p>Each moment in the list shows:</p>
      <ul>
        <li>
          <strong>When</strong> it started in the match, and how long it lasted.
        </li>
        <li>
          <strong>How it ended</strong>, if it mattered: <strong>Shot</strong> or <strong>Goal</strong>. A moment
          tagged <strong>Led to shot</strong> or <strong>Led to goal</strong> is an earlier part of a move that ended in
          one.
        </li>
        <li>
          <strong>The two teams</strong>: the team on the ball and what it was doing, against the other team and how it
          was defending.
        </li>
        <li>
          <strong>The players</strong> who had the ball, in order.
        </li>
      </ul>

      <h2>Filters</h2>
      <ul>
        <li>
          <strong>Team in possession</strong>: the team that had the ball.
        </li>
        <li>
          <strong>Attacking phase</strong>: what the team on the ball was doing, such as building up or breaking
          quickly. Pick as many as you like.
        </li>
        <li>
          <strong>Defending phase</strong>: how the other team was defending, such as a low block or a high block. Pick
          as many as you like.
        </li>
        <li>
          <strong>Half</strong>: first or second.
        </li>
        <li>
          <strong>Led to</strong>: only the moments that ended in, or led to, a shot or a goal.
        </li>
      </ul>
      <p>
        The filters are behind the filter icon to the right of <strong>Moments</strong>. Once any is on, the
        heading above the list shows how many moments are left. <strong>Reset</strong> clears them all.
      </p>

      <h2>Adding to your clip</h2>
      <p>
        Click a moment to add it. The first one you add replaces the opening two minutes; each one after that goes on
        the end of your clip. Moments already in your clip are tagged <strong>In clip</strong>, and clicking one jumps
        to it.
      </p>
      <p>
        To add a stretch that isn't in the list, use <strong>Create Custom Moment</strong> at the bottom of the panel:
        enter the match clock time it starts at and how many seconds it runs, then press <strong>Add to clip</strong>.
        Write stoppage time as a broadcast would: <strong>45+1:30</strong> is first-half stoppage, and{' '}
        <strong>46:30</strong> is the second half.
      </p>
    </>
  )
}
