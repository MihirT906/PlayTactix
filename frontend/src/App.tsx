import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import './App.css'
import PlotManager from './components/PlotManager'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [chunkData, setChunkData] = useState<{ frame_num: number; x: number; y: number }[]>([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [chunkRange, setChunkRange] = useState({ start: 1, end: 10 }) // Define chunk range

  const plotManager = new PlotManager()

  // Fetch data for the current chunk range
  useEffect(() => {
    const fetchChunkData = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/data/frames?start=${chunkRange.start}&end=${chunkRange.end}`
        )
        const frameData = await response.json()
        setChunkData(frameData)
      } catch (error) {
        console.error('Error fetching chunk data:', error)
      }
    }

    fetchChunkData()
  }, [chunkRange]) // Refetch data when chunk range changes

  // Filter data for the current frame
  const currentFrameData = chunkData.filter(point => point.frame_num === currentFrame)

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

  const handlePlotClick = (event: any) => {
    if (event.points && event.points.length > 0) {
      const point = event.points[0]
      console.log('Clicked point:', { x: point.x, y: point.y })
    }
  }

  return (
    <>
      <h1>Frame {currentFrame} / 50</h1>
      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={() => plotManager.clearShapes()}>Clear Lines</button>
      <Plot
        data={[
          {
            x: currentFrameData.map(point => point.x),
            y: currentFrameData.map(point => point.y),
            mode: 'markers',
            type: 'scatter',
            marker: { size: 10 },
          },
        ]}
        layout={plotManager.getLayout()}
        config={plotManager.getConfig()}
        onClick={handlePlotClick}
        onRelayout={(e: any) => {
          if (e.shapes) {
            plotManager.updateShapes(e.shapes)
          }
        }}
      />
    </>
  )
}

export default App