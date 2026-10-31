import type { CSSProperties } from 'react'
import { OVERLAY_SEGMENT_LABELS, type OverlaySegment, type OverlaySegmentKind } from '../../types/ClipInterfaces'
import { DraggableRangeBar } from './DraggableRangeBar'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

// Pitch and pitch control get their own distinct looks; pass probability, sequence trails, voronoi and the pass network fall
// back to a minimal, theme-independent style since they have no single team color to draw from.
const OVERLAY_BAR_CLASS_NAMES: Record<OverlaySegmentKind, string> = {
  pitch: 'annotation-timeline__annotation--overlay',
  pitch_control: 'annotation-timeline__annotation--overlay',
  pass_option_prob: 'annotation-timeline__annotation--minimal',
  sequence_trails: 'annotation-timeline__annotation--minimal',
  voronoi: 'annotation-timeline__annotation--minimal',
  pass_network: 'annotation-timeline__annotation--minimal',
}

type BackgroundRowProps = {
  type: OverlaySegmentKind
  /** Every segment of this overlay type, with its index in the clip's overlay segments. */
  segments: { overlay: OverlaySegment; index: number }[]
  scaleStart: number
  scaleEnd: number
  /** Clip-frame bounds the overlay edges are held within (the real clip, not the drag headroom). */
  minFrame: number
  maxFrame: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onRangeChange: (index: number, clipStart: number, clipEnd: number) => void
  onDelete: (index: number) => void
  barStyle?: CSSProperties
}

/**
 * One overlay type (pitch, pitch control, pass probability, ...): a bar for each clip range it's shown
 * for. Turning an overlay off and on again leaves several bars on the same row; each can only be
 * dragged up to its neighbours, so two bars of one type never overlap.
 */
export function BackgroundRow({
  type,
  segments,
  scaleStart,
  scaleEnd,
  minFrame,
  maxFrame,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onRangeChange,
  onDelete,
  barStyle,
}: BackgroundRowProps) {
  const label = OVERLAY_SEGMENT_LABELS[type]
  const sorted = [...segments].sort((a, b) => a.overlay.clipStart - b.overlay.clipStart)

  return (
    <TimelineRow
      label={label}
      labelWidth={labelWidth}
      trackWidth={trackWidth}
      trackHeight={LANE_HEIGHT}
      currentFrameOffsetPercent={currentFrameOffsetPercent}
    >
      {sorted.map(({ overlay, index }, position) => (
        <DraggableRangeBar
          key={index}
          frameStart={overlay.clipStart}
          frameEnd={overlay.clipEnd}
          scaleStart={scaleStart}
          scaleEnd={scaleEnd}
          minFrame={position > 0 ? sorted[position - 1].overlay.clipEnd + 1 : minFrame}
          maxFrame={position < sorted.length - 1 ? sorted[position + 1].overlay.clipStart - 1 : maxFrame}
          label={label}
          className={OVERLAY_BAR_CLASS_NAMES[type]}
          style={barStyle}
          onRangeChange={(clipStart, clipEnd) => onRangeChange(index, clipStart, clipEnd)}
          onDelete={() => onDelete(index)}
        />
      ))}
    </TimelineRow>
  )
}
