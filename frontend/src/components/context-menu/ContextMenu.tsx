import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ContextMenu.css'

export type ContextMenuItem = {
  label: ReactNode
  onSelect: () => void
  /** Renders the item in a warning colour (used for destructive actions like Delete). */
  danger?: boolean
  disabled?: boolean
}

type ContextMenuProps = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/**
 * A small popup menu anchored at viewport coordinates. Closes on outside click,
 * Escape, or viewport resize. Rendered into document.body so it's never clipped
 * by a scroll container.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    // Defer binding so the same right-click that opened the menu doesn't close it.
    const timer = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown)
    }, 0)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', onClose)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
      role="menu"
    >
      {items.map((item, index) => (
        <button
          key={index}
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
      ))}
    </div>,
    document.body
  )
}
