import { useMemo } from 'react'
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
}

const getAnnotationLabel = (annotation: { type: string; shape: any }) => {
  if (annotation.type === 'playerLine') {
    const [player1, player2] = annotation.shape.players ?? []
    return `P${player1 ?? '?'} ↔ P${player2 ?? '?'}`
  }

  return annotation.shape?.type ? `Draw (${annotation.shape.type})` : 'Draw'
}

type AnnotationTimelineProps = {
  annotationStore: AnnotationStore
  currentFrame: number
  scaleStart: number
  scaleEnd: number
  annotationUpdateEvent: boolean
}

const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  annotationStore,
  currentFrame,
  scaleStart,
  scaleEnd,
  annotationUpdateEvent,
}) => {
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
  }, [annotationStore, scaleStart, scaleEnd, visibleFrameSpan, annotationUpdateEvent])

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
                      return (
                        <div
                          key={annotation.key}
                          className={`annotation-timeline__annotation ${annotation.isOngoing ? 'annotation-timeline__annotation--ongoing' : ''}`}
                          data-label={label}
                          style={{
                            left: `${annotation.leftPercent}%`,
                            width: `${annotation.widthPercent}%`,
                            top: `${annotation.laneIndex * TIMELINE_LANE_HEIGHT + 2}px`,
                          }}
                          title={label}
                        >
                          <span className="annotation-timeline__annotation-label">{label}</span>
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
