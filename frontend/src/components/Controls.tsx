interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause }) => {
  return (
    <div>
      <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  )
}

export default Controls