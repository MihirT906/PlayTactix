import { useCallback, useState, type CSSProperties } from 'react'
import type AnnotationStore from '../../services/AnnotationStore-optimized'
import { useMatchSession } from '../../context/MatchSessionContext'
import { useStyleConfig } from '../../context/StyleConfigContext'
import type { OverlaySegment } from '../../types/ClipInterfaces'
import { SegmentRow } from './SegmentRow'
import { BackgroundRow } from './BackgroundRow'
import { AnnotationRows } from './AnnotationRows'
import './AnnotationTimeline.css'

const TIMELINE_LABEL_WIDTH = 220
const TIMELINE_MIN_TRACK_WIDTH = 960
const TIMELINE_PIXELS_PER_FRAME = 2
/** Empty runway kept past the clip content so a segment edge always has somewhere to be dragged into. */
const TIMELINE_HEADROOM_RATIO = 0.15
const TIMELINE_MIN_HEADROOM_FRAMES = 12

type AnnotationTimelineProps = {
  annotationStore: AnnotationStore
  clipFrame: number
  clipRange: { start: number; end: number }
  /** Available source-footage frame range for the placed match, or null until match meta loads. */
  sourceBounds: { min: number; max: number } | null
  annotationVersion: number
  onAnnotationUpdate: () => void
}

type TimelineSectionProps = {
  title: string
  contentWidth: number
  children: React.ReactNode
}

/** One boxed, independently-scrollable section (Match Segments, Overlays, Annotations). */
function TimelineSection({ title, contentWidth, children }: TimelineSectionProps) {
  return (
    <section className="annotation-timeline">
      <div className="annotation-timeline__header">
        <h3>{title}</h3>
      </div>

      <div className="annotation-timeline__scroll">
        <div className="annotation-timeline__body" style={{ minWidth: `${contentWidth}px` }}>
          {children}
        </div>
      </div>
    </section>
  )
}

/**
 * Renders three boxed sections over the same frame scale: Match Segments (the
 * source clip range), Overlays (one row per active overlay segment - pitch,
 * pitch control, pass probability), and Annotations (read-only lanes of
 * player lines, drawn shapes). Each draggable row owns its own drag state -
 * see useRangeDrag.
 */
const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  annotationStore,
  clipFrame,
  clipRange,
  sourceBounds,
  annotationVersion,
  onAnnotationUpdate,
}) => {
  const {
    session,
    setOverlaySegmentRange,
    setSegmentRange,
    removeSegment,
    setActiveOverlaySegment,
  } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()

  const getOverlayBarStyle = (overlay: OverlaySegment): CSSProperties | undefined =>
    overlay.type === 'pitch_control'
      ? {
          background: `linear-gradient(90deg, color-mix(in srgb, ${awayTeamColor} 50%, transparent), color-mix(in srgb, ${homeTeamColor} 50%, transparent))`,
        }
      : undefined

  const matchSegments = session.playback.clip.matchSegments
  const overlaySegments = session.playback.clip.overlaySegments

  // Transient scale widening while an edge is dragged past the visible end (Option B).
  // Cleared on drag release, when the scale falls back to the clip length + headroom.
  const [dragScaleEnd, setDragScaleEnd] = useState<number | null>(null)
  const requestScaleEnd = useCallback((frameEnd: number) => {
    setDragScaleEnd((current) => Math.max(current ?? 0, frameEnd))
  }, [])
  const releaseScale = useCallback(() => setDragScaleEnd(null), [])

  const scaleStart = clipRange.start

  // Furthest the scale can ever go: the point where some segment's end would pull
  // its source frame past the end of the available footage. Infinite until meta loads.
  const sourceCeiling = sourceBounds
    ? matchSegments.reduce(
        (max, segment) => Math.max(max, segment.clipEnd + (sourceBounds.max - segment.sourceFrameEnd)),
        clipRange.end
      )
    : Number.POSITIVE_INFINITY

  const headroom = Math.max(clipRange.end * TIMELINE_HEADROOM_RATIO, TIMELINE_MIN_HEADROOM_FRAMES)
  const desiredScaleEnd = Math.max(clipRange.end + headroom, dragScaleEnd ?? 0)
  const scaleEnd = Math.ceil(
    Number.isFinite(sourceCeiling)
      ? Math.min(desiredScaleEnd, Math.max(sourceCeiling, clipRange.end))
      : desiredScaleEnd
  )

  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)
  const trackWidth = Math.max(visibleFrameSpan * TIMELINE_PIXELS_PER_FRAME, TIMELINE_MIN_TRACK_WIDTH)
  const contentWidth = TIMELINE_LABEL_WIDTH + 12 + trackWidth
  const currentFrameOffsetPercent = Math.min(
    Math.max(((clipFrame - scaleStart) / visibleFrameSpan) * 100, 0),
    100
  )

  return (
    <>
      <TimelineSection title="Match Segments" contentWidth={contentWidth}>
        {matchSegments.length === 0 ? (
          <div className="annotation-timeline__empty">No match segments</div>
        ) : (
          <SegmentRow
            segments={matchSegments}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            sourceBounds={sourceBounds}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackWidth={trackWidth}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
            onRangeChange={setSegmentRange}
            onDelete={removeSegment}
            onScaleRequest={requestScaleEnd}
            onScaleRelease={releaseScale}
          />
        )}
      </TimelineSection>

      <TimelineSection title="Overlays" contentWidth={contentWidth}>
        {overlaySegments.length === 0 ? (
          <div className="annotation-timeline__empty">No overlays</div>
        ) : (
          overlaySegments.map((overlay) => (
            <BackgroundRow
              key={overlay.type}
              overlay={overlay}
              scaleStart={scaleStart}
              scaleEnd={scaleEnd}
              minFrame={clipRange.start}
              maxFrame={clipRange.end}
              labelWidth={TIMELINE_LABEL_WIDTH}
              trackWidth={trackWidth}
              currentFrameOffsetPercent={currentFrameOffsetPercent}
              onRangeChange={(clipStart, clipEnd) => setOverlaySegmentRange(overlay.type, clipStart, clipEnd)}
              onDelete={() => setActiveOverlaySegment(overlay.type, false)}
              barStyle={getOverlayBarStyle(overlay)}
            />
          ))
        )}
      </TimelineSection>

      <TimelineSection title="Annotations" contentWidth={contentWidth}>
        <AnnotationRows
          annotationStore={annotationStore}
          annotationVersion={annotationVersion}
          scaleStart={scaleStart}
          scaleEnd={scaleEnd}
          labelWidth={TIMELINE_LABEL_WIDTH}
          trackWidth={trackWidth}
          currentFrameOffsetPercent={currentFrameOffsetPercent}
          onDelete={(annotationKey) => {
            annotationStore.removeAnnotation(annotationKey)
            onAnnotationUpdate()
          }}
        />
      </TimelineSection>
    </>
  )
}

export default AnnotationTimeline
