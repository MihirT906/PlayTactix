import type { Event } from '../../types/FrameDataInterfaces'

type TeamColors = {
  homeTeamId?: number
  awayTeamId?: number
  homeTeamColor: string
  awayTeamColor: string
}

export function buildEventVisualisationOverlay(events: Event[], lineColor: string, teamColors: TeamColors) {
  const { homeTeamId, awayTeamId, homeTeamColor, awayTeamColor } = teamColors
  return events.flatMap((event) => {
    const markerColor =
      event.team_id === homeTeamId ? homeTeamColor : event.team_id === awayTeamId ? awayTeamColor : lineColor
    const hovertemplate = `${event.event_type}${event.event_subtype ? ` - ${event.event_subtype}` : ''}<extra></extra>`

    const eventSegment = {
      x: [event.x_start, event.x_end],
      y: [event.y_start, event.y_end],
      type: 'scatter',
      mode: 'lines+markers',
      hovertemplate,
      marker: {
        size: 6,
        color: markerColor,
      },
      line: {
        color: 'yellow',
        width: 2,
        dash: 'dot',
      },
    }

    return [eventSegment]
  })
}
