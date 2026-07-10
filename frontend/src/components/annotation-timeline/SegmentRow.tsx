import type { Segment } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

type SegmentRowProps = {
  segment: Segment | null
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (clipStart: number, clipEnd: number, kind: 'move' | 'resize') => void
}

/** The active match segment: the source clip range played back. */
export function SegmentRow({
  segment,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
}: SegmentRowProps) {
  if (!segment) return null

  return (
    <TimelineRow
      label="Segment"
      labelWidth={labelWidth}
      trackWidth={trackWidth}
      trackHeight={LANE_HEIGHT}
      currentFrameOffsetPercent={currentFrameOffsetPercent}
    >
      <DraggableRangeBar
        frameStart={segment.clipStart}
        frameEnd={segment.clipEnd}
        scaleStart={scaleStart}
        scaleEnd={scaleEnd}
        label="Segment"
        className="annotation-timeline__annotation--match"
        onRangeChange={onRangeChange}
      />
    </TimelineRow>
  )
}
