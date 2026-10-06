import { formatEventValue } from '../../constants/eventData'
import { getEventMetricValue, matchesFilterTimeline } from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import type { FilterTimelineOption, MetricTimelineOption, TimelineOption } from '../../types/TimelineOption'

export const TIMELINE_LANE_HEIGHT = 22
export const TIMELINE_CHART_HEIGHT = 64
export const TIMELINE_CHART_PADDING = 6
export const EVENT_FILL_OPACITY = 0.35

type ClipRange = { start: number; end: number }

// An event placed horizontally on a track, as percentages of the clip.
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

type EventRowBase = {
  key: string
  label: string
  // Whether the row can hold more than one subtype, so events need theirs spelled out.
  showSubtype: boolean
}

// Events as fixed-height bars, stacked into lanes where they overlap.
export type LaneRow = EventRowBase & {
  kind: 'lanes'
  events: LaneEvent[]
  laneCount: number
}

// Events as columns whose height follows a metric; `max` is the highest value in the clip.
export type ValueRow = EventRowBase & {
  kind: 'value'
  events: ValueEvent[]
  max: number
}

export type MetricRow = {
  kind: 'metric'
  key: string
  label: string
  points: MetricPoint[]
  min: number
  max: number
}

export type PossessionBandRow = {
  kind: 'possessionBand'
  key: string
  label: string
  bands: PossessionBand[]
  min: number
  max: number
}

export type TimelineRow = LaneRow | ValueRow | MetricRow | PossessionBandRow

export function getRowHeight(row: TimelineRow): number {
  return row.kind === 'lanes' ? row.laneCount * TIMELINE_LANE_HEIGHT : TIMELINE_CHART_HEIGHT
}

export function getEventLabel(event: Event, showSubtype: boolean, value: number | null = null): string {
  const parts = [event.player_name]

  if (showSubtype && event.event_subtype) parts.push(formatEventValue(event.event_subtype))
  if (value != null) parts.push(value.toFixed(3))

  return parts.join(' · ')
}

function positionEvent(event: Event, clipRange: ClipRange): PositionedEvent {
  const span = Math.max(clipRange.end - clipRange.start, 1)
  const visibleStart = Math.max(event.frame_start, clipRange.start)
  const widthPercent = ((Math.min(event.frame_end, clipRange.end) - visibleStart) / span) * 100

  return {
    ...event,
    leftPercent: ((visibleStart - clipRange.start) / span) * 100,
    widthPercent: Math.max(widthPercent, 0.6),
  }
}

// Expects events sorted by start frame; each goes in the first lane that is free by then.
function buildLaneRow(base: EventRowBase, events: Event[], clipRange: ClipRange): LaneRow {
  const laneEndFrames: number[] = []

  const laneEvents = events.map((event) => {
    let laneIndex = laneEndFrames.findIndex((endFrame) => endFrame <= event.frame_start)

    if (laneIndex === -1) {
      laneIndex = laneEndFrames.length
      laneEndFrames.push(event.frame_end)
    } else {
      laneEndFrames[laneIndex] = event.frame_end
    }

    return { ...positionEvent(event, clipRange), laneIndex }
  })

  return { ...base, kind: 'lanes', events: laneEvents, laneCount: Math.max(laneEndFrames.length, 1) }
}

function buildValueRow(base: EventRowBase, events: Event[], clipRange: ClipRange, column: string, max: number): ValueRow {
  return {
    ...base,
    kind: 'value',
    events: events.map((event) => ({ ...positionEvent(event, clipRange), value: getEventMetricValue(event, column) })),
    max,
  }
}

function buildFilterRows(timeline: FilterTimelineOption, sourceEvents: Event[], clipRange: ClipRange): TimelineRow[] {
  const matchingEvents = sourceEvents.filter((event) => matchesFilterTimeline(timeline, event))
  const heightColumn = timeline.heightBy
  // One scale for the whole track, so split rows stay comparable with each other.
  const max = heightColumn
    ? Math.max(0, ...matchingEvents.map((event) => getEventMetricValue(event, heightColumn) ?? 0))
    : 0

  const buildRow = (base: EventRowBase, events: Event[]) =>
    heightColumn ? buildValueRow(base, events, clipRange, heightColumn, max) : buildLaneRow(base, events, clipRange)

  const mergedRow = buildRow(
    {
      key: timeline.id,
      label: heightColumn ? `${timeline.label} · ${heightColumn}` : timeline.label,
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
  clipRange: ClipRange,
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

// Turns the visible timelines into drawable rows. `clipEvents` are the events overlapping the
// clip, in clip frames and sorted by start.
export function buildTimelineRows(timelines: TimelineOption[], clipEvents: Event[], clipRange: ClipRange): TimelineRow[] {
  return timelines
    .filter((timeline) => !timeline.hidden)
    .flatMap((timeline): TimelineRow[] => {
      const { id: key, label } = timeline

      if (timeline.kind === 'filter') {
        return buildFilterRows(timeline, clipEvents, clipRange)
      }

      if (timeline.aggregation === 'band') {
        return [{ kind: 'possessionBand', key, label, ...computePossessionBands(timeline.column, clipEvents) }]
      }

      return [{ kind: 'metric', key, label, ...computeMetricPoints(timeline, clipEvents, clipRange) }]
    })
}
