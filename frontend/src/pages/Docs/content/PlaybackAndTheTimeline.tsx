import { SLIDER_COLORS } from '../../../constants/sliderColors'
import Legend from './Legend'

const SLIDER_BANDS = [
  { color: SLIDER_COLORS.played, name: 'Red', meaning: 'played' },
  { color: SLIDER_COLORS.loaded, name: 'Dark grey', meaning: 'loaded and ready to play' },
  { color: SLIDER_COLORS.loading, name: 'Light grey', meaning: 'still loading' },
  { color: SLIDER_COLORS.missing, name: 'Black', meaning: 'no tracking data for these frames' },
]

export default function PlaybackAndTheTimeline() {
  return (
    <>
      <p>
        The playback controls sit above the pitch and the timeline below it. Together they set where you are in your
        clip.
      </p>

      <h2>Playback</h2>
      <p>
        Press play to watch the clip. The <strong>0.5x</strong> and <strong>2x</strong> buttons either side halve or
        double the speed, and the current speed shows above the play button.
      </p>
      <p>
        To the right are two clocks. <strong>Match Time</strong> is the game clock; <strong>Clip Time</strong> is how
        far you are through your clip. A clip can join moments from across the match, so Clip Time runs straight
        through while Match Time jumps between them. Hover the clocks for the exact frame numbers.
      </p>
      <p>The slider covers the whole clip. Drag it to move through the clip. Its colours show:</p>
      <Legend items={SLIDER_BANDS} swatch="bar" />

      <h2>The timeline</h2>
      <p>
        The rows under the pitch lay your clip out in time, in two sections. <strong>Insights</strong>, on top, holds
        the tracks you've added to read the game. <strong>Clip</strong> holds what you build:{' '}
        <strong>Match Segments</strong>, <strong>Overlays</strong> and <strong>Annotations</strong>. Click a section's
        title to fold it away. The vertical line marks where you are; click or drag along an empty part of a row to
        move it.
      </p>
      <p>
        Drag a bar to move it and drag its ends to trim it. To remove one, hover it and press ✕, or right-click it and
        choose <strong>Delete</strong>.
      </p>
    </>
  )
}
