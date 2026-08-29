import type { Segment } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

type SegmentRowProps = {
  segments: Segment[]
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (index: number, clipStart: number, clipEnd: number, kind: 'move' | 'resize') => void
  onDelete: (index: number) => void
}

/** The match segments placed on the clip timeline - the source footage played back. */
export function SegmentRow({
  segments,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
  onDelete,
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
        return (
          <DraggableRangeBar
            key={index}
            frameStart={segment.clipStart}
            frameEnd={segment.clipEnd}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
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
