import { z } from 'zod'
import { OVERLAY_SEGMENT_LABELS, type Clip, type OverlaySegmentKind } from './ClipInterfaces'
import type { TimelineOption } from './TimelineOption'
import { EVENT_MAP_KINDS, type EventMapFilters } from '../plot/overlays/eventMapOverlay'
import { PASS_NETWORK_WINDOWS, type PassNetworkConfig } from '../plot/overlays/passNetworkOverlay'
import { APP_CONFIG } from '../config'
import { getLogger } from '../services/logger'

const logger = getLogger('SavedProject')

// Identifies the file type, independent of the brand's display name so a rename doesn't orphan saved files.
export const PROJECT_FORMAT = 'tappd.project'
export const SCHEMA_VERSION = 1

// Each schema below is both the runtime check for a section of the file and, through z.infer, its type.
// A section that mirrors an app type is tied to it with `satisfies`, so changing the app type without
// the schema fails the build.

// The provider and sport pairs this build can open. Supporting a new one starts with an entry here.
const MatchSourceSchema = z.union([z.object({ provider: z.literal('skillcorner'), sport: z.literal('soccer') })])

// Which match a project refers to. The transport (GitHub, an API, a cache) is left out: it is how
// this build fetches the match, not part of which match it is.
const MatchRefSchema = MatchSourceSchema.and(
  z.object({
    id: z.string().min(1), // The provider's own match id, kept as a string whatever form the provider uses
  })
)

// The labels are keyed by every overlay kind, so their keys are the full list.
const OVERLAY_SEGMENT_KINDS = Object.keys(OVERLAY_SEGMENT_LABELS) as OverlaySegmentKind[]

const ClipSchema = z.object({
  length: z.number(),
  matchSegments: z.array(
    z.object({
      matchId: z.number().nullable(),
      clipStart: z.number(),
      clipEnd: z.number(),
      sourceFrameStart: z.number(),
      sourceFrameEnd: z.number(),
      isDefault: z.boolean().optional(),
    })
  ),
  overlaySegments: z.array(
    z.object({
      type: z.enum(OVERLAY_SEGMENT_KINDS),
      clipStart: z.number(),
      clipEnd: z.number(),
    })
  ),
}) satisfies z.ZodType<Clip>

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

const AnnotationSchema = z.object({
  key: z.string(),
  type: z.string(),
  frameStart: z.number(),
  frameEnd: z.number().nullable(),
  shape: z.record(z.string(), z.unknown()),
})

const TimelineSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('filter'),
    id: z.string(),
    label: z.string(),
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
    label: z.string(),
    column: z.string(),
    hidden: z.boolean().optional(),
  }),
]) satisfies z.ZodType<TimelineOption>

// Team colours and visibility apply to any sport.
const TeamStyleSchema = z.object({
  homeTeamColor: z.string(),
  awayTeamColor: z.string(),
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

export type SavedMatchRef = z.infer<typeof MatchRefSchema>
export type SavedAnnotation = z.infer<typeof AnnotationSchema>
export type SavedSoccerAnalysis = z.infer<typeof SoccerAnalysisSchema>
export type SavedProject = z.infer<typeof ProjectSchema>

// Everything the style context restores. The file keeps the team part and the event part apart,
// since only the event part depends on the sport.
export type SavedStyle = z.infer<typeof TeamStyleSchema> & Pick<SavedSoccerAnalysis, 'eventStyles' | 'eventVisibility'>

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Parses untrusted JSON text into a SavedProject.
// Throws an Error with a user-presentable message on any problem.
// Only the current version loads: older files are not upgraded while the format is still being refined.
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
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`This project was saved by a different version of ${brand} and can't be opened.`)
  }
  if (isObject(raw.match) && !MatchSourceSchema.safeParse(raw.match).success) {
    throw new Error(`This project is for a ${String(raw.match.sport)} match from ${String(raw.match.provider)}, which ${brand} can't open yet.`)
  }

  const result = ProjectSchema.safeParse(raw)
  if (!result.success) {
    logger.warn('Project file failed validation', result.error.issues)
    throw new Error('This project file is incomplete or corrupted.')
  }
  return result.data
}
