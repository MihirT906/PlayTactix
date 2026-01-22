import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import PlotComponent from './components/PlotComponent'
import Controls from './components/Controls'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [chunkRange, setChunkRange] = useState({ start: 1, end: 10 }) // Define chunk range
  const [currentFrameData, setCurrentFrameData] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })

  const dataManager = new DataManager()

  // Fetch data for the current chunk range
  useEffect(() => {
    const fetchData = async () => {
      await dataManager.fetchChunk(chunkRange.start, chunkRange.end)
      const frameData = dataManager.getFrameData(currentFrame)
      console.log('Frame Data:', frameData) // Debugging
      setCurrentFrameData({
        x: frameData.map(point => point.x),
        y: frameData.map(point => point.y),
      })
    }

    fetchData()
  }, [chunkRange, currentFrame])

  // Animation timer: auto-increment frame every second when playing, loop back to 1 after frame 50
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const nextFrame = prev >= 50 ? 1 : prev + 1

        // Update chunk range if the next frame is outside the current chunk
        if (nextFrame < chunkRange.start || nextFrame > chunkRange.end) {
          const newStart = Math.floor((nextFrame - 1) / 10) * 10 + 1
          const newEnd = newStart + 9
          setChunkRange({ start: newStart, end: newEnd })
        }

        return nextFrame
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, chunkRange])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <>
      <h1>Frame {currentFrame} / 50</h1>
      <Controls isPlaying={isPlaying} onPlayPause={handlePlayPause} />
      <PlotComponent x={currentFrameData.x} y={currentFrameData.y} />
    </>
  )
}

export default App