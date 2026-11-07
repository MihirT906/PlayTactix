import { describe, expect, it } from 'vitest'
import { findMatchClock, formatBroadcastClock, formatMatchClockAt, parseBroadcastClock } from './matchClock'

// A first half that ran to 45+2:00 and a second half that ran to 90+3:00.
const firstHalf = { period: 1, name: 'period_1', start_frame: 10, end_frame: 10 + 47 * 600, duration_frames: 47 * 600, duration_minutes: 47 }
const secondHalf = { period: 2, name: 'period_2', start_frame: 30000, end_frame: 30000 + 48 * 600, duration_frames: 48 * 600, duration_minutes: 48 }
const periods = [firstHalf, secondHalf]

describe('formatBroadcastClock', () => {
  it('shows regular time as it runs and stoppage time after the period', () => {
    expect(formatBroadcastClock(52 * 60 + 10, 2)).toBe('52:10')
    expect(formatBroadcastClock(46 * 60 + 30, 1)).toBe('45+1:30')
    expect(formatBroadcastClock(46 * 60 + 30, 2)).toBe('46:30')
    expect(formatBroadcastClock(92 * 60 + 5, 2)).toBe('90+2:05')
  })

  it('reads the clock at a tracking frame', () => {
    expect(formatMatchClockAt(10 + 46 * 600, periods)).toBe('45+1:00')
    expect(formatMatchClockAt(30000 + 600, periods)).toBe('46:00')
    expect(formatMatchClockAt(5, periods)).toBeNull()
  })
})

describe('parseBroadcastClock', () => {
  it('reads regular and stoppage time', () => {
    expect(parseBroadcastClock('52:10')).toEqual({ minutes: 52, seconds: 10, added: null })
    expect(parseBroadcastClock('52')).toEqual({ minutes: 52, seconds: 0, added: null })
    expect(parseBroadcastClock('45+1:30')).toEqual({ minutes: 45, seconds: 0, added: 90 })
    expect(parseBroadcastClock(' 90 + 2 ')).toEqual({ minutes: 90, seconds: 0, added: 120 })
  })

  it('rejects what is not a clock time', () => {
    expect(parseBroadcastClock('')).toBeNull()
    expect(parseBroadcastClock('52:7')).toBeNull()
    expect(parseBroadcastClock('52:60')).toBeNull()
    expect(parseBroadcastClock('45:10+1')).toBeNull()
    expect(parseBroadcastClock('abc')).toBeNull()
  })
})

describe('findMatchClock', () => {
  const find = (text: string) => findMatchClock(parseBroadcastClock(text)!, periods)

  it('puts stoppage time in the period it follows and plain times in regular time', () => {
    expect(find('45+1:00')).toEqual({ period: firstHalf, frame: 10 + 46 * 600 })
    expect(find('46:00')).toEqual({ period: secondHalf, frame: 30000 + 600 })
    expect(find('30:00')).toEqual({ period: firstHalf, frame: 10 + 30 * 600 })
  })

  it('reads a plain final-whistle time as the end of regular time', () => {
    expect(find('90:00')).toEqual({ period: secondHalf, frame: 30000 + 45 * 600 })
  })

  it('is null for stoppage time the period did not have, or a time past the match', () => {
    expect(find('45+5:00')).toBeNull()
    expect(find('100:00')).toBeNull()
  })
})
