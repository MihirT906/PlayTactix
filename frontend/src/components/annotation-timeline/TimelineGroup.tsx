import type { ReactNode } from 'react'

type TimelineGroupProps = {
  title: string
  children: ReactNode
}

/** One titled group of rows (Overlays, Annotations) inside the Clip section. */
export function TimelineGroup({ title, children }: TimelineGroupProps) {
  return (
    <div className="annotation-timeline__group">
      <div className="annotation-timeline__group-header">
        <h3 className="annotation-timeline__group-title">{title}</h3>
      </div>
      {children}
    </div>
  )
}
