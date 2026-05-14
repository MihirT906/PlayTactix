import Controls from './Controls'
import PlotComponent from './PlotComponent'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FrameData } from '../types/FrameDataInterfaces'
import type AnnotationStore from '../services/AnnotationStore-optimized'

type PlotLayoutComponentProps = {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  onFrameChange: (frame: number) => void
  episodeRange: { start: number; end: number }
  chunkRange: { start: number; end: number }
  matchData: MatchData | null
  frameData: FrameData | null
  annotationStore: AnnotationStore
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
  annotationStore,
  onAnnotationUpdate,
}: PlotLayoutComponentProps) {
  return (
    <>
      <Controls
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentFrame={currentFrame}
        episodeRange={episodeRange}
        onFrameChange={onFrameChange}
        chunkRange={chunkRange}
        annotationStore={annotationStore}
      />
      <PlotComponent
        currentFrame={currentFrame}
        matchData={matchData}
        frameData={frameData}
        annotationStore={annotationStore}
        onAnnotationUpdate={onAnnotationUpdate}
      />
    </>
  )
}

export default PlotLayoutComponent