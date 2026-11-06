import type { MatchData } from '../types/MatchDataInterfaces'

const FRAME_RATE = 10 // Tracking frames per second

// Where each period's clock starts, in minutes: 0, 45, then 90 and 105 for extra time.
const PERIOD_START_MINUTES: Record<number, number> = { 1: 0, 2: 45, 3: 90, 4: 105 }

type MatchPeriods = MatchData['match_periods']

// The match clock at a tracking frame, in seconds, as the events write it: each period's clock
// starts at its usual minute and runs on through stoppage time (so 46:10 rather than 45+1:10).
// Null when the frame is in no period, or the periods are not known yet.
export function matchClockSecondsAt(frame: number, periods: MatchPeriods | null | undefined): number | null {
  const period = periods?.find((p) => frame >= p.start_frame && frame <= p.end_frame)
  if (!period) return null
  return (PERIOD_START_MINUTES[period.period] ?? 0) * 60 + (frame - period.start_frame) / FRAME_RATE
}

// "MM:SS".
export function formatClock(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

// The match clock at a tracking frame as "MM:SS", or "--:--" outside the periods.
export function formatMatchTime(frame: number, periods: MatchPeriods | null | undefined): string {
  const seconds = matchClockSecondsAt(frame, periods)
  return seconds === null ? '--:--' : formatClock(seconds)
}

// The playhead against the clip's length, as "MM:SS / MM:SS".
export function formatClipTime(clipFrame: number, clipEnd: number): string {
  return `${formatClock(clipFrame / FRAME_RATE)} / ${formatClock(clipEnd / FRAME_RATE)}`
}

// A length of play from its frame count, as "M:SS": "0:13", "1:05".
export function formatFrameDuration(frames: number): string {
  const seconds = Math.max(Math.round(frames / FRAME_RATE), 0)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
