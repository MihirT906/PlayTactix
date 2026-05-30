import './PlotLayoutComponent.css'
import Controls from './Controls'
import PlotComponent from './PlotComponent'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FrameData, Event } from '../types/FrameDataInterfaces'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import EventDisplayComponent from './EventDisplayComponent'

type PlotLayoutComponentProps = {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  onFrameChange: (frame: number) => void
  episodeRange: { start: number; end: number }
  chunkRange: { start: number; end: number }
  matchData: MatchData | null
  frameData: FrameData | null
  eventsData: Map<number, Event[]> | null
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
  onAnnotationUpdate: () => void
}

function PlotLayoutComponent({
  isPlaying,
  onPlayPause,
  currentFrame,
  onFrameChange,
  episodeRange,
  chunkRange,
  matchData,
  frameData,
  eventsData,
  annotationStore,
  timelineStore,
  onAnnotationUpdate,
}: PlotLayoutComponentProps) {
  return (
    <div className="plot-layout">
      <Controls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentFrame={currentFrame}
        episodeRange={episodeRange}
        onFrameChange={onFrameChange}
        chunkRange={chunkRange}
        annotationStore={annotationStore}
      />
      <div className="plot-layout__plot">
        <PlotComponent
          currentFrame={currentFrame}
          matchData={matchData}
          frameData={frameData}
          annotationStore={annotationStore}
          onAnnotationUpdate={onAnnotationUpdate}
        />
      </div>

      <EventDisplayComponent
        eventsData={eventsData}
        scaleStart={episodeRange.start}
        scaleEnd={episodeRange.end}
        currentFrame={currentFrame}
        matchData={matchData}
        timelineStore={timelineStore}
      />
    </div>
  )
}

export default PlotLayoutComponent