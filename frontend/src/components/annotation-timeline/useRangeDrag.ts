import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type FrameRange = { frameStart: number; frameEnd: number }

export type DragEdge = 'start' | 'end' | 'move'

const MIN_FRAME_SPAN = 1
/** How close (px) to the visible track's edge the pointer must get before the track auto-scrolls. */
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
   * Bounds for moving the whole range, when it may go further than its edges can be pulled - e.g. past
   * a neighbour, to change places with it. Default to minFrame/maxFrame.
   */
  moveMinFrame?: number
  moveMaxFrame?: number
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
  /** The range as last dragged to, which decides whether the track may still scroll either way. */
  range: FrameRange
  track: HTMLElement
  scrollEl: HTMLElement | null
  /** The row's sticky label, which covers the left of the scroll viewport. */
  labelEl: HTMLElement | null
  /** The (unrounded) frame under the pointer when the drag began, so a move follows the track as it scrolls. */
  startPointerFrame: number
  pointerX: number
  rafId: number | null
}

type ScrollDirection = 'left' | 'right'

/**
 * Drives a single draggable frame-range (a "start" handle, an "end" handle, and
 * a "move" body). Each caller gets its own independent instance, so there is no
 * shared/keyed drag state to branch on - the range being dragged is just the
 * range this hook was given.
 *
 * The scale can grow mid-drag (pulling an edge past the visible end asks the
 * owner to widen it - see onScaleRequest), so the pointer handlers read scale,
 * bounds and callbacks through refs kept current after every render rather than
 * closing over stale render-time values.
 */
export function useRangeDrag({
  scaleStart,
  scaleEnd,
  minFrame,
  maxFrame,
  moveMinFrame,
  moveMaxFrame,
  onScaleRequest,
  onScaleRelease,
  onCommit,
}: UseRangeDragOptions) {
  const [liveRange, setLiveRange] = useState<FrameRange | null>(null)

  const scaleStartRef = useRef(scaleStart)
  const scaleEndRef = useRef(scaleEnd)
  const minFrameRef = useRef(minFrame)
  const maxFrameRef = useRef(maxFrame)
  const moveMinFrameRef = useRef(moveMinFrame)
  const moveMaxFrameRef = useRef(moveMaxFrame)
  const onScaleRequestRef = useRef(onScaleRequest)
  const onScaleReleaseRef = useRef(onScaleRelease)
  const onCommitRef = useRef(onCommit)
  // Only the pointer handlers read these, and they run after the render has committed.
  useLayoutEffect(() => {
    scaleStartRef.current = scaleStart
    scaleEndRef.current = scaleEnd
    minFrameRef.current = minFrame
    maxFrameRef.current = maxFrame
    moveMinFrameRef.current = moveMinFrame
    moveMaxFrameRef.current = moveMaxFrame
    onScaleRequestRef.current = onScaleRequest
    onScaleReleaseRef.current = onScaleRelease
    onCommitRef.current = onCommit
  })

  const dragRef = useRef<ActiveDrag | null>(null)

  useEffect(
    () => () => {
      if (dragRef.current?.rafId != null) cancelAnimationFrame(dragRef.current.rafId)
    },
    []
  )

  const resolveBounds = (edge: DragEdge) => {
    const lo = minFrameRef.current ?? scaleStartRef.current
    const hi = maxFrameRef.current ?? scaleEndRef.current
    if (edge !== 'move') return { lo, hi }
    return { lo: moveMinFrameRef.current ?? lo, hi: moveMaxFrameRef.current ?? hi }
  }

  /** The frame under a viewport x on the track, unrounded and unclamped. */
  const frameAt = (track: HTMLElement, clientX: number) => {
    const trackRect = track.getBoundingClientRect()
    const span = Math.max(scaleEndRef.current - scaleStartRef.current, 1)
    return scaleStartRef.current + ((clientX - trackRect.left) / Math.max(trackRect.width, 1)) * span
  }

  /** The part of the scroll viewport the track shows in: right of the sticky label, up to the viewport's right. */
  const visibleTrackBounds = (drag: ActiveDrag) => {
    const viewRect = drag.scrollEl!.getBoundingClientRect()
    const labelRight = drag.labelEl?.getBoundingClientRect().right ?? viewRect.left
    return { left: Math.max(viewRect.left, labelRight), right: viewRect.right }
  }

  /** Whether the dragged edge (or the whole bar) can still go that way, so scrolling there is worth it. */
  const canGo = (drag: ActiveDrag, direction: ScrollDirection) => {
    const { lo, hi } = resolveBounds(drag.edge)
    const { frameStart, frameEnd } = drag.range
    if (direction === 'right') {
      return drag.edge === 'start' ? frameStart < frameEnd - MIN_FRAME_SPAN : frameEnd < hi
    }
    return drag.edge === 'end' ? frameEnd > frameStart + MIN_FRAME_SPAN : frameStart > lo
  }

  /** Which way the track should scroll for the pointer's position, if any. */
  const edgeScrollDirection = (drag: ActiveDrag): ScrollDirection | null => {
    if (!drag.scrollEl) return null
    const { left, right } = visibleTrackBounds(drag)
    if (drag.pointerX > right - EDGE_ZONE_PX && canGo(drag, 'right')) return 'right'
    if (drag.pointerX < left + EDGE_ZONE_PX && canGo(drag, 'left')) return 'left'
    return null
  }

  /** Map the current pointer position onto the (possibly just-scrolled or resized) track and update the live range. */
  const applyFromPointer = () => {
    const drag = dragRef.current
    if (!drag) return

    if (drag.track.getBoundingClientRect().width === 0) return
    const span = Math.max(scaleEndRef.current - scaleStartRef.current, 1)
    const { lo, hi } = resolveBounds(drag.edge)
    const pointerFrame = frameAt(drag.track, drag.pointerX)

    if (drag.edge === 'move') {
      // Measured in frames, not pixels, so the bar keeps up with the track scrolling under the pointer.
      const deltaFrames = Math.round(pointerFrame - drag.startPointerFrame)
      const minDelta = lo - drag.initialRange.frameStart
      const maxDelta = hi - drag.initialRange.frameEnd
      const clampedDelta = Math.min(Math.max(deltaFrames, minDelta), maxDelta)

      drag.range = {
        frameStart: drag.initialRange.frameStart + clampedDelta,
        frameEnd: drag.initialRange.frameEnd + clampedDelta,
      }
      setLiveRange(drag.range)
      return
    }

    const frame = Math.min(Math.max(Math.round(pointerFrame), lo), hi)
    drag.range =
      drag.edge === 'start'
        ? { ...drag.range, frameStart: Math.min(frame, drag.range.frameEnd - MIN_FRAME_SPAN) }
        : { ...drag.range, frameEnd: Math.max(frame, drag.range.frameStart + MIN_FRAME_SPAN) }
    setLiveRange(drag.range)

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
    const direction = edgeScrollDirection(drag)
    if (scrollEl && direction) {
      const { left, right } = visibleTrackBounds(drag)
      const rightOver = drag.pointerX - (right - EDGE_ZONE_PX)
      const leftOver = left + EDGE_ZONE_PX - drag.pointerX
      const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth

      if (direction === 'right') {
        const { hi } = resolveBounds(drag.edge)
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
      } else {
        const step = Math.min(leftOver / EDGE_ZONE_PX, 1) * MAX_EDGE_SCROLL_PX
        scrollEl.scrollLeft = Math.max(scrollEl.scrollLeft - step, 0)
      }
    }

    applyFromPointer()

    drag.rafId = edgeScrollDirection(drag) ? requestAnimationFrame(tick) : null
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
      range,
      track,
      scrollEl: track.closest('.annotation-timeline__scroll') as HTMLElement | null,
      labelEl: track.parentElement?.querySelector('.annotation-timeline__label-row') as HTMLElement | null,
      startPointerFrame: frameAt(track, event.clientX),
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
      if (current.rafId == null && edgeScrollDirection(current)) {
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
