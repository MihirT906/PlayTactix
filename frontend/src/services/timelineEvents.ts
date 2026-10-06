import { formatEventValue } from '../constants/eventData'
import type { Event } from '../types/FrameDataInterfaces'
import type { FilterTimelineOption } from '../types/TimelineOption'

const MAX_SUBTYPES_IN_LABEL = 2

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

// Unique events overlapping the clip, with frames converted from match frames to clip frames.
export function getClipEvents(
  eventsData: Map<number, Event[]> | null,
  clipRange: { start: number; end: number },
  segmentStart: number,
): Event[] {
  if (!eventsData) {
    return []
  }

  const uniqueEvents = new Map<string, Event>()

  for (const frameEvents of eventsData.values()) {
    for (const event of frameEvents) {
      uniqueEvents.set(event.event_id, {
        ...event,
        frame_start: event.frame_start - segmentStart,
        frame_end: event.frame_end - segmentStart,
      })
    }
  }

  return Array.from(uniqueEvents.values())
    .filter((event) => event.frame_end >= clipRange.start && event.frame_start <= clipRange.end)
    .sort((left, right) => {
      if (left.frame_start !== right.frame_start) {
        return left.frame_start - right.frame_start
      }

      return left.frame_end - right.frame_end
    })
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
