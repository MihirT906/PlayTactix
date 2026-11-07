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
        Press play, left of the slider, to watch the clip. The speed icon on the right picks a speed from{' '}
        <strong>0.25x</strong> to <strong>4x</strong>.
      </p>
      <p>
        Under the slider are two clocks. <strong>Match Time</strong> is the match clock; <strong>Clip Time</strong> is how
        far you are through your clip. A clip can join moments from across the match, so Clip Time runs straight
        through while Match Time jumps between them. Hover the clocks for the exact frame numbers.
      </p>
      <p>
        The slider covers the whole clip. Drag it to move through the clip. A tick marks where one moment ends and the
        next begins, which is where Match Time jumps; click a tick to go to the start of that moment. Its colours show:
      </p>
      <Legend items={SLIDER_BANDS} swatch="bar" />

      <h2>The timeline</h2>
      <p>
        The rows under the pitch lay your clip out in time, in two sections. <strong>Insights</strong>, on top, holds
        the tracks you've added to read the game. <strong>Clip</strong> holds what you build:{' '}
        <strong>Moments</strong>, <strong>Overlays</strong> and <strong>Annotations</strong>. Click a section's
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
