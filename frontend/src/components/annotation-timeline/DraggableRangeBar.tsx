import type { CSSProperties } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useRangeDrag, type FrameRange } from './useRangeDrag'
import { ContextMenu, type ContextMenuItem } from '../context-menu/ContextMenu'
import { useContextMenu } from '../context-menu/useContextMenu'

type DraggableRangeBarProps = {
  frameStart: number
  frameEnd: number
  scaleStart: number
  scaleEnd: number
  label: string
  /** What the bar reads for the range it covers, kept up to date while it is dragged. Defaults to `label`. */
  describe?: (range: FrameRange) => { text: string; title: string }
  className: string
  style?: CSSProperties
  /** Hard clip-frame bounds for a dragged edge (source footage + neighbours). Defaults to the scale. */
  minFrame?: number
  maxFrame?: number
  /** Bounds for moving the whole bar, when it may pass its neighbours to change places. Default to minFrame/maxFrame. */
  moveMinFrame?: number
  moveMaxFrame?: number
  /** Option B auto-grow: widen the visible scale to at least this frame while an edge is pulled past the end. */
  onScaleRequest?: (frameEnd: number) => void
  /** The drag ended - drop any transient scale widening. */
  onScaleRelease?: () => void
  onRangeChange: (frameStart: number, frameEnd: number, kind: 'move' | 'resize') => void
  /** The playhead's clip frame, where the right-click menu splits and trims the bar. */
  playheadFrame: number
  /** Cuts what the bar stands for in two at the given frame. */
  onSplit: (frame: number) => void
  /** Removes what the bar stands for, from the ✕ shown on hover or the right-click menu. */
  onDelete: () => void
}

/**
 * A single croppable bar: drag the body to move it, drag either edge to resize it, hover for ✕ to delete it.
 * Right-click splits it at the playhead, trims either end to the playhead, or deletes it.
 */
export function DraggableRangeBar({
  frameStart,
  frameEnd,
  scaleStart,
  scaleEnd,
  label,
  describe,
  className,
  style,
  minFrame,
  maxFrame,
  moveMinFrame,
  moveMaxFrame,
  onScaleRequest,
  onScaleRelease,
  onRangeChange,
  playheadFrame,
  onSplit,
  onDelete,
}: DraggableRangeBarProps) {
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)

  const { liveRange, beginDrag } = useRangeDrag({
    scaleStart,
    scaleEnd,
    minFrame,
    maxFrame,
    moveMinFrame,
    moveMaxFrame,
    onScaleRequest,
    onScaleRelease,
    onCommit: (range, edge) => onRangeChange(range.frameStart, range.frameEnd, edge === 'move' ? 'move' : 'resize'),
  })
  const { menu, openMenu, closeMenu } = useContextMenu()

  const range: FrameRange = liveRange ?? { frameStart, frameEnd }
  const clampedStart = Math.max(range.frameStart, scaleStart)
  const clampedEnd = Math.min(range.frameEnd, scaleEnd)
  const leftPercent = ((clampedStart - scaleStart) / visibleFrameSpan) * 100
  const widthPercent = Math.max(((clampedEnd - clampedStart) / visibleFrameSpan) * 100, 0.6)
  const description = describe?.(range) ?? { text: label, title: label }

  // Splitting and trimming need the playhead inside the bar, so neither part is left empty.
  const playheadInside = playheadFrame > frameStart && playheadFrame < frameEnd
  const menuItems: ContextMenuItem[] = [
    { label: 'Split at playhead', disabled: !playheadInside, onSelect: () => onSplit(playheadFrame) },
    { label: 'Trim start to playhead', disabled: !playheadInside, onSelect: () => onRangeChange(playheadFrame, frameEnd, 'resize') },
    { label: 'Trim end to playhead', disabled: !playheadInside, onSelect: () => onRangeChange(frameStart, playheadFrame, 'resize') },
    { label: 'Delete', danger: true, onSelect: onDelete },
  ]

  return (
    <>
      <div
        className={`annotation-timeline__annotation annotation-timeline__annotation--croppable ${className}`}
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: '2px', ...style }}
        title={description.title}
        onPointerDown={(event) => beginDrag(event, 'move', range)}
        onContextMenu={(event) => openMenu(event, undefined)}
      >
        <div
          className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--start"
          onPointerDown={(event) => beginDrag(event, 'start', range)}
        />
        <span className="annotation-timeline__annotation-label">{description.text}</span>
        <button
          type="button"
          className="annotation-timeline__annotation-delete"
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          // Keeps the press from starting a move of the bar underneath.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onDelete}
        >
          <FaTimes aria-hidden="true" />
        </button>
        <div
          className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--end"
          onPointerDown={(event) => beginDrag(event, 'end', range)}
        />
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />
      )}
    </>
  )
}
