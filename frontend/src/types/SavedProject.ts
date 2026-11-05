import { z } from 'zod'
import { OVERLAY_SEGMENT_LABELS, type OverlaySegment, type OverlaySegmentKind, type Segment } from './ClipInterfaces'
import type { FilterTimelineOption, MetricTimelineOption } from './TimelineOption'
import type { Segment as Geometry } from '../plot/annotationGeometry'
import { EVENT_MAP_KINDS, type EventMapFilters } from '../plot/overlays/eventMapOverlay'
import { PASS_NETWORK_WINDOWS, type PassNetworkConfig } from '../plot/overlays/passNetworkOverlay'
import { MIN_TEAM_SHAPE_PLAYERS } from '../services/AnnotationStore-optimized'
import { APP_CONFIG } from '../config'
import { getLogger } from '../services/logger'

const logger = getLogger('SavedProject')

// Identifies the file type, independent of the brand's display name so a rename doesn't orphan saved files.
export const PROJECT_FORMAT = 'tappd.project'
export const SCHEMA_VERSION = 1

// Each schema below is both the runtime check for a section of the file and, through z.infer, its type.
// A section that mirrors an app type is tied to it with `satisfies`, so changing the app type without
// the schema fails the build. Values the app can work out again (a track's label, a segment's match)
// are left out of the file and rebuilt on load.

// The provider and sport pairs this build can open. Supporting a new one starts with an entry here.
const MatchSourceSchema = z.union([z.object({ provider: z.literal('skillcorner'), sport: z.literal('soccer') })])

type Sport = z.infer<typeof MatchSourceSchema>['sport']

// Which match a project refers to. The transport (GitHub, an API, a cache) is left out: it is how
// this build fetches the match, not part of which match it is.
const MatchRefSchema = MatchSourceSchema.and(
  z.object({
    id: z.string().min(1), // The provider's own match id, kept as a string whatever form the provider uses
    label: z.string().optional(), // e.g. "Arsenal v Chelsea, 2024-03-02", for messages only; never used to find the match
  })
)

// The labels are keyed by every overlay kind, so their keys are the full list.
const ALL_OVERLAY_KINDS = Object.keys(OVERLAY_SEGMENT_LABELS) as OverlaySegmentKind[]

// The overlays each sport offers.
const SPORT_OVERLAY_KINDS: Record<Sport, OverlaySegmentKind[]> = {
  soccer: ALL_OVERLAY_KINDS,
}

// A project refers to a single match, so its segments don't repeat which one.
const ClipSegmentSchema = z
  .object({
    clipStart: z.number().nonnegative(),
    clipEnd: z.number().nonnegative(),
    sourceFrameStart: z.number().nonnegative(),
    sourceFrameEnd: z.number().nonnegative(),
    isDefault: z.boolean().optional(),
  })
  .refine((segment) => segment.clipStart <= segment.clipEnd && segment.sourceFrameStart <= segment.sourceFrameEnd, {
    message: 'A segment ends before it starts',
  }) satisfies z.ZodType<Omit<Segment, 'matchId'>>

const OverlaySegmentSchema = z
  .object({
    type: z.enum(ALL_OVERLAY_KINDS),
    clipStart: z.number().nonnegative(),
    clipEnd: z.number().nonnegative(),
  })
  .refine((overlay) => overlay.clipStart <= overlay.clipEnd, {
    message: 'An overlay ends before it starts',
  }) satisfies z.ZodType<OverlaySegment>

const ClipSchema = z.object({
  length: z.number().nonnegative(),
  matchSegments: z.array(ClipSegmentSchema),
  overlaySegments: z.array(OverlaySegmentSchema),
})

const EventMapFiltersSchema = z.object({
  scope: z.enum(['clip', 'match']),
  kinds: z.array(z.enum(EVENT_MAP_KINDS)),
  teamId: z.number().nullable(),
  playerIds: z.array(z.number()),
  ledTo: z.enum(['any', 'shot', 'goal']),
  channels: z.array(z.string()),
  thirds: z.array(z.string()),
  positions: z.array(z.string()),
  runTypes: z.array(z.string()),
  carryStartTypes: z.array(z.string()),
  carryEndTypes: z.array(z.string()),
}) satisfies z.ZodType<EventMapFilters>

const PassNetworkSchema = z.object({
  window: z.enum(PASS_NETWORK_WINDOWS),
  rangeStartMinute: z.number(),
  rangeEndMinute: z.number(),
  build: z.enum(['full', 'progressive']),
  teamId: z.number().nullable(),
}) satisfies z.ZodType<PassNetworkConfig>

// Two ends in pitch metres: a line's or arrow's, or two opposite corners of a rectangle.
const GeometrySchema = z.object({
  x0: z.number(),
  y0: z.number(),
  x1: z.number(),
  y1: z.number(),
}) satisfies z.ZodType<Geometry>

// An annotation shows from frameStart until frameEnd, or to the end when frameEnd is null.
const annotationOf = <Type extends string, Shape extends z.ZodType>(type: Type, shape: Shape) =>
  z.object({
    key: z.string(),
    type: z.literal(type),
    frameStart: z.number(),
    frameEnd: z.number().nullable(),
    shape,
  })

const AnnotationSchema = z.discriminatedUnion('type', [
  annotationOf('rect', GeometrySchema),
  annotationOf('line', GeometrySchema),
  annotationOf('arrow', GeometrySchema),
  annotationOf('playerLine', z.object({ players: z.tuple([z.number(), z.number()]) })),
  annotationOf('teamShape', z.object({ players: z.array(z.number()).min(MIN_TEAM_SHAPE_PLAYERS) })),
  annotationOf('playerFocus', z.object({ playerId: z.number() })),
])

// A track's label is left out: it is named from what it shows, so it is rebuilt on load.
const TimelineSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('filter'),
    id: z.string(),
    eventType: z.string(),
    subtypes: z.array(z.string()),
    splitBySubtype: z.boolean(),
    heightBy: z.string().nullable().optional(),
    teamId: z.number().nullable().optional(),
    playerIds: z.array(z.number()).optional(),
    hidden: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('metric'),
    id: z.string(),
    column: z.string(),
    hidden: z.boolean().optional(),
  }),
]) satisfies z.ZodType<Omit<FilterTimelineOption, 'label'> | Omit<MetricTimelineOption, 'label'>>

// Team colours and visibility apply to any sport. A colour is null while it follows the team's kit,
// so a project only fixes a colour the user picked.
const TeamStyleSchema = z.object({
  homeTeamColor: z.string().nullable(),
  awayTeamColor: z.string().nullable(),
  teamVisibility: z.record(z.string(), z.boolean()),
})

// Everything that only makes sense for soccer: its overlays' settings, its Insights tracks and the
// styles of its event types.
const SoccerAnalysisSchema = z.object({
  sport: z.literal('soccer'),
  eventMap: z.object({
    filters: EventMapFiltersSchema,
    excludedIds: z.array(z.string()),
  }),
  autoDisappearEvents: z.boolean(),
  passNetwork: PassNetworkSchema,
  timelines: z.array(TimelineSchema),
  eventStyles: z.record(z.string(), z.object({ color: z.string(), width: z.number() })),
  eventVisibility: z.record(z.string(), z.boolean()),
})

// One entry per sport. Supporting a new sport adds its schema here, leaving the rest of the file as it is.
const AnalysisSchema = z.discriminatedUnion('sport', [SoccerAnalysisSchema])

// Match data (frames, events, metadata) is deliberately not embedded: the file only
// references the match, and loading re-downloads it through the normal flow.
const ProjectSchema = z
  .object({
    format: z.literal(PROJECT_FORMAT),
    schemaVersion: z.literal(SCHEMA_VERSION),
    savedAt: z.string(),
    // The build that wrote the file, to tell which code made a file that won't load.
    savedBy: z.object({ app: z.string(), build: z.string() }),
    match: MatchRefSchema,
    clip: ClipSchema,
    annotations: z.array(AnnotationSchema),
    style: TeamStyleSchema,
    analysis: AnalysisSchema,
  })
  .refine((project) => project.analysis.sport === project.match.sport, {
    message: 'The analysis is for a different sport than the match',
    path: ['analysis', 'sport'],
  })
  .refine(
    (project) =>
      project.clip.overlaySegments.every((overlay) => SPORT_OVERLAY_KINDS[project.match.sport].includes(overlay.type)),
    { message: "An overlay isn't offered for this sport", path: ['clip', 'overlaySegments'] }
  )

export type SavedMatchRef = z.infer<typeof MatchRefSchema>
export type SavedClip = z.infer<typeof ClipSchema>
export type SavedAnnotation = z.infer<typeof AnnotationSchema>
export type SavedTimeline = z.infer<typeof TimelineSchema>
export type SavedSoccerAnalysis = z.infer<typeof SoccerAnalysisSchema>
export type SavedProject = z.infer<typeof ProjectSchema>

// Everything the style context restores. The file keeps the team part and the event part apart,
// since only the event part depends on the sport.
export type SavedStyle = z.infer<typeof TeamStyleSchema> & Pick<SavedSoccerAnalysis, 'eventStyles' | 'eventVisibility'>

// Each entry upgrades a project from version N to N + 1. Add one whenever SCHEMA_VERSION is bumped
// so files saved by older builds keep loading.
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Parses untrusted JSON text into a SavedProject, upgrading older versions.
// Throws an Error with a user-presentable message on any problem.
export function parseProject(text: string): SavedProject {
  const brand = APP_CONFIG.brand.title

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  // These come ahead of the full check so the commonest mismatches get their own message.
  if (!isObject(raw) || raw.format !== PROJECT_FORMAT) {
    throw new Error(`This file is not a ${brand} project.`)
  }
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) {
    throw new Error('This project file has no version.')
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`This project was saved by a newer version of ${brand}.`)
  }

  let migrated: Record<string, unknown> = raw
  for (let version = raw.schemaVersion; version < SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version]
    if (!step) throw new Error(`Cannot upgrade project from version ${version}.`)
    migrated = { ...step(migrated), schemaVersion: version + 1 }
  }

  if (isObject(migrated.match) && !MatchSourceSchema.safeParse(migrated.match).success) {
    throw new Error(
      `This project is for a ${String(migrated.match.sport)} match from ${String(migrated.match.provider)}, which ${brand} can't open yet.`
    )
  }

  const result = ProjectSchema.safeParse(migrated)
  if (!result.success) {
    logger.warn('Project file failed validation', result.error.issues)
    throw new Error('This project file is incomplete or corrupted.')
  }
  return result.data
}
