import type { ReactNode } from 'react'
import { FaChevronDown } from 'react-icons/fa'

type TimelineGroupProps = {
  title: string
  /** Controls shown beside the title, such as a button that adds a row. */
  actions?: ReactNode
  /** Given with onToggleCollapsed, the title becomes a button that hides and shows the rows. */
  collapsed?: boolean
  onToggleCollapsed?: () => void
  children: ReactNode
}

/** One titled group of rows (Match Segments, Insights, Overlays, Annotations) inside the shared scroll area. */
export function TimelineGroup({ title, actions, collapsed = false, onToggleCollapsed, children }: TimelineGroupProps) {
  return (
    <div className="annotation-timeline__group">
      <div className="annotation-timeline__group-header">
        {onToggleCollapsed ? (
          <button
            type="button"
            className="annotation-timeline__group-title annotation-timeline__group-toggle"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
          >
            <FaChevronDown
              className={`annotation-timeline__group-chevron${collapsed ? ' is-collapsed' : ''}`}
              aria-hidden="true"
            />
            {title}
          </button>
        ) : (
          <h3 className="annotation-timeline__group-title">{title}</h3>
        )}
        {actions}
      </div>
      {collapsed ? null : children}
    </div>
  )
}
