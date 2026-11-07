import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../../config'
import { docsPagePath } from '../docsNav'

const brand = APP_CONFIG.brand.title

export default function WhatIsTappd() {
  return (
    <>
      <p>
        {brand} is a telestrator for soccer tracking data. Instead of drawing over a video of the match, you draw on
        the match itself: real players, in the positions they actually took, frame by frame.
      </p>

      <h2>Why tracking data</h2>
      <p>
        Video shows what the camera saw. Tracking data records where the players and the ball were, ten times a second.
        Because {brand} knows where everyone is, it can:
      </p>
      <ul>
        <li>work out who controls the space, how likely each pass is, and how compact a defensive block is</li>
        <li>keep your drawings attached to the players as they move</li>
        <li>let you move a player and see what would have changed</li>
      </ul>

      <h2>Who it's for</h2>
      <p>
        Anyone who explains soccer: a coach walking a squad through a move, an analyst making a case to a scout, a
        creator breaking down a goal, or a fan settling an argument.
      </p>

      <h2>What you can do</h2>
      <p>
        <Link to={docsPagePath('moments')}>Find</Link> the moments that matter,{' '}
        <Link to={docsPagePath('overlays')}>lay analysis</Link> over them,{' '}
        <Link to={docsPagePath('annotations')}>draw</Link> on the play, and{' '}
        <Link to={docsPagePath('clips-and-segments')}>build a clip</Link> that tells the story. Then{' '}
        <Link to={docsPagePath('saving-and-loading-projects')}>save it</Link> to come back to or share.
      </p>
    </>
  )
}
