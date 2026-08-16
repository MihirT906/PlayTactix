import type { CSSProperties } from 'react'
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

type AnnotationTimelineProps = {
  annotationStore: AnnotationStore
  clipFrame: number
  clipRange: { start: number; end: number }
  annotationVersion: number
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
  annotationVersion,
}) => {
  const { session, setOverlaySegmentRange, setSegmentRange } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()

  const getOverlayBarStyle = (overlay: OverlaySegment): CSSProperties | undefined =>
    overlay.type === 'pitch_control'
      ? {
          background: `linear-gradient(90deg, color-mix(in srgb, ${awayTeamColor} 50%, transparent), color-mix(in srgb, ${homeTeamColor} 50%, transparent))`,
        }
      : undefined

  const scaleStart = clipRange.start
  const scaleEnd = clipRange.end
  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)
  const trackWidth = Math.max(visibleFrameSpan * TIMELINE_PIXELS_PER_FRAME, TIMELINE_MIN_TRACK_WIDTH)
  const contentWidth = TIMELINE_LABEL_WIDTH + 12 + trackWidth
  const currentFrameOffsetPercent = Math.min(
    Math.max(((clipFrame - scaleStart) / visibleFrameSpan) * 100, 0),
    100
  )

  const activeSegment = session.playback.clip.matchSegments[0] ?? null
  const overlaySegments = session.playback.clip.overlaySegments

  return (
    <>
      <TimelineSection title="Match Segments" contentWidth={contentWidth}>
        <SegmentRow
          segment={activeSegment}
          scaleStart={scaleStart}
          scaleEnd={scaleEnd}
          labelWidth={TIMELINE_LABEL_WIDTH}
          trackWidth={trackWidth}
          currentFrameOffsetPercent={currentFrameOffsetPercent}
          onRangeChange={setSegmentRange}
        />
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
              labelWidth={TIMELINE_LABEL_WIDTH}
              trackWidth={trackWidth}
              currentFrameOffsetPercent={currentFrameOffsetPercent}
              onRangeChange={(clipStart, clipEnd) => setOverlaySegmentRange(overlay.type, clipStart, clipEnd)}
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
        />
      </TimelineSection>
    </>
  )
}

export default AnnotationTimeline
