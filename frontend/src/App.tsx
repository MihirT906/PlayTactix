import { useCallback, useEffect, useState } from 'react'
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
import { MatchSessionProvider, useMatchSession } from './context/MatchSessionContext'
import type OverlayManager from './services/OverlayManager'


type AppView = 'idle' | 'picker' | 'workspace'
function App({
  dataManager,
  overlayManager,
  annotationStore,
  timelineStore,
}: {
  dataManager: DataManager
  overlayManager: OverlayManager
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
}) {
  return (
    <MatchSessionProvider dataManager={dataManager} overlayManager={overlayManager}>
      <AppContent
        annotationStore={annotationStore}
        timelineStore={timelineStore}
      />
    </MatchSessionProvider>
  )
}

function AppContent({
  annotationStore,
  timelineStore,
}: {
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
}) {
    const {
      session,
      resources,
      selectMatch,
      setCurrentFrame,
      advanceFrame,
      setEpisodeRange,
      togglePlayback,
      stopPlayback,
      doublePlaybackSpeed,
      halvePlaybackSpeed,
      setSidebarPanel,
      clearSidebarPanel,
      setActiveOverlay,
      setFrameLoading,
      setLoadedFrameRange,
      setMetaStatus,
      setKeyMomentStatus,
    } = useMatchSession()

    const dataManager = resources.dataManager
    const selectedMatchId = session.match.id
    const currentFrame = session.playback.currentFrame
    const episodeRange = session.playback.episodeRange
    const isPlaying = session.playback.isPlaying
    const playbackSpeed = session.playback.playbackSpeed
    const isFetching = session.playback.isFrameLoading
    const activeSidebarPanel = session.ui.activeSidebarPanel
    const chunkRange = session.rawData.loadedFrameRange ?? { start: 0, end: 0 }
    const metaStatus = session.match.metaStatus

    const [matchMetaData, setMatchMetaData] = useState<MatchData | null>(null)
    const [keyMomentsData, setKeyMomentsData] = useState<KeyMomentsData | null>(null)
    const [eventsData, setEventsData] = useState<Map<number, Event[]>>(new Map()) // State to hold events data
    const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null)
    const [annotationVersion, setAnnotationVersion] = useState(0)
    const handleAnnotationUpdate = useCallback(() => setAnnotationVersion((version) => version + 1), [])
    const [appView, setAppView] = useState<AppView>('idle')

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
        setFrameLoading(true)

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
          setLoadedFrameRange(result.newChunkRange)
          setEventsData(dataManager.getEventData(result.newChunkRange?.start || 0, result.newChunkRange?.end || 0))
        }

        // Finally, set the frameLoading flag back to false
        setFrameLoading(false)
      }

      fetchFrameData()
    }, [currentFrame, selectedMatchId, dataManager])

    useEffect(() => { // Fetch match metadata when a match is selected
      if (selectedMatchId === null) return

      const fetchMatchMetaData = async () => {
        // First set the metaStatus to 'loading' to indicate that we're fetching data
        setMetaStatus('loading')

        // Collect match metadata from dataManager
        const data = await dataManager.fetchMatchMetaData()
        if (data) {
          setMatchMetaData(data)
          // After successfully fetching metadata, update the metaStatus to 'ready'
          setMetaStatus('ready')
        } else {
          console.warn('No match metadata available')
          // If fetching metadata fails, set the metaStatus to 'error'
          setMetaStatus('error')
        }
      }

      fetchMatchMetaData()
    }, [selectedMatchId])

    useEffect(() => {
      if (selectedMatchId === null) return

      const fetchKeyMomentsData = async () => {
        // First set the keyMomentStatus to 'loading' to indicate that we're fetching data
        setKeyMomentStatus('loading')

        // Collect key moments data from dataManager
        const data = await dataManager.fetchKeyMoments()
        if (data) {
          setKeyMomentsData(data)
          // After successfully fetching key moments, update the keyMomentStatus to 'ready'
          setKeyMomentStatus('ready')
        } else {
          console.warn('No key moments data available')
          // If fetching key moments fails, set the keyMomentStatus to 'error'
          setKeyMomentStatus('error')
        }
      }

      fetchKeyMomentsData()
    }, [selectedMatchId])

    useEffect(() => { // For playback control - auto-advance frames when isPlaying is true
      if (!isPlaying || isFetching) return

      const interval = setInterval(() => {
        advanceFrame()
      }, SLEEP_INTERVAL / playbackSpeed)

      return () => clearInterval(interval)
    }, [isPlaying, isFetching, playbackSpeed])

    const handlePlayPause = () => {
      togglePlayback()
    }

    const handleFrameChange = (frame: number) => {
      setCurrentFrame(frame)
      stopPlayback() // Pause playback when user manually changes frame
    }

    const addCustomEpisodeRange = (start: number, end: number) => {
      setEpisodeRange(start, end)
      setCurrentFrame(start) // Reset to the start of the new range
      stopPlayback() // Pause playback when a new range is added
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
                    clearSidebarPanel()
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
                  setMatchMetaData(null)
                  setKeyMomentsData(null)
                  setEventsData(new Map())
                  setCurrentFrameData(null)
                  selectMatch(matchId)
                  setAppView('workspace')
                }}
              />
            </div>
          ) : null}

          {appView === 'workspace' ? (
            <div className="workspace-content">
              {metaStatus === 'loading' ? (
                <div className="match-info-loading">Loading match metadata...</div>
              ) : metaStatus === 'error' ? (
                <div className="match-info-error">Failed to load match metadata.</div>
              ) : (
                <MatchDetailsDisplay matchData={matchMetaData} />
              )}

              <div className={`app-container app-container--active ${activeSidebarPanel !== null ? 'app-container--settings-open' : ''}`}>
                <WorkspaceSidebar
                  activePanel={activeSidebarPanel}
                  onActivePanelChange={(panel) => 
                    setSidebarPanel(panel)
                  }
                  matchData={matchMetaData}
                  timelineStore={timelineStore}
                  episodeRange={episodeRange}
                  onAddCustomEpisodeRange={addCustomEpisodeRange}
                  keyMomentsData={keyMomentsData}
                  annotationStore={annotationStore}
                  onAnnotationUpdate={handleAnnotationUpdate}
                />
                <div className="main-content">
                  <div style={{ width: '100%' }}>
                    <PlotLayoutComponent
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      playbackSpeed={playbackSpeed}
                      onDoubleSpeed={doublePlaybackSpeed}
                      onHalveSpeed={halvePlaybackSpeed}
                      currentFrame={currentFrame}
                      onFrameChange={handleFrameChange}
                      episodeRange={episodeRange}
                      chunkRange={chunkRange}
                      matchData={matchMetaData}
                      frameData={currentFrameData}
                      eventsData={eventsData}
                      annotationStore={annotationStore}
                      timelineStore={timelineStore}
                      onAnnotationUpdate={handleAnnotationUpdate}
                      annotationVersion={annotationVersion}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </StyleConfigProvider>
    )
  }

export default App