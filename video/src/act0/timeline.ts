// Act 0 frame plan (30 fps). Shot numbers match video/script.md.
import { track } from '../anim'

/** A line of text on screen from frame `from` to `to`. */
export type Caption = { from: number; to: number; text: string }

// 0.0 Title card: the opening line, centred on black.
export const TITLE: Caption = { from: 4, to: 46, text: "You've seen the pros break down a play." }
// The couch scene fades up from black as the title fades out.
export const ROOM_IN = { from: 42, to: 56 }

const T0 = 50 // everything below starts this many frames in

export const ACT0_DURATION = T0 + 249 // ~10.0s

export type Channel = { num: number; start: number }

// Each channel gets 2s. The switch happens on `start`; the thumb presses a few frames before.
export const CHANNELS: Channel[] = [
  { num: 4, start: T0 + 15 }, // 0.2 American football
  { num: 7, start: T0 + 75 }, // 0.3 basketball studio
  { num: 9, start: T0 + 135 }, // 0.4 soccer tactics board
]
export const OFF = T0 + 195 // 0.5 switch off
export const PRESS_LEAD = 3

export const PRESSES = [...CHANNELS.map((c) => c.start), OFF].map((s) => s - PRESS_LEAD)

/** The channel on screen at frame f, or null before the first switch and after the TV goes off. */
export function channelAt(f: number): Channel | null {
  if (f < CHANNELS[0].start || f >= OFF) return null
  let current = CHANNELS[0]
  for (const c of CHANNELS) if (f >= c.start) current = c
  return current
}

// How long the static and the picture roll last after each switch.
export const STATIC_FRAMES = 3
export const ROLL_FRAMES = 3
export const OSD_FRAMES = 30

// Camera: a slow push-in on the TV across the three channels, then it holds.
export function camera(f: number) {
  return {
    cx: 960,
    cy: track(f, [[T0, 540], [OFF, 500]]),
    z: track(f, [[T0, 1], [OFF, 1.1]]),
  }
}

// Centred on black once the TV is off.
export const OFF_CAPTION: Caption = { from: OFF + 9, to: OFF + 51, text: 'Ever wanted to do it yourself?' }
