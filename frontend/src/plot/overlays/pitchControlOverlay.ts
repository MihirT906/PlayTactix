import { PITCH_CONTROL_COLS, PITCH_CONTROL_ROWS, PITCH_LENGTH, PITCH_WIDTH } from '../pitchControl'
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

// A filled contour of a pitch control grid (see computePitchControl): home colour where the home team
// controls the space, away colour where the away team does, a blend of the two where it is contested.
export function buildPitchControlOverlay(
  pitchControl: number[][] | null,
  matchData: MatchData | null,
  config: PitchControlOverlayConfig,
) {
  if (!pitchControl) {
    return null
  }

  const homeTeamColor = config['homeTeamColor'] || normalizeColor(matchData?.home_team_kit?.jersey_color, '#DC2626')
  const awayTeamColor = config['awayTeamColor'] || normalizeColor(matchData?.away_team_kit?.jersey_color, '#2563EB')
  const blendedColor = blendHexColors(awayTeamColor, homeTeamColor, 0.5)

  return [{
    type: 'contour',
    z: pitchControl,
    x0: -PITCH_LENGTH / 2,
    dx: PITCH_LENGTH / (PITCH_CONTROL_COLS - 1),
    y0: -PITCH_WIDTH / 2,
    dy: PITCH_WIDTH / (PITCH_CONTROL_ROWS - 1),
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
}
