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
    match: { id: session.match.id, source: 'skillcorner-github' },
    clip: session.playback.clip,
    selectedEventIds: session.overlays.selectedEvents.map((event) => event.event_id),
    autoDisappearEvents: session.overlays.autoDisappearEvents,
    annotations: annotationStore.getAllAnnotations(),
    timelines: timelineStore.getAll(),
    style,
  }
}

export function downloadProject(project: SavedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `playtactix-${project.match.id}-${project.savedAt.slice(0, 10)}.playtactix.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
