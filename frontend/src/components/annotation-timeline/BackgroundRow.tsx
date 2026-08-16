import { OVERLAY_SEGMENT_LABELS, type OverlaySegment } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

type BackgroundRowProps = {
  overlay: OverlaySegment
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (clipStart: number, clipEnd: number) => void
}

/** One active overlay segment (pitch, pitch control, pass probability): the clip range it's shown for. */
export function BackgroundRow({
  overlay,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
}: BackgroundRowProps) {
  return (
    <TimelineRow
      label={OVERLAY_SEGMENT_LABELS[overlay.type]}
      labelWidth={labelWidth}
      trackWidth={trackWidth}
      trackHeight={LANE_HEIGHT}
      currentFrameOffsetPercent={currentFrameOffsetPercent}
    >
      <DraggableRangeBar
        frameStart={overlay.clipStart}
        frameEnd={overlay.clipEnd}
        scaleStart={scaleStart}
        scaleEnd={scaleEnd}
        label={OVERLAY_SEGMENT_LABELS[overlay.type]}
        className="annotation-timeline__annotation--overlay"
        onRangeChange={onRangeChange}
      />
    </TimelineRow>
  )
}
