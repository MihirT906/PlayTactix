import { useRangeDrag, type FrameRange } from './useRangeDrag'

type DraggableRangeBarProps = {
  frameStart: number
  frameEnd: number
  scaleStart: number
  scaleEnd: number
  label: string
  className: string
  onRangeChange: (frameStart: number, frameEnd: number, kind: 'move' | 'resize') => void
}

/** A single croppable bar: drag the body to move it, drag either edge to resize it. */
export function DraggableRangeBar({
  frameStart,
  frameEnd,
  scaleStart,
  scaleEnd,
  label,
  className,
  onRangeChange,
}: DraggableRangeBarProps) {
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)

  const { liveRange, beginDrag } = useRangeDrag({
    scaleStart,
    scaleEnd,
    onCommit: (range, edge) => onRangeChange(range.frameStart, range.frameEnd, edge === 'move' ? 'move' : 'resize'),
  })

  const range: FrameRange = liveRange ?? { frameStart, frameEnd }
  const clampedStart = Math.max(range.frameStart, scaleStart)
  const clampedEnd = Math.min(range.frameEnd, scaleEnd)
  const leftPercent = ((clampedStart - scaleStart) / visibleFrameSpan) * 100
  const widthPercent = Math.max(((clampedEnd - clampedStart) / visibleFrameSpan) * 100, 0.6)

  return (
    <div
      className={`annotation-timeline__annotation annotation-timeline__annotation--croppable ${className}`}
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: '2px' }}
      title={label}
      onPointerDown={(event) => beginDrag(event, 'move', range)}
    >
      <div
        className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--start"
        onPointerDown={(event) => beginDrag(event, 'start', range)}
      />
      <span className="annotation-timeline__annotation-label">{label}</span>
      <div
        className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--end"
        onPointerDown={(event) => beginDrag(event, 'end', range)}
      />
    </div>
  )
}
