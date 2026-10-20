import { formatEventValue } from '../constants/eventData'
import type { Segment } from '../types/ClipInterfaces'
import type { Event } from '../types/FrameDataInterfaces'
import type { PhasesOfPlay } from '../types/KeyMomentsDataInterfaces'
import type { AggregationMethod, FilterTimelineOption, InsightFilter, TimelineOption } from '../types/TimelineOption'

const MAX_SUBTYPES_IN_LABEL = 2

type MetricColumn = {
  label: string
  // What the value means, shown on hover.
  description: string
  // Chances read best as percentages; xThreat is a small decimal.
  format: 'percent' | 'decimal'
}

// How each metric column is named and its values written wherever a track shows them.
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
  xloss_player_possession: {
    label: 'Loss risk',
    description: 'Chance of losing the ball, at the start, end and peak of each possession.',
    format: 'percent',
  },
  xshot_player_possession: {
    label: 'Shot chance',
    description: 'Chance of the possession leading to a shot, at its start, end and peak.',
    format: 'percent',
  },
}

export function getMetricLabel(column: string): string {
  return METRIC_COLUMNS[column]?.label ?? column
}

export function getMetricDescription(column: string): string | undefined {
  return METRIC_COLUMNS[column]?.description
}

// A percentage for chances; otherwise two decimals, or three below 0.1 so small xThreat values don't
// all read as 0.0x.
export function formatMetricValue(column: string, value: number): string {
  if (METRIC_COLUMNS[column]?.format === 'percent') {
    return `${Math.round(value * 100)}%`
  }
  if (value === 0) return '0'
  return value.toFixed(Math.abs(value) >= 0.1 ? 2 : 3)
}

export type MetricDefinition = {
  column: string
  label: string
  aggregation: AggregationMethod
}

const metric = (column: string, aggregation: AggregationMethod): MetricDefinition => ({
  column,
  label: getMetricLabel(column),
  aggregation,
})

// The metrics a metric track can chart, each with the aggregation it starts with.
export const METRICS: MetricDefinition[] = [
  metric('xpass_completion', 'average'),
  metric('xthreat', 'max'),
  metric('xloss_player_possession', 'band'),
  metric('xshot_player_possession', 'band'),
]

// The name a track is shown under. Metric tracks are named from their column, so projects saved with
// the raw column name show the readable one too.
export function getTrackLabel(timeline: TimelineOption): string {
  return timeline.kind === 'metric' ? getMetricLabel(timeline.column) : timeline.label
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

// A phase of play placed on the clip.
export type ClipPhase = {
  key: string
  frameStart: number
  frameEnd: number
  teamId: number
  inPossessionType: string
  outOfPossessionType: string
  startType: string | null
  endType: string | null
  leadToShot: boolean
  leadToGoal: boolean
}

// The match's phases of play that are in the clip, in clip frames and sorted by start.
export function getClipPhases(phases: PhasesOfPlay[] | null, segments: Segment[]): ClipPhase[] {
  if (!phases) {
    return []
  }

  return placeOnClip(phases, segments)
    .sort((left, right) => byStartThenEnd(left.item, right.item))
    .map(({ item, segmentIndex }) => ({
      key: `${item.phase_index}@${segmentIndex}`,
      frameStart: item.frame_start,
      frameEnd: item.frame_end,
      teamId: item.team_id,
      inPossessionType: item.team_in_possession_phase_type,
      outOfPossessionType: item.team_out_of_possession_phase_type,
      startType: item.start_type,
      endType: item.end_type,
      leadToShot: item.lead_to_shot,
      leadToGoal: item.lead_to_goal,
    }))
}

export function matchesInsightFilter(filter: InsightFilter, event: Event): boolean {
  return (
    (filter.teamId === null || event.team_id === filter.teamId) &&
    (filter.playerIds.length === 0 || filter.playerIds.includes(event.player_id))
  )
}

export function matchesFilterTimeline(
  timeline: Pick<FilterTimelineOption, 'eventType' | 'subtypes'>,
  event: Event,
): boolean {
  return (
    event.event_type === timeline.eventType &&
    (timeline.subtypes.length === 0 || timeline.subtypes.includes(event.event_subtype))
  )
}

// Event columns that can set the bar height of an event track.
export const HEIGHT_COLUMNS = [
  'xthreat',
  'xpass_completion',
  'player_targeted_xthreat',
  'player_targeted_xpass_completion',
] as const

// Returns the event's value for a metric column, or null when it has none (the data uses -1 for missing).
export function getEventMetricValue(event: Event, column: string): number | null {
  const value = event[column as keyof Event]
  return typeof value === 'number' && Number.isFinite(value) && value !== -1 ? value : null
}
