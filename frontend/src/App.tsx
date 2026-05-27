import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import { APP_CONFIG, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import { Link } from 'react-router-dom';
import { FaCog, FaHome } from 'react-icons/fa';
import type { MatchData } from './types/MatchDataInterfaces';
import type { FrameData, Event } from './types/FrameDataInterfaces'
import type { KeyMomentsData } from './types/KeyMomentsDataInterfaces'
import MatchDetailsDisplay from './components/MatchDetailsDisplay'
import { StyleConfigProvider } from './context/StyleConfigContext'
import PlotLayoutComponent from './components/PlotLayoutComponent'
import KeyMomentFinderComponent from './components/KeyMomentFinderComponent'
import Settings from './components/Settings'
import MatchPicker from './components/MatchPicker'

type MainContentView = 'plot' | 'keyMoments'
type AppView = 'idle' | 'picker' | 'workspace'

function App({dataManager, annotationStore}: {dataManager: DataManager, annotationStore: AnnotationStore}) {
  const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
  const [chunkRange, setChunkRange] = useState({ start: 0, end: 0 })
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [keyMomentsData, setKeyMomentsData] = useState<KeyMomentsData | null>(null)
  const [eventsData, setEventsData] = useState<Map<number, Event[]>>(new Map()) // State to hold events data
  const [episodeRange, setEpisodeRange] = useState({ start: 10, end: 1000 })
  const [currentFrame, setCurrentFrame] = useState(episodeRange.start)
  const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null)
  const [isFetching, setIsFetching] = useState(false) // Track if data is being fetched
  const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false)
  const [mainContentView] = useState<MainContentView>('plot')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [appView, setAppView] = useState<AppView>('idle')
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)

  const isPickerView = appView === 'picker'
  const hasSelectedGame = appView === 'workspace'

  useEffect(() => {
    const root = document.documentElement

    Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
      root.style.setProperty(variable, value)
    })

    document.title = APP_CONFIG.brand.title
  }, [])


  useEffect(() => {
    if (selectedMatchId === null) return

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
        setEventsData(dataManager.getEventData(result.newChunkRange?.start || 0, result.newChunkRange?.end || 0))
      }

      setIsFetching(false) // Set fetching flag to false
    }

    fetchFrameData()
    console.log("Events data in app", eventsData)
  }, [currentFrame, selectedMatchId])

  useEffect(() => {
    if (selectedMatchId === null) return

    const fetchMatchData = async () => {
      const data = await dataManager.fetchMatchMetaData()
      if (data) {
        setMatchData(data)
      } else {
        console.warn('No match metadata available')
      }
    }

    fetchMatchData()
  }, [selectedMatchId])

  useEffect(() => {
    if (selectedMatchId === null) return

    const fetchKeyMomentsData = async () => {
      const data = await dataManager.fetchKeyMoments()
      if (data) {
        setKeyMomentsData(data)
      } else {
        console.warn('No key moments data available')
      }
    }

    fetchKeyMomentsData()
  }, [selectedMatchId])

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
          <div className="app-header-main">
            <div className="app-title-group">
            <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
            </div>
            <button
              type="button"
              className={`app-header-action ${isPickerView ? 'is-active' : ''}`}
              onClick={() => {
                setIsSettingsOpen(false)
                setAppView('picker')
              }}
              aria-label="Choose game"
            >
              Choose Game
            </button>
          </div>
          {/* <div className="frame-status">Frame {currentFrame} / 50</div> */}
        </header>

        {isPickerView ? (
          <div className="app-picker-shell">
            <MatchPicker
              onMatchSelected={(matchId) => {
                dataManager.setMatchId(matchId)
                setSelectedMatchId(matchId)
                setMatchData(null)
                setKeyMomentsData(null)
                setEventsData(new Map())
                setCurrentFrameData(null)
                setChunkRange({ start: 0, end: 0 })
                setEpisodeRange({ start: 10, end: 1000 })
                setCurrentFrame(10)
                setAppView('workspace')
              }}
            />
          </div>
        ) : null}

        {hasSelectedGame ? <MatchDetailsDisplay matchData={matchData!} /> : null}

        {hasSelectedGame ? (
        <div className={`app-container app-container--active ${isSettingsOpen ? 'app-container--settings-open' : ''}`}>
          <aside className={`left-panel settings-sidebar ${isSettingsOpen ? 'is-open' : ''}`} aria-label="Settings sidebar">
            <div className="settings-sidebar-rail">
              <div className="settings-sidebar-rail-header">
                <span className="settings-sidebar-rail-kicker">Navigation</span>
                <span className="settings-sidebar-rail-title">Workspace</span>
              </div>
              <nav className="settings-sidebar-nav" aria-label="Primary workspace actions">
                <Link to="/app" className="settings-sidebar-toggle" aria-label="Go to app home">
                  <FaHome aria-hidden="true" />
                  <span>Home</span>
                </Link>
                <button
                  type="button"
                  className={`settings-sidebar-toggle ${isSettingsOpen ? 'is-active' : ''}`}
                  onClick={() => setIsSettingsOpen((value) => !value)}
                  aria-expanded={isSettingsOpen}
                  aria-controls="settings-sidebar-panel"
                  aria-label={isSettingsOpen ? 'Close settings panel' : 'Open settings panel'}
                  disabled={!hasSelectedGame}
                >
                  <FaCog aria-hidden="true" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
            {hasSelectedGame && isSettingsOpen ? (
              <div id="settings-sidebar-panel" className="settings-sidebar-panel">
                <Settings matchData={matchData} />
              </div>
            ) : null}
          </aside>
          <div className="main-content">
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
        ) : null}
      </div>
    </StyleConfigProvider>
  )
}

export default App