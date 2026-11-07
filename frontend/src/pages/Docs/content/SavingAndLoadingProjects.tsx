export default function SavingAndLoadingProjects() {
  return (
    <>
      <p>
        A project is your clip saved as a file, so you can come back to it later or send it to someone else.
      </p>

      <h2>Saving</h2>
      <p>
        Press <strong>Save Project</strong> in the top bar of the workspace. Your browser downloads a{' '}
        <code>.tappd.json</code> file.
      </p>
      <p>
        The file keeps everything you built: the segments, which overlays show and when, your drawings, your Insights
        tracks, and your colour and visibility settings. It names the match but doesn't hold its footage, so it stays
        small.
      </p>

      <h2>Loading</h2>
      <p>
        Press <strong>Load Project</strong> in the top bar, from anywhere in the app, and pick the file. The match it
        names opens with the clip just as it was saved.
      </p>
      <p>
        Loading replaces the project you have open. If it has changes you haven't saved, you'll be asked before they're
        thrown away.
      </p>
    </>
  )
}
