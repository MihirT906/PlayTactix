import { APP_CONFIG } from '../../config'
import FirstClipSteps from '../../components/FirstClipSteps'
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

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-top">
        <div className="landing-main">
          <section className="landing-hero">
            <h1 className="landing-headline">Turn Match Data Into Tactical Stories.</h1>
            <p className="landing-lede">
              {APP_CONFIG.brand.title} is a telestrator for football tracking data. You know when a TV analyst freezes
              the replay and starts drawing on the screen to show you what really happened? Now you can do that
              yourself, on tracking and event data. Pick a match from the top bar to start.
            </p>
          </section>

          <section className="landing-section">
            <h2 className="landing-heading">Data you can show a dressing room</h2>
            <p className="landing-text">
              Tracking data records where every player and the ball are, ten times a second, for a whole match.
              Almost anything you'd want to know about the game is in there. It's also a table tens of thousands of
              rows long, which is a hard thing to put in front of a team. {APP_CONFIG.brand.title} turns those rows
              back into the game you know: moments you can replay, pull apart and show to the people who need to see
              them.
            </p>
          </section>
        </div>
        <FirstClipSteps />
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
