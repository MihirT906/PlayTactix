import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import { DOCS_HOME_PATH } from '../Docs/docsNav'
import ChalkboardPlay from './ChalkboardPlay'
import './LandingPage.css'

const FEATURES = [
  {
    title: 'Find moments in football terms',
    body: "Open a match and filter down to what you're after: the moves that ended in a shot or a goal, what happened in one area of the pitch, what the full-backs were doing. No hunting through 90 minutes.",
  },
  {
    title: "See what video can't show",
    body: 'Was the pass really on? Was there space to run into? Overlays like pitch control and pass probability put the answer on the pitch, where everyone can see it.',
  },
  {
    title: 'Draw on the play as it moves',
    body: "What you draw appears in time with the action, so it feels like you're talking someone through the move as it happens.",
  },
  {
    title: 'Tell the story in one clip',
    body: 'Pull the moments that make your case from across the match into one clip. Keep it to come back to, or send it to someone who needs to see it.',
  },
]

type LandingPageProps = {
  onChooseGame: () => void
}

export default function LandingPage({ onChooseGame }: LandingPageProps) {
  return (
    <div className="landing">
      <div className="landing-top">
        <div className="landing-main">
          <h1 className="landing-headline">Turn Match Data Into Tactical Stories.</h1>
          <div className="landing-body">
            <div className="landing-copy">
              <section className="landing-intro">
                <p className="landing-lede">
                  You've watched pundits break down plays at half-time. Now it's your turn. Every match has a moment you
                  want to go back to: the run nobody picked up, the pass that was on and never played.{' '}
                  {APP_CONFIG.brand.title} puts that moment back on the pitch and hands you the pen. The players move exactly as they did, rebuilt from tracking data. Replay it,
                  switch on the built-in analysis overlays, draw on it to make your point, and save the clip for your
                  squad, or for the mate who still thinks they know better. Pick a match and see what you find.
                </p>
                <div className="landing-actions">
                  <button type="button" className="landing-cta" onClick={onChooseGame}>
                    Choose Game
                  </button>
                  <Link className="landing-cta landing-cta-secondary" to={DOCS_HOME_PATH} target="_blank" rel="noopener">
                    Read the Docs
                  </Link>
                </div>
              </section>

              <section className="landing-section">
                <h2 className="landing-heading">Data you can show a dressing room</h2>
                <p className="landing-text">
                  Tracking data records where every player and the ball are, ten times a second, for a whole match, and
                  more and more of it now comes from computer vision models that pull it straight out of match video.
                  Almost anything you'd want to know about the game is in there. It's also a table tens of thousands of
                  rows long, which is a hard thing to put in front of a team. {APP_CONFIG.brand.title} turns those rows
                  back into the game you know: moments you can replay, pull apart and show to the people who need to see
                  them.
                </p>
              </section>
            </div>
            <ChalkboardPlay className="landing-art" />
          </div>
        </div>
      </div>

      <section className="landing-section">
        <h2 className="landing-heading">What you can do</h2>
        <div className="landing-grid">
          {FEATURES.map((f) => (
            <article className="landing-card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
