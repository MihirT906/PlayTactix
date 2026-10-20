import { Fragment, type ReactNode } from 'react'
import { Popover } from './Popover'

export type ContextMenuItem = {
  label: ReactNode
  onSelect: () => void
  /** Renders the item in a warning colour (used for destructive actions like Delete). */
  danger?: boolean
  disabled?: boolean
  /** Heading of the group the item is in; one is shown above each run of items with the same section. */
  section?: string
}

type ContextMenuProps = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
  /** The button that opened the menu, if any, so pressing it again can close it. */
  anchor?: HTMLElement | null
}

/** A small popup menu anchored at viewport coordinates; see Popover for how it closes. */
export function ContextMenu({ x, y, items, onClose, anchor }: ContextMenuProps) {
  return (
    <Popover x={x} y={y} onClose={onClose} anchor={anchor} role="menu">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.section && item.section !== items[index - 1]?.section ? (
            <div className="context-menu__section" role="presentation">
              {item.section}
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={`context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect()
              onClose()
            }}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </Popover>
  )
}
