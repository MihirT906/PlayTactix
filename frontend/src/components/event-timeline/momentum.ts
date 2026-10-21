import { getEventMetricValue } from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'

// A team possession: a run of player possessions by one team, from the first touch to the last.
export type TeamPossession = {
  key: string
  teamId: number
  frameStart: number
  frameEnd: number
  // The highest possession value (the chance of scoring from it) reached during the possession.
  peak: number
}

// A stop longer than this (5 seconds) ends a team possession, even when the same team restarts.
const MAX_GAP_FRAMES = 50

// The match's floor is the peak most possessions reach anyway, just by having the ball.
const FLOOR_QUANTILE = 0.1

// A player possession's value at its most dangerous point, or null when the data has none.
function possessionPeak(event: Event): number | null {
  const values = [
    getEventMetricValue(event, 'possession_epv_for_start'),
    getEventMetricValue(event, 'possession_epv_for_end'),
  ].filter((value): value is number => value !== null)
  return values.length > 0 ? Math.max(...values) : null
}

// Clip events carry the match segment they were placed through after an "@" in their id; a team
// possession never runs across two segments.
const segmentOf = (event: Event) => event.event_id.split('@')[1] ?? ''

// Groups the player possessions in `events` into team possessions. A possession ends when the other
// team touches the ball, play stops for a while, or the clip moves to another segment. Possessions
// with no values are left out.
export function getTeamPossessions(events: Event[]): TeamPossession[] {
  const possessions = events
    .filter((event) => event.event_type === 'player_possession')
    .sort((a, b) => a.frame_start - b.frame_start || a.frame_end - b.frame_end)

  const teamPossessions: TeamPossession[] = []
  let current: (Omit<TeamPossession, 'peak'> & { segment: string; peak: number | null }) | null = null

  const close = () => {
    if (current?.peak == null) return
    const { key, teamId, frameStart, frameEnd, peak } = current
    teamPossessions.push({ key, teamId, frameStart, frameEnd, peak })
  }

  for (const event of possessions) {
    const peak = possessionPeak(event)
    const continues =
      current !== null &&
      current.teamId === event.team_id &&
      current.segment === segmentOf(event) &&
      event.frame_start - current.frameEnd <= MAX_GAP_FRAMES

    if (current !== null && continues) {
      current.frameEnd = Math.max(current.frameEnd, event.frame_end)
      if (peak !== null) current.peak = current.peak === null ? peak : Math.max(current.peak, peak)
      continue
    }

    close()
    current = {
      key: event.event_id,
      teamId: event.team_id,
      frameStart: event.frame_start,
      frameEnd: event.frame_end,
      segment: segmentOf(event),
      peak,
    }
  }
  close()

  return teamPossessions
}

// What bar heights are measured against: the match's floor and its most dangerous possession. Taken
// from the whole match, so a quiet clip shows low bars rather than stretching ordinary play to the top.
export type MomentumScale = { floor: number; max: number }

export function getMomentumScale(matchEvents: Event[]): MomentumScale {
  const peaks = getTeamPossessions(matchEvents)
    .map((possession) => possession.peak)
    .sort((a, b) => a - b)
  if (peaks.length === 0) return { floor: 0, max: 1 }
  return { floor: peaks[Math.floor((peaks.length - 1) * FLOOR_QUANTILE)], max: peaks[peaks.length - 1] }
}

// How tall a possession's bar is, from 0 to 1. The square root lifts the middle, so a half chance
// stands clear of ordinary play while the match's best chance still reaches the top.
export function getMomentumStrength(peak: number, { floor, max }: MomentumScale): number {
  if (max <= floor) return 0
  return Math.sqrt(Math.min(Math.max((peak - floor) / (max - floor), 0), 1))
}
