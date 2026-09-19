import { useEffect, useRef, useState } from 'react'

export type FrameRange = { frameStart: number; frameEnd: number }

export type DragEdge = 'start' | 'end' | 'move'

const MIN_FRAME_SPAN = 1
/** How close (px) to the scroll viewport edge the pointer must get before the track auto-scrolls. */
const EDGE_ZONE_PX = 48
/** Max px the track scrolls per animation frame while the pointer sits in the edge zone. */
const MAX_EDGE_SCROLL_PX = 18

type UseRangeDragOptions = {
  scaleStart: number
  scaleEnd: number
  /**
   * Hard clip-frame bounds for the dragged edge - source-footage limits and
   * neighbouring segments. Defaults to the visible scale when omitted.
   */
  minFrame?: number
  maxFrame?: number
  /**
   * Option B auto-grow: called while an edge is pulled past the visible end and
   * there is still headroom before {@link maxFrame}. The owner should widen the
   * visible scale to at least this frame so the edge can keep tracking the pointer.
   */
  onScaleRequest?: (frameEnd: number) => void
  /** The drag ended - the owner can drop any transient scale widening. */
  onScaleRelease?: () => void
  onCommit: (range: FrameRange, edge: DragEdge) => void
}

type ActiveDrag = {
  edge: DragEdge
  initialRange: FrameRange
  track: HTMLElement
  scrollEl: HTMLElement | null
  startPointerX: number
  pointerX: number
  rafId: number | null
}

/**
 * Drives a single draggable frame-range (a "start" handle, an "end" handle, and
 * a "move" body). Each caller gets its own independent instance, so there is no
 * shared/keyed drag state to branch on - the range being dragged is just the
 * range this hook was given.
 *
 * The scale can grow mid-drag (pulling an edge past the visible end asks the
 * owner to widen it - see onScaleRequest), so the pointer handlers read scale,
 * bounds and callbacks through refs kept current on every render rather than
 * closing over stale render-time values.
 */
export function useRangeDrag({
  scaleStart,
  scaleEnd,
  minFrame,
  maxFrame,
  onScaleRequest,
  onScaleRelease,
  onCommit,
}: UseRangeDragOptions) {
  const [liveRange, setLiveRange] = useState<FrameRange | null>(null)

  const scaleStartRef = useRef(scaleStart)
  const scaleEndRef = useRef(scaleEnd)
  const minFrameRef = useRef(minFrame)
  const maxFrameRef = useRef(maxFrame)
  const onScaleRequestRef = useRef(onScaleRequest)
  const onScaleReleaseRef = useRef(onScaleRelease)
  const onCommitRef = useRef(onCommit)
  scaleStartRef.current = scaleStart
  scaleEndRef.current = scaleEnd
  minFrameRef.current = minFrame
  maxFrameRef.current = maxFrame
  onScaleRequestRef.current = onScaleRequest
  onScaleReleaseRef.current = onScaleRelease
  onCommitRef.current = onCommit

  const dragRef = useRef<ActiveDrag | null>(null)

  useEffect(
    () => () => {
      if (dragRef.current?.rafId != null) cancelAnimationFrame(dragRef.current.rafId)
    },
    []
  )

  const resolveBounds = () => ({
    lo: minFrameRef.current ?? scaleStartRef.current,
    hi: maxFrameRef.current ?? scaleEndRef.current,
  })

  const isInEdgeZone = (drag: ActiveDrag) => {
    if (!drag.scrollEl) return false
    const rect = drag.scrollEl.getBoundingClientRect()
    return (
      (drag.pointerX > rect.right - EDGE_ZONE_PX && drag.edge !== 'start') ||
      (drag.pointerX < rect.left + EDGE_ZONE_PX && drag.edge !== 'end')
    )
  }

  /** Map the current pointer position onto the (possibly just-resized) track and update the live range. */
  const applyFromPointer = () => {
    const drag = dragRef.current
    if (!drag) return

    const trackRect = drag.track.getBoundingClientRect()
    if (trackRect.width === 0) return
    const scaleFrom = scaleStartRef.current
    const span = Math.max(scaleEndRef.current - scaleFrom, 1)
    const { lo, hi } = resolveBounds()

    if (drag.edge === 'move') {
      const deltaFrames = Math.round(((drag.pointerX - drag.startPointerX) / trackRect.width) * span)
      const minDelta = lo - drag.initialRange.frameStart
      const maxDelta = hi - drag.initialRange.frameEnd
      const clampedDelta = Math.min(Math.max(deltaFrames, minDelta), maxDelta)

      setLiveRange({
        frameStart: drag.initialRange.frameStart + clampedDelta,
        frameEnd: drag.initialRange.frameEnd + clampedDelta,
      })
      return
    }

    const ratio = (drag.pointerX - trackRect.left) / trackRect.width
    const frame = Math.min(Math.max(Math.round(scaleFrom + ratio * span), lo), hi)

    setLiveRange((previous) => {
      if (!previous) return previous
      if (drag.edge === 'start') {
        return { ...previous, frameStart: Math.min(frame, previous.frameEnd - MIN_FRAME_SPAN) }
      }
      return { ...previous, frameEnd: Math.max(frame, previous.frameStart + MIN_FRAME_SPAN) }
    })

    // Auto-grow: the end edge is near the visible end and there is still real
    // footage past it - ask the owner to widen the scale so the pull can continue.
    if (drag.edge === 'end' && Number.isFinite(hi)) {
      const margin = Math.max(span * 0.08, 4)
      if (frame > scaleEndRef.current - margin && frame < hi) {
        onScaleRequestRef.current?.(Math.min(frame + margin * 2, hi))
      }
    }
  }

  /** While the pointer stays in an edge zone: scroll the track, grow the scale when scroll runs out, keep the range following. */
  const tick = () => {
    const drag = dragRef.current
    if (!drag) return

    const scrollEl = drag.scrollEl
    if (scrollEl) {
      const viewRect = scrollEl.getBoundingClientRect()
      const rightOver = drag.pointerX - (viewRect.right - EDGE_ZONE_PX)
      const leftOver = viewRect.left + EDGE_ZONE_PX - drag.pointerX
      const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth

      if (rightOver > 0 && drag.edge !== 'start') {
        const { hi } = resolveBounds()
        if (scrollEl.scrollLeft >= maxScroll - 1) {
          // Out of track: widen the scale so more scroll room appears - but only
          // when there is a real ceiling to widen towards (footage bound known).
          if (Number.isFinite(hi)) {
            const span = Math.max(scaleEndRef.current - scaleStartRef.current, 1)
            const target = scaleEndRef.current + Math.max(span * 0.15, 8)
            onScaleRequestRef.current?.(Math.min(target, hi))
          }
        } else {
          const step = Math.min(rightOver / EDGE_ZONE_PX, 1) * MAX_EDGE_SCROLL_PX
          scrollEl.scrollLeft = Math.min(scrollEl.scrollLeft + step, maxScroll)
        }
      } else if (leftOver > 0 && drag.edge !== 'end') {
        const step = Math.min(leftOver / EDGE_ZONE_PX, 1) * MAX_EDGE_SCROLL_PX
        scrollEl.scrollLeft = Math.max(scrollEl.scrollLeft - step, 0)
      }
    }

    applyFromPointer()

    drag.rafId = isInEdgeZone(drag) ? requestAnimationFrame(tick) : null
  }

  const beginDrag = (event: React.PointerEvent<HTMLElement>, edge: DragEdge, range: FrameRange) => {
    event.preventDefault()
    event.stopPropagation()

    const track = (event.currentTarget as HTMLElement).closest(
      '.annotation-timeline__track'
    ) as HTMLElement | null
    if (!track) return

    const drag: ActiveDrag = {
      edge,
      initialRange: range,
      track,
      scrollEl: track.closest('.annotation-timeline__scroll') as HTMLElement | null,
      startPointerX: event.clientX,
      pointerX: event.clientX,
      rafId: null,
    }
    dragRef.current = drag
    setLiveRange(range)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      current.pointerX = moveEvent.clientX
      applyFromPointer()
      if (current.rafId == null && isInEdgeZone(current)) {
        current.rafId = requestAnimationFrame(tick)
      }
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      const current = dragRef.current
      if (current?.rafId != null) cancelAnimationFrame(current.rafId)
      dragRef.current = null

      setLiveRange((committed) => {
        if (committed) onCommitRef.current(committed, edge)
        return null
      })
      onScaleReleaseRef.current?.()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return { liveRange, beginDrag }
}
