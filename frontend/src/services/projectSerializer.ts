import type AnnotationStore from './AnnotationStore-optimized'
import type TimelineStore from './TimelineStore'
import type { MatchSessionState } from '../context/MatchSessionContext'
import { PROJECT_FORMAT, SCHEMA_VERSION, type SavedProject, type SavedStyle } from '../types/SavedProject'

type SerializeInput = {
  session: MatchSessionState
  style: SavedStyle
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
}

export function serializeProject({ session, style, annotationStore, timelineStore }: SerializeInput): SavedProject {
  if (session.match.id === null) {
    throw new Error('No match is open.')
  }

  return {
    format: PROJECT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    // The app only opens SkillCorner soccer matches so far, so the open match is always one.
    match: { provider: 'skillcorner', sport: 'soccer', id: String(session.match.id) },
    clip: session.playback.clip,
    annotations: annotationStore.getAllAnnotations(),
    style: {
      homeTeamColor: style.homeTeamColor,
      awayTeamColor: style.awayTeamColor,
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
      timelines: timelineStore.getAll(),
      eventStyles: style.eventStyles,
      eventVisibility: style.eventVisibility,
    },
  }
}

// The user's work as a comparable string: what a project file holds, less its timestamp and colours.
// Colours are left out because they follow the match's kits, so they change without the user doing anything.
export function workFingerprint({ session, annotationStore, timelineStore }: Omit<SerializeInput, 'style'>): string {
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
