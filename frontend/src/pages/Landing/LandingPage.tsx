import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import { DOCS_HOME_PATH } from '../Docs/docsNav'
import FeatureShowcase from './FeatureShowcase'
import IntroVideoDialog, { IntroVideoPreview } from './IntroVideo'
import './LandingPage.css'

type LandingPageProps = {
  onChooseMatch: () => void
}

export default function LandingPage({ onChooseMatch }: LandingPageProps) {
  const [introOpen, setIntroOpen] = useState(false)

  return (
    <div className="landing">
      <div className="landing-top">
        <div className="landing-main">
          {/* The hero on the left; on the right, the intro video, paused until clicked */}
          <div className="landing-body">
            <section className="landing-intro">
              <h1 className="landing-headline">Turn Match Data Into Tactical Stories.</h1>
              <p className="landing-lede">
                You've watched analysts break down the big moments at half-time.{' '}
                <strong className="landing-lede-hook">Now it's your turn:</strong>{' '}
                {APP_CONFIG.brand.title} puts the play back on the pitch, shows you what the data says, and hands you
                the pen.
              </p>
              <div className="landing-actions">
                <button type="button" className="landing-cta" onClick={onChooseMatch}>
                  Try Now
                </button>
                <Link className="landing-cta landing-cta-secondary" to={DOCS_HOME_PATH} target="_blank" rel="noopener">
                  Read the Docs
                </Link>
              </div>
            </section>
            <IntroVideoPreview onOpen={() => setIntroOpen(true)} />
          </div>
        </div>
      </div>

      <section className="landing-section">
        <h2 className="landing-heading">Data you can show a dressing room</h2>
        <p className="landing-text">
          Tracking data records where every player and the ball are, ten times a second, for a whole match, and more and
          more of it now comes from computer vision models that pull it straight out of match video. Almost anything
          you'd want to know about the game is in there. It's also a table tens of thousands of rows long, which is a
          hard thing to put in front of a team. {APP_CONFIG.brand.title} turns those rows back into the game you know:
          moments you can replay, pull apart and show to the people who need to see them.
        </p>
      </section>

      <FeatureShowcase />

      <IntroVideoDialog open={introOpen} onClose={() => setIntroOpen(false)} />
    </div>
  )
}
