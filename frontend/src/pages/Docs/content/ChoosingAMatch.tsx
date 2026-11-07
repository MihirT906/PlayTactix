export default function ChoosingAMatch() {
  return (
    <>
      <p>
        Press <strong>Choose Match</strong> in the top bar to see the match list. Each card is one match, with the home
        team on the left and the away team on the right. Click one to open it in the workspace.
      </p>
      <p>
        The matches are free data from{' '}
        <a href="https://github.com/SkillCorner/opendata" target="_blank" rel="noreferrer">
          SkillCorner
        </a>
        , who have graciously provided 20 matches from the 2024/25 Australian A-League season.
      </p>

      <h2>Behind the scenes</h2>
      <p>
        When you click a match, its tracking and event data are downloaded. Tracking is recorded ten times a second,
        which adds up to around 50,000 frames and over a million player and ball positions in a single match.
      </p>
      <p>
        That is far too much to load at once, so the platform uses caching to load only the chunks of the match you
        are about to watch. That is what keeps playback smooth.
      </p>
    </>
  )
}
