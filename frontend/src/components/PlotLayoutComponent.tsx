import { useMemo, useState } from 'react'
import './PlotLayoutComponent.css'
import Controls from './Controls'
import PlotComponent from './PlotComponent'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FrameData, Event } from '../types/FrameDataInterfaces'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import AnnotationTimeline from './annotation-timeline'

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
  chunkRange: { start: number; end: number }
  missingFrameRanges: { start: number; end: number }[]
  matchData: MatchData | null
  frameData: FrameData | null
  matchEvents: Event[] | null
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
  onAnnotationUpdate: () => void
  annotationVersion: number
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
  chunkRange,
  missingFrameRanges,
  matchData,
  frameData,
  matchEvents,
  annotationStore,
  timelineStore,
  onAnnotationUpdate,
  annotationVersion,
}: PlotLayoutComponentProps) {
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
        chunkRange={chunkRange}
        segmentStart={segmentRange.start}
        missingRanges={missingFrameRanges}
        annotationStore={annotationStore}
      />
      <div className="plot-layout__plot">
        <div className="plot-layout__stage">
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