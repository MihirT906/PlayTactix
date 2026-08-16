import type AnnotationStore from '../../services/AnnotationStore-optimized'
import { useMatchSession } from '../../context/MatchSessionContext'
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

/**
 * Renders rows over the same frame scale: the match segment (source clip
 * range), one row per active overlay segment (pitch, pitch control, pass
 * probability), and read-only lanes of annotations (player lines, drawn
 * shapes). Each draggable row owns its own drag state - see useRangeDrag.
 */
const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  annotationStore,
  clipFrame,
  clipRange,
  annotationVersion,
}) => {
  const { session, setOverlaySegmentRange, setSegmentRange } = useMatchSession()

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
    <section className="annotation-timeline">
      <div className="annotation-timeline__header">
        <h3>Annotations</h3>
      </div>

      <div className="annotation-timeline__scroll">
        <div className="annotation-timeline__body" style={{ minWidth: `${contentWidth}px` }}>
          <SegmentRow
            segment={activeSegment}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackWidth={trackWidth}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
            onRangeChange={setSegmentRange}
          />

          {overlaySegments.map((overlay) => (
            <BackgroundRow
              key={overlay.type}
              overlay={overlay}
              scaleStart={scaleStart}
              scaleEnd={scaleEnd}
              labelWidth={TIMELINE_LABEL_WIDTH}
              trackWidth={trackWidth}
              currentFrameOffsetPercent={currentFrameOffsetPercent}
              onRangeChange={(clipStart, clipEnd) => setOverlaySegmentRange(overlay.type, clipStart, clipEnd)}
            />
          ))}

          <AnnotationRows
            annotationStore={annotationStore}
            annotationVersion={annotationVersion}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackWidth={trackWidth}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
          />
        </div>
      </div>
    </section>
  )
}

export default AnnotationTimeline
