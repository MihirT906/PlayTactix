import { useRef, useState } from 'react'

export type FrameRange = { frameStart: number; frameEnd: number }

export type DragEdge = 'start' | 'end' | 'move'

const MIN_FRAME_SPAN = 1

type UseRangeDragOptions = {
  scaleStart: number
  scaleEnd: number
  onCommit: (range: FrameRange, edge: DragEdge) => void
}

/**
 * Drives a single draggable frame-range (a "start" handle, an "end" handle, and
 * a "move" body). Each caller gets its own independent instance, so there is no
 * shared/keyed drag state to branch on - the range being dragged is just the
 * range this hook was given.
 */
export function useRangeDrag({ scaleStart, scaleEnd, onCommit }: UseRangeDragOptions) {
  const [liveRange, setLiveRange] = useState<FrameRange | null>(null)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)
  const clampFrame = (frame: number) => Math.min(Math.max(Math.round(frame), scaleStart), scaleEnd)

  const beginDrag = (event: React.PointerEvent<HTMLElement>, edge: DragEdge, range: FrameRange) => {
    event.preventDefault()
    event.stopPropagation()

    const track = (event.currentTarget as HTMLElement).closest('.annotation-timeline__track')
    if (!track) return
    const trackRect = track.getBoundingClientRect()
    const pointerStartX = event.clientX
    const initialRange = range

    setLiveRange(initialRange)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (edge === 'move') {
        const span = initialRange.frameEnd - initialRange.frameStart
        const deltaFrames = Math.round(((moveEvent.clientX - pointerStartX) / trackRect.width) * visibleFrameSpan)
        const minDelta = scaleStart - initialRange.frameStart
        const maxDelta = scaleEnd - initialRange.frameEnd
        const clampedDelta = Math.min(Math.max(deltaFrames, minDelta), maxDelta)

        setLiveRange({
          frameStart: initialRange.frameStart + clampedDelta,
          frameEnd: initialRange.frameEnd + clampedDelta,
        })
        return
      }

      const ratio = (moveEvent.clientX - trackRect.left) / trackRect.width
      const frame = clampFrame(scaleStart + ratio * visibleFrameSpan)

      setLiveRange((previous) => {
        if (!previous) return previous

        if (edge === 'start') {
          return { ...previous, frameStart: Math.min(frame, previous.frameEnd - MIN_FRAME_SPAN) }
        }

        return { ...previous, frameEnd: Math.max(frame, previous.frameStart + MIN_FRAME_SPAN) }
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      setLiveRange((current) => {
        if (current) onCommitRef.current(current, edge)
        return null
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return { liveRange, beginDrag }
}
