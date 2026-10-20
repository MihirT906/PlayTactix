import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ContextMenu.css'

type PopoverProps = {
  x: number
  y: number
  onClose: () => void
  /** The button that opened it: presses on it are left to the button, so it can close it again. */
  anchor?: HTMLElement | null
  className?: string
  role?: string
  children: ReactNode
}

/**
 * A floating panel at viewport coordinates. Closes on outside press, Escape, or
 * viewport resize. Rendered into document.body so it's never clipped by a
 * scroll container.
 */
export function Popover({ x, y, onClose, anchor, className, role, children }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!popoverRef.current?.contains(target) && !anchor?.contains(target)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    // Defer binding so the same press that opened it doesn't close it.
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
  }, [onClose, anchor])

  return createPortal(
    <div
      ref={popoverRef}
      className={`context-menu${className ? ` ${className}` : ''}`}
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
      role={role}
    >
      {children}
    </div>,
    document.body
  )
}
