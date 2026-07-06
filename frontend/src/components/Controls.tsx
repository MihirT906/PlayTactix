import React from 'react'
import './Controls.css'
import AnnotationStore from '../services/AnnotationStore-optimized'
import { FaPlay, FaPause, FaForward, FaBackward } from 'react-icons/fa'
import { RiSlowDownLine, RiSpeedUpLine } from "react-icons/ri";

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  playbackSpeed: number
  onDoubleSpeed: () => void
  onHalveSpeed: () => void
  currentFrame: number
  episodeRange: { start: number; end: number }
  onFrameChange: (frame: number) => void
  chunkRange: { start: number; end: number }
  annotationStore: AnnotationStore
}

const formatSpeed = (speed: number) => {
  const formatted = Number.isInteger(speed) ? speed.toString() : speed.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${formatted}x`
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, playbackSpeed, onDoubleSpeed, onHalveSpeed, currentFrame, episodeRange, onFrameChange, chunkRange, annotationStore }) => {
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
        <div className="playback-speed-group">
          <button className="app-header-action speed-button" onClick={onHalveSpeed} title="Halve speed">
            <RiSlowDownLine />
            <span className="speed-button-label">0.5x</span>
          </button>
          <div className="play-pause-wrapper">
            <span className="speed-label">{formatSpeed(playbackSpeed)}</span>
            <button className="app-header-action play-pause-button" onClick={onPlayPause}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
          </div>
          <button className="app-header-action speed-button" onClick={onDoubleSpeed} title="Double speed">
            <RiSpeedUpLine />
            <span className="speed-button-label">2x</span>
          </button>
        </div>
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