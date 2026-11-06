import type { PointerEvent as ReactPointerEvent, ReactNode, Ref, UIEvent } from 'react'
import { FaChevronDown } from 'react-icons/fa'

type TimelineSectionProps = {
  title: string
  collapsed: boolean
  onToggleCollapsed: () => void
  scrollRef: Ref<HTMLDivElement>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  contentWidth: number
  onTrackPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  children: ReactNode
}

/** One boxed part of the timeline (Insights, Clip) with its own sideways scroll; its title hides and shows it. */
export function TimelineSection({
  title,
  collapsed,
  onToggleCollapsed,
  scrollRef,
  onScroll,
  contentWidth,
  onTrackPointerDown,
  children,
}: TimelineSectionProps) {
  return (
    <section className="annotation-timeline">
      <button
        type="button"
        className="annotation-timeline__section-toggle"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
      >
        <FaChevronDown className={`annotation-timeline__group-chevron${collapsed ? ' is-collapsed' : ''}`} aria-hidden="true" />
        {title}
      </button>
      {collapsed ? null : (
        <div className="annotation-timeline__scroll" ref={scrollRef} onScroll={onScroll}>
          <div
            className="annotation-timeline__body"
            style={{ minWidth: `${contentWidth}px` }}
            onPointerDown={onTrackPointerDown}
          >
            {children}
          </div>
        </div>
      )}
    </section>
  )
}
