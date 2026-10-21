import { formatEventValue } from '../constants/eventData'
import type { Segment } from '../types/ClipInterfaces'
import type { Event } from '../types/FrameDataInterfaces'
import type { FilterTimelineOption, TimelineOption } from '../types/TimelineOption'

const MAX_SUBTYPES_IN_LABEL = 2

// How a metric's values are written: chances as percentages, xThreat and possession value as
// decimals, counts as whole numbers, and pressure as its level.
export type MetricFormat = 'percent' | 'decimal' | 'count' | 'pressure'

type MetricColumn = {
  label: string
  // What the value means, shown on hover.
  description: string
  format: MetricFormat
  // Written after a count, for one and for several, e.g. "1 option", "3 options".
  unit?: [string, string]
  // The value can be negative, and is then drawn below a middle line; values are written with a sign.
  signed?: boolean
  // The value that gets no bar; zero unless the column starts higher (pressure starts at 1, none).
  floor?: number
  // Bar heights follow the square root of the value, so a few big values don't flatten the rest.
  sqrt?: boolean
}

// SkillCorner's pressure levels, by their id (1 to 5).
const PRESSURE_LEVELS = ['No pressure', 'Low pressure', 'Medium pressure', 'High pressure', 'Very high pressure']

// How each event column that can set a bar's height is named and its values written.
const METRIC_COLUMNS: Record<string, MetricColumn> = {
  xthreat: {
    label: 'xThreat',
    description: 'Expected threat: how much the action is expected to add to the chance of scoring.',
    format: 'decimal',
  },
  xpass_completion: {
    label: 'xPass',
    description: 'Expected pass completion: the chance a pass would be completed.',
    format: 'percent',
  },
  player_targeted_xthreat: {
    label: 'Target xThreat',
    description: 'xThreat of the pass to the player it was aimed at.',
    format: 'decimal',
  },
  player_targeted_xpass_completion: {
    label: 'Target xPass',
    description: 'Chance the pass to the player it was aimed at would be completed.',
    format: 'percent',
  },
  possession_epv_total: {
    label: 'Value added',
    description:
      "How much the player's time on the ball raised the team's expected value (its chance of scoring, less its chance of conceding). Below the line when it went down.",
    format: 'decimal',
    signed: true,
    sqrt: true,
  },
  pass_epv_total: {
    label: 'Pass value',
    description:
      "How much the player's pass raised the team's expected value, up to where it was received or lost. Below the line when it went down.",
    format: 'decimal',
    signed: true,
    sqrt: true,
  },
  n_opponents_bypassed: {
    label: 'Opponents bypassed',
    description: 'How many opponents the pass took out of the game. Below the line when it went back past them.',
    format: 'count',
    unit: ['bypassed', 'bypassed'],
    signed: true,
  },
  overall_pressure_start_id: {
    label: 'Pressure on receiving',
    description: 'How much pressure the player was under when they got the ball, from none to very high.',
    format: 'pressure',
    floor: 1,
  },
  n_passing_options: {
    label: 'Passing options',
    description: 'How many teammates offered a pass while the player had the ball.',
    format: 'count',
    unit: ['option', 'options'],
  },
}

export function getMetricLabel(column: string): string {
  return METRIC_COLUMNS[column]?.label ?? column
}

export function getMetricDescription(column: string): string | undefined {
  return METRIC_COLUMNS[column]?.description
}

// A percentage for chances, a whole number for counts and the level for pressure; otherwise two
// decimals, or three below 0.1 so small values don't all read as 0.0x.
export function formatMetric(format: MetricFormat, value: number): string {
  if (format === 'percent') return `${Math.round(value * 100)}%`
  if (format === 'count') return String(Math.round(value))
  if (format === 'pressure') return PRESSURE_LEVELS[Math.round(value) - 1] ?? String(value)
  const written = value.toFixed(Math.abs(value) >= 0.1 ? 2 : 3)
  // A tiny value would otherwise read as 0.000 or -0.000.
  return Number(written) === 0 ? '0' : written
}

export function formatMetricValue(column: string, value: number): string {
  const metric = METRIC_COLUMNS[column]
  const written = formatMetric(metric?.format ?? 'decimal', value)
  const signed = metric?.signed && written !== '0' && value > 0 ? `+${written}` : written
  return metric?.unit ? `${signed} ${metric.unit[Math.abs(Math.round(value)) === 1 ? 0 : 1]}` : signed
}

export function isSignedMetric(column: string): boolean {
  return METRIC_COLUMNS[column]?.signed ?? false
}

// How far a value is from the column's floor, where its bar starts.
export function getMetricReach(column: string, value: number): number {
  return Math.abs(value - (METRIC_COLUMNS[column]?.floor ?? 0))
}

// The value at the top of a track whose values reach at most `reach` from the floor.
export function getMetricTop(column: string, reach: number): number {
  return (METRIC_COLUMNS[column]?.floor ?? 0) + reach
}

// A value's bar height as a share of the room for it, from -1 to 1; negative bars go below the
// middle line. Unsigned values under the floor get no bar.
export function getBarStrength(column: string, value: number, reach: number): number {
  const metric = METRIC_COLUMNS[column]
  const offset = value - (metric?.floor ?? 0)
  if (reach <= 0 || (offset < 0 && !metric?.signed)) return 0
  const share = Math.min(Math.abs(offset) / reach, 1)
  return Math.sign(offset) * (metric?.sqrt ? Math.sqrt(share) : share)
}

// A graph a metric track can draw.
export type MetricGraph = {
  // Saved on the track as its `column`, so a graph keeps its id once projects use it.
  id: string
  label: string
  // What the graph shows, shown on hover over its label.
  description: string
}

// The graphs offered, in the order they are listed.
export const METRIC_GRAPHS: MetricGraph[] = [
  {
    id: 'momentum',
    label: 'Momentum',
    description:
      "One bar per team possession, home team above the line and away team below. A bar's height is the possession's peak value (the chance of scoring from it), measured against the whole match, so the tallest bars are the match's biggest chances. Press a bar to jump to it.",
  },
]

export function getMetricGraph(id: string): MetricGraph | undefined {
  return METRIC_GRAPHS.find((graph) => graph.id === id)
}

// The name a track is shown under. Metric tracks are named from their graph, so projects saved with
// an older name show the current one.
export function getTrackLabel(timeline: TimelineOption): string {
  return timeline.kind === 'metric' ? getMetricGraph(timeline.column)?.label ?? timeline.label : timeline.label
}

export function getFilterTimelineLabel(eventType: string, subtypes: string[]): string {
  const typeLabel = formatEventValue(eventType)

  if (subtypes.length === 0) {
    return typeLabel
  }
  if (subtypes.length > MAX_SUBTYPES_IN_LABEL) {
    return `${typeLabel} · ${subtypes.length} subtypes`
  }

  return `${typeLabel} · ${subtypes.map(formatEventValue).join(', ')}`
}

type FrameSpan = { frame_start: number; frame_end: number }

// Brings each item onto the clip's frames through every match segment it overlaps, cut to that
// segment, since the footage either side of a segment is not in the clip. An item in two segments
// comes back once for each, with the index of the segment it was placed through.
function placeOnClip<T extends FrameSpan>(items: T[], segments: Segment[]): { item: T; segmentIndex: number }[] {
  return segments.flatMap((segment, segmentIndex) =>
    items
      .filter((item) => item.frame_end >= segment.sourceFrameStart && item.frame_start <= segment.sourceFrameEnd)
      .map((item) => ({
        segmentIndex,
        item: {
          ...item,
          frame_start: Math.max(item.frame_start, segment.sourceFrameStart) - segment.sourceFrameStart + segment.clipStart,
          frame_end: Math.min(item.frame_end, segment.sourceFrameEnd) - segment.sourceFrameStart + segment.clipStart,
        },
      })),
  )
}

const byStartThenEnd = (left: FrameSpan, right: FrameSpan) =>
  left.frame_start - right.frame_start || left.frame_end - right.frame_end

// The match's events that are in the clip, in clip frames and sorted by start. An event shown in two
// segments gets the segment index on its id, so each copy has its own.
export function getClipEvents(matchEvents: Event[] | null, segments: Segment[]): Event[] {
  if (!matchEvents) {
    return []
  }

  return placeOnClip(matchEvents, segments)
    .map(({ item, segmentIndex }) => ({ ...item, event_id: `${item.event_id}@${segmentIndex}` }))
    .sort(byStartThenEnd)
}

export function matchesFilterTimeline(
  timeline: Pick<FilterTimelineOption, 'eventType' | 'subtypes' | 'teamId' | 'playerIds'>,
  event: Event,
): boolean {
  return (
    event.event_type === timeline.eventType &&
    (timeline.subtypes.length === 0 || timeline.subtypes.includes(event.event_subtype)) &&
    (timeline.teamId == null || event.team_id === timeline.teamId) &&
    (!timeline.playerIds?.length || timeline.playerIds.includes(event.player_id))
  )
}

// What an event track is narrowed to, to tell apart tracks of the same events: the team, then the
// player or how many. Null when it shows everyone.
export function describeTrackFilter(
  timeline: Pick<FilterTimelineOption, 'teamId' | 'playerIds'>,
  getTeamName: (teamId: number) => string,
  getPlayerName: (playerId: number) => string,
): string | null {
  const playerIds = timeline.playerIds ?? []
  const parts = [
    timeline.teamId != null ? getTeamName(timeline.teamId) : null,
    playerIds.length === 1 ? getPlayerName(playerIds[0]) : playerIds.length > 1 ? `${playerIds.length} players` : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

// Event columns that can set the bar height of an event track.
export const HEIGHT_COLUMNS = [
  'xthreat',
  'xpass_completion',
  'player_targeted_xthreat',
  'player_targeted_xpass_completion',
  'possession_epv_total',
  'pass_epv_total',
  'n_opponents_bypassed',
  'overall_pressure_start_id',
  'n_passing_options',
] as const

// Returns the event's value for a metric column, or null when it has none. Missing values arrive as
// null; -1 is a real value for some columns (one opponent bypassed backwards).
export function getEventMetricValue(event: Event, column: string): number | null {
  const value = event[column as keyof Event]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
