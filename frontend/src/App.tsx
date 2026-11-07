import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { FaExternalLinkAlt } from 'react-icons/fa'
import { Link, Navigate, Route, Routes, matchPath, useBlocker, useMatch, useNavigate } from 'react-router-dom'
import './App.css'
import DataManager from './services/DataManager'
import MatchDataManager from './services/MatchDataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import TimelineStore from './services/TimelineStore'
import LandingPage from './pages/Landing/LandingPage'
import DocsPage from './pages/Docs/DocsPage'
import { APP_CONFIG, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import type { MatchData } from './types/MatchDataInterfaces';
import type { FrameData } from './types/FrameDataInterfaces'
import type { KeyMomentsData } from './types/KeyMomentsDataInterfaces'
import MatchDetailsDisplay from './components/MatchDetailsDisplay'
import MatchIsland from './components/MatchIsland'
import { StyleConfigProvider, useStyleConfig } from './context/StyleConfigContext'
import PlotLayoutComponent from './components/PlotLayoutComponent'
import MatchPicker from './components/MatchPicker'
import ProjectControls from './components/ProjectControls'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import BrandTitle from './components/brand/BrandTitle'
import ChoiceDialog from './components/ChoiceDialog'
import { hasPlaceholder, isPlaceholderUntouched } from './services/clipManager'
import { MatchSessionProvider, useMatchSession } from './context/MatchSessionContext'
import { workFingerprint, type LiveStyle } from './services/projectSerializer'

const DISCARD_WORK_MESSAGE = 'Your project has changes you have not saved. Discard them?'

const ROUTES = {
  landing: '/',
  picker: '/matches',
  workspace: '/matches/:matchId',
  docs: '/docs',
  docsPage: '/docs/:slug',
  developerDocs: '/docs/developers',
  developerDocsPage: '/docs/developers/:slug',
} as const

const workspacePath = (matchId: number) => `/matches/${matchId}`

// The match a workspace path names, or null when the path is not a workspace or its id is not a match id.
const parseMatchId = (raw: string | undefined) => {
  const matchId = Number(raw)
  return Number.isInteger(matchId) && matchId >= 0 ? matchId : null
}

// AppContent renders the style provider, so it can't read the style itself; this keeps a copy where it can.
function StyleReporter({ styleRef }: { styleRef: RefObject<LiveStyle | null> }) {
  const style = useStyleConfig()
  useEffect(() => {
    styleRef.current = style
  })
  return null
}

function App({
  dataManager,
  annotationStore,
  timelineStore,
}: {
  dataManager: DataManager
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
}) {
  return (
    <MatchSessionProvider dataManager={dataManager}>
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
      setCurrentClipFrame,
      advanceFrame,
      appendSegment,
      togglePlayback,
      stopPlayback,
      setPlaybackSpeed,
      setSidebarPanel,
      clearSidebarPanel,
      setFrameLoading,
      setLoadedFrameRanges,
      setMetaStatus,
      setKeyMomentStatus,
    } = useMatchSession()

    const dataManager = resources.dataManager
    const selectedMatchId = session.match.id
    const currentMatchFrame = session.playback.currentMatchFrame
    const clipFrame = session.playback.currentClipFrame
    const clip = session.playback.clip
    const clipRange = { start: 0, end: clip.length }
    const segment = clip.matchSegments[0] ?? null
    const segmentRange = segment
      ? { start: segment.sourceFrameStart, end: segment.sourceFrameEnd }
      : { start: 0, end: 0 }
    const isPlaying = session.playback.isPlaying
    const playbackSpeed = session.playback.playbackSpeed
    const isFetching = session.playback.isFrameLoading
    const activeSidebarPanel = session.ui.activeSidebarPanel
    const loadedFrameRanges = session.rawData.loadedFrameRanges
    const metaStatus = session.match.metaStatus

    const [matchMetaData, setMatchMetaData] = useState<MatchData | null>(null)
    const [keyMomentsData, setKeyMomentsData] = useState<KeyMomentsData | null>(null)
    const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null)
    const [missingFrameRanges, setMissingFrameRanges] = useState<{ start: number; end: number }[]>([])
    const [annotationVersion, setAnnotationVersion] = useState(0)
    const handleAnnotationUpdate = useCallback(() => setAnnotationVersion((version) => version + 1), [])
    // Held in state (not refs) so the match island re-observes them as they mount and unmount.
    const [matchCardElement, setMatchCardElement] = useState<HTMLDivElement | null>(null)
    const [controlsElement, setControlsElement] = useState<HTMLDivElement | null>(null)

    const navigate = useNavigate()
    const isPickerRoute = useMatch(ROUTES.picker) !== null
    // The splat also matches /docs itself, so the Docs button stays active on the docs home and every page.
    const isDocsRoute = useMatch(`${ROUTES.docs}/*`) !== null
    const workspaceRoute = useMatch(ROUTES.workspace)
    const urlMatchId = workspaceRoute ? parseMatchId(workspaceRoute.params.matchId) : null
    // Set when the match a workspace URL names could not be downloaded.
    const [urlMatchError, setUrlMatchError] = useState<number | null>(null)

    // The work as it was last saved, loaded or freshly opened; anything different is unsaved.
    // Recorded in an effect so it reads the session after the change that made it clean has rendered.
    const savedWorkRef = useRef<string | null>(null)
    const styleRef = useRef<LiveStyle | null>(null)
    const currentWork = () =>
      styleRef.current &&
      workFingerprint({ session, style: styleRef.current, matchData: matchMetaData, annotationStore, timelineStore })
    const [savedWorkRequest, setSavedWorkRequest] = useState(0)
    const markWorkSaved = useCallback(() => setSavedWorkRequest((request) => request + 1), [])
    // Mirrored in state as well, so the Save button re-renders to show whether there are unsaved changes.
    const [savedWork, setSavedWork] = useState<string | null>(null)
    useEffect(() => {
      if (savedWorkRequest === 0) return
      savedWorkRef.current = currentWork()
      setSavedWork(savedWorkRef.current)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedWorkRequest])

    const hasUnsavedWork = () =>
      selectedMatchId !== null && savedWorkRef.current !== currentWork()
    const confirmDiscardWork = () => !hasUnsavedWork() || window.confirm(DISCARD_WORK_MESSAGE)

    // Warn before a refresh or closed tab throws the clip away.
    const hasUnsavedWorkRef = useRef(hasUnsavedWork)
    hasUnsavedWorkRef.current = hasUnsavedWork
    useEffect(() => {
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (!hasUnsavedWorkRef.current()) return
        event.preventDefault()
        event.returnValue = ''
      }
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])

    // Back/Forward onto another match's workspace would replace the clip, so ask first. In-app links
    // that switch matches (the picker, loading a project) already ask before they navigate.
    const blocker = useBlocker(({ nextLocation, historyAction }) => {
      if (historyAction !== 'POP') return false
      const next = matchPath(ROUTES.workspace, nextLocation.pathname)
      return next !== null && parseMatchId(next.params.matchId) !== selectedMatchId && hasUnsavedWork()
    })
    useEffect(() => {
      if (blocker.state !== 'blocked') return
      if (window.confirm(DISCARD_WORK_MESSAGE)) blocker.proceed()
      else blocker.reset()
    }, [blocker])

    // Clears everything that belongs to the open match before a different one loads, including the
    // annotations and insights tracks, which would otherwise carry over onto the new match.
    const resetMatchData = () => {
      setMatchMetaData(null)
      setKeyMomentsData(null)
      setCurrentFrameData(null)
      annotationStore.clear()
      timelineStore.reset()
      handleAnnotationUpdate()
      markWorkSaved()
    }

    // A workspace URL for a match that is not open (a refresh, a shared link, Back/Forward) downloads
    // and opens that match. Picking a match in the app opens it before navigating, so this does nothing then.
    useEffect(() => {
      if (urlMatchId === null || urlMatchId === selectedMatchId) return
      // Set by the cleanup when the URL moves on, so a slow download does not open a match no longer asked for.
      let cancelled = false
      setUrlMatchError(null)

      new MatchDataManager().downloadMatchData(urlMatchId)
        .then(() => {
          if (cancelled) return
          resetMatchData()
          selectMatch(urlMatchId)
        })
        .catch(() => {
          if (!cancelled) setUrlMatchError(urlMatchId)
        })
      return () => {
        cancelled = true
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlMatchId, selectedMatchId])

    useEffect(() => {
      const root = document.documentElement

      Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
        root.style.setProperty(variable, value)
      })

      document.title = APP_CONFIG.brand.title
    }, [])


    useEffect(() => { // Every chunk that lands, prefetched or fetched for the playhead, updates the slider's cached bands and refreshes the missing-frame gaps
      dataManager.setLoadedRangesListener(setLoadedFrameRanges)
      return () => dataManager.setLoadedRangesListener(null)
    }, [dataManager, setLoadedFrameRanges])

    useEffect(() => { // Fetch frame data when currentMatchFrame changes
      if (selectedMatchId === null) {
        // A fetch cancelled by closing the match would otherwise leave the flag set.
        if (session.playback.isFrameLoading) setFrameLoading(false)
        return
      }
      // A loaded frame (the usual case once the prefetch is ahead) shows straight away. Only a frame that
      // has to be fetched raises the loading flag, which pauses playback until it arrives.
      const loadedFrame = dataManager.getLoadedFrame(currentMatchFrame)
      if (loadedFrame) {
        setCurrentFrameData(loadedFrame)
        setFrameLoading(false)
        return
      }
      // Set by the cleanup when the frame moves on, so a slow fetch for an earlier frame neither shows
      // its frame nor clears the loading flag while the current frame is still loading.
      let cancelled = false

      const fetchFrameData = async () => {
        // First, set the frameLoading flag to true to indicate that we're fetching data
        setFrameLoading(true)

        // Collect frame data from dataManager
        const result = await dataManager.getFrameData(currentMatchFrame)
        if (cancelled) return

        if (result.frameData) {
          setCurrentFrameData(result.frameData)
        } else {
          console.warn(`No data available for frame ${currentMatchFrame}`)
          setCurrentFrameData(null)
        }

        // Finally, set the frameLoading flag back to false
        setFrameLoading(false)
      }

      fetchFrameData()
      return () => {
        cancelled = true
      }
    }, [currentMatchFrame, selectedMatchId, dataManager])

    useEffect(() => { // Recompute known-missing frame ranges (mapped to clip coordinates) whenever more data loads
      if (selectedMatchId === null || !segment) {
        // Keeps the same empty list, so this does not re-render (and re-run) when nothing changed.
        setMissingFrameRanges((current) => (current.length === 0 ? current : []))
        return
      }

      const ranges = dataManager.getMissingFrameRanges(segment.sourceFrameStart, segment.sourceFrameEnd)
      const clipRanges = ranges.map((range) => ({
        start: range.start - segment.sourceFrameStart + segment.clipStart,
        end: range.end - segment.sourceFrameStart + segment.clipStart,
      }))
      setMissingFrameRanges(clipRanges)
      // loadedFrameRanges is replaced each time a chunk lands, so it marks when more data has loaded.
    }, [loadedFrameRanges, segment?.sourceFrameStart, segment?.sourceFrameEnd, segment?.clipStart, selectedMatchId, dataManager])

    useEffect(() => { // Fetch match metadata when a match is selected
      if (selectedMatchId === null) return
      // Set by the cleanup when the match changes, so a slow response for the old match is dropped.
      let cancelled = false

      const fetchMatchMetaData = async () => {
        // First set the metaStatus to 'loading' to indicate that we're fetching data
        setMetaStatus('loading')

        // Collect match metadata from dataManager
        const data = await dataManager.fetchMatchMetaData()
        if (cancelled) return
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
      return () => {
        cancelled = true
      }
    }, [selectedMatchId])

    useEffect(() => {
      if (selectedMatchId === null) return
      // Set by the cleanup when the match changes, so a slow response for the old match is dropped.
      let cancelled = false

      const fetchKeyMomentsData = async () => {
        // First set the keyMomentStatus to 'loading' to indicate that we're fetching data
        setKeyMomentStatus('loading')

        // Collect key moments data from dataManager
        const data = await dataManager.fetchKeyMoments()
        if (cancelled) return
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
      return () => {
        cancelled = true
      }
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

    const handleClipFrameChange = (clipFrame: number) => {
      setCurrentClipFrame(clipFrame)
      stopPlayback() // Pause playback when user manually changes frame
    }

    // Starting afresh drops the placeholder a match opens with, and with it the drawings made on it.
    // Keeping it turns it into an ordinary segment, and the new one goes after it.
    const addSegment = (start: number, end: number, keepPlaceholder: boolean) => {
      if (!keepPlaceholder && hasPlaceholder(clip)) {
        annotationStore.clear()
        handleAnnotationUpdate()
      }
      appendSegment(start, end, keepPlaceholder)
      stopPlayback() // Pause playback when a new segment is added
    }

    // A segment waiting on the user to say what happens to the placeholder they have worked on.
    const [pendingSegment, setPendingSegment] = useState<{ start: number; end: number } | null>(null)

    const handleAddSegment = (start: number, end: number) => {
      const placeholderEdited =
        hasPlaceholder(clip) && (!isPlaceholderUntouched(clip) || annotationStore.getAllAnnotations().length > 0)
      if (placeholderEdited) {
        setPendingSegment({ start, end })
        return
      }
      addSegment(start, end, false)
    }

    const resolvePendingSegment = (keepPlaceholder: boolean) => {
      if (pendingSegment) addSegment(pendingSegment.start, pendingSegment.end, keepPlaceholder)
      setPendingSegment(null)
    }

    const openMatchPicker = () => {
      clearSidebarPanel()
      navigate(ROUTES.picker)
    }

    const openWorkspace = (matchId: number) => {
      clearSidebarPanel()
      navigate(workspacePath(matchId))
    }

    return (
      <StyleConfigProvider matchData={matchMetaData}>
        <StyleReporter styleRef={styleRef} />
        <div className="app-shell">
          <header className="app-header">
            <div className="app-title-group">
              <h1 className="app-title">
                <Link to={ROUTES.landing} className="app-title-link" onClick={clearSidebarPanel}>
                  <BrandTitle title={APP_CONFIG.brand.title} />
                </Link>
              </h1>
            </div>
            {/* Places to go next to the brand; things to do with a project, then help, at the far end. */}
            <nav className="navigation-bar" aria-label="Main">
              <button
                type="button"
                className={`app-header-action ${isPickerRoute ? 'is-active' : ''}`}
                onClick={openMatchPicker}
                aria-label="Choose match"
              >
                Choose Match
              </button>
              {isPickerRoute && selectedMatchId !== null ? (
                <button
                  type="button"
                  className="app-header-action"
                  onClick={() => openWorkspace(selectedMatchId)}
                  aria-label="Back to workspace"
                >
                  Back to Workspace
                </button>
              ) : null}
            </nav>
            <div className="app-header-actions">
              <ProjectControls
                annotationStore={annotationStore}
                timelineStore={timelineStore}
                keyMomentsData={keyMomentsData}
                matchData={matchMetaData}
                showSave={urlMatchId !== null && urlMatchId === selectedMatchId}
                onResetMatchData={resetMatchData}
                onOpenWorkspace={openWorkspace}
                onProjectApplied={() => {
                  handleAnnotationUpdate()
                  markWorkSaved()
                }}
                onProjectSaved={markWorkSaved}
                confirmDiscardWork={confirmDiscardWork}
                savedWork={selectedMatchId === null ? null : savedWork}
                annotationVersion={annotationVersion}
              />
              <span className="app-header-divider" aria-hidden="true" />
              <button
                type="button"
                className={`app-header-action app-header-docs ${isDocsRoute ? 'is-active' : ''}`}
                onClick={() => window.open(ROUTES.docs, '_blank', 'noopener')}
                aria-label="Docs (opens in a new tab)"
                title="Opens in a new tab"
              >
                Docs
                <FaExternalLinkAlt aria-hidden="true" />
              </button>
            </div>
          </header>

          <Routes>
          <Route path={ROUTES.landing} element={<LandingPage onChooseMatch={openMatchPicker} />} />

          <Route path={ROUTES.picker} element={
            <div className="app-picker-shell">
              <MatchPicker
                currentMatchId={selectedMatchId}
                confirmLeaveMatch={confirmDiscardWork}
                onMatchSelected={(matchId) => {
                  // Reopening the match already in the workspace keeps the clip as it is.
                  if (matchId !== selectedMatchId) {
                    resetMatchData()
                    selectMatch(matchId)
                  }
                  openWorkspace(matchId)
                }}
              />
            </div>
          } />

          <Route path={ROUTES.workspace} element={
            urlMatchId === null ? (
              <Navigate to={ROUTES.picker} replace />
            ) : urlMatchError === urlMatchId ? (
              <div className="match-info-error">
                Failed to load match {urlMatchId}. <Link to={ROUTES.picker}>Choose another match</Link>
              </div>
            ) : urlMatchId !== selectedMatchId ? (
              <div className="match-info-loading">Loading match...</div>
            ) : (
            <div className="workspace-content">
              {metaStatus === 'loading' ? (
                <div className="match-info-loading">Loading match metadata...</div>
              ) : metaStatus === 'error' ? (
                <div className="match-info-error">Failed to load match metadata.</div>
              ) : (
                <MatchDetailsDisplay matchData={matchMetaData} cardRef={setMatchCardElement} />
              )}
              <MatchIsland
                matchData={matchMetaData}
                cardElement={matchCardElement}
                controlsElement={controlsElement}
              />

              <div className={`app-container app-container--active ${activeSidebarPanel !== null ? 'app-container--settings-open' : ''}`}>
                <WorkspaceSidebar
                  activePanel={activeSidebarPanel}
                  onActivePanelChange={(panel) => 
                    setSidebarPanel(panel)
                  }
                  matchData={matchMetaData}
                  timelineStore={timelineStore}
                  onAddSegment={handleAddSegment}
                  keyMomentsData={keyMomentsData}
                />
                <div className="main-content">
                  <div style={{ width: '100%' }}>
                    <PlotLayoutComponent
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      playbackSpeed={playbackSpeed}
                      onSpeedChange={setPlaybackSpeed}
                      currentMatchFrame={currentMatchFrame}
                      clipFrame={clipFrame}
                      onClipFrameChange={handleClipFrameChange}
                      clipRange={clipRange}
                      segmentRange={segmentRange}
                      loadedFrameRanges={loadedFrameRanges}
                      missingFrameRanges={missingFrameRanges}
                      matchData={matchMetaData}
                      frameData={currentFrameData}
                      matchEvents={keyMomentsData?.events ?? null}
                      annotationStore={annotationStore}
                      timelineStore={timelineStore}
                      onAnnotationUpdate={handleAnnotationUpdate}
                      annotationVersion={annotationVersion}
                      isFrameLoading={isFetching}
                      controlsRef={setControlsElement}
                    />
                  </div>
                </div>
              </div>
            </div>
            )
          } />

          <Route path={ROUTES.docs} element={<DocsPage guide="user" />} />
          <Route path={ROUTES.docsPage} element={<DocsPage guide="user" />} />
          <Route path={ROUTES.developerDocs} element={<DocsPage guide="developers" />} />
          <Route path={ROUTES.developerDocsPage} element={<DocsPage guide="developers" />} />

          <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
          </Routes>
          {pendingSegment ? (
            <ChoiceDialog
              title="Keep your work on the opening clip?"
              message="You've made changes to the opening two minutes. Keep them and add this moment after, or start afresh with just this moment."
              choices={[
                { label: 'Start afresh', onSelect: () => resolvePendingSegment(false) },
                { label: 'Keep and add on', onSelect: () => resolvePendingSegment(true), primary: true },
              ]}
              onCancel={() => setPendingSegment(null)}
            />
          ) : null}
        </div>
      </StyleConfigProvider>
    )
  }

export default App