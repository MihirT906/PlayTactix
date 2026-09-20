import type { Clip } from './ClipInterfaces'
import type { TimelineOption } from './TimelineOption'

export const PROJECT_FORMAT = 'playtactix-project'
export const SCHEMA_VERSION = 1

export type SavedAnnotation = {
  key: string
  type: string
  frameStart: number
  frameEnd: number | null
  shape: Record<string, unknown>
}

export type SavedStyle = {
  homeTeamColor: string
  awayTeamColor: string
  eventStyles: Record<string, { color: string; width: number }>
  teamVisibility: Record<string, boolean>
  eventVisibility: Record<string, boolean>
}

// Match data (frames, events, metadata) is deliberately not embedded: the file only
// references the match, and loading re-downloads it through the normal flow.
export type SavedProject = {
  format: typeof PROJECT_FORMAT
  schemaVersion: number
  savedAt: string
  match: {
    id: number
    source: 'skillcorner-github'
  }
  clip: Clip
  selectedEventIds: string[]
  autoDisappearEvents: boolean
  annotations: SavedAnnotation[]
  timelines: TimelineOption[]
  style: SavedStyle
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function isClip(value: unknown): value is Clip {
  if (!isObject(value)) return false
  if (!isNumber(value.length) || !Array.isArray(value.matchSegments) || !Array.isArray(value.overlaySegments)) {
    return false
  }
  return (
    value.matchSegments.every(
      (s: unknown) =>
        isObject(s) &&
        isNumber(s.clipStart) &&
        isNumber(s.clipEnd) &&
        isNumber(s.sourceFrameStart) &&
        isNumber(s.sourceFrameEnd)
    ) &&
    value.overlaySegments.every(
      (o: unknown) => isObject(o) && typeof o.type === 'string' && isNumber(o.clipStart) && isNumber(o.clipEnd)
    )
  )
}

function isAnnotation(value: unknown): value is SavedAnnotation {
  return (
    isObject(value) &&
    typeof value.key === 'string' &&
    typeof value.type === 'string' &&
    isNumber(value.frameStart) &&
    (value.frameEnd === null || isNumber(value.frameEnd)) &&
    isObject(value.shape)
  )
}

function isTimeline(value: unknown): value is TimelineOption {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (value.kind === 'filter' ? isObject(value.condition) : value.kind === 'metric' && typeof value.column === 'string')
  )
}

function isStyle(value: unknown): value is SavedStyle {
  return (
    isObject(value) &&
    typeof value.homeTeamColor === 'string' &&
    typeof value.awayTeamColor === 'string' &&
    isObject(value.eventStyles) &&
    isObject(value.teamVisibility) &&
    isObject(value.eventVisibility)
  )
}

// Each entry upgrades a project from version N to N + 1. Add one whenever SCHEMA_VERSION
// is bumped so files saved by older builds keep loading.
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

export function isSavedProject(value: unknown): value is SavedProject {
  return (
    isObject(value) &&
    value.format === PROJECT_FORMAT &&
    value.schemaVersion === SCHEMA_VERSION &&
    isObject(value.match) &&
    isNumber(value.match.id) &&
    isClip(value.clip) &&
    Array.isArray(value.selectedEventIds) &&
    value.selectedEventIds.every((id: unknown) => typeof id === 'string') &&
    typeof value.autoDisappearEvents === 'boolean' &&
    Array.isArray(value.annotations) &&
    value.annotations.every(isAnnotation) &&
    Array.isArray(value.timelines) &&
    value.timelines.every(isTimeline) &&
    isStyle(value.style)
  )
}

// Parses untrusted JSON text into a SavedProject, upgrading older versions.
// Throws an Error with a user-presentable message on any problem.
export function parseProject(text: string): SavedProject {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (!isObject(raw) || raw.format !== PROJECT_FORMAT) {
    throw new Error('This file is not a PlayTactix project.')
  }
  if (!isNumber(raw.schemaVersion)) {
    throw new Error('This project file has no version.')
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This project was saved by a newer version of PlayTactix.')
  }

  let migrated: Record<string, unknown> = raw
  for (let version = raw.schemaVersion; version < SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version]
    if (!step) throw new Error(`Cannot upgrade project from version ${version}.`)
    migrated = { ...step(migrated), schemaVersion: version + 1 }
  }

  if (!isSavedProject(migrated)) {
    throw new Error('This project file is incomplete or corrupted.')
  }
  return migrated
}
