import { useCallback, useState, type MouseEvent } from 'react'

export type ContextMenuState<T> = { x: number; y: number; data: T } | null

/**
 * Tracks the open/closed state of a right-click context menu plus an optional
 * payload identifying which element it was opened on (e.g. an annotation key).
 */
export function useContextMenu<T = void>() {
  const [menu, setMenu] = useState<ContextMenuState<T>>(null)

  const openMenu = useCallback((event: MouseEvent, data: T) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY, data })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  return { menu, openMenu, closeMenu }
}
