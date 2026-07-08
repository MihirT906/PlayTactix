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
import type { Event } from '../types/FrameDataInterfaces'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OverlayKind = 'pass_option_prob' | 'pitch_control' | 'event_visualisation'
export type EditMode = 'draw_line' | 'draw_rect' | 'player_focus' | 'draw_line_players'
export type BackgroundKind = 'pitch'

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
    playbackSpeed: number
  }
  rawData: {
    loadedFrameRange: { start: number; end: number } | null
  }
  overlays: {
    active: OverlayKind | null
    status: Record<OverlayKind, LoadStatus>
    selectedEvents: Event[]
    autoDisappearEvents: boolean
  }
  ui: {
    activeSidebarPanel: SidebarPanel
    editMode: EditMode | null
  }
  background: {
    active: BackgroundKind | null
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
  doublePlaybackSpeed: () => void
  halvePlaybackSpeed: () => void

  setSidebarPanel: (panel: SidebarPanel) => void
  clearSidebarPanel: () => void

  setEditMode: (mode: EditMode | null) => void

  setActiveOverlay: (overlay: OverlayKind | null) => void
  toggleSelectedEvent: (event: Event) => void
  setSelectedEvents: (events: Event[]) => void
  setAutoDisappearEvents: (autoDisappear: boolean) => void

  setActiveBackground: (background: BackgroundKind | null) => void

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
const MIN_PLAYBACK_SPEED = 0.125
const MAX_PLAYBACK_SPEED = 8

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
    playbackSpeed: 1,
  },
  rawData: {
    loadedFrameRange: null,
  },
  overlays: {
    active: null,
    status: {
      pass_option_prob: 'idle',
      pitch_control: 'idle',
      event_visualisation: 'idle',
    },
    selectedEvents: [],
    autoDisappearEvents: false,
  },
  ui: {
    activeSidebarPanel: null,
    editMode: null,
  },
  background: {
    active: null,
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

        doublePlaybackSpeed: () => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    playbackSpeed: Math.min(prev.playback.playbackSpeed * 2, MAX_PLAYBACK_SPEED),
                },
            }))
        },

        halvePlaybackSpeed: () => {
            setSession((prev) => ({
                ...prev,
                playback: {
                    ...prev.playback,
                    playbackSpeed: Math.max(prev.playback.playbackSpeed / 2, MIN_PLAYBACK_SPEED),
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

        setEditMode: (mode: EditMode | null) => {
            setSession((prev) => ({
                ...prev,
                ui: {
                    ...prev.ui,
                    editMode: mode,
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

        toggleSelectedEvent: (event: Event) => {
            setSession((prev) => {
                const isSelected = prev.overlays.selectedEvents.some((e) => e.event_id === event.event_id)
                const selectedEvents = isSelected
                    ? prev.overlays.selectedEvents.filter((e) => e.event_id !== event.event_id)
                    : [...prev.overlays.selectedEvents, event]

                return {
                    ...prev,
                    overlays: {
                        ...prev.overlays,
                        selectedEvents,
                        active: selectedEvents.length > 0 ? 'event_visualisation' : prev.overlays.active,
                    },
                }
            })
        },

        setSelectedEvents: (events: Event[]) => {
            setSession((prev) => ({
                ...prev,
                overlays: {
                    ...prev.overlays,
                    selectedEvents: events,
                    active: events.length > 0 ? 'event_visualisation' : prev.overlays.active,
                },
            }))
        },

        setAutoDisappearEvents: (autoDisappear: boolean) => {
            setSession((prev) => ({
                ...prev,
                overlays: {
                    ...prev.overlays,
                    autoDisappearEvents: autoDisappear,
                },
            }))
        },

        setActiveBackground: (background: BackgroundKind | null) => {
            setSession((prev) => ({
                ...prev,
                background: {
                    ...prev.background,
                    active: background,
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