import { useState } from 'react'

interface KeyMomentFinderComponentProps {
  episodeRange: { start: number; end: number }
  onAddCustomEpisodeRange: (start: number, end: number) => void
}

function KeyMomentFinderComponent({ episodeRange, onAddCustomEpisodeRange }: KeyMomentFinderComponentProps) {
  const [startFrame, setStartFrame] = useState(episodeRange.start.toString())
  const [endFrame, setEndFrame] = useState(episodeRange.end.toString())

  const handleAddCustomEpisodeRange = () => {
    const start = Number.parseInt(startFrame, 10)
    const end = Number.parseInt(endFrame, 10)

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return
    }

    onAddCustomEpisodeRange(start, end)
  }

  return (
    <section className="key-moment-finder" aria-labelledby="key-moment-finder-heading">
      {/* <h2 id="key-moment-finder-heading">Key Moment Finder</h2> */}
      <input
        type="number"
        placeholder="Start Frame"
        value={startFrame}
        onChange={(e) => setStartFrame(e.target.value)}
      />
      <input
        type="number"
        placeholder="End Frame"
        value={endFrame}
        onChange={(e) => setEndFrame(e.target.value)}
      />
      <button onClick={handleAddCustomEpisodeRange}>Add Custom Episode Range</button>
    </section>
  )
}

export default KeyMomentFinderComponent