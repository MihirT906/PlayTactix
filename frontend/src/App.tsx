import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import './App.css'
import PlotManager from './components/PlotManager'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [allData, setAllData] = useState<{ frame_num: number; x: number; y: number }[]>([])
  const [isPlaying, setIsPlaying] = useState(true)

  const plotManager = new PlotManager()

  // Fetch all frame data once
  useEffect(() => {
    const fetchAllFrames = async () => {
      try {
        const response = await fetch(`http://localhost:8000/data/frames`)
        const allFrameData = await response.json()
        setAllData(allFrameData)
      } catch (error) {
        console.error('Error fetching all frame data:', error)
      }
    }

    fetchAllFrames()
  }, [])

  // Filter data for the current frame
  const currentFrameData = allData.filter(point => point.frame_num === currentFrame)

  // Animation timer: auto-increment frame every second when playing, loop back to 1 after frame 50
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= 50) return 1
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying])

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