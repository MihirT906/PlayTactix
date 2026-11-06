import { useEffect, useState } from 'react'

// True once `element` has scrolled off the top of the viewport. Sitting below the fold
// does not count.
export function useScrolledPast(element: HTMLElement | null): boolean {
  const [scrolledPast, setScrolledPast] = useState(false)

  useEffect(() => {
    if (!element) {
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return element !== null && scrolledPast
}
