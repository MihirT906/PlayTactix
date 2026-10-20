import type { MouseEvent, ReactNode } from 'react'

type TimelineRowProps = {
  label: string
  /** What the row shows, added to the label's hover text. */
  description?: string
  labelWidth: number
  trackWidth: number
  trackHeight: number
  currentFrameOffsetPercent: number
  /** Controls shown in the label on hover, such as a remove button. */
  labelActions?: ReactNode
  onLabelContextMenu?: (event: MouseEvent) => void
  children?: ReactNode
}

/** Label column + scrollable track, with the current-playhead marker drawn behind any children. */
export function TimelineRow({
  label,
  description,
  labelWidth,
  trackWidth,
  trackHeight,
  currentFrameOffsetPercent,
  labelActions,
  onLabelContextMenu,
  children,
}: TimelineRowProps) {
  return (
    <div className="annotation-timeline__row" style={{ gridTemplateColumns: `${labelWidth}px ${trackWidth}px` }}>
      <div
        className={`annotation-timeline__label-row${labelActions ? ' annotation-timeline__label-row--with-actions' : ''}`}
        title={description ? `${label}\n${description}` : label}
        onContextMenu={onLabelContextMenu}
      >
        <span className="annotation-timeline__label-text">{label}</span>
        {labelActions}
      </div>
      <div className="annotation-timeline__track" style={{ height: `${trackHeight}px` }}>
        <div
          className="annotation-timeline__current-frame"
          style={{ left: `${currentFrameOffsetPercent}%` }}
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  )
}
