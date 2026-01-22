import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import PlotComponent from './components/PlotComponent'
import Controls from './components/Controls'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentFrameData, setCurrentFrameData] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })

  const chunkSize = 10 // Fixed chunk size
  const dataManager = new DataManager()

  // Fetch data for the current chunk range
  useEffect(() => {
    const fetchData = async () => {
      const start = Math.floor((currentFrame - 1) / chunkSize) * chunkSize + 1
      const end = start + chunkSize - 1

      await dataManager.fetchChunk(start, end)
      const frameData = dataManager.getFrameData(currentFrame)
      setCurrentFrameData({
        x: frameData.map(point => point.x),
        y: frameData.map(point => point.y),
      })
    }

    fetchData()
  }, [currentFrame])

  // Animation timer: auto-increment frame every second when playing, loop back to 1 after frame 50
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev >= 50 ? 1 : prev + 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame)
    setIsPlaying(false) // Pause the animation when the user moves the slider
  }

  return (
    <>
      <h1>Frame {currentFrame} / 50</h1>
      <Controls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        currentFrame={currentFrame}
        onFrameChange={handleFrameChange}
      />
      <PlotComponent x={currentFrameData.x} y={currentFrameData.y} />
    </>
  )
}

export default App