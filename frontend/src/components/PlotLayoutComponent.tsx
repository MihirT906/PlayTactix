import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import './PlotLayoutComponent.css'
import Controls from './Controls'
import PlotComponent from './PlotComponent'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FrameData, Event } from '../types/FrameDataInterfaces'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import AnnotationTimeline from './annotation-timeline'
import { useScrolledPast } from '../hooks/useScrolledPast'

type PlotLayoutComponentProps = {
  isPlaying: boolean
  onPlayPause: () => void
  playbackSpeed: number
  onDoubleSpeed: () => void
  onHalveSpeed: () => void
  currentMatchFrame: number
  clipFrame: number
  onClipFrameChange: (clipFrame: number) => void
  clipRange: { start: number; end: number }
  segmentRange: { start: number; end: number }
  loadedFrameRanges: { start: number; end: number }[]
  missingFrameRanges: { start: number; end: number }[]
  matchData: MatchData | null
  frameData: FrameData | null
  matchEvents: Event[] | null
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
  onAnnotationUpdate: () => void
  annotationVersion: number
  // Whether the frame on screen is still being fetched.
  isFrameLoading: boolean
  controlsRef?: Ref<HTMLDivElement>
}

// How long frames have to keep loading before the spinner shows. Frames already in memory load
// almost at once, so a shorter wait would flash the spinner on every frame of playback.
const LOADING_INDICATOR_DELAY_MS = 250

// How wide the pitch is while docked beside the match island, in px.
const DOCKED_PITCH_WIDTH = 240

const DOCK_ANIMATION: KeyframeAnimationOptions = { duration: 420, easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)' }

// True once `active` has stayed true for `delayMs`; false again as soon as it is not.
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!active) return
    const timeout = setTimeout(() => setElapsed(true), delayMs)
    return () => {
      clearTimeout(timeout)
      setElapsed(false)
    }
  }, [active, delayMs])

  return active && elapsed
}

function PlotLayoutComponent({
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onDoubleSpeed,
  onHalveSpeed,
  currentMatchFrame,
  clipFrame,
  onClipFrameChange,
  clipRange,
  segmentRange,
  loadedFrameRanges,
  missingFrameRanges,
  matchData,
  frameData,
  matchEvents,
  annotationStore,
  timelineStore,
  onAnnotationUpdate,
  annotationVersion,
  isFrameLoading,
  controlsRef,
}: PlotLayoutComponentProps) {
  const showLoading = useDelayedFlag(isFrameLoading, LOADING_INDICATOR_DELAY_MS)

  // Once the pitch scrolls off the top, it docks small beside the match island. The stage keeps
  // the pitch's size while it is away, so the page does not jump and the scroll check still works.
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const [pitchSize, setPitchSize] = useState<{ width: number; height: number } | null>(null)
  const isDocked = useScrolledPast(stageElement) && pitchSize !== null
  // Where the docked pitch last sat on screen, for the snap back to start from.
  const dockedRectRef = useRef<DOMRect | null>(null)

  // Scaling does not change the pitch's layout size, so this always reads its full size.
  useEffect(() => {
    const dock = dockRef.current
    if (!dock) return
    const observer = new ResizeObserver(() => setPitchSize({ width: dock.offsetWidth, height: dock.offsetHeight }))
    observer.observe(dock)
    return () => observer.disconnect()
  }, [])

  // Slides the pitch between its place on the page and the dock, from wherever it was
  // painted before the switch to where it is laid out now.
  useLayoutEffect(() => {
    const dock = dockRef.current
    if (!dock || !stageElement) return
    dock.getAnimations().forEach((animation) => animation.cancel())

    const stageRect = stageElement.getBoundingClientRect()
    let keyframes: Keyframe[] | null = null
    if (isDocked) {
      const dockedRect = dock.getBoundingClientRect()
      dockedRectRef.current = dockedRect
      keyframes = [
        { transform: `translate(${stageRect.left - dockedRect.left}px, ${stageRect.top - dockedRect.top}px) scale(1)` },
        { transform: `translate(0, 0) scale(${dockedRect.width / stageRect.width})` },
      ]
    } else if (dockedRectRef.current) {
      const dockedRect = dockedRectRef.current
      dockedRectRef.current = null
      keyframes = [
        { transform: `translate(${dockedRect.left - stageRect.left}px, ${dockedRect.top - stageRect.top}px) scale(${dockedRect.width / stageRect.width})` },
        { transform: 'translate(0, 0) scale(1)' },
      ]
    }
    if (!keyframes || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    dock.classList.add('is-animating')
    const animation = dock.animate(keyframes, DOCK_ANIMATION)
    animation.onfinish = animation.oncancel = () => dock.classList.remove('is-animating')
  }, [isDocked, stageElement])

  const scrollToPitch = () => stageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // The insight event under the pointer on the timeline, whose players the pitch picks out.
  const [hoveredInsightEvent, setHoveredInsightEvent] = useState<Event | null>(null)

  // The playable source-frame range of the loaded match - the ceiling a segment
  // edge can be dragged/extended to on the clip timeline.
  const sourceBounds = useMemo(() => {
    const periods = matchData?.match_periods
    if (!periods?.length) return null
    return {
      min: Math.min(...periods.map((period) => period.start_frame)),
      max: Math.max(...periods.map((period) => period.end_frame)),
    }
  }, [matchData])

  return (
    <div className="plot-layout">
      <Controls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        playbackSpeed={playbackSpeed}
        onDoubleSpeed={onDoubleSpeed}
        onHalveSpeed={onHalveSpeed}
        currentMatchFrame={currentMatchFrame}
        clipFrame={clipFrame}
        clipRange={clipRange}
        onClipFrameChange={onClipFrameChange}
        loadedFrameRanges={loadedFrameRanges}
        segmentStart={segmentRange.start}
        missingRanges={missingFrameRanges}
        annotationStore={annotationStore}
        matchPeriods={matchData?.match_periods ?? null}
        containerRef={controlsRef}
      />
      <div className="plot-layout__plot">
        <div
          ref={setStageElement}
          className="plot-layout__stage"
          style={isDocked ? { width: pitchSize.width, height: pitchSize.height } : undefined}
        >
          <div
            ref={dockRef}
            className={`plot-layout__dock ${isDocked ? 'is-docked' : ''}`}
            style={pitchSize ? ({ '--dock-width': `${DOCKED_PITCH_WIDTH}px`, '--dock-scale': DOCKED_PITCH_WIDTH / pitchSize.width } as CSSProperties) : undefined}
            onClick={isDocked ? scrollToPitch : undefined}
            onKeyDown={isDocked ? (event) => { if (event.key === 'Enter' || event.key === ' ') scrollToPitch() } : undefined}
            role={isDocked ? 'button' : undefined}
            tabIndex={isDocked ? 0 : undefined}
            aria-label={isDocked ? 'Scroll back to the pitch' : undefined}
          >
          <PlotComponent
            currentFrame={currentMatchFrame}
            clipFrame={clipFrame}
            matchData={matchData}
            frameData={frameData}
            matchEvents={matchEvents}
            annotationStore={annotationStore}
            onAnnotationUpdate={onAnnotationUpdate}
            annotationVersion={annotationVersion}
            highlightedEvent={hoveredInsightEvent}
          />
          {showLoading ? (
            <div className="plot-layout__loading" role="status" aria-live="polite">
              <span className="plot-layout__spinner" aria-hidden="true" />
              Loading frames...
            </div>
          ) : null}
          </div>
        </div>
      </div>

      <AnnotationTimeline
        annotationStore={annotationStore}
        clipFrame={clipFrame}
        clipRange={clipRange}
        sourceBounds={sourceBounds}
        annotationVersion={annotationVersion}
        onAnnotationUpdate={onAnnotationUpdate}
        timelineStore={timelineStore}
        matchEvents={matchEvents}
        matchData={matchData}
        onInsightEventHover={setHoveredInsightEvent}
      />
    </div>
  )
}

export default PlotLayoutComponent