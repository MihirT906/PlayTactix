import type { CSSProperties } from 'react'
import { OVERLAY_SEGMENT_LABELS, type OverlaySegment, type OverlaySegmentKind } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

// Pitch and pitch control get their own distinct looks; pass probability falls
// back to a minimal, theme-independent style since it has no team colors to draw from.
const OVERLAY_BAR_CLASS_NAMES: Record<OverlaySegmentKind, string> = {
  pitch: 'annotation-timeline__annotation--overlay',
  pitch_control: 'annotation-timeline__annotation--overlay',
  pass_option_prob: 'annotation-timeline__annotation--minimal',
}

type BackgroundRowProps = {
  overlay: OverlaySegment
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (clipStart: number, clipEnd: number) => void
  onDelete: () => void
  barStyle?: CSSProperties
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
  onDelete,
  barStyle,
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
        className={OVERLAY_BAR_CLASS_NAMES[overlay.type]}
        style={barStyle}
        onRangeChange={onRangeChange}
        contextMenuItems={[{ label: 'Delete', danger: true, onSelect: onDelete }]}
      />
    </TimelineRow>
  )
}
