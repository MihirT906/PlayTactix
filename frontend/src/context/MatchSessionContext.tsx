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
import type { Clip, OverlaySegmentKind } from '../types/ClipInterfaces'
import * as clipManager from '../services/clipManager'
import { getLogger } from '../services/logger'

const logger = getLogger('Clip')

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
// Only event_visualisation still uses the single "active" overlay slot; pitch,
// pitch_control and pass_option_prob live as independent OverlaySegments instead.
export type OverlayKind = 'event_visualisation'
export type EditMode = 'draw_line' | 'draw_rect' | 'player_focus' | 'draw_line_players'
export type { OverlaySegmentKind }

export type MatchSessionState = {
  match: {
    id: number | null
    metaStatus: LoadStatus
    keyMomentStatus: LoadStatus
  }
  playback: {
    currentClipFrame: number
    currentMatchFrame: number
    clip: Clip
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
  // Overlays are also expressed as OverlaySegments on the clip's own timeline (see
  // playback.clip.overlaySegments) so they can be independently toggled and given
  // their own visible clip range, the same way the pitch background works.
  ui: {
    activeSidebarPanel: SidebarPanel
    editMode: EditMode | null
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
  setCurrentMatchFrame: (frame: number) => void
  setCurrentClipFrame: (clipFrame: number) => void
  advanceFrame: () => void
  addSegment: (sourceFrameStart: number, sourceFrameEnd: number) => void
  setSegmentRange: (clipStart: number, clipEnd: number, kind: 'move' | 'resize') => void
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

  setActiveOverlaySegment: (kind: OverlaySegmentKind, active: boolean) => void
  setOverlaySegmentRange: (kind: OverlaySegmentKind, clipStart: number, clipEnd: number) => void

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

const MIN_PLAYBACK_SPEED = 0.125
const MAX_PLAYBACK_SPEED = 8

export const createInitialMatchSessionState = (matchId: number | null = null): MatchSessionState => ({
  match: {
    id: matchId,
    metaStatus: 'idle',
    keyMomentStatus: 'idle',
  },
  playback: {
    currentClipFrame: 0,
    currentMatchFrame: clipManager.DEFAULT_SEGMENT_SOURCE_RANGE.start,
    clip: clipManager.createDefaultClip(matchId),
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
      event_visualisation: 'idle',
    },
    selectedEvents: [],
    autoDisappearEvents: false,
  },
  ui: {
    activeSidebarPanel: null,
    editMode: null,
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

            logger.info('Clip reset for new match', { matchId })
            setSession(createInitialMatchSessionState(matchId))
        },

        setCurrentMatchFrame: (frame: number) => {
            setSession((prev) => {
                const segment = prev.playback.clip.matchSegments[0]
                const clipFrame = segment ? frame - segment.sourceFrameStart + segment.clipStart : frame

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        currentMatchFrame: frame,
                        currentClipFrame: clipFrame,
                    },
                }
            })
        },

        setCurrentClipFrame: (clipFrame: number) => {
            setSession((prev) => {
                const resolved = clipManager.resolveClipFrame(prev.playback.clip, clipFrame)

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        currentClipFrame: clipFrame,
                        currentMatchFrame: resolved ? resolved.sourceFrame : prev.playback.currentMatchFrame,
                    },
                }
            })
        },

        advanceFrame: () => {
            setSession((prev) => {
                const { currentClipFrame, clip } = prev.playback
                const nextClipFrame = currentClipFrame >= clip.length ? 0 : currentClipFrame + 1
                const resolved = clipManager.resolveClipFrame(clip, nextClipFrame)
                // logger.info('Advance Frame:', nextClipFrame, resolved)
                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        currentMatchFrame: resolved ? resolved.sourceFrame : prev.playback.currentMatchFrame,
                        currentClipFrame: nextClipFrame,
                    },
                }
            })
        },

        addSegment: (sourceFrameStart: number, sourceFrameEnd: number) => {
            setSession((prev) => {
                const clip = clipManager.addSegment(prev.playback.clip, prev.match.id, sourceFrameStart, sourceFrameEnd)

                logger.info('Clip segment changed', clip.matchSegments[0])

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        clip,
                        currentMatchFrame: sourceFrameStart,
                        currentClipFrame: 0,
                        isPlaying: false,
                    },
                }
            })
        },

        setSegmentRange: (clipStart: number, clipEnd: number, kind: 'move' | 'resize') => {
            setSession((prev) => {
                const clip = clipManager.setSegmentRange(prev.playback.clip, clipStart, clipEnd, kind)
                const resolved = clipManager.resolveClipFrame(clip, prev.playback.currentClipFrame)

                logger.info('Clip segment range changed', { clipStart, clipEnd, kind })

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        clip,
                        currentMatchFrame: resolved ? resolved.sourceFrame : prev.playback.currentMatchFrame,
                    },
                }
            })
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
            setSession((prev) => {
                const active = prev.overlays.active === overlay ? null : overlay
                logger.info('Clip overlay changed', { active })

                return {
                    ...prev,
                    overlays: {
                        ...prev.overlays,
                        active,
                    },
                }
            })
        },

        toggleSelectedEvent: (event: Event) => {
            setSession((prev) => {
                const isSelected = prev.overlays.selectedEvents.some((e) => e.event_id === event.event_id)
                const selectedEvents = isSelected
                    ? prev.overlays.selectedEvents.filter((e) => e.event_id !== event.event_id)
                    : [...prev.overlays.selectedEvents, event]

                logger.info('Clip overlay event selection changed', { eventId: event.event_id, selected: !isSelected })

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
            logger.info('Clip overlay events replaced', { count: events.length })
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
            logger.info('Clip overlay auto-disappear events changed', { autoDisappear })
            setSession((prev) => ({
                ...prev,
                overlays: {
                    ...prev.overlays,
                    autoDisappearEvents: autoDisappear,
                },
            }))
        },

        setActiveOverlaySegment: (kind: OverlaySegmentKind, active: boolean) => {
            setSession((prev) => {
                const clip = active
                    ? clipManager.addOverlay(prev.playback.clip, kind)
                    : clipManager.removeOverlay(prev.playback.clip, kind)

                logger.info('Clip overlay segment changed', { kind, active })

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        clip,
                    },
                }
            })
        },

        setOverlaySegmentRange: (kind: OverlaySegmentKind, clipStart: number, clipEnd: number) => {
            setSession((prev) => {
                logger.info('Clip overlay segment range changed', { kind, clipStart, clipEnd })

                return {
                    ...prev,
                    playback: {
                        ...prev.playback,
                        clip: clipManager.setOverlayRange(prev.playback.clip, kind, clipStart, clipEnd),
                    },
                }
            })
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