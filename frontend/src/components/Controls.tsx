import React from 'react'
import './Controls.css' // Importing a CSS file for styling
import AnnotationStore from '../services/AnnotationStore-optimized'
import { FaPlay, FaPause } from 'react-icons/fa'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  frameRange: { start: number; end: number }
  onFrameChange: (frame: number) => void
  chunkRange: { start: number; end: number } // Added chunk range prop
  annotationStore: AnnotationStore
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, currentFrame, frameRange, onFrameChange, chunkRange, annotationStore }) => {
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
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <input
        className="frame-slider"
        type="range"
        min={frameRange.start}
        max={frameRange.end}
        value={currentFrame}
        onChange={handleSliderChange}
        onMouseUp={handleSliderDragEnd}
        style={{
          '--progress': `${((currentFrame - frameRange.start) / (frameRange.end - frameRange.start)) * 100}%`,
          '--cache-progress': `${((chunkRange.end) / (frameRange.end - frameRange.start)) * 100}%`,
        } as React.CSSProperties}
      />
      <span className="frame-label">Frame: {currentFrame}</span>
    </div>
  )
}

export default Controls