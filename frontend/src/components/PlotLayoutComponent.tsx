import './PlotLayoutComponent.css'
import Controls from './Controls'
import PlotComponent from './PlotComponent'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FrameData, Event } from '../types/FrameDataInterfaces'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import EventDisplayComponent from './EventDisplayComponent'
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
  eventsData: Map<number, Event[]> | null
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
  eventsData,
  annotationStore,
  timelineStore,
  onAnnotationUpdate,
  annotationVersion,
}: PlotLayoutComponentProps) {
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
        <PlotComponent
          currentFrame={currentMatchFrame}
          clipFrame={clipFrame}
          matchData={matchData}
          frameData={frameData}
          annotationStore={annotationStore}
          onAnnotationUpdate={onAnnotationUpdate}
        />
      </div>

      <EventDisplayComponent
        eventsData={eventsData}
        clipRange={clipRange}
        segmentStart={segmentRange.start}
        clipFrame={clipFrame}
        matchData={matchData}
        timelineStore={timelineStore}
      />

      <AnnotationTimeline
        annotationStore={annotationStore}
        clipFrame={clipFrame}
        clipRange={clipRange}
        annotationVersion={annotationVersion}
      />
    </div>
  )
}

export default PlotLayoutComponent