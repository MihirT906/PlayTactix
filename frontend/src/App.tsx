import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import PlotComponent from './components/PlotComponent'
import Controls from './components/Controls'
import { APP_CONFIG, CHUNK_SIZE, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import AnnotationDisplay from './components/AnnotationDisplay'
import { Link } from 'react-router-dom';
import type { MatchData } from './types/DataInterfaces';
import MatchDetailsDisplay from './components/MatchDetailsDisplay'

function App({dataManager, annotationStore}: {dataManager: DataManager, annotationStore: AnnotationStore}) {
  const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
  const [chunkRange, setChunkRange] = useState({ start: 10, end: 100 })
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [currentFrame, setCurrentFrame] = useState(10)
  const [currentFrameData, setCurrentFrameData] = useState<{ x: number[]; y: number[] } | null>(null)
  const [isFetching, setIsFetching] = useState(false) // Track if data is being fetched
  const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false)

  useEffect(() => {
    const root = document.documentElement

    Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
      root.style.setProperty(variable, value)
    })

    document.title = APP_CONFIG.brand.title
  }, [])


  useEffect(() => {
    const fetchFrameData = async () => {
      setIsFetching(true) // Set fetching flag to true
      const frameData = await dataManager.getFrameData(currentFrame)
      if (frameData) {
        setCurrentFrameData({ x: frameData.players.x, y: frameData.players.y })
      } else {
        console.warn(`No data available for frame ${currentFrame}`)
        setCurrentFrameData(null)
      }
      setIsFetching(false) // Set fetching flag to false
      const start = Math.floor((currentFrame - 1) / CHUNK_SIZE) * CHUNK_SIZE + 1;
      const end = start + CHUNK_SIZE - 1;
      console.log('Chunk range for current frame:', { start, end })
      setChunkRange({ start, end })
    }

    fetchFrameData()
  }, [currentFrame])

  useEffect(() => {
    const fetchMatchData = async () => {
      const data = await dataManager.fetchMatchMetaData()
      if (data) {
        setMatchData(data)
        console.log('Match metadata:', data)
      } else {
        console.warn('No match metadata available')
      }
    }

    fetchMatchData()
  }, [])

  useEffect(() => {
    if (!isPlaying || isFetching) return // Only proceed if not fetching
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev >= 500 ? 10 : prev + 1))
    }, SLEEP_INTERVAL)

    return () => clearInterval(interval)
  }, [isPlaying, isFetching])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame)
    setIsPlaying(false) // Pause the animation when the user moves the slider
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="home-icon">
          <span>🏠</span>
        </Link>
      </aside>
      <header className="app-header">
        <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
        <div className="frame-status">Frame {currentFrame} / 50</div>
      </header>
      
      <MatchDetailsDisplay matchData={matchData!} />

      <div className="app-container">
        <div className="main-content">
          <Controls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            currentFrame={currentFrame}
            frameRange={{ start: 10, end: 500 }} // Pass frame range
            onFrameChange={handleFrameChange}
            chunkRange={chunkRange} // Pass chunkRange to Controls
            annotationStore={annotationStore}
          />
          <PlotComponent currentFrame={currentFrame} x={currentFrameData? currentFrameData.x : []} y={currentFrameData? currentFrameData.y : []} annotationStore={annotationStore} onAnnotationUpdate={() => setAnnotationUpdateEvent(!annotationUpdateEvent)} />
        </div>
        <div className="right-panel">
          <AnnotationDisplay annotationStore={annotationStore} currentFrame={currentFrame} annotationUpdateEvent={annotationUpdateEvent} />
        </div>
      </div>
    </div>
  )
}

export default App