import React from 'react'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  currentFrame: number
  onFrameChange: (frame: number) => void
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, currentFrame, onFrameChange }) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value, 10)
    onFrameChange(frame)
  }

  return (
    <div>
      <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
      <input
        type="range"
        min="1"
        max="50"
        value={currentFrame}
        onChange={handleSliderChange}
      />
      <span>Frame: {currentFrame}</span>
    </div>
  )
}

export default Controls