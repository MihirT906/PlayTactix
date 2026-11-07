import { useEffect, useMemo, useRef, useState } from 'react'
import { useMatchSession } from '../context/MatchSessionContext'
import { useStyleConfig } from '../context/StyleConfigContext'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import type TimelineStore from '../services/TimelineStore'
import MatchDataManager from '../services/MatchDataManager'
import { downloadProject, restoreProject, serializeProject, workFingerprint, type RestoredProject } from '../services/projectSerializer'
import { parseProject } from '../types/SavedProject'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import { getLogger } from '../services/logger'

const logger = getLogger('ProjectControls')

type ProjectControlsProps = {
  annotationStore: AnnotationStore
  timelineStore: TimelineStore
  keyMomentsData: KeyMomentsData | null
  // The open match's metadata, which names the match in a saved project.
  matchData: MatchData | null
  // Save only makes sense on the open match's workspace; Load stays available everywhere.
  showSave: boolean
  // Clears the match data App holds locally (metadata, key moments, frames) before a different match loads.
  onResetMatchData: () => void
  onOpenWorkspace: (matchId: number) => void
  // Called after annotations were replaced, so the plot re-reads them.
  onProjectApplied: () => void
  onProjectSaved: () => void
  // Asks the user before loading a project over work they haven't saved; false means stop.
  confirmDiscardWork: () => boolean
  // The work as last saved, loaded or opened, to tell whether there are unsaved changes; null with no match open.
  savedWork: string | null
  // Bumped whenever the annotations change, which the store does not announce itself.
  annotationVersion: number
}

const NOTICE_DURATION_MS = 6000

export default function ProjectControls({
  annotationStore,
  timelineStore,
  keyMomentsData,
  matchData,
  showSave,
  onResetMatchData,
  onOpenWorkspace,
  onProjectApplied,
  onProjectSaved,
  confirmDiscardWork,
  savedWork,
  annotationVersion,
}: ProjectControlsProps) {
  const { session, selectMatch, restoreSession } = useMatchSession()
  const style = useStyleConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<RestoredProject | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)

  // The Insights tracks change in their own store, so listen for them to recheck for unsaved changes.
  const [timelinesVersion, setTimelinesVersion] = useState(0)
  useEffect(() => timelineStore.subscribe(() => setTimelinesVersion((version) => version + 1)), [timelineStore])

  // Compared against what was last saved; the deps are the parts of the work that can change, so this
  // is not redone on every frame of playback.
  const { clip } = session.playback
  const { eventMapFilters, eventMapExcludedIds, autoDisappearEvents, passNetworkConfig } = session.overlays
  const { homeTeamColor, awayTeamColor, kitColors, teamVisibility, eventStyles, eventVisibility } = style
  // The kit colours come as a fresh object each render, so their values are what is watched.
  const { home: homeKitColor, away: awayKitColor } = kitColors
  const hasUnsavedChanges = useMemo(
    () => savedWork !== null && workFingerprint({ session, style, matchData, annotationStore, timelineStore }) !== savedWork,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedWork, clip, eventMapFilters, eventMapExcludedIds, autoDisappearEvents, passNetworkConfig, homeTeamColor, awayTeamColor, homeKitColor, awayKitColor, teamVisibility, eventStyles, eventVisibility, matchData, annotationVersion, timelinesVersion],
  )

  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [notice])

  const matchReady =
    session.match.metaStatus === 'ready' && session.match.keyMomentStatus === 'ready' && keyMomentsData !== null

  const apply = (project: RestoredProject) => {
    restoreSession(project.session)
    annotationStore.load(project.annotations, 0)
    timelineStore.load(project.timelines)
    style.setAllStyle(project.style)
    onProjectApplied()

    setNotice({ kind: 'info', text: 'Project loaded.' })
  }

  // Finishes a load once the referenced match's metadata and key moments have arrived.
  useEffect(() => {
    if (!pending || session.match.id !== pending.matchId) return

    if (session.match.metaStatus === 'error' || session.match.keyMomentStatus === 'error') {
      setPending(null)
      setBusy(false)
      setNotice({ kind: 'error', text: `Could not load ${pending.matchLabel ?? 'the match this project refers to'}.` })
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
          style,
          matchData,
          annotationStore,
          timelineStore,
        })
      )
      onProjectSaved()
      setNotice({ kind: 'info', text: 'Project saved.' })
    } catch (error) {
      logger.error('Failed to save project', error)
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save the project.' })
    }
  }

  const handleFile = async (file: File) => {
    let project: RestoredProject
    try {
      project = restoreProject(parseProject(await file.text()))
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not read the file.' })
      return
    }

    const { matchId } = project
    setBusy(true)
    if (session.match.id === matchId && matchReady) {
      // Same match is already open with its data loaded, so apply directly.
      apply(project)
      setBusy(false)
      onOpenWorkspace(matchId)
      return
    }

    try {
      await new MatchDataManager().downloadMatchData(matchId)
    } catch (error) {
      // Nothing has changed yet, so the open match and its work stay as they were.
      logger.error('Failed to download match data for project', error)
      setBusy(false)
      setNotice({ kind: 'error', text: `Could not load ${project.matchLabel ?? 'the match this project refers to'}.` })
      return
    }
    onResetMatchData()
    selectMatch(matchId)
    setPending(project)
    onOpenWorkspace(matchId)
  }

  return (
    <>
      {/* Ahead of the buttons, so a message appearing does not shift them. */}
      {notice ? (
        <span className={`project-notice project-notice--${notice.kind}`} role="status">
          {notice.text}
        </span>
      ) : null}
      {showSave ? (
        <button
          type="button"
          className="app-header-action app-header-file-action"
          onClick={handleSave}
          disabled={session.match.id === null || !matchReady}
          aria-label={hasUnsavedChanges ? 'Save project (unsaved changes)' : 'Save project'}
          title={hasUnsavedChanges ? 'You have unsaved changes' : undefined}
        >
          {hasUnsavedChanges ? <span className="unsaved-dot" aria-hidden="true" /> : null}
          Save Project
        </button>
      ) : null}
      <button
        type="button"
        className="app-header-action app-header-file-action"
        onClick={() => {
          if (confirmDiscardWork()) fileInputRef.current?.click()
        }}
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
    </>
  )
}
