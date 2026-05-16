import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import { APP_CONFIG, CHUNK_SIZE, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import { data, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import type { MatchData } from './types/MatchDataInterfaces';
import type { FrameData, Event } from './types/FrameDataInterfaces'
import type { KeyMomentsData } from './types/KeyMomentsDataInterfaces'
import MatchDetailsDisplay from './components/MatchDetailsDisplay'
import { StyleConfigProvider } from './context/StyleConfigContext'
import PlotLayoutComponent from './components/PlotLayoutComponent'
import KeyMomentFinderComponent from './components/KeyMomentFinderComponent'
import EventDisplayComponent from './components/EventDisplayComponent'

type MainContentView = 'plot' | 'keyMoments'

function App({dataManager, annotationStore}: {dataManager: DataManager, annotationStore: AnnotationStore}) {
  const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
  const [chunkRange, setChunkRange] = useState({ start: 0, end: 0 })
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [keyMomentsData, setKeyMomentsData] = useState<KeyMomentsData | null>(null)
  const [eventsData, setEventsData] = useState<Map<number, Event[]>>(new Map()) // State to hold events data
  const [episodeRange, setEpisodeRange] = useState({ start: 10, end: 200 })
  const [currentFrame, setCurrentFrame] = useState(episodeRange.start)
  const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null)
  const [isFetching, setIsFetching] = useState(false) // Track if data is being fetched
  const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false)
  const [mainContentView, setMainContentView] = useState<MainContentView>('plot')

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
      const result = await dataManager.getFrameData(currentFrame)
      if (result.frameData) {
        // console.log(`Data for frame ${currentFrame}:`, result.frameData)
        setCurrentFrameData(result.frameData)
      } else {
        console.warn(`No data available for frame ${currentFrame}`)
        setCurrentFrameData(null)
      }

      if (result.didLoadChunk) {
        setChunkRange(result.newChunkRange || { start: 0, end: 0 })
        console.log('Updating chunk range in App component:', result.newChunkRange)
        setEventsData(dataManager.getEventData(episodeRange.start || 0, episodeRange.end || 0))
      }

      setIsFetching(false) // Set fetching flag to false
    }

    fetchFrameData()
    console.log("Events data in app", eventsData)
  }, [currentFrame])

  useEffect(() => {
    const fetchMatchData = async () => {
      const data = await dataManager.fetchMatchMetaData()
      if (data) {
        setMatchData(data)
      } else {
        console.warn('No match metadata available')
      }
    }

    fetchMatchData()
  }, [])

  useEffect(() => {
    const fetchKeyMomentsData = async () => {
      const data = await dataManager.fetchKeyMoments()
      if (data) {
        setKeyMomentsData(data)
      } else {
        console.warn('No key moments data available')
      }
    }

    fetchKeyMomentsData()
  }, [])

  useEffect(() => {
    if (!isPlaying || isFetching) return // Only proceed if not fetching
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev >= episodeRange.end ? episodeRange.start : prev + 1))
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

  const addCustomEpisodeRange = (start: number, end: number) => {
    setEpisodeRange({ start, end })
    setCurrentFrame(start) // Reset to the start of the new range
  }

  return (
    <StyleConfigProvider matchData={matchData}>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-title-group">
            <Link to="/" className="home-icon" aria-label="Go to home screen">
              <FaHome aria-hidden="true" />
            </Link>
            <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
          </div>
          {/* <div className="frame-status">Frame {currentFrame} / 50</div> */}
        </header>
        
        <MatchDetailsDisplay matchData={matchData!} />

        <div className="app-container">
          {/* <div className="left-panel">
            <Settings matchData={matchData!}/>
          </div> */}
          <div className="main-content">
            <div className="main-content-toggle" role="tablist" aria-label="Main content view switcher">
              <button
                type="button"
                className={`main-content-toggle-button ${mainContentView === 'plot' ? 'is-active' : ''}`}
                onClick={() => setMainContentView('plot')}
                aria-pressed={mainContentView === 'plot'}
              >
                Plot Layout
              </button>
              <button
                type="button"
                className={`main-content-toggle-button ${mainContentView === 'keyMoments' ? 'is-active' : ''}`}
                onClick={() => setMainContentView('keyMoments')}
                aria-pressed={mainContentView === 'keyMoments'}
              >
                Key Moment Finder
              </button>
            </div>
            {mainContentView === 'plot' ? (
              <div style={{ width: '100%' }}>
                <PlotLayoutComponent
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  currentFrame={currentFrame}
                  onFrameChange={handleFrameChange}
                  episodeRange={episodeRange}
                  chunkRange={chunkRange}
                  matchData={matchData}
                  frameData={currentFrameData}
                  eventsData={eventsData}
                  annotationStore={annotationStore}
                  onAnnotationUpdate={() => setAnnotationUpdateEvent(!annotationUpdateEvent)}
                />
              </div>
              
            ) : (
              <KeyMomentFinderComponent episodeRange={episodeRange} onAddCustomEpisodeRange={addCustomEpisodeRange} keyMomentsData={keyMomentsData} />
            )}
          </div>
          {/* <div className="right-panel">
            <AnnotationDisplay annotationStore={annotationStore} currentFrame={currentFrame} annotationUpdateEvent={annotationUpdateEvent} />
          </div> */}
        </div>
      </div>
    </StyleConfigProvider>
  )
}

export default App