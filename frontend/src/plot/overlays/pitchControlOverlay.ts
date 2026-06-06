import { useStyleConfig } from '../../context/StyleConfigContext'
import type { FrameData } from '../../types/FrameDataInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'

const toHex = (value: number) => value.toString(16).padStart(2, '0')

const blendHexColors = (first: string, second: string, weight = 0.5) => {
  const normalize = (color: string) => {
    const hex = color.trim().replace('#', '')
    return /^[0-9a-fA-F]{6}$/.test(hex) ? hex : null
  }

  const firstHex = normalize(first)
  const secondHex = normalize(second)

  if (!firstHex || !secondHex) {
    return '#BFBFBF'
  }

  const firstRgb = [
    Number.parseInt(firstHex.slice(0, 2), 16),
    Number.parseInt(firstHex.slice(2, 4), 16),
    Number.parseInt(firstHex.slice(4, 6), 16),
  ]

  const secondRgb = [
    Number.parseInt(secondHex.slice(0, 2), 16),
    Number.parseInt(secondHex.slice(2, 4), 16),
    Number.parseInt(secondHex.slice(4, 6), 16),
  ]

  const mixed = firstRgb.map((channel, index) =>
    Math.round(channel * (1 - weight) + secondRgb[index] * weight)
  )

  return `#${toHex(mixed[0])}${toHex(mixed[1])}${toHex(mixed[2])}`
}

const normalizeColor = (color: string | undefined, fallback: string) => {
  if (typeof color !== 'string' || color.trim().length === 0) {
    return fallback
  }

  return color.trim()
}

export type PitchControlOverlayConfig = {
  homeTeamColor?: string;
  awayTeamColor?: string;
}

export async function buildPitchControlOverlay(
  frameData: FrameData | null,
  matchData: MatchData | null,
  config: PitchControlOverlayConfig,
) {
  if (!frameData) {
    return null
  }

  try {
    const pitchControl = frameData.overlays?.pitch_control?.data
    if (!pitchControl) {
      return null
    }
    const homeTeamColor = config['homeTeamColor'] || normalizeColor(matchData?.home_team_kit?.jersey_color, '#DC2626')
    const awayTeamColor = config['awayTeamColor'] || normalizeColor(matchData?.away_team_kit?.jersey_color, '#2563EB')
    // const awayColor = normalizeColor(matchData?.away_team_kit?.jersey_color, '#2563EB')
    // const homeColor = normalizeColor(matchData?.home_team_kit?.jersey_color, '#DC2626')

    const rows = 68
    const cols = 106

    const blendedColor = blendHexColors(awayTeamColor, homeTeamColor, 0.5)

    return [{
      type: 'contour',
      z: pitchControl,
      x0: -53,
      dx: 106 / (cols - 1),
      y0: -34,
      dy: 68 / (rows - 1),
      hoverinfo: 'skip',
      showscale: false,
      opacity: 0.4,
      contours: {
        // showlabels: true,
        coloring: 'fill',
        showlines: true,
      },
      colorscale: [
        [0, homeTeamColor],
        [0.5, blendedColor],
        [1, awayTeamColor],
      ],
    }]
  } catch (error) {
    console.error('Error fetching pitch control overlay:', error)
    return null
  }
}