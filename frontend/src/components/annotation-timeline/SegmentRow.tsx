import type { Segment } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

type SegmentRowProps = {
  segments: Segment[]
  scaleStart: number
  scaleEnd: number
  /** Available source-footage frame range for the placed match, or null until match meta loads. */
  sourceBounds: { min: number; max: number } | null
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (index: number, clipStart: number, clipEnd: number, kind: 'move' | 'resize') => void
  onDelete: (index: number) => void
  /** Option B auto-grow while a segment edge is pulled past the visible end. */
  onScaleRequest?: (frameEnd: number) => void
  onScaleRelease?: () => void
}

/** The match segments placed on the clip timeline - the source footage played back. */
export function SegmentRow({
  segments,
  scaleStart,
  scaleEnd,
  sourceBounds,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
  onDelete,
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
            className="annotation-timeline__annotation--match"
            onRangeChange={(clipStart, clipEnd, kind) => onRangeChange(index, clipStart, clipEnd, kind)}
            contextMenuItems={[{ label: 'Delete', danger: true, onSelect: () => onDelete(index) }]}
          />
        )
      })}
    </TimelineRow>
  )
}
