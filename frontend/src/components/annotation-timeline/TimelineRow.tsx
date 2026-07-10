import type { ReactNode } from 'react'

type TimelineRowProps = {
  label: string
  labelWidth: number
  trackWidth: number
  trackHeight: number
  currentFrameOffsetPercent: number
  children?: ReactNode
}

/** Label column + scrollable track, with the current-playhead marker drawn behind any children. */
export function TimelineRow({
  label,
  labelWidth,
  trackWidth,
  trackHeight,
  currentFrameOffsetPercent,
  children,
}: TimelineRowProps) {
  return (
    <div className="annotation-timeline__row" style={{ gridTemplateColumns: `${labelWidth}px ${trackWidth}px` }}>
      <div className="annotation-timeline__label-row">{label}</div>
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
