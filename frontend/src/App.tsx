import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import TimelineStore from './services/TimelineStore'
import { APP_CONFIG, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import type { MatchData } from './types/MatchDataInterfaces';
import type { FrameData, Event } from './types/FrameDataInterfaces'
import type { KeyMomentsData } from './types/KeyMomentsDataInterfaces'
import MatchDetailsDisplay from './components/MatchDetailsDisplay'
import { StyleConfigProvider } from './context/StyleConfigContext'
import PlotLayoutComponent from './components/PlotLayoutComponent'
import MatchPicker from './components/MatchPicker'
import WorkspaceSidebar, { type SidebarPanel } from './components/WorkspaceSidebar'

type AppView = 'idle' | 'picker' | 'workspace'
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type OverlayKind = 'pass_option_prob' | 'pitch_control' 

type MatchSessionState = {
  match: {
    id: number | null
    metaStatus: LoadStatus
    keyMomentStatus: LoadStatus
  }
  playback: {
    currentFrame: number
    episodeRange: { start: number; end: number }
    isPlaying: boolean
    isFrameLoading: boolean
  }
  rawData: {
    loadedFrameRange: { start: number; end: number } | null
  }
  overlays: {
    active: OverlayKind[]
  }
  ui: {
    activeSidebarPanel: 'settings' | 'timeline' | 'search' | null
  }
}

type MatchSessionResources = {
  dataManager: DataManager
}

const DEFAULT_EPISODE_RANGE = { start: 10, end: 1000 }

const createInitialMatchSessionState = (): MatchSessionState => ({
  match: {
    id: null,
    metaStatus: 'idle',
    keyMomentStatus: 'idle',
  },
  playback: {
    currentFrame: DEFAULT_EPISODE_RANGE.start,
    episodeRange: DEFAULT_EPISODE_RANGE,
    isPlaying: false,
    isFrameLoading: false,
  },
  rawData: {
    loadedFrameRange: null,
  },
  overlays: {
    active: [],
  },
  ui: {
    activeSidebarPanel: null,
  },
})

function App({dataManager, annotationStore, timelineStore}: {dataManager: DataManager, annotationStore: AnnotationStore, timelineStore: TimelineStore}) {
  const [session, setSession] = useState<MatchSessionState>(createInitialMatchSessionState())
  const selectedMatchId = session.match.id
  const currentFrame = session.playback.currentFrame
  const episodeRange = session.playback.episodeRange
  const isPlaying = session.playback.isPlaying
  const isFetching = session.playback.isFrameLoading
  const activeSidebarPanel = session.ui.activeSidebarPanel
  const chunkRange = session.rawData.loadedFrameRange ?? { start: 0, end: 0 }
  // const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
  // const [chunkRange, setChunkRange] = useState({ start: 0, end: 0 })
  const [matchMetaData, setMatchMetaData] = useState<MatchData | null>(null)
  const [keyMomentsData, setKeyMomentsData] = useState<KeyMomentsData | null>(null)
  const [eventsData, setEventsData] = useState<Map<number, Event[]>>(new Map()) // State to hold events data
  // const [episodeRange, setEpisodeRange] = useState({ start: 10, end: 1000 })
  // const [currentFrame, setCurrentFrame] = useState(episodeRange.start)
  const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null)
  // const [isFetching, setIsFetching] = useState(false) // Track if data is being fetched
  const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false)
  // const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>(null)
  const [appView, setAppView] = useState<AppView>('idle')
  // const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)

  useEffect(() => {
    const root = document.documentElement

    Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
      root.style.setProperty(variable, value)
    })

    document.title = APP_CONFIG.brand.title
  }, [])


  useEffect(() => { // Fetch frame data when currentFrame changes
    if (selectedMatchId === null) return

    const fetchFrameData = async () => {
      // First, set the frameLoading flag to true to indicate that we're fetching data
      setSession((prev) => ({
        ...prev,
        playback: {
          ...prev.playback,
          isFrameLoading: true,
        },
      }))

      // Collect frame data from dataManager
      const result = await dataManager.getFrameData(currentFrame)

      if (result.frameData) {
        setCurrentFrameData(result.frameData)
      } else {
        console.warn(`No data available for frame ${currentFrame}`)
        setCurrentFrameData(null)
      }

      // If a new chunk was loaded, update the chunk range and fetch events for the new range
      if (result.didLoadChunk && result.newChunkRange) {
        setSession((prev) => ({
          ...prev,
          rawData: {
            ...prev.rawData,
            loadedFrameRange: result.newChunkRange,
          },
        }))
        setEventsData(dataManager.getEventData(result.newChunkRange?.start || 0, result.newChunkRange?.end || 0))
      }

      // Finally, set the frameLoading flag back to false
      setSession((prev) => ({
        ...prev,
        playback: {
          ...prev.playback,
          isFrameLoading: false,
        },
      }))
    }

    fetchFrameData()
  }, [currentFrame, selectedMatchId, dataManager])

  useEffect(() => { // Fetch match metadata when a match is selected
    if (selectedMatchId === null) return

    const fetchMatchMetaData = async () => {
      // First set the metaStatus to 'loading' to indicate that we're fetching data
      setSession((prev) => ({
        ...prev,
        match: {
          ...prev.match,
          metaStatus: 'loading',
        },
      }))

      // Collect match metadata from dataManager
      const data = await dataManager.fetchMatchMetaData()
      if (data) {
        setMatchMetaData(data)
        // After successfully fetching metadata, update the metaStatus to 'ready'
        setSession((prev) => ({
          ...prev,
          match: {
            ...prev.match,
            metaStatus: 'ready',
          },
        }))
      } else {
        console.warn('No match metadata available')
        // If fetching metadata fails, set the metaStatus to 'error'
        setSession((prev) => ({
          ...prev,
          match: {
            ...prev.match,
            metaStatus: 'error',
          },
        }))
      }
    }

    fetchMatchMetaData()
  }, [selectedMatchId])

  useEffect(() => {
    if (selectedMatchId === null) return

    const fetchKeyMomentsData = async () => {
      // First set the keyMomentStatus to 'loading' to indicate that we're fetching data
      setSession((prev) => ({
        ...prev,
        match: {
          ...prev.match,
          keyMomentStatus: 'loading',
        },
      }))

      // Collect key moments data from dataManager
      const data = await dataManager.fetchKeyMoments()
      if (data) {
        setKeyMomentsData(data)
        // After successfully fetching key moments, update the keyMomentStatus to 'ready'
        setSession((prev) => ({
          ...prev,
          match: {
            ...prev.match,
            keyMomentStatus: 'ready',
          },
        }))
      } else {
        console.warn('No key moments data available')
        // If fetching key moments fails, set the keyMomentStatus to 'error'
        setSession((prev) => ({
          ...prev,
          match: {
            ...prev.match,
            keyMomentStatus: 'error',
          },
        }))
      }
    }

    fetchKeyMomentsData()
  }, [selectedMatchId])

  useEffect(() => { // For playback control - auto-advance frames when isPlaying is true
    if (!isPlaying || isFetching) return

    const interval = setInterval(() => {
      setSession((prev) => ({
        ...prev,
        playback: {
          ...prev.playback,
          currentFrame: prev.playback.currentFrame >= prev.playback.episodeRange.end ? prev.playback.episodeRange.start : prev.playback.currentFrame + 1,
        },
      }))
    }, SLEEP_INTERVAL)

    return () => clearInterval(interval)
  }, [isPlaying, isFetching])

  const handlePlayPause = () => {
    setSession((prev) => ({
      ...prev,
      playback: {
        ...prev.playback,
        isPlaying: !prev.playback.isPlaying,
      },
    }))
  }

  const handleFrameChange = (frame: number) => {
    setSession((prev) => ({
      ...prev,
      playback: {
        ...prev.playback,
        currentFrame: frame,
        isPlaying: false, // Pause the animation when the user moves the slider
      },
    }))
  }

  const addCustomEpisodeRange = (start: number, end: number) => {
    setSession((prev) => ({
      ...prev,
      playback: {
        ...prev.playback,
        episodeRange: { start, end },
        currentFrame: start, // Reset to the start of the new range
        isPlaying: false, // Pause playback when a new range is added
      },
    }))
  }

  return (
    <StyleConfigProvider matchData={matchMetaData}>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-title-group">
            <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
          </div>
          <div className="navigation-bar">
            <button
              type="button"
              className={`app-header-action ${appView === 'picker' ? 'is-active' : ''}`}
              onClick={() => {
                setSession((prev) => ({
                  ...prev,
                  ui: {
                    ...prev.ui,
                    activeSidebarPanel: null, // Close any open sidebar panel when navigating back to picker
                  },
                }))
                setAppView('picker')
              }}
              aria-label="Choose game"
            >
              Choose Game
            </button>
          </div>
        </header>

        {appView === 'picker' ? (
          <div className="app-picker-shell">
            <MatchPicker
              onMatchSelected={(matchId) => {
                dataManager.setMatchId(matchId)
                setMatchMetaData(null)
                setKeyMomentsData(null)
                setEventsData(new Map())
                setCurrentFrameData(null)
                setSession({
                  ...createInitialMatchSessionState(),
                  match: {
                    id: matchId,
                    metaStatus: 'idle',
                    keyMomentStatus: 'idle',
                  },
                })
                setAppView('workspace')
              }}
            />
          </div>
        ) : null}

        {appView === 'workspace' ? (
          <div className="workspace-content">
            <MatchDetailsDisplay matchData={matchMetaData!} />

            <div className={`app-container app-container--active ${activeSidebarPanel !== null ? 'app-container--settings-open' : ''}`}>
              <WorkspaceSidebar
                activePanel={activeSidebarPanel}
                onActivePanelChange={(panel) => 
                  setSession((prev) => ({
                    ...prev,
                    ui: {
                      ...prev.ui,
                      activeSidebarPanel: panel, // Toggle panel visibility
                    }
                  }))
                }
                matchData={matchMetaData}
                timelineStore={timelineStore}
                episodeRange={episodeRange}
                onAddCustomEpisodeRange={addCustomEpisodeRange}
                keyMomentsData={keyMomentsData}
              />
              <div className="main-content">
                <div style={{ width: '100%' }}>
                  <PlotLayoutComponent
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    currentFrame={currentFrame}
                    onFrameChange={handleFrameChange}
                    episodeRange={episodeRange}
                    chunkRange={chunkRange}
                    matchData={matchMetaData}
                    frameData={currentFrameData}
                    eventsData={eventsData}
                    annotationStore={annotationStore}
                    timelineStore={timelineStore}
                    onAnnotationUpdate={() => setAnnotationUpdateEvent(!annotationUpdateEvent)}
                  />
                </div>
              </div>
              {/* <div className="right-panel">
                <AnnotationDisplay annotationStore={annotationStore} currentFrame={currentFrame} annotationUpdateEvent={annotationUpdateEvent} />
              </div> */}
            </div>
          </div>
        ) : null}
      </div>
    </StyleConfigProvider>
  )
}

export default App