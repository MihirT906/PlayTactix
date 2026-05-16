import React from 'react'
import './Controls.css' // Importing a CSS file for styling
import AnnotationStore from '../services/AnnotationStore-optimized'
import { FaPlay, FaPause } from 'react-icons/fa'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  episodeRange: { start: number; end: number }
  onFrameChange: (frame: number) => void
  chunkRange: { start: number; end: number } // Added chunk range prop
  annotationStore: AnnotationStore
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, currentFrame, episodeRange, onFrameChange, chunkRange, annotationStore }) => {
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
      <div className="controls-toolbar">
        <button className="play-pause-button" onClick={onPlayPause}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <span className="frame-label">Frame: {currentFrame}</span>
      </div>
      <input
        className="frame-slider"
        type="range"
        min={episodeRange.start}
        max={episodeRange.end}
        value={currentFrame}
        onChange={handleSliderChange}
        onMouseUp={handleSliderDragEnd}
        style={{
          '--progress': `${((currentFrame - episodeRange.start) / (episodeRange.end - episodeRange.start)) * 100}%`,
          '--cache-progress': `${((chunkRange.end - episodeRange.start) / (episodeRange.end - episodeRange.start)) * 100}%`,
        } as React.CSSProperties}
      />
    </div>
  )
}

export default Controls