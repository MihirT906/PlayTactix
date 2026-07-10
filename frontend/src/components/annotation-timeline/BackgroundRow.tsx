import type { OverlaySegment } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

type BackgroundRowProps = {
  overlay: OverlaySegment | null
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (clipStart: number, clipEnd: number) => void
}

/** The active background overlay (e.g. pitch): the clip range it's shown behind. */
export function BackgroundRow({
  overlay,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
}: BackgroundRowProps) {
  if (!overlay) return null

  return (
    <TimelineRow
      label="Background"
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
        label={overlay.type}
        className="annotation-timeline__annotation--overlay"
        onRangeChange={onRangeChange}
      />
    </TimelineRow>
  )
}
