import './FirstClipSteps.css'

const STEPS = [
  { title: 'Pick a match', body: 'Choose the game you want to dig into from the top bar.' },
  { title: 'Find the moment', body: 'Use key moments and the timeline to land on the passage of play that caught your eye.' },
  { title: 'Tell the story', body: 'Switch on overlays and draw on the play to show what happened and why.' },
  { title: 'Share the clip', body: 'Export it and send it to whoever you want to convince.' },
]

// Sits in the left column that .app-shell--with-steps reserves; the parent must be position: relative.
export default function FirstClipSteps() {
  return (
    <aside className="first-clip-steps">
      <h2 className="first-clip-steps-heading">Your first clip in four steps</h2>
      <ol className="first-clip-steps-list">
        {STEPS.map((s) => (
          <li key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </aside>
  )
}
