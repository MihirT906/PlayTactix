import { useMemo } from 'react'
import type AnnotationStore from '../../services/AnnotationStore-optimized'
import { TimelineRow } from './TimelineRow'
import { DraggableRangeBar } from './DraggableRangeBar'

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
  effectiveEnd: number
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
  clipFrame: number
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  onDelete: (annotationKey: string) => void
  onAnnotationUpdate: () => void
}

/** One lane-packed row per annotation type (player lines, drawn shapes, ...) - draggable to move/resize, like Segments and Overlays. */
export function AnnotationRows({
  annotationStore,
  annotationVersion,
  clipFrame,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onDelete,
  onAnnotationUpdate,
}: AnnotationRowsProps) {
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

          return {
            ...annotation,
            laneIndex,
            effectiveEnd,
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
  }, [annotationStore, scaleStart, scaleEnd, annotationVersion])

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
          {row.annotations.map((annotation) => (
            <DraggableRangeBar
              key={annotation.key}
              frameStart={annotation.frameStart}
              frameEnd={annotation.effectiveEnd}
              scaleStart={scaleStart}
              scaleEnd={scaleEnd}
              minFrame={scaleStart}
              maxFrame={scaleEnd}
              label={getAnnotationLabel(annotation)}
              className={annotation.isOngoing ? 'annotation-timeline__annotation--ongoing' : 'annotation-timeline__annotation--minimal'}
              style={{ top: `${annotation.laneIndex * LANE_HEIGHT + 2}px` }}
              onRangeChange={(frameStart, frameEnd) => {
                // Dragging an "ongoing" annotation gives it a concrete end - same
                // trade-off Segments/Overlays make, they have no open-ended state either.
                annotationStore.updateAnnotationRange(annotation.key, frameStart, frameEnd, clipFrame)
                onAnnotationUpdate()
              }}
              contextMenuItems={[{ label: 'Delete', danger: true, onSelect: () => onDelete(annotation.key) }]}
            />
          ))}
        </TimelineRow>
      ))}
    </>
  )
}
