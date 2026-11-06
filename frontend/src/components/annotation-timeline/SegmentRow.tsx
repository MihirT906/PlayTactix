import { formatClock, formatFrameDuration, matchClockSecondsAt } from '../../services/matchClock'
import type { Segment } from '../../types/ClipInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'
import type { FrameRange } from './useRangeDrag'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

const PERIOD_NAMES: Record<number, string> = { 1: '1st half', 2: '2nd half', 3: 'Extra time 1st half', 4: 'Extra time 2nd half' }

// The source footage a segment covers once dragged to `range`. Moving it keeps the same footage;
// resizing an edge trims or extends the footage by as much as that edge moved.
function sourceRangeFor(segment: Segment, range: FrameRange) {
  const isMove = range.frameEnd - range.frameStart === segment.clipEnd - segment.clipStart
  if (isMove) return { start: segment.sourceFrameStart, end: segment.sourceFrameEnd }
  return {
    start: segment.sourceFrameStart + (range.frameStart - segment.clipStart),
    end: segment.sourceFrameEnd + (range.frameEnd - segment.clipEnd),
  }
}

// The bar reads the match clock it starts at and how long it runs, e.g. "52:00 · 34s"; hovering it
// adds the half and the clock it ends at. Until the match periods load it can only give the length.
function describeSegment(name: string, segment: Segment, range: FrameRange, periods: MatchData['match_periods'] | undefined) {
  const source = sourceRangeFor(segment, range)
  const duration = formatFrameDuration(source.end - source.start)
  const start = matchClockSecondsAt(source.start, periods)
  const end = matchClockSecondsAt(source.end, periods)
  if (start === null) return { text: `${name} · ${duration}`, title: `${name} · ${duration}` }

  const period = periods?.find((p) => source.start >= p.start_frame && source.start <= p.end_frame)?.period
  const halfName = period ? PERIOD_NAMES[period] ?? `Period ${period}` : null
  const clockRange = end === null ? formatClock(start) : `${formatClock(start)}–${formatClock(end)}`
  return {
    text: `${formatClock(start)} · ${duration}`,
    title: [name, halfName, clockRange, duration].filter(Boolean).join(' · '),
  }
}

type SegmentRowProps = {
  segments: Segment[]
  /** The match's periods, to turn source frames into the match clock; null until match meta loads. */
  matchPeriods: MatchData['match_periods'] | null
  scaleStart: number
  scaleEnd: number
  /** Available source-footage frame range for the placed match, or null until match meta loads. */
  sourceBounds: { min: number; max: number } | null
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (index: number, clipStart: number, clipEnd: number, kind: 'move' | 'resize') => void
  onSplit: (index: number, clipFrame: number) => void
  onDelete: (index: number) => void
  /** The playhead's clip frame, where a segment is split or trimmed from its right-click menu. */
  clipFrame: number
  /** Option B auto-grow while a segment edge is pulled past the visible end. */
  onScaleRequest?: (frameEnd: number) => void
  onScaleRelease?: () => void
}

/** The match segments placed on the clip timeline - the source footage played back. */
export function SegmentRow({
  segments,
  matchPeriods,
  scaleStart,
  scaleEnd,
  sourceBounds,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
  onSplit,
  onDelete,
  clipFrame,
  onScaleRequest,
  onScaleRelease,
}: SegmentRowProps) {
  const multiple = segments.length > 1

  return (
    <TimelineRow
      label={multiple ? `Segments (${segments.length})` : 'Segment'}
      labelWidth={labelWidth}
      trackWidth={trackWidth}
      trackHeight={LANE_HEIGHT}
      currentFrameOffsetPercent={currentFrameOffsetPercent}
    >
      {segments.map((segment, index) => {
        const label = multiple ? `Segment ${index + 1}` : 'Segment'
        const previous = segments[index - 1]
        const next = segments[index + 1]

        // The start edge can't reverse past the previous segment or run the
        // source frame below the footage start; the end edge can't overlap the
        // next segment or run the source frame past the footage end.
        const minFrame = Math.max(
          previous ? previous.clipEnd : 0,
          sourceBounds ? segment.clipStart - (segment.sourceFrameStart - sourceBounds.min) : 0
        )
        const maxFrame = Math.min(
          next ? next.clipStart : Number.POSITIVE_INFINITY,
          sourceBounds
            ? segment.clipEnd + (sourceBounds.max - segment.sourceFrameEnd)
            : Number.POSITIVE_INFINITY
        )

        return (
          <DraggableRangeBar
            key={index}
            frameStart={segment.clipStart}
            frameEnd={segment.clipEnd}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            minFrame={minFrame}
            maxFrame={maxFrame}
            onScaleRequest={onScaleRequest}
            onScaleRelease={onScaleRelease}
            label={label}
            describe={(range) => describeSegment(label, segment, range, matchPeriods ?? undefined)}
            className="annotation-timeline__annotation--match"
            onRangeChange={(clipStart, clipEnd, kind) => onRangeChange(index, clipStart, clipEnd, kind)}
            playheadFrame={clipFrame}
            onSplit={(frame) => onSplit(index, frame)}
            onDelete={() => onDelete(index)}
          />
        )
      })}
    </TimelineRow>
  )
}
