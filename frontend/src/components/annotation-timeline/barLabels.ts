import { formatFrameDuration } from '../../services/matchClock'
import type { FrameRange } from './useRangeDrag'

// A timeline bar's text: its name and how long it runs, e.g. "Pitch · 0:13", kept up to date while it
// is dragged. An open-ended bar (an annotation not yet ended) is only counted up to `until`, the clip's
// end, rather than to the empty runway drawn past it.
export function describeWithDuration(label: string, until: number = Number.POSITIVE_INFINITY) {
  return (range: FrameRange) => {
    const text = `${label} · ${formatFrameDuration(Math.min(range.frameEnd, until) - range.frameStart)}`
    return { text, title: text }
  }
}
