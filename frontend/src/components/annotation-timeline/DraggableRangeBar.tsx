import type { CSSProperties } from 'react'
import { useRangeDrag, type FrameRange } from './useRangeDrag'
import { ContextMenu, type ContextMenuItem } from '../context-menu/ContextMenu'
import { useContextMenu } from '../context-menu/useContextMenu'

type DraggableRangeBarProps = {
  frameStart: number
  frameEnd: number
  scaleStart: number
  scaleEnd: number
  label: string
  className: string
  style?: CSSProperties
  onRangeChange: (frameStart: number, frameEnd: number, kind: 'move' | 'resize') => void
  /** Right-click menu entries for this bar (e.g. Delete). Omit for no menu. */
  contextMenuItems?: ContextMenuItem[]
}

/** A single croppable bar: drag the body to move it, drag either edge to resize it. */
export function DraggableRangeBar({
  frameStart,
  frameEnd,
  scaleStart,
  scaleEnd,
  label,
  className,
  style,
  onRangeChange,
  contextMenuItems,
}: DraggableRangeBarProps) {
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)

  const { liveRange, beginDrag } = useRangeDrag({
    scaleStart,
    scaleEnd,
    onCommit: (range, edge) => onRangeChange(range.frameStart, range.frameEnd, edge === 'move' ? 'move' : 'resize'),
  })
  const { menu, openMenu, closeMenu } = useContextMenu()

  const range: FrameRange = liveRange ?? { frameStart, frameEnd }
  const clampedStart = Math.max(range.frameStart, scaleStart)
  const clampedEnd = Math.min(range.frameEnd, scaleEnd)
  const leftPercent = ((clampedStart - scaleStart) / visibleFrameSpan) * 100
  const widthPercent = Math.max(((clampedEnd - clampedStart) / visibleFrameSpan) * 100, 0.6)

  return (
    <>
      <div
        className={`annotation-timeline__annotation annotation-timeline__annotation--croppable ${className}`}
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: '2px', ...style }}
        title={label}
        onPointerDown={(event) => beginDrag(event, 'move', range)}
        onContextMenu={contextMenuItems ? (event) => openMenu(event, undefined) : undefined}
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

      {menu && contextMenuItems && (
        <ContextMenu x={menu.x} y={menu.y} items={contextMenuItems} onClose={closeMenu} />
      )}
    </>
  )
}
