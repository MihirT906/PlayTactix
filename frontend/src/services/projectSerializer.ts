import type AnnotationStore from './AnnotationStore-optimized'
import type TimelineStore from './TimelineStore'
import type { MatchSessionState } from '../context/MatchSessionContext'
import type { Clip } from '../types/ClipInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { TimelineOption } from '../types/TimelineOption'
import type { EventMapFilters } from '../plot/overlays/eventMapOverlay'
import type { PassNetworkConfig } from '../plot/overlays/passNetworkOverlay'
import { getFilterTimelineLabel, getMetricGraph } from './timelineEvents'
import { getLogger } from './logger'
import {
  PROJECT_FORMAT,
  SCHEMA_VERSION,
  type SavedAnnotation,
  type SavedClip,
  type SavedMatchRef,
  type SavedProject,
  type SavedStyle,
  type SavedTimeline,
} from '../types/SavedProject'

const logger = getLogger('projectSerializer')

type StoredAnnotation = ReturnType<AnnotationStore['getAllAnnotations']>[number]

// The style as the style context holds it, with the kit colours each team follows until the user picks its own.
type LiveStyle = {
  homeTeamColor: string
  awayTeamColor: string
  kitColors: { home: string; away: string }
  teamVisibility: Record<string, boolean>
  eventStyles: Record<string, { color: string; width: number }>
  eventVisibility: Record<string, boolean>
}

type SerializeInput = {
  session: MatchSessionState
  style: LiveStyle
  matchData: MatchData | null
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
}

// What loading a project puts back, in the shapes the session, stores and style context take.
export type RestoredProject = {
  matchId: number
  matchLabel: string | undefined
  session: {
    clip: Clip
    eventMapFilters: EventMapFilters
    eventMapExcludedIds: string[]
    autoDisappearEvents: boolean
    passNetworkConfig: PassNetworkConfig
  }
  annotations: StoredAnnotation[]
  timelines: TimelineOption[]
  style: SavedStyle
}

// The app still identifies a match by SkillCorner's numeric id. These two are the only places that turn it
// into the file's match reference and back, so identifying matches by provider and sport app-wide starts here.
export function matchRefFor(matchId: number, matchData: MatchData | null): SavedMatchRef {
  const label =
    matchData?.id === matchId
      ? `${matchData.home_team.short_name} v ${matchData.away_team.short_name}, ${matchData.date_time.slice(0, 10)}`
      : undefined
  // The app only opens SkillCorner soccer matches so far, so the open match is always one.
  return { provider: 'skillcorner', sport: 'soccer', id: String(matchId), label }
}

export function appMatchIdOf(ref: SavedMatchRef): number | null {
  const matchId = Number(ref.id)
  return Number.isInteger(matchId) ? matchId : null
}

const geometryOf = (shape: { x0: number; y0: number; x1: number; y1: number }) => ({
  x0: shape.x0,
  y0: shape.y0,
  x1: shape.x1,
  y1: shape.y1,
})

// The store keeps rectangles and lines as one 'draw' type; the file gives each its own. Only the fields a
// type is drawn from are kept, so nothing else a shape happens to carry ends up in the file.
function toSavedAnnotation(annotation: StoredAnnotation): SavedAnnotation | null {
  const { key, frameStart, frameEnd, shape } = annotation
  const timing = { key, frameStart, frameEnd }

  switch (annotation.type) {
    case 'draw':
      if (shape.type === 'rect' || shape.type === 'line') return { ...timing, type: shape.type, shape: geometryOf(shape) }
      break
    case 'arrow':
      return { ...timing, type: 'arrow', shape: geometryOf(shape) }
    case 'playerLine':
      return { ...timing, type: 'playerLine', shape: { players: [shape.players[0], shape.players[1]] } }
    case 'teamShape':
      return { ...timing, type: 'teamShape', shape: { players: [...shape.players] } }
    case 'playerFocus':
      return { ...timing, type: 'playerFocus', shape: { playerId: shape.playerId } }
  }

  logger.warn('Left an annotation of an unknown type out of the project', annotation.type)
  return null
}

function toStoredAnnotation(annotation: SavedAnnotation): StoredAnnotation {
  const { key, frameStart, frameEnd } = annotation
  if (annotation.type === 'rect' || annotation.type === 'line') {
    return { key, frameStart, frameEnd, type: 'draw', shape: { type: annotation.type, ...annotation.shape } }
  }
  return { key, frameStart, frameEnd, type: annotation.type, shape: annotation.shape }
}

function toSavedClip(clip: Clip): SavedClip {
  return {
    ...clip,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matchSegments: clip.matchSegments.map(({ matchId, ...segment }) => segment),
  }
}

function toSavedTimeline(timeline: TimelineOption): SavedTimeline {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { label, ...saved } = timeline
  return saved
}

function toTimeline(saved: SavedTimeline): TimelineOption {
  return saved.kind === 'filter'
    ? { ...saved, label: getFilterTimelineLabel(saved.eventType, saved.subtypes) }
    : { ...saved, label: getMetricGraph(saved.column)?.label ?? saved.column }
}

// Null while the colour is still the kit's, so the project only fixes a colour the user picked.
const ownColor = (color: string, kitColor: string) => (color.toUpperCase() === kitColor.toUpperCase() ? null : color)

export function serializeProject({ session, style, matchData, annotationStore, timelineStore }: SerializeInput): SavedProject {
  if (session.match.id === null) {
    throw new Error('No match is open.')
  }

  return {
    format: PROJECT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    savedBy: { app: 'tappd', build: __APP_BUILD__ },
    match: matchRefFor(session.match.id, matchData),
    clip: toSavedClip(session.playback.clip),
    annotations: annotationStore
      .getAllAnnotations()
      .map(toSavedAnnotation)
      .filter((annotation) => annotation !== null),
    style: {
      homeTeamColor: ownColor(style.homeTeamColor, style.kitColors.home),
      awayTeamColor: ownColor(style.awayTeamColor, style.kitColors.away),
      teamVisibility: style.teamVisibility,
    },
    analysis: {
      sport: 'soccer',
      eventMap: {
        filters: session.overlays.eventMapFilters,
        excludedIds: session.overlays.eventMapExcludedIds,
      },
      autoDisappearEvents: session.overlays.autoDisappearEvents,
      passNetwork: session.overlays.passNetworkConfig,
      timelines: timelineStore.getAll().map(toSavedTimeline),
      eventStyles: style.eventStyles,
      eventVisibility: style.eventVisibility,
    },
  }
}

// Throws an Error with a user-presentable message if the project can't be restored into this build.
export function restoreProject(project: SavedProject): RestoredProject {
  const matchId = appMatchIdOf(project.match)
  if (matchId === null) {
    throw new Error('This project refers to a match id that could not be read.')
  }

  const { analysis } = project
  return {
    matchId,
    matchLabel: project.match.label,
    session: {
      clip: {
        ...project.clip,
        matchSegments: project.clip.matchSegments.map((segment) => ({ ...segment, matchId })),
      },
      eventMapFilters: analysis.eventMap.filters,
      eventMapExcludedIds: analysis.eventMap.excludedIds,
      autoDisappearEvents: analysis.autoDisappearEvents,
      passNetworkConfig: analysis.passNetwork,
    },
    annotations: project.annotations.map(toStoredAnnotation),
    timelines: analysis.timelines.map(toTimeline),
    style: { ...project.style, eventStyles: analysis.eventStyles, eventVisibility: analysis.eventVisibility },
  }
}

// The user's work as a comparable string: what a project file holds, less its timestamp and colours.
// Colours are left out because they follow the match's kits, so they change without the user doing anything.
export function workFingerprint({ session, annotationStore, timelineStore }: Omit<SerializeInput, 'style' | 'matchData'>): string {
  return JSON.stringify({
    clip: session.playback.clip,
    eventMap: {
      filters: session.overlays.eventMapFilters,
      excludedIds: session.overlays.eventMapExcludedIds,
    },
    autoDisappearEvents: session.overlays.autoDisappearEvents,
    passNetwork: session.overlays.passNetworkConfig,
    annotations: annotationStore.getAllAnnotations(),
    timelines: timelineStore.getAll(),
  })
}

export function downloadProject(project: SavedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tappd-${project.match.sport}-${project.match.id}-${project.savedAt.slice(0, 10)}.tappd.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
