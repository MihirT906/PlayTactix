import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from 'react'
import type AnnotationStore from '../../services/AnnotationStore-optimized'
import type TimelineStore from '../../services/TimelineStore'
import { useMatchSession } from '../../context/MatchSessionContext'
import { useStyleConfig } from '../../context/StyleConfigContext'
import type { OverlaySegment, OverlaySegmentKind } from '../../types/ClipInterfaces'
import type { Event } from '../../types/FrameDataInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'
import { SegmentRow } from './SegmentRow'
import { BackgroundRow } from './BackgroundRow'
import { AnnotationRows } from './AnnotationRows'
import { InsightRows } from './InsightRows'
import { TimelineGroup } from './TimelineGroup'
import { TimelineSection } from './TimelineSection'
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
  timelineStore: TimelineStore
  /** Every event of the match, for the Insights tracks. */
  matchEvents: Event[] | null
  matchData: MatchData | null
  onInsightEventHover: (event: Event | null) => void
}

/**
 * Renders two sections over the same frame scale. Insights, on top, reads the
 * game: event and metric tracks across the clip. Clip builds it: Moments
 * (the match footage placed on the clip), Overlays (one row per active overlay
 * segment - pitch control, pass probability, ...) and Annotations
 * (lane-packed rows of player lines, drawn shapes). Each section collapses on
 * its own; their sideways scrolls are kept in step so the playheads always
 * line up. Segment, overlay and annotation bars are draggable to move/resize; each
 * bar owns its own drag state - see useRangeDrag. Pressing an empty stretch
 * of any track seeks there, and pressing an insight event seeks to its start.
 */
const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  annotationStore,
  clipFrame,
  clipRange,
  sourceBounds,
  annotationVersion,
  onAnnotationUpdate,
  timelineStore,
  matchEvents,
  matchData,
  onInsightEventHover,
}) => {
  const {
    session,
    setOverlaySegmentRange,
    setSegmentRange,
    removeSegment,
    removeOverlaySegment,
    splitSegment,
    splitOverlaySegment,
    setCurrentClipFrame,
    stopPlayback,
  } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()

  const getOverlayBarStyle = (type: OverlaySegmentKind): CSSProperties | undefined =>
    type === 'pitch_control'
      ? {
          background: `linear-gradient(90deg, color-mix(in srgb, ${awayTeamColor} 50%, transparent), color-mix(in srgb, ${homeTeamColor} 50%, transparent))`,
        }
      : undefined

  const matchSegments = session.playback.clip.matchSegments
  const overlaySegments = session.playback.clip.overlaySegments
  // One row per overlay type, in the order each was first added, holding all of that type's segments.
  const overlayRows = useMemo(() => {
    const rows = new Map<OverlaySegmentKind, { overlay: OverlaySegment; index: number }[]>()
    overlaySegments.forEach((overlay, index) => {
      rows.set(overlay.type, [...(rows.get(overlay.type) ?? []), { overlay, index }])
    })
    return Array.from(rows, ([type, segments]) => ({ type, segments }))
  }, [overlaySegments])

  // Transient scale widening while an edge is dragged past the visible end (Option B).
  // Cleared on drag release, when the scale falls back to the clip length + headroom.
  const [dragScaleEnd, setDragScaleEnd] = useState<number | null>(null)
  const requestScaleEnd = useCallback((frameEnd: number) => {
    setDragScaleEnd((current) => Math.max(current ?? 0, frameEnd))
  }, [])
  const releaseScale = useCallback(() => setDragScaleEnd(null), [])

  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState(false)
  const [isClipCollapsed, setIsClipCollapsed] = useState(false)

  // The two sections scroll sideways together. A section opened again picks up where the other is.
  const insightsScrollRef = useRef<HTMLDivElement>(null)
  const clipScrollRef = useRef<HTMLDivElement>(null)
  const scrollLeftRef = useRef(0)
  const syncScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = event.currentTarget
    scrollLeftRef.current = scrollLeft
    for (const other of [insightsScrollRef.current, clipScrollRef.current]) {
      if (other && other !== event.currentTarget && other.scrollLeft !== scrollLeft) other.scrollLeft = scrollLeft
    }
  }
  useLayoutEffect(() => {
    for (const scroller of [insightsScrollRef.current, clipScrollRef.current]) {
      if (scroller) scroller.scrollLeft = scrollLeftRef.current
    }
  }, [isInsightsCollapsed, isClipCollapsed])

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
    <>
      <TimelineSection
        title="Insights"
        collapsed={isInsightsCollapsed}
        onToggleCollapsed={() => setIsInsightsCollapsed((current) => !current)}
        scrollRef={insightsScrollRef}
        onScroll={syncScroll}
        contentWidth={contentWidth}
        onTrackPointerDown={handleTrackPointerDown}
      >
        <div className="annotation-timeline__group">
          <InsightRows
            timelineStore={timelineStore}
            matchEvents={matchEvents}
            matchData={matchData}
            clipFrame={clipFrame}
            clipRange={clipRange}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackWidth={trackWidth}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
            onEventHover={onInsightEventHover}
          />
        </div>
      </TimelineSection>

      <TimelineSection
        title="Clip"
        collapsed={isClipCollapsed}
        onToggleCollapsed={() => setIsClipCollapsed((current) => !current)}
        scrollRef={clipScrollRef}
        onScroll={syncScroll}
        contentWidth={contentWidth}
        onTrackPointerDown={handleTrackPointerDown}
      >
        {/* The footage is a single row, so it sits straight under Clip rather than in a titled group. */}
        <div className="annotation-timeline__group">
          <SegmentRow
            segments={matchSegments}
            matchPeriods={matchData?.match_periods ?? null}
            scaleStart={scaleStart}
            scaleEnd={scaleEnd}
            sourceBounds={sourceBounds}
            labelWidth={TIMELINE_LABEL_WIDTH}
            trackWidth={trackWidth}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
            onRangeChange={setSegmentRange}
            onSplit={splitSegment}
            onDelete={removeSegment}
            clipFrame={clipFrame}
            onScaleRequest={requestScaleEnd}
            onScaleRelease={releaseScale}
          />
        </div>

        <TimelineGroup title="Overlays">
          {overlaySegments.length === 0 ? (
            <div className="annotation-timeline__empty">No overlays</div>
          ) : (
            overlayRows.map(({ type, segments }) => (
              <BackgroundRow
                key={type}
                type={type}
                segments={segments}
                scaleStart={scaleStart}
                scaleEnd={scaleEnd}
                minFrame={clipRange.start}
                maxFrame={clipRange.end}
                labelWidth={TIMELINE_LABEL_WIDTH}
                trackWidth={trackWidth}
                currentFrameOffsetPercent={currentFrameOffsetPercent}
                onRangeChange={setOverlaySegmentRange}
                onSplit={splitOverlaySegment}
                onDelete={removeOverlaySegment}
                clipFrame={clipFrame}
                barStyle={getOverlayBarStyle(type)}
              />
            ))
          )}
        </TimelineGroup>

        <TimelineGroup title="Annotations">
          <AnnotationRows
            annotationStore={annotationStore}
            clipEnd={clipRange.end}
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
            getPlayerName={(playerId) =>
              matchData?.players.find((player) => player.id === playerId)?.short_name ?? `Player ${playerId}`
            }
          />
        </TimelineGroup>
      </TimelineSection>
    </>
  )
}

export default AnnotationTimeline
