import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type DataManager from '../services/DataManager'
import type { SidebarPanel } from '../components/WorkspaceSidebar'
import type OverlayManager from '../services/OverlayManager'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OverlayKind = 'pass_option_prob' | 'pitch_control'

export type MatchSessionState = {
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
    active: OverlayKind | null
    status: Record<OverlayKind, LoadStatus>
  }
  ui: {
    activeSidebarPanel: SidebarPanel
  }
}

type MatchSessionResources = {
  dataManager: DataManager
  overlayManager: OverlayManager
}

type MatchSessionContextValue = {
  session: MatchSessionState
  resources: MatchSessionResources

  selectMatch: (matchId: number) => void
  setCurrentFrame: (frame: number) => void
  advanceFrame: () => void
  setEpisodeRange: (start: number, end: number) => void
  togglePlayback: () => void
  stopPlayback: () => void

  setSidebarPanel: (panel: SidebarPanel) => void
  clearSidebarPanel: () => void

  setActiveOverlay: (overlay: OverlayKind | null) => void

  setFrameLoading: (isLoading: boolean) => void
  setLoadedFrameRange: (range: { start: number; end: number } | null) => void

  setMetaStatus: (status: LoadStatus) => void
  setKeyMomentStatus: (status: LoadStatus) => void
}

type MatchSessionProviderProps = {
    children: ReactNode
    dataManager: DataManager
    overlayManager: OverlayManager
}

const DEFAULT_EPISODE_RANGE = { start: 10, end: 1000 }

export const createInitialMatchSessionState = (): MatchSessionState => ({
  match: {
    id: null,
    metaStatus: 'idle',
    keyMomentStatus: 'idle',
  },
  playback: {
    currentFrame: DEFAULT_EPISODE_RANGE.start,
    episodeRange: { ...DEFAULT_EPISODE_RANGE },
    isPlaying: false,
    isFrameLoading: false,
  },
  rawData: {
    loadedFrameRange: null,
  },
  overlays: {
    active: null,
    status: {
      pass_option_prob: 'idle',
      pitch_control: 'idle',
    },
  },
  ui: {
    activeSidebarPanel: null,
  },
})

const MatchSessionContext = createContext<MatchSessionContextValue | null>(null)

export function MatchSessionProvider({
  children,
  dataManager,
  overlayManager,
}: MatchSessionProviderProps) {
  const [session, setSession] = useState<MatchSessionState>(createInitialMatchSessionState)

  const resources = useMemo(
    () => ({
        dataManager,
        overlayManager,
    }),
    [dataManager, overlayManager]
  )

  const value = useMemo<MatchSessionContextValue>(() => {
    return {
        session,
        resources,

        selectMatch: (matchId: number) => {
            dataManager.setMatchId(matchId)
            overlayManager.setMatchId(matchId)

            setSession({
                ...createInitialMatchSessionState(),
                match: {
                    id: matchId,
                    metaStatus: 'idle',
                    keyMomentStatus: 'idle',
                },
            })
        },

        setCurrentFrame: (frame: number) => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    currentFrame: frame,
                },
            }))
        },

        advanceFrame: () => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    currentFrame:
                    prev.playback.currentFrame >= prev.playback.episodeRange.end
                        ? prev.playback.episodeRange.start
                        : prev.playback.currentFrame + 1,
                },
            }))
        },

        setEpisodeRange: (start: number, end: number) => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    episodeRange: { start, end },
                    currentFrame: start,
                    isPlaying: false,
                },
            }))
        },

        togglePlayback: () => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    isPlaying: !prev.playback.isPlaying,
                },
            }))
        },

        stopPlayback: () => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    isPlaying: false
                },
            }))
        },

        setSidebarPanel: (panel: SidebarPanel) => {
            setSession((prev) => ({
                ...prev,
                ui: {
                    ...prev.ui,
                    activeSidebarPanel: panel,
                },
            }))
        },

        clearSidebarPanel: () => {
            setSession((prev) => ({
                ...prev,
                ui: {
                    ...prev.ui,
                    activeSidebarPanel: null,
                },
            }))
        },

        setActiveOverlay: (overlay: OverlayKind | null) => {
            setSession((prev) => ({
                ...prev,
                overlays: {
                    ...prev.overlays,
                    active: prev.overlays.active === overlay ? null : overlay,
                },
            }))
        },

        setFrameLoading: (isLoading: boolean) => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    isFrameLoading: isLoading,
                },
            }))
        },

        setLoadedFrameRange: (range) => {
            setSession((prev) => ({
                ...prev,
                rawData: {
                    ...prev.rawData,
                    loadedFrameRange: range,
                },
            }))
        },

        setMetaStatus: (status: LoadStatus) => {
            setSession((prev) => ({
                ...prev,
                match: {
                    ...prev.match,
                    metaStatus: status,
                },
            }))
        },

        setKeyMomentStatus: (status: LoadStatus) => {
            setSession((prev) => ({
                ...prev,
                match: {
                    ...prev.match,
                    keyMomentStatus: status,
                },
            }))
        },
    }
  }, [dataManager, resources, session])

  return (
    <MatchSessionContext.Provider value={value}>
      {children}
    </MatchSessionContext.Provider>
  )
}

export function useMatchSession() {
  const context = useContext(MatchSessionContext)

  if (!context) {
    throw new Error('useMatchSession must be used within a MatchSessionProvider')
  }

  return context
}