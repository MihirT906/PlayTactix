import { useEffect, useRef, useState } from 'react'
import { useMatchSession } from '../context/MatchSessionContext'
import { useStyleConfig } from '../context/StyleConfigContext'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import MatchDataManager from '../services/MatchDataManager'
import { downloadProject, serializeProject } from '../services/projectSerializer'
import { parseProject, type SavedProject } from '../types/SavedProject'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import { getLogger } from '../services/logger'

const logger = getLogger('ProjectControls')

type ProjectControlsProps = {
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
  keyMomentsData: KeyMomentsData | null
  // Clears the match data App holds locally (metadata, key moments, frames) before a different match loads.
  onResetMatchData: () => void
  onOpenWorkspace: () => void
  // Called after annotations were replaced, so the plot re-reads them.
  onProjectApplied: () => void
}

const NOTICE_DURATION_MS = 6000

export default function ProjectControls({
  annotationStore,
  timelineStore,
  keyMomentsData,
  onResetMatchData,
  onOpenWorkspace,
  onProjectApplied,
}: ProjectControlsProps) {
  const { session, selectMatch, restoreSession } = useMatchSession()
  const style = useStyleConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<SavedProject | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [notice])

  const matchReady =
    session.match.metaStatus === 'ready' && session.match.keyMomentStatus === 'ready' && keyMomentsData !== null

  const apply = (project: SavedProject) => {
    const wanted = new Set(project.selectedEventIds)
    const selectedEvents = (keyMomentsData?.events ?? []).filter((event) => wanted.has(event.event_id))
    const dropped = wanted.size - selectedEvents.length

    restoreSession({
      clip: project.clip,
      selectedEvents,
      autoDisappearEvents: project.autoDisappearEvents,
    })
    annotationStore.load(project.annotations, 0)
    timelineStore.load(project.timelines)
    style.setAllStyle(project.style)
    onProjectApplied()

    setNotice({
      kind: 'info',
      text: dropped > 0 ? `Project loaded. ${dropped} selected event(s) no longer exist and were skipped.` : 'Project loaded.',
    })
  }

  // Finishes a load once the referenced match's metadata and key moments have arrived.
  useEffect(() => {
    if (!pending || session.match.id !== pending.match.id) return

    if (session.match.metaStatus === 'error' || session.match.keyMomentStatus === 'error') {
      setPending(null)
      setBusy(false)
      setNotice({ kind: 'error', text: 'Could not load the match this project refers to.' })
      return
    }

    if (matchReady) {
      apply(pending)
      setPending(null)
      setBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, session.match.id, session.match.metaStatus, session.match.keyMomentStatus, matchReady])

  const handleSave = () => {
    try {
      downloadProject(
        serializeProject({
          session,
          style: {
            homeTeamColor: style.homeTeamColor,
            awayTeamColor: style.awayTeamColor,
            eventStyles: style.eventStyles,
            teamVisibility: style.teamVisibility,
            eventVisibility: style.eventVisibility,
          },
          annotationStore,
          timelineStore,
        })
      )
      setNotice({ kind: 'info', text: 'Project saved.' })
    } catch (error) {
      logger.error('Failed to save project', error)
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save the project.' })
    }
  }

  const handleFile = async (file: File) => {
    let project: SavedProject
    try {
      project = parseProject(await file.text())
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not read the file.' })
      return
    }

    setBusy(true)
    if (session.match.id === project.match.id && matchReady) {
      // Same match is already open with its data loaded, so apply directly.
      apply(project)
      setBusy(false)
      onOpenWorkspace()
      return
    }

    await new MatchDataManager().downloadMatchData(project.match.id)
    onResetMatchData()
    selectMatch(project.match.id)
    setPending(project)
    onOpenWorkspace()
  }

  return (
    <>
      <button
        type="button"
        className="app-header-action"
        onClick={handleSave}
        disabled={session.match.id === null || !matchReady}
        aria-label="Save project"
      >
        Save Project
      </button>
      <button
        type="button"
        className="app-header-action"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        aria-label="Load project"
      >
        {busy ? 'Loading…' : 'Load Project'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = '' // allow re-selecting the same file
          if (file) void handleFile(file)
        }}
      />
      {notice ? (
        <span className={`project-notice project-notice--${notice.kind}`} role="status">
          {notice.text}
        </span>
      ) : null}
    </>
  )
}
