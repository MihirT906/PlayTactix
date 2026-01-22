import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import './App.css'
import PlotManager from './components/PlotManager'

function App() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [data, setData] = useState([])
  const [isPlaying, setIsPlaying] = useState(true)

  const plotManager = new PlotManager()

  // Fetch and update player positions when frame number changes
  useEffect(() => {
    const fetchFrame = async () => {
      try {
        const response = await fetch(`http://localhost:8000/data/frame/${currentFrame}`)
        const frameData = await response.json()
        setData(frameData)
      } catch (error) {
        console.error(`Error fetching frame ${currentFrame}:`, error)
      }
    }

    fetchFrame()
  }, [currentFrame])

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
            x: data.map(point => point.x),
            y: data.map(point => point.y),
            mode: 'markers',
            type: 'scatter',
            marker: { size: 10 },
          },
        ]}
        layout={plotManager.getLayout(currentFrame)}
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