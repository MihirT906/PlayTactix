import type { Clip } from './ClipInterfaces'
import type { TimelineOption } from './TimelineOption'
import { DEFAULT_EVENT_MAP_FILTERS, EVENT_MAP_KINDS, type EventMapFilters } from '../plot/overlays/eventMapOverlay'
import { DEFAULT_PASS_NETWORK_CONFIG, PASS_NETWORK_WINDOWS, type PassNetworkConfig } from '../plot/overlays/passNetworkOverlay'

export const PROJECT_FORMAT = 'playtactix-project'
export const SCHEMA_VERSION = 6

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
  pitchRenderer?: string
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
  eventMap: {
    filters: EventMapFilters
    excludedIds: string[]
  }
  autoDisappearEvents: boolean
  passNetwork: PassNetworkConfig
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

const isArrayOf = (value: unknown, type: 'string' | 'number'): boolean =>
  Array.isArray(value) && value.every((entry) => typeof entry === type)

function isEventMap(value: unknown): value is SavedProject['eventMap'] {
  if (!isObject(value) || !isObject(value.filters) || !isArrayOf(value.excludedIds, 'string')) return false
  const filters = value.filters
  return (
    (filters.scope === 'clip' || filters.scope === 'match') &&
    Array.isArray(filters.kinds) &&
    filters.kinds.every((kind: unknown) => (EVENT_MAP_KINDS as unknown[]).includes(kind)) &&
    (filters.teamId === null || isNumber(filters.teamId)) &&
    isArrayOf(filters.playerIds, 'number') &&
    (filters.ledTo === 'any' || filters.ledTo === 'shot' || filters.ledTo === 'goal') &&
    isArrayOf(filters.channels, 'string') &&
    isArrayOf(filters.thirds, 'string') &&
    isArrayOf(filters.positions, 'string') &&
    isArrayOf(filters.runTypes, 'string') &&
    isArrayOf(filters.carryStartTypes, 'string') &&
    isArrayOf(filters.carryEndTypes, 'string')
  )
}

function isPassNetwork(value: unknown): value is PassNetworkConfig {
  return (
    isObject(value) &&
    (PASS_NETWORK_WINDOWS as unknown[]).includes(value.window) &&
    isNumber(value.rangeStartMinute) &&
    isNumber(value.rangeEndMinute) &&
    (value.build === 'full' || value.build === 'progressive') &&
    (value.teamId === null || isNumber(value.teamId))
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
    (value.kind === 'filter'
      ? typeof value.eventType === 'string' &&
        Array.isArray(value.subtypes) &&
        value.subtypes.every((subtype: unknown) => typeof subtype === 'string') &&
        typeof value.splitBySubtype === 'boolean' &&
        (value.teamId == null || isNumber(value.teamId)) &&
        (value.playerIds === undefined || isArrayOf(value.playerIds, 'number'))
      : value.kind === 'metric' && typeof value.column === 'string')
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
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 filter timelines held a single `column equals value` condition.
  1: (raw) => ({
    ...raw,
    timelines: Array.isArray(raw.timelines) ? raw.timelines.map(migrateV1Timeline) : raw.timelines,
  }),
  // v2 held a hand-ticked list of events. The Event Map is now driven by filters, which a list of
  // ids cannot be turned back into, so an upgraded project opens with an empty map.
  2: (raw) => {
    const upgraded: Record<string, unknown> = { ...raw, eventMap: { filters: DEFAULT_EVENT_MAP_FILTERS, excludedIds: [] } }
    delete upgraded.selectedEventIds
    return upgraded
  },
  // v3 metric tracks charted an event column with a chosen aggregation. None of those graphs is
  // offered any more (momentum replaced them), so their tracks are dropped.
  3: (raw) => ({
    ...raw,
    timelines: Array.isArray(raw.timelines)
      ? raw.timelines.filter((timeline) => !isObject(timeline) || timeline.kind !== 'metric')
      : raw.timelines,
  }),
  // v4 could hold a phases of play track, which Insights no longer has, so it is dropped.
  4: (raw) => ({
    ...raw,
    timelines: Array.isArray(raw.timelines)
      ? raw.timelines.filter((timeline) => !isObject(timeline) || timeline.kind !== 'phases')
      : raw.timelines,
  }),
  // v5 had no pass network, so an upgraded project opens with the default one.
  5: (raw) => ({ ...raw, passNetwork: DEFAULT_PASS_NETWORK_CONFIG }),
}

const V1_ENGAGEMENT_SUBTYPES = ['pressing', 'pressure', 'counter_press', 'recovery_press', 'other']

function migrateV1Timeline(timeline: unknown): unknown {
  if (!isObject(timeline) || timeline.kind !== 'filter' || !isObject(timeline.condition)) {
    return timeline
  }

  const { condition, ...rest } = timeline
  const value = String(condition.value)

  if (condition.column === 'event_subtype') {
    // v1 did not record the event type, so it is inferred from the subtype.
    const eventType = V1_ENGAGEMENT_SUBTYPES.includes(value) ? 'on_ball_engagement' : 'passing_option'
    return { ...rest, eventType, subtypes: [value], splitBySubtype: false }
  }

  return { ...rest, eventType: value, subtypes: [], splitBySubtype: false }
}

export function isSavedProject(value: unknown): value is SavedProject {
  return (
    isObject(value) &&
    value.format === PROJECT_FORMAT &&
    value.schemaVersion === SCHEMA_VERSION &&
    isObject(value.match) &&
    isNumber(value.match.id) &&
    isClip(value.clip) &&
    isEventMap(value.eventMap) &&
    typeof value.autoDisappearEvents === 'boolean' &&
    isPassNetwork(value.passNetwork) &&
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
