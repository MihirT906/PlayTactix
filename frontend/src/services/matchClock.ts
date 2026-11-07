import type { MatchData } from '../types/MatchDataInterfaces'

export const FRAME_RATE = 10 // Tracking frames per second

// Each period's regular time on the match clock, in minutes: 0-45 and 45-90, then 90-105 and
// 105-120 for extra time. Anything past a period's end is stoppage time.
const PERIOD_MINUTES: Record<number, { start: number; end: number }> = {
  1: { start: 0, end: 45 },
  2: { start: 45, end: 90 },
  3: { start: 90, end: 105 },
  4: { start: 105, end: 120 },
}

const periodStartMinute = (period: number) => PERIOD_MINUTES[period]?.start ?? 0

type MatchPeriods = MatchData['match_periods']
type MatchPeriod = MatchPeriods[number]

// The match clock at a tracking frame, in seconds, as the events write it: each period's clock
// starts at its usual minute and runs on through stoppage time (so 46:10 rather than 45+1:10).
// Null when the frame is in no period, or the periods are not known yet.
export function matchClockSecondsAt(frame: number, periods: MatchPeriods | null | undefined): number | null {
  const period = periods?.find((p) => frame >= p.start_frame && frame <= p.end_frame)
  if (!period) return null
  return periodStartMinute(period.period) * 60 + (frame - period.start_frame) / FRAME_RATE
}

// A running match clock in a period as a broadcast shows it: "52:10", or "45+1:30" in stoppage time.
export function formatBroadcastClock(clockSeconds: number, period: number): string {
  const end = PERIOD_MINUTES[period]?.end
  if (end === undefined || clockSeconds < end * 60) return formatClock(clockSeconds)
  const added = Math.floor(clockSeconds - end * 60)
  return `${end}+${Math.floor(added / 60)}:${String(added % 60).padStart(2, '0')}`
}

// The match clock at a tracking frame in broadcast form; null when the frame is in no period.
export function formatMatchClockAt(frame: number, periods: MatchPeriods | null | undefined): string | null {
  const period = periods?.find((p) => frame >= p.start_frame && frame <= p.end_frame)
  const seconds = matchClockSecondsAt(frame, periods)
  return period && seconds !== null ? formatBroadcastClock(seconds, period.period) : null
}

// A clock time typed in broadcast form: "52:10" (or whole minutes, "52"), or stoppage time as
// "45+1:30" (or "45+2"). Null when it is not one.
export type BroadcastClock = { minutes: number; seconds: number; added: number | null }

export function parseBroadcastClock(text: string): BroadcastClock | null {
  const match = /^\s*(\d+)(?::([0-5]\d))?(?:\s*\+\s*(\d+)(?::([0-5]\d))?)?\s*$/.exec(text)
  if (!match) return null
  const [, minutes, seconds, addedMinutes, addedSeconds] = match
  // Stoppage time follows a whole minute: "45+1:30", not "45:10+1:30".
  if (addedMinutes !== undefined && seconds !== undefined) return null
  return {
    minutes: Number(minutes),
    seconds: Number(seconds ?? 0),
    added: addedMinutes === undefined ? null : Number(addedMinutes) * 60 + Number(addedSeconds ?? 0),
  }
}

// The period a broadcast clock time is in and the tracking frame it falls on, or null when the match
// has no such time. "45+1:30" is first-half stoppage; a plain time is in the period whose regular time
// covers it, so 46:30 is the second half. A plain time at a period's final whistle (90:00) is its end.
export function findMatchClock(clock: BroadcastClock, periods: MatchPeriods): { period: MatchPeriod; frame: number } | null {
  const frameIn = (period: MatchPeriod, clockSeconds: number) => {
    const frame = period.start_frame + Math.round((clockSeconds - periodStartMinute(period.period) * 60) * FRAME_RATE)
    return frame >= period.start_frame && frame <= period.end_frame ? { period, frame } : null
  }

  if (clock.added !== null) {
    const period = periods.find((p) => PERIOD_MINUTES[p.period]?.end === clock.minutes)
    return period ? frameIn(period, clock.minutes * 60 + clock.added) : null
  }

  const clockSeconds = clock.minutes * 60 + clock.seconds
  const regular = periods.find((p) => {
    const minutes = PERIOD_MINUTES[p.period]
    return minutes !== undefined && clockSeconds >= minutes.start * 60 && clockSeconds < minutes.end * 60
  })
  const atFinalWhistle = periods.find((p) => (PERIOD_MINUTES[p.period]?.end ?? -1) * 60 === clockSeconds)
  const period = regular ?? atFinalWhistle
  return period ? frameIn(period, clockSeconds) : null
}

// "MM:SS".
export function formatClock(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

// The match clock at a tracking frame in broadcast form ("52:10", "45+1:30"), or "--:--" outside the periods.
export function formatMatchTime(frame: number, periods: MatchPeriods | null | undefined): string {
  return formatMatchClockAt(frame, periods) ?? '--:--'
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
