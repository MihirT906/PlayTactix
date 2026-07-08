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
  currentMatchFrame: number
  clipFrame: number
  clipRange: { start: number; end: number }
  onClipFrameChange: (clipFrame: number) => void
  chunkRange: { start: number; end: number }
  episodeStart: number
  annotationStore: AnnotationStore
}

const formatSpeed = (speed: number) => {
  const formatted = Number.isInteger(speed) ? speed.toString() : speed.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${formatted}x`
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, playbackSpeed, onDoubleSpeed, onHalveSpeed, currentMatchFrame, clipFrame, clipRange, onClipFrameChange, chunkRange, episodeStart, annotationStore }) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value, 10)
    onClipFrameChange(frame)
  }

  const handleSliderDragEnd = (event: React.MouseEvent<HTMLInputElement>) => {
    const clipFrame = parseInt(event.currentTarget.value, 10)
    console.log('Slider changed, new clip frame:', clipFrame)
    annotationStore.reconstruct_active_annotations(clipFrame)
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
        <span className="frame-label">Match Frame: {currentMatchFrame} | Clip Frame: {clipFrame}</span>
      </div>
      <input
        className="frame-slider"
        type="range"
        min={clipRange.start}
        max={clipRange.end}
        value={clipFrame}
        onChange={handleSliderChange}
        onMouseUp={handleSliderDragEnd}
        style={{
          '--progress': `${((clipFrame - clipRange.start) / (clipRange.end - clipRange.start)) * 100}%`,
          '--cache-progress': `${(((chunkRange.end - episodeStart) - clipRange.start) / (clipRange.end - clipRange.start)) * 100}%`,
        } as React.CSSProperties}
      />
    </div>
  )
}

export default Controls