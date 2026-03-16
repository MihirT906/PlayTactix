import React from 'react'
import './Controls.css' // Importing a CSS file for styling
import AnnotationStore from '../services/AnnotationStore-optimized'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  onFrameChange: (frame: number) => void
  chunkRange: { start: number; end: number } // Added chunk range prop
  annotationStore: AnnotationStore
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, currentFrame, onFrameChange, chunkRange, annotationStore }) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value, 10)
    onFrameChange(frame)
  }

  const handleSliderDragEnd = (event: React.MouseEvent<HTMLInputElement>) => {
    console.log('Slider changed, new frame:', event.currentTarget.value)
    annotationStore.reconstruct_active_annotations(parseInt(event.currentTarget.value, 10))
  }

  return (
    <div className="controls-container">
      <button className="play-pause-button" onClick={onPlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input
        className="frame-slider"
        type="range"
        min="1"
        max="50"
        value={currentFrame}
        onChange={handleSliderChange}
        onMouseUp={handleSliderDragEnd}
        style={{
          '--progress': `${((currentFrame - 1) / 49) * 100}%`,
          '--cache-progress': `${((chunkRange.end - 1) / 49) * 100}%`,
        } as React.CSSProperties}
      />
      <span className="frame-label">Frame: {currentFrame}</span>
    </div>
  )
}

export default Controls