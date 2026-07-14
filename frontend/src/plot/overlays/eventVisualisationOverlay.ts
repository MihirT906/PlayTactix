import type { Event } from '../../types/FrameDataInterfaces'

type TeamColors = {
  homeTeamId?: number
  awayTeamId?: number
  homeTeamColor: string
  awayTeamColor: string
}

// Coordinates from the backend are already normalized so the direction of attack is
// always +x, regardless of the event's original attacking_side. pass_angle is not
// re-oriented during that normalization, so it needs the same 180 degree flip applied
// to line it back up with the normalized start/end coordinates.
function getPassEndpoint(event: Event): { x: number; y: number } {
  const hasPassVector =
    typeof event.pass_angle === 'number' &&
    Number.isFinite(event.pass_angle) &&
    typeof event.pass_distance === 'number' &&
    Number.isFinite(event.pass_distance)

  if (!hasPassVector) {
    return { x: event.x_end, y: event.y_end }
  }

  const angleDeg = event.attacking_side === 'left_to_right' ? event.pass_angle : event.pass_angle + 180
  const angleRad = (angleDeg * Math.PI) / 180

  return {
    x: event.x_start + event.pass_distance * Math.cos(angleRad),
    y: event.y_start + event.pass_distance * Math.sin(angleRad),
  }
}

const PASS_FADE_STEPS = 8

// Named/hex colors can't take a per-segment alpha directly, so route them through a
// throwaway canvas to resolve to an rgb() triple that we can then re-emit as rgba().
function toRgbaWithAlpha(color: string, alpha: number): string {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return color

  ctx.fillStyle = color
  const resolved = ctx.fillStyle // browser normalizes this to '#rrggbb' or 'rgba(...)'

  const hexMatch = resolved.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hexMatch) {
    const [r, g, b] = hexMatch.slice(1).map((h) => parseInt(h, 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const rgbMatch = resolved.match(/^rgba?\(([^)]+)\)$/)
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1].split(',').map((n) => n.trim())
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return color
}

// pass_distance/pass_angle are noisier the further the ball travels, so rather than draw
// one confident line to an endpoint that's likely off, fade the pass line out over its
// length - it reads as "roughly this direction" instead of "exactly here".
function buildPassFadeSegments(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  hovertemplate: string,
) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  return Array.from({ length: PASS_FADE_STEPS }, (_, i) => {
    const t0 = i / PASS_FADE_STEPS
    const t1 = (i + 1) / PASS_FADE_STEPS
    const alpha = lerp(0.9, 0.05, t1)

    return {
      x: [lerp(x0, x1, t0), lerp(x0, x1, t1)],
      y: [lerp(y0, y1, t0), lerp(y0, y1, t1)],
      type: 'scatter',
      mode: 'lines',
      hovertemplate,
      showlegend: false,
      line: {
        color: toRgbaWithAlpha(color, alpha),
        width: 1,
      },
    }
  })
}

export function buildEventVisualisationOverlay(events: Event[], lineColor: string, teamColors: TeamColors) {
  const { homeTeamId, awayTeamId, homeTeamColor, awayTeamColor } = teamColors
  return events.flatMap((event) => {
    const markerColor =
      event.team_id === homeTeamId ? homeTeamColor : event.team_id === awayTeamId ? awayTeamColor : lineColor
    const hovertemplate = `${event.event_type}${event.event_subtype ? ` - ${event.event_subtype}` : ''}<extra></extra>`
    const { x: passEndX, y: passEndY } = getPassEndpoint(event)

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

    const passSegments = buildPassFadeSegments(event.x_end, event.y_end, passEndX, passEndY, markerColor, hovertemplate)

    return [eventSegment, ...passSegments]
    // return [eventSegment]
  })
}
