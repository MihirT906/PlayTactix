import { formatEventValue } from '../../constants/eventData'
import {
  getBarStrength,
  getEventMetricValue,
  getMetricReach,
  getMetricTop,
  isSignedMetric,
  getMetricDescription,
  getMetricGraph,
  getMetricLabel,
  matchesFilterTimeline,
} from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import type { FilterTimelineOption, TimelineOption } from '../../types/TimelineOption'
import { getMomentumStrength, getTeamPossessions, type MomentumScale, type TeamPossession } from './momentum'

export const TIMELINE_LANE_HEIGHT = 22
export const TIMELINE_CHART_HEIGHT = 64
export const TIMELINE_CHART_PADDING = 6
export const EVENT_FILL_OPACITY = 0.35

type FrameRange = { start: number; end: number }

// An event placed horizontally on a track, as percentages of the timeline's scale.
export type PositionedEvent = Event & {
  leftPercent: number
  widthPercent: number
}

export type LaneEvent = PositionedEvent & { laneIndex: number }

// `value` is null when the event has none for the track's bar-height column; `strength` is its bar's
// height as a share of the room for it, from -1 (below a middle line) to 1.
export type ValueEvent = PositionedEvent & { value: number | null; strength: number }

type RowBase = {
  key: string
  label: string
  // What the row's values mean, shown on hover over its label.
  description?: string
  // The track the row is drawn for; a track split by subtype draws several rows.
  timelineId: string
}

type EventRowBase = RowBase & {
  // Whether the row can hold more than one subtype, so events need theirs spelled out.
  showSubtype: boolean
}

// Events as fixed-height bars, stacked into lanes where they overlap.
export type LaneRow = EventRowBase & {
  kind: 'lanes'
  events: LaneEvent[]
  laneCount: number
}

// Events as columns whose height follows a metric `column`; `max` is the value at the top of the
// track. A `signed` row draws from a middle line, with `-max` at the bottom.
export type ValueRow = EventRowBase & {
  kind: 'value'
  column: string
  events: ValueEvent[]
  max: number
  signed: boolean
}

// A team possession placed on the scale; `strength` is its bar's height, from 0 to 1.
export type MomentumBar = TeamPossession & {
  leftPercent: number
  widthPercent: number
  strength: number
}

// One bar per team possession, the home team's above the middle line and the away team's below.
export type MomentumRow = RowBase & {
  kind: 'momentum'
  bars: MomentumBar[]
  // The team drawn above the line; null when the teams are not known, and every bar goes above.
  upperTeamId: number | null
}

export type TimelineRow = LaneRow | ValueRow | MomentumRow

export function getRowHeight(row: TimelineRow): number {
  if (row.kind === 'lanes') return row.laneCount * TIMELINE_LANE_HEIGHT
  return TIMELINE_CHART_HEIGHT
}

// `value` is the event's metric value, already written out for its column.
export function getEventLabel(event: Event, showSubtype: boolean, value: string | null = null): string {
  const parts = [event.player_name]

  if (showSubtype && event.event_subtype) parts.push(formatEventValue(event.event_subtype))
  if (value != null) parts.push(value)

  return parts.join(' · ')
}

// A frame range cut to the clip, then placed on the scale, which can run on past the clip's end.
function placeOnScale(frameStart: number, frameEnd: number, clipRange: FrameRange, scale: FrameRange) {
  const span = Math.max(scale.end - scale.start, 1)
  const visibleStart = Math.max(frameStart, clipRange.start)
  const widthPercent = ((Math.min(frameEnd, clipRange.end) - visibleStart) / span) * 100

  return {
    leftPercent: ((visibleStart - scale.start) / span) * 100,
    widthPercent: Math.max(widthPercent, 0.6),
  }
}

function positionEvent(event: Event, clipRange: FrameRange, scale: FrameRange): PositionedEvent {
  return { ...event, ...placeOnScale(event.frame_start, event.frame_end, clipRange, scale) }
}

// Expects events sorted by start frame; each goes in the first lane that is free by then.
function buildLaneRow(base: EventRowBase, events: Event[], clipRange: FrameRange, scale: FrameRange): LaneRow {
  const laneEndFrames: number[] = []

  const laneEvents = events.map((event) => {
    let laneIndex = laneEndFrames.findIndex((endFrame) => endFrame <= event.frame_start)

    if (laneIndex === -1) {
      laneIndex = laneEndFrames.length
      laneEndFrames.push(event.frame_end)
    } else {
      laneEndFrames[laneIndex] = event.frame_end
    }

    return { ...positionEvent(event, clipRange, scale), laneIndex }
  })

  return { ...base, kind: 'lanes', events: laneEvents, laneCount: Math.max(laneEndFrames.length, 1) }
}

function buildValueRow(
  base: EventRowBase,
  events: Event[],
  clipRange: FrameRange,
  scale: FrameRange,
  column: string,
  reach: number,
): ValueRow {
  return {
    ...base,
    kind: 'value',
    column,
    events: events.map((event) => {
      const value = getEventMetricValue(event, column)
      return {
        ...positionEvent(event, clipRange, scale),
        value,
        strength: value == null ? 0 : getBarStrength(column, value, reach),
      }
    }),
    max: getMetricTop(column, reach),
    signed: isSignedMetric(column),
  }
}

function buildFilterRows(
  timeline: FilterTimelineOption,
  sourceEvents: Event[],
  filterLabel: string | null,
  clipRange: FrameRange,
  scale: FrameRange,
): TimelineRow[] {
  const matchingEvents = sourceEvents.filter((event) => matchesFilterTimeline(timeline, event))
  const withFilter = (label: string) => (filterLabel ? `${label} · ${filterLabel}` : label)
  const heightColumn = timeline.heightBy
  // One scale for the whole track, so split rows stay comparable with each other.
  const reach = heightColumn
    ? Math.max(0, ...matchingEvents.map((event) => {
        const value = getEventMetricValue(event, heightColumn)
        return value == null ? 0 : getMetricReach(heightColumn, value)
      }))
    : 0

  const buildRow = (base: EventRowBase, events: Event[]) =>
    heightColumn
      ? buildValueRow({ ...base, description: getMetricDescription(heightColumn) }, events, clipRange, scale, heightColumn, reach)
      : buildLaneRow(base, events, clipRange, scale)

  const mergedRow = buildRow(
    {
      key: timeline.id,
      timelineId: timeline.id,
      label: withFilter(heightColumn ? `${timeline.label} · ${getMetricLabel(heightColumn)}` : timeline.label),
      showSubtype: timeline.subtypes.length !== 1,
    },
    matchingEvents,
  )

  if (!timeline.splitBySubtype) {
    return [mergedRow]
  }

  // With no subtypes picked, split by whichever ones occur in the clip.
  const subtypes =
    timeline.subtypes.length > 0
      ? timeline.subtypes
      : Array.from(new Set(matchingEvents.map((event) => event.event_subtype).filter(Boolean))).sort()

  if (subtypes.length === 0) {
    return [mergedRow]
  }

  return subtypes.map((subtype) =>
    buildRow(
      {
        key: `${timeline.id}:${subtype}`,
        timelineId: timeline.id,
        label: withFilter(`${formatEventValue(timeline.eventType)} · ${formatEventValue(subtype)}`),
        showSubtype: false,
      },
      matchingEvents.filter((event) => event.event_subtype === subtype),
    ),
  )
}

export type TimelineRowSources = {
  // The events in the clip, in clip frames and sorted by start.
  events: Event[]
  // What an event track is narrowed to, added to its label; null when it shows everyone.
  describeFilter: (timeline: FilterTimelineOption) => string | null
  // The match's two teams, home first.
  teamIds: number[]
  // What momentum bars are measured against, taken from the whole match.
  momentumScale: MomentumScale
}

// Turns the visible timelines into drawable rows, placed as percentages of `scale`.
export function buildTimelineRows(
  timelines: TimelineOption[],
  { events: clipEvents, describeFilter, teamIds, momentumScale }: TimelineRowSources,
  clipRange: FrameRange,
  scale: FrameRange = clipRange,
): TimelineRow[] {
  return timelines
    .filter((timeline) => !timeline.hidden)
    .flatMap((timeline): TimelineRow[] => {
      const { id: key } = timeline

      if (timeline.kind === 'filter') {
        return buildFilterRows(timeline, clipEvents, describeFilter(timeline), clipRange, scale)
      }

      // A graph no longer offered draws nothing.
      const graph = getMetricGraph(timeline.column)
      if (!graph) return []

      return [{
        kind: 'momentum',
        key,
        timelineId: key,
        label: graph.label,
        description: graph.description,
        upperTeamId: teamIds[0] ?? null,
        bars: getTeamPossessions(clipEvents).map((possession) => ({
          ...possession,
          ...placeOnScale(possession.frameStart, possession.frameEnd, clipRange, scale),
          strength: getMomentumStrength(possession.peak, momentumScale),
        })),
      }]
    })
}
