import { useMemo } from 'react'
import type AnnotationStore from '../../services/AnnotationStore-optimized'
import { TimelineRow } from './TimelineRow'

const LANE_HEIGHT = 22

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

type LaidOutAnnotation = {
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
  annotations: LaidOutAnnotation[]
  laneCount: number
}

type AnnotationRowsProps = {
  annotationStore: AnnotationStore
  annotationVersion: number
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
}

/** One lane-packed, read-only row per annotation type (player lines, drawn shapes, ...). */
export function AnnotationRows({
  annotationStore,
  annotationVersion,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
}: AnnotationRowsProps) {
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)

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

      const laidOut: LaidOutAnnotation[] = sorted
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
  }, [annotationStore, scaleStart, scaleEnd, visibleFrameSpan, annotationVersion])

  if (rows.length === 0) {
    return <div className="annotation-timeline__empty">No annotations</div>
  }

  return (
    <>
      {rows.map((row) => (
        <TimelineRow
          key={row.type}
          label={row.label}
          labelWidth={labelWidth}
          trackWidth={trackWidth}
          trackHeight={row.laneCount * LANE_HEIGHT}
          currentFrameOffsetPercent={currentFrameOffsetPercent}
        >
          {row.annotations.map((annotation) => {
            const label = getAnnotationLabel(annotation)
            return (
              <div
                key={annotation.key}
                className={`annotation-timeline__annotation ${annotation.isOngoing ? 'annotation-timeline__annotation--ongoing' : ''}`}
                style={{
                  left: `${annotation.leftPercent}%`,
                  width: `${annotation.widthPercent}%`,
                  top: `${annotation.laneIndex * LANE_HEIGHT + 2}px`,
                }}
                title={label}
              >
                <span className="annotation-timeline__annotation-label">{label}</span>
              </div>
            )
          })}
        </TimelineRow>
      ))}
    </>
  )
}
