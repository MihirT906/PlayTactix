import { formatEventValue } from '../../constants/eventData'
import {
  getEventMetricValue,
  getMetricDescription,
  getMetricLabel,
  matchesFilterTimeline,
  matchesInsightFilter,
  type ClipPhase,
} from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import type { FilterTimelineOption, InsightFilter, MetricTimelineOption, TimelineOption } from '../../types/TimelineOption'

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

// `value` is null when the event has none for the track's bar-height column.
export type ValueEvent = PositionedEvent & { value: number | null }

export type MetricPoint = { frame: number; value: number | null }

export type PossessionBand = {
  frameStart: number
  frameEnd: number
  start: number
  end: number
  max: number
}

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

// Events as columns whose height follows a metric `column`; `max` is the highest value in the clip.
export type ValueRow = EventRowBase & {
  kind: 'value'
  column: string
  events: ValueEvent[]
  max: number
}

export type MetricRow = RowBase & {
  kind: 'metric'
  column: string
  points: MetricPoint[]
  min: number
  max: number
}

export type PossessionBandRow = RowBase & {
  kind: 'possessionBand'
  column: string
  bands: PossessionBand[]
  min: number
  max: number
}

export type PositionedPhase = ClipPhase & {
  leftPercent: number
  widthPercent: number
}

export type PhaseRow = RowBase & {
  kind: 'phases'
  phases: PositionedPhase[]
}

export type TimelineRow = LaneRow | ValueRow | MetricRow | PossessionBandRow | PhaseRow

export function getRowHeight(row: TimelineRow): number {
  if (row.kind === 'lanes') return row.laneCount * TIMELINE_LANE_HEIGHT
  if (row.kind === 'phases') return TIMELINE_LANE_HEIGHT
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
  max: number,
): ValueRow {
  return {
    ...base,
    kind: 'value',
    column,
    events: events.map((event) => ({ ...positionEvent(event, clipRange, scale), value: getEventMetricValue(event, column) })),
    max,
  }
}

function buildFilterRows(
  timeline: FilterTimelineOption,
  sourceEvents: Event[],
  filter: InsightFilter,
  clipRange: FrameRange,
  scale: FrameRange,
): TimelineRow[] {
  const matchingEvents = sourceEvents.filter(
    (event) => matchesFilterTimeline(timeline, event) && matchesInsightFilter(filter, event),
  )
  const heightColumn = timeline.heightBy
  // One scale for the whole track, so split rows stay comparable with each other.
  const max = heightColumn
    ? Math.max(0, ...matchingEvents.map((event) => getEventMetricValue(event, heightColumn) ?? 0))
    : 0

  const buildRow = (base: EventRowBase, events: Event[]) =>
    heightColumn
      ? buildValueRow({ ...base, description: getMetricDescription(heightColumn) }, events, clipRange, scale, heightColumn, max)
      : buildLaneRow(base, events, clipRange, scale)

  const mergedRow = buildRow(
    {
      key: timeline.id,
      timelineId: timeline.id,
      label: heightColumn ? `${timeline.label} · ${getMetricLabel(heightColumn)}` : timeline.label,
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
        label: `${formatEventValue(timeline.eventType)} · ${formatEventValue(subtype)}`,
        showSubtype: false,
      },
      matchingEvents.filter((event) => event.event_subtype === subtype),
    ),
  )
}

function computeMetricPoints(
  timeline: MetricTimelineOption,
  sourceEvents: Event[],
  clipRange: FrameRange,
): { points: MetricPoint[]; min: number; max: number } {
  const column = timeline.column as keyof Event
  const eventsWithValue = sourceEvents.filter(
    (e) => e[column] != null && typeof e[column] === 'number' && e[column] !== -1,
  )

  if (eventsWithValue.length === 0) return { points: [], min: 0, max: 1 }

  const boundaries = new Set<number>([clipRange.start, clipRange.end])
  for (const event of eventsWithValue) {
    if (event.frame_start >= clipRange.start && event.frame_start <= clipRange.end) boundaries.add(event.frame_start)
    if (event.frame_end >= clipRange.start && event.frame_end <= clipRange.end) boundaries.add(event.frame_end)
  }

  const points: MetricPoint[] = Array.from(boundaries)
    .sort((a, b) => a - b)
    .map((frame) => {
      const active = eventsWithValue.filter((e) => e.frame_start <= frame && e.frame_end >= frame)

      if (active.length === 0) return { frame, value: null }

      const values = active.map((e) => e[column] as number)
      const value =
        timeline.aggregation === 'max'
          ? Math.max(...values)
          : timeline.aggregation === 'latest'
            ? values[values.length - 1]
            : values.reduce((sum, v) => sum + v, 0) / values.length

      return { frame, value }
    })

  // Fit the scale to the values in the clip; a constant line falls back to a zero baseline.
  const values = points.flatMap((point) => (point.value == null ? [] : [point.value]))
  if (values.length === 0) return { points, min: 0, max: 1 }

  const max = Math.max(...values)
  const min = Math.min(...values)

  return { points, min: min === max ? Math.min(0, min) : min, max }
}

function computePossessionBands(
  column: string,
  sourceEvents: Event[],
): { bands: PossessionBand[]; min: number; max: number } {
  const startKey = `${column}_start` as keyof Event
  const endKey = `${column}_end` as keyof Event
  const maxKey = `${column}_max` as keyof Event
  const bands: PossessionBand[] = []

  for (const event of sourceEvents) {
    const start = event[startKey]
    const end = event[endKey]
    const max = event[maxKey]

    if (typeof start !== 'number' || typeof end !== 'number' || typeof max !== 'number') continue
    if (start === -1 || end === -1 || max === -1) continue

    bands.push({ frameStart: event.frame_start, frameEnd: event.frame_end, start, end, max })
  }

  if (bands.length === 0) return { bands: [], min: 0, max: 1 }

  // Bands rest on the zero line, so only the top of the scale is fitted to the clip.
  const values = bands.flatMap((band) => [band.start, band.end, band.max])

  return { bands, min: Math.min(0, ...values), max: Math.max(...values) }
}

export type TimelineRowSources = {
  // The events in the clip, in clip frames and sorted by start.
  events: Event[]
  // The phases of play in the clip, in clip frames and sorted by start.
  phases: ClipPhase[]
  // Narrows the event tracks; metric and phase tracks are drawn from every event.
  filter: InsightFilter
}

// Turns the visible timelines into drawable rows, placed as percentages of `scale`.
export function buildTimelineRows(
  timelines: TimelineOption[],
  { events: clipEvents, phases, filter }: TimelineRowSources,
  clipRange: FrameRange,
  scale: FrameRange = clipRange,
): TimelineRow[] {
  return timelines
    .filter((timeline) => !timeline.hidden)
    .flatMap((timeline): TimelineRow[] => {
      const { id: key, label } = timeline

      if (timeline.kind === 'phases') {
        return [{
          kind: 'phases',
          key,
          timelineId: key,
          label,
          phases: phases.map((phase) => ({ ...phase, ...placeOnScale(phase.frameStart, phase.frameEnd, clipRange, scale) })),
        }]
      }

      if (timeline.kind === 'filter') {
        return buildFilterRows(timeline, clipEvents, filter, clipRange, scale)
      }

      const metricRow = {
        key,
        timelineId: key,
        label: getMetricLabel(timeline.column),
        description: getMetricDescription(timeline.column),
        column: timeline.column,
      }

      if (timeline.aggregation === 'band') {
        return [{ kind: 'possessionBand', ...metricRow, ...computePossessionBands(timeline.column, clipEvents) }]
      }

      return [{ kind: 'metric', ...metricRow, ...computeMetricPoints(timeline, clipEvents, clipRange) }]
    })
}
