import { useMemo } from 'react'
import type AnnotationStore from '../../services/AnnotationStore-optimized'
import type { StoredAnnotation } from '../../services/AnnotationStore-optimized'
import { TimelineRow } from './TimelineRow'
import { describeWithDuration } from './barLabels'
import { DraggableRangeBar } from './DraggableRangeBar'

const LANE_HEIGHT = 22

const ROW_LABELS: Record<string, string> = {
  playerLine: 'Player Lines',
  draw: 'Draw Shapes',
  arrow: 'Arrows',
  teamShape: 'Team Shapes',
  playerFocus: 'Player Focus',
}

const getAnnotationLabel = (annotation: StoredAnnotation, getPlayerName: (playerId: number) => string) => {
  switch (annotation.type) {
    case 'playerFocus':
      return getPlayerName(annotation.shape.playerId)
    case 'playerLine': {
      const [player1, player2] = annotation.shape.players
      return `P${player1} ↔ P${player2}`
    }
    case 'arrow':
      return 'Arrow'
    case 'teamShape':
      return `Shape (${annotation.shape.players.length} players)`
    case 'draw':
      return `Draw (${annotation.shape.type})`
  }
}

type LaidOutAnnotation = StoredAnnotation & {
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
  /** The clip's last frame, which an annotation that has not been ended runs to. */
  clipEnd: number
  /** A player's name for a bar's label, e.g. the player a focus is on. */
  getPlayerName: (playerId: number) => string
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
  getPlayerName,
  clipEnd,
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
          // One not yet ended runs to the end of the clip, like an overlay, not across the runway past it;
          // one ending past the clip (dragged there, or the clip since cut shorter) is drawn up to its end too.
          const effectiveEnd = Math.min(annotation.frameEnd ?? clipEnd, clipEnd)

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
  }, [annotationStore, scaleStart, scaleEnd, clipEnd, annotationVersion])

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
              maxFrame={clipEnd}
              label={getAnnotationLabel(annotation, getPlayerName)}
              describe={describeWithDuration(getAnnotationLabel(annotation, getPlayerName))}
              className={annotation.isOngoing ? 'annotation-timeline__annotation--ongoing' : 'annotation-timeline__annotation--minimal'}
              style={{ top: `${annotation.laneIndex * LANE_HEIGHT + 2}px` }}
              onRangeChange={(frameStart, frameEnd) => {
                // Moving an "ongoing" annotation or pulling its end gives it a concrete end - same trade-off
                // Segments/Overlays make, they have no open-ended state either. Changing only its start keeps it ongoing.
                const keepsOngoing = annotation.isOngoing && frameEnd === annotation.effectiveEnd
                annotationStore.updateAnnotationRange(annotation.key, frameStart, keepsOngoing ? null : frameEnd, clipFrame)
                onAnnotationUpdate()
              }}
              playheadFrame={clipFrame}
              onSplit={(frame) => {
                annotationStore.splitAnnotation(annotation.key, frame, clipFrame)
                onAnnotationUpdate()
              }}
              onDelete={() => onDelete(annotation.key)}
            />
          ))}
        </TimelineRow>
      ))}
    </>
  )
}
