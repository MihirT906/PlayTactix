import { useEffect, useMemo, useState } from 'react'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import './AnnotationTimeline.css'

type TimelineAnnotation = {
  key: string
  type: string
  frameStart: number
  frameEnd: number | null
  shape: any
  laneIndex: number
  leftPercent: number
  widthPercent: number
  isOngoing: boolean
}

type AnnotationRow = {
  type: string
  label: string
  annotations: TimelineAnnotation[]
  laneCount: number
}

const TIMELINE_LANE_HEIGHT = 22
const TIMELINE_LABEL_WIDTH = 220
const TIMELINE_ROW_GAP = 12
const TIMELINE_MIN_TRACK_WIDTH = 960
const TIMELINE_PIXELS_PER_FRAME = 2

const ROW_LABELS: Record<string, string> = {
  playerLine: 'Player Lines',
  draw: 'Draw Shapes',
  overlay: 'Overlays',
}

const getAnnotationLabel = (annotation: { type: string; shape: any }) => {
  if (annotation.type === 'playerLine') {
    const [player1, player2] = annotation.shape.players ?? []
    return `P${player1 ?? '?'} ↔ P${player2 ?? '?'}`
  }

  if (annotation.type === 'overlay') {
    return annotation.shape?.label ?? 'Overlay'
  }

  return annotation.shape?.type ? `Draw (${annotation.shape.type})` : 'Draw'
}

type AnnotationTimelineProps = {
  annotationStore: AnnotationStore
  currentFrame: number
  scaleStart: number
  scaleEnd: number
  annotationVersion: number
  onAnnotationUpdate: () => void
}

const MIN_OVERLAY_FRAME_SPAN = 1

type DragState = {
  key: string
  edge: 'start' | 'end' | 'move'
  trackLeft: number
  trackWidth: number
  pointerStartX: number
  initialFrameStart: number
  initialFrameEnd: number
}

type LiveRange = {
  key: string
  frameStart: number
  frameEnd: number
}

const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  annotationStore,
  currentFrame,
  scaleStart,
  scaleEnd,
  annotationVersion,
  onAnnotationUpdate,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [liveRange, setLiveRange] = useState<LiveRange | null>(null)
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)
  const timelineTrackWidth = Math.max(visibleFrameSpan * TIMELINE_PIXELS_PER_FRAME, TIMELINE_MIN_TRACK_WIDTH)
  const timelineContentWidth = TIMELINE_LABEL_WIDTH + TIMELINE_ROW_GAP + timelineTrackWidth
  const currentFrameOffset = ((currentFrame - scaleStart) / visibleFrameSpan) * 100
  const clampedFrameOffset = Math.min(Math.max(currentFrameOffset, 0), 100)

  const rows = useMemo<AnnotationRow[]>(() => {
    const allAnnotations = annotationStore.getAllAnnotations()
    const byType = new Map<string, typeof allAnnotations>()

    for (const annotation of allAnnotations) {
      const bucket = byType.get(annotation.type) ?? []
      bucket.push(annotation)
      byType.set(annotation.type, bucket)
    }

    return Array.from(byType.entries()).map(([type, annotations]) => {
      const sorted = [...annotations].sort((a, b) => a.frameStart - b.frameStart)
      const laneEndFrames: number[] = []

      const laidOut: TimelineAnnotation[] = sorted
        .map((annotation) =>
          liveRange && liveRange.key === annotation.key
            ? { ...annotation, frameStart: liveRange.frameStart, frameEnd: liveRange.frameEnd }
            : annotation
        )
        .filter((annotation) => (annotation.frameEnd ?? Infinity) >= scaleStart && annotation.frameStart <= scaleEnd)
        .map((annotation) => {
          const isOngoing = annotation.frameEnd == null
          const effectiveEnd = annotation.frameEnd ?? scaleEnd

          let laneIndex = laneEndFrames.findIndex((endFrame) => endFrame <= annotation.frameStart)
          if (laneIndex === -1) {
            laneIndex = laneEndFrames.length
            laneEndFrames.push(effectiveEnd)
          } else {
            laneEndFrames[laneIndex] = effectiveEnd
          }

          const clampedStart = Math.max(annotation.frameStart, scaleStart)
          const clampedEnd = Math.min(effectiveEnd, scaleEnd)
          const leftPercent = ((clampedStart - scaleStart) / visibleFrameSpan) * 100
          const widthPercent = ((clampedEnd - clampedStart) / visibleFrameSpan) * 100

          return {
            ...annotation,
            laneIndex,
            leftPercent,
            widthPercent: Math.max(widthPercent, 0.6),
            isOngoing,
          }
        })

      return {
        type,
        label: ROW_LABELS[type] ?? type,
        annotations: laidOut,
        laneCount: Math.max(...laidOut.map((a) => a.laneIndex + 1), 1),
      }
    })
  }, [annotationStore, scaleStart, scaleEnd, visibleFrameSpan, annotationVersion, liveRange])

  const clampFrame = (frame: number) => Math.min(Math.max(Math.round(frame), scaleStart), scaleEnd)

  const beginDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    annotation: TimelineAnnotation,
    edge: 'start' | 'end' | 'move'
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const track = (event.currentTarget as HTMLElement).closest('.annotation-timeline__track')
    if (!track) return
    const trackRect = track.getBoundingClientRect()
    const frameEnd = annotation.frameEnd ?? scaleEnd

    setDragState({
      key: annotation.key,
      edge,
      trackLeft: trackRect.left,
      trackWidth: trackRect.width,
      pointerStartX: event.clientX,
      initialFrameStart: annotation.frameStart,
      initialFrameEnd: frameEnd,
    })
    setLiveRange({
      key: annotation.key,
      frameStart: annotation.frameStart,
      frameEnd,
    })
  }

  useEffect(() => {
    if (!dragState) return

    const handlePointerMove = (event: PointerEvent) => {
      if (dragState.edge === 'move') {
        const deltaFrames = Math.round(((event.clientX - dragState.pointerStartX) / dragState.trackWidth) * visibleFrameSpan)
        const span = dragState.initialFrameEnd - dragState.initialFrameStart
        const maxDelta = scaleEnd - dragState.initialFrameEnd
        const minDelta = scaleStart - dragState.initialFrameStart
        const clampedDelta = Math.min(Math.max(deltaFrames, minDelta), maxDelta)

        setLiveRange((previous) => {
          if (!previous || previous.key !== dragState.key) return previous
          return {
            ...previous,
            frameStart: dragState.initialFrameStart + clampedDelta,
            frameEnd: dragState.initialFrameStart + clampedDelta + span,
          }
        })
        return
      }

      const ratio = (event.clientX - dragState.trackLeft) / dragState.trackWidth
      const frame = clampFrame(scaleStart + ratio * visibleFrameSpan)

      setLiveRange((previous) => {
        if (!previous || previous.key !== dragState.key) return previous

        if (dragState.edge === 'start') {
          const frameStart = Math.min(frame, previous.frameEnd - MIN_OVERLAY_FRAME_SPAN)
          return { ...previous, frameStart }
        }

        const frameEnd = Math.max(frame, previous.frameStart + MIN_OVERLAY_FRAME_SPAN)
        return { ...previous, frameEnd }
      })
    }

    const handlePointerUp = () => {
      setLiveRange((current) => {
        if (current && current.key === dragState.key) {
          const label = current.key.replace(/^overlay\|/, '')
          annotationStore.updateOverlayAnnotationRange(label, current.frameStart, current.frameEnd)
          onAnnotationUpdate()
        }
        return null
      })
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState, scaleStart, scaleEnd, visibleFrameSpan, annotationStore, onAnnotationUpdate])

  return (
    <section className="annotation-timeline">
      <div className="annotation-timeline__header">
        <h3>Annotations</h3>
      </div>

      {rows.length === 0 && <div className="annotation-timeline__empty">No annotations</div>}

      {rows.length > 0 && (
        <div className="annotation-timeline__scroll">
          <div className="annotation-timeline__body" style={{ minWidth: `${timelineContentWidth}px` }}>
            {rows.map((row) => {
              const trackHeight = row.laneCount * TIMELINE_LANE_HEIGHT

              return (
                <div
                  key={row.type}
                  className="annotation-timeline__row"
                  style={{ gridTemplateColumns: `${TIMELINE_LABEL_WIDTH}px ${timelineTrackWidth}px` }}
                >
                  <div className="annotation-timeline__label-row">{row.label}</div>
                  <div className="annotation-timeline__track" style={{ height: `${trackHeight}px` }}>
                    <div
                      className="annotation-timeline__current-frame"
                      style={{ left: `${clampedFrameOffset}%` }}
                      aria-hidden="true"
                    />
                    {row.annotations.map((annotation) => {
                      const label = getAnnotationLabel(annotation)
                      const isCroppable = annotation.type === 'overlay'
                      return (
                        <div
                          key={annotation.key}
                          className={`annotation-timeline__annotation ${annotation.isOngoing ? 'annotation-timeline__annotation--ongoing' : ''} ${isCroppable ? 'annotation-timeline__annotation--croppable annotation-timeline__annotation--overlay' : ''}`}
                          data-label={label}
                          style={{
                            left: `${annotation.leftPercent}%`,
                            width: `${annotation.widthPercent}%`,
                            top: `${annotation.laneIndex * TIMELINE_LANE_HEIGHT + 2}px`,
                          }}
                          title={label}
                          onPointerDown={isCroppable ? (event) => beginDrag(event, annotation, 'move') : undefined}
                        >
                          {isCroppable && (
                            <div
                              className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--start"
                              onPointerDown={(event) => beginDrag(event, annotation, 'start')}
                            />
                          )}
                          <span className="annotation-timeline__annotation-label">{label}</span>
                          {isCroppable && (
                            <div
                              className="annotation-timeline__annotation-handle annotation-timeline__annotation-handle--end"
                              onPointerDown={(event) => beginDrag(event, annotation, 'end')}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default AnnotationTimeline
