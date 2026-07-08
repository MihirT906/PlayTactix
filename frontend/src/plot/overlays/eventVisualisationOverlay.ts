import type { Event } from '../../types/FrameDataInterfaces'

export function buildEventVisualisationOverlay(events: Event[], color: string) {
  return events.map((event) => ({
    x: [event.x_start, event.x_end],
    y: [event.y_start, event.y_end],
    type: 'scatter',
    mode: 'lines+markers',
    hovertemplate: `${event.event_type}${event.event_subtype ? ` - ${event.event_subtype}` : ''}<extra></extra>`,
    marker: {
      size: 6,
      color,
    },
    line: {
      color,
      width: 2,
      dash: 'dot',
    },
  }))
}
