import { useCallback, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
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

type TimelineGroupProps = {
  title: string
  children: React.ReactNode
}

/** One titled group of rows (Match Segments, Overlays, Annotations) inside the shared scroll area. */
function TimelineGroup({ title, children }: TimelineGroupProps) {
  return (
    <div className="annotation-timeline__group">
      <h3 className="annotation-timeline__group-title">{title}</h3>
      {children}
    </div>
  )
}

/**
 * Renders three groups over the same frame scale: Match Segments (the
 * source clip range), Overlays (one row per active overlay segment - pitch,
 * pitch control, pass probability), and Annotations (lane-packed rows of
 * player lines, drawn shapes). They share one horizontal scroll so their
 * playheads always line up. All bars are draggable to move/resize; each
 * bar owns its own drag state - see useRangeDrag. Pressing an empty stretch
 * of any track seeks there.
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
    removeOverlaySegment,
    setCurrentClipFrame,
    stopPlayback,
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

  // Pressing an empty stretch of any track moves the playhead there, and dragging scrubs. Bars stop their own
  // pointerdown, so this only sees presses that miss them. The playhead stays within the clip, not the headroom.
  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const track = (event.target as HTMLElement).closest('.annotation-timeline__track') as HTMLElement | null
    if (!track) return
    event.preventDefault()

    let lastFrame: number | null = null
    const seekTo = (clientX: number) => {
      const rect = track.getBoundingClientRect()
      if (rect.width === 0) return
      const frame = Math.round(scaleStart + ((clientX - rect.left) / rect.width) * visibleFrameSpan)
      const clamped = Math.min(Math.max(frame, clipRange.start), clipRange.end)
      if (clamped === lastFrame) return
      lastFrame = clamped
      setCurrentClipFrame(clamped)
    }

    stopPlayback()
    seekTo(event.clientX)

    const handlePointerMove = (moveEvent: PointerEvent) => seekTo(moveEvent.clientX)
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <section className="annotation-timeline">
      <div className="annotation-timeline__scroll">
        <div
          className="annotation-timeline__body"
          style={{ minWidth: `${contentWidth}px` }}
          onPointerDown={handleTrackPointerDown}
        >
          <TimelineGroup title="Match Segments">
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
          </TimelineGroup>

          <TimelineGroup title="Overlays">
            {overlaySegments.length === 0 ? (
              <div className="annotation-timeline__empty">No overlays</div>
            ) : (
              overlaySegments.map((overlay, index) => (
                <BackgroundRow
                  key={`${overlay.type}-${index}`}
                  overlay={overlay}
                  scaleStart={scaleStart}
                  scaleEnd={scaleEnd}
                  minFrame={clipRange.start}
                  maxFrame={clipRange.end}
                  labelWidth={TIMELINE_LABEL_WIDTH}
                  trackWidth={trackWidth}
                  currentFrameOffsetPercent={currentFrameOffsetPercent}
                  onRangeChange={(clipStart, clipEnd) => setOverlaySegmentRange(index, clipStart, clipEnd)}
                  onDelete={() => removeOverlaySegment(index)}
                  barStyle={getOverlayBarStyle(overlay)}
                />
              ))
            )}
          </TimelineGroup>

          <TimelineGroup title="Annotations">
            <AnnotationRows
              annotationStore={annotationStore}
              annotationVersion={annotationVersion}
              clipFrame={clipFrame}
              scaleStart={scaleStart}
              scaleEnd={scaleEnd}
              labelWidth={TIMELINE_LABEL_WIDTH}
              trackWidth={trackWidth}
              currentFrameOffsetPercent={currentFrameOffsetPercent}
              onDelete={(annotationKey) => {
                annotationStore.removeAnnotation(annotationKey)
                onAnnotationUpdate()
              }}
              onAnnotationUpdate={onAnnotationUpdate}
            />
          </TimelineGroup>
        </div>
      </div>
    </section>
  )
}

export default AnnotationTimeline
