import type { Event } from '../../types/FrameDataInterfaces'

type TeamColors = {
  homeTeamId?: number
  awayTeamId?: number
  homeTeamColor: string
  awayTeamColor: string
}

export function buildEventVisualisationOverlay(events: Event[], lineColor: string, teamColors: TeamColors) {
  const { homeTeamId, awayTeamId, homeTeamColor, awayTeamColor } = teamColors
  return events.map((event) => {
    const markerColor =
      event.team_id === homeTeamId ? homeTeamColor : event.team_id === awayTeamId ? awayTeamColor : lineColor

    return {
      x: [event.x_start, event.x_end],
      y: [event.y_start, event.y_end],
      type: 'scatter',
      mode: 'lines+markers',
      hovertemplate: `${event.event_type}${event.event_subtype ? ` - ${event.event_subtype}` : ''}<extra></extra>`,
      marker: {
        size: 6,
        color: markerColor,
      },
      line: {
        color: lineColor,
        width: 2,
        dash: 'dot',
      },
    }
  })
}
