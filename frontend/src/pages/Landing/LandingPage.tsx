import { APP_CONFIG } from '../../config'
import './LandingPage.css'

const FEATURES = [
  {
    title: 'Find the moments that matter',
    body: 'Jump straight to goals, shots and key phases of play instead of scrubbing through 90 minutes of tracking data.',
  },
  {
    title: 'Layer on tactical overlays',
    body: 'Pitch control, phases of play and possession sequences sit directly on top of the tracking data, so the shape of the game is visible at a glance.',
  },
  {
    title: 'Annotate in football language',
    body: 'Draw, mark and label the way an analyst would on match footage. Your ideas stay tied to the exact frame they describe.',
  },
  {
    title: 'Share what you found',
    body: 'Export clips of your analysis so coaches, players and colleagues see the story, not a spreadsheet.',
  },
]

const STEPS = [
  { title: 'Pick a match', body: 'Load tracking and event data for the game you want to study.' },
  { title: 'Find the moment', body: 'Use key moments and the event timeline to land on the passage of play.' },
  { title: 'Tell the story', body: 'Add overlays and annotations that explain what happened and why.' },
  { title: 'Share the clip', body: 'Export it and put your analysis in front of the people who need it.' },
]

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <h1 className="landing-headline">Turn Match Data Into Tactical Stories.</h1>
        <p className="landing-lede">
          {APP_CONFIG.brand.title} works the way a TV analyst draws on match footage, except it runs on tracking
          and event data. Choose a game from the top bar, find the key moments, explain them visually and share them in minutes.
        </p>
      </section>

      <section className="landing-section">
        <h2 className="landing-heading">Data is only useful once it can be understood</h2>
        <p className="landing-text">
          Tracking data holds every run, gap and pressing trigger of a match, but numbers and charts rarely
          persuade a dressing room. {APP_CONFIG.brand.title} turns that data into something you can point at,
          annotate and explain.
        </p>
      </section>

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

      <section className="landing-section">
        <h2 className="landing-heading">How it works</h2>
        <ol className="landing-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
