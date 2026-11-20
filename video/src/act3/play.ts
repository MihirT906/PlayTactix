// Act 3's move, choreographed in pitch metres (x along the pitch, y across, blue attacks +x; red's goal is at
// x = 52.5). Everything is a pure function of move time m (seconds), so any beat can play, pause or replay it.
//
// The story: blue 7 hugs the touchline and drags red's left-back (2) wide, the channel between him and the left
// centre-back (4) opens, blue 8 slips blue 11 into it, and 11 cuts inside and scores.
import type { Pt } from '../anim'

export type Team = 'b' | 'r'
type Keys = [m: number, x: number, y: number][]

export const MOVE_END = 5.6 // the clip's length, in move time

// Key events (move time).
export const PASS_1 = { from: 0.0, to: 0.8 } // 10 → 8
export const KEY_PASS = { from: 2.0, to: 2.9 } // 8 → 11, into the channel
export const SHOT = { from: 4.0, to: 4.3 } // 11 scores
export const PAUSE_AT = 1.6 // where 3.2 pauses to show the passing options

const ROSTER: { team: Team; num: number; keys: Keys }[] = [
  // Blue
  { team: 'b', num: 1, keys: [[0, -46, 0], [5.6, -43, 1]] },
  { team: 'b', num: 2, keys: [[0, 2, -24], [2.5, 12, -26], [5.6, 18, -25]] },
  { team: 'b', num: 4, keys: [[0, -10, -8], [5.6, -3, -7]] },
  { team: 'b', num: 5, keys: [[0, -10, 8], [5.6, -3, 7]] },
  { team: 'b', num: 3, keys: [[0, -4, 24], [5.6, 6, 25]] },
  { team: 'b', num: 6, keys: [[0, 4, -1], [2.5, 9, -2], [5.6, 14, -1]] },
  { team: 'b', num: 10, keys: [[0, 5, 6], [1.0, 9, 7], [2.0, 14, 7], [4.0, 22, 6], [5.6, 26, 5]] },
  { team: 'b', num: 8, keys: [[0, 12, -3], [0.8, 13, -4], [1.4, 16, -5.5], [2.0, 19, -7], [3.0, 24, -7], [5.6, 30, -6]] },
  { team: 'b', num: 11, keys: [[0, 27, -11], [1.2, 28, -11.5], [1.9, 30, -13], [2.9, 39, -17], [3.5, 42.5, -14], [4.0, 45, -11], [4.6, 47, -15], [5.6, 49, -27]] },
  { team: 'b', num: 9, keys: [[0, 34, 2], [2.0, 37, 3], [3.6, 43, 3], [4.2, 46, 2], [5.6, 47, -6]] },
  { team: 'b', num: 7, keys: [[0, 30, -26], [1.6, 34, -31], [2.9, 39, -30], [4.0, 43, -28], [5.6, 47, -27]] },
  // Red
  { team: 'r', num: 1, keys: [[0, 50, 0], [3.8, 50, -1.5], [4.2, 51, -3.5], [5.6, 51.5, -3]] },
  { team: 'r', num: 2, keys: [[0, 37, -15], [1.6, 37, -25], [2.9, 39, -25], [4.0, 43, -20], [5.6, 45, -21]] },
  { team: 'r', num: 4, keys: [[0, 37, -5], [1.9, 37, -4], [2.9, 40, -9], [4.0, 44, -8], [5.6, 46, -8]] },
  { team: 'r', num: 5, keys: [[0, 37, 5], [1.9, 37, 4], [2.9, 42, 1], [4.0, 45, 1], [5.6, 46, 1]] },
  { team: 'r', num: 3, keys: [[0, 36, 16], [1.9, 37, 13], [4.0, 41, 10], [5.6, 42, 10]] },
  { team: 'r', num: 6, keys: [[0, 27, -6], [1.9, 22, -7.5], [3.0, 24, -8], [5.6, 28, -8]] },
  { team: 'r', num: 8, keys: [[0, 26, 6], [1.9, 24, 4], [4.0, 28, 2], [5.6, 30, 2]] },
  { team: 'r', num: 10, keys: [[0, 17, 1], [1.9, 15, -1], [5.6, 18, 2]] },
  { team: 'r', num: 7, keys: [[0, 14, 14], [5.6, 15, 12]] },
  { team: 'r', num: 9, keys: [[0, 4, -6], [5.6, 7, -5]] },
  { team: 'r', num: 11, keys: [[0, -2, 6], [5.6, 1, 4]] },
]

export const PLAYERS = ROSTER.map(({ team, num }) => ({ team, num }))
export const idx = (team: Team, num: number) => ROSTER.findIndex((p) => p.team === team && p.num === num)

export const RUNNER = idx('b', 11)
export const PASSER = idx('b', 8)
/** Red's back four, from left-back (bottom of the screen) across. */
export const BACK_FOUR = [2, 4, 5, 3].map((n) => idx('r', n))
/** Red's back six, for Team Shape. */
export const BACK_SIX = [...BACK_FOUR, idx('r', 6), idx('r', 8)]
/** Blue 8's passing options at the pause, with the chance each pass is completed. */
export const PASS_OPTIONS: { to: number; p: number }[] = [
  { to: idx('b', 10), p: 0.82 },
  { to: RUNNER, p: 0.64 },
  { to: idx('b', 9), p: 0.31 },
]

/** Smooth curve through the keys (cubic Hermite with Catmull-Rom tangents), held at the ends. */
function spline(m: number, keys: Keys): Pt {
  if (m <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] }
  const last = keys[keys.length - 1]
  if (m >= last[0]) return { x: last[1], y: last[2] }
  let i = 0
  while (m > keys[i + 1][0]) i++
  const k0 = keys[Math.max(0, i - 1)]
  const k1 = keys[i]
  const k2 = keys[i + 1]
  const k3 = keys[Math.min(keys.length - 1, i + 2)]
  const h = k2[0] - k1[0]
  const t = (m - k1[0]) / h
  const tan = (a: typeof k1, b: typeof k1, j: 1 | 2) => ((b[j] - a[j]) / Math.max(1e-6, b[0] - a[0])) * h
  const at = (j: 1 | 2) => {
    const m1 = k0 === k1 ? 0 : tan(k0, k2, j)
    const m2 = k3 === k2 ? 0 : tan(k1, k3, j)
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * k1[j] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[j] + (t3 - t2) * m2
  }
  return { x: at(1), y: at(2) }
}

export function playerPos(i: number, m: number): Pt {
  const p = spline(m, ROSTER[i].keys)
  // A little life, so nobody stands perfectly still.
  const sway = i === idx('b', 1) || i === idx('r', 1) ? 0.2 : 0.45
  return { x: p.x + sway * Math.sin(m * 1.9 + i * 1.7), y: p.y + sway * Math.sin(m * 1.3 + i * 2.3) }
}

const foot = (i: number, m: number): Pt => {
  const p = playerPos(i, m)
  return { x: p.x + (ROSTER[i].team === 'b' ? 0.8 : -0.8), y: p.y }
}
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

const GOAL_MOUTH: Pt = { x: 52.7, y: -1.6 }
const NET: Pt = { x: 54.2, y: -1.3 }

export function ballPos(m: number): Pt {
  const p10 = idx('b', 10)
  if (m < PASS_1.from) return foot(p10, m)
  if (m < PASS_1.to) return lerpPt(foot(p10, PASS_1.from), foot(PASSER, PASS_1.to), (m - PASS_1.from) / (PASS_1.to - PASS_1.from))
  if (m < KEY_PASS.from) return foot(PASSER, m)
  if (m < KEY_PASS.to) return lerpPt(foot(PASSER, KEY_PASS.from), foot(RUNNER, KEY_PASS.to), (m - KEY_PASS.from) / (KEY_PASS.to - KEY_PASS.from))
  if (m < SHOT.from) return foot(RUNNER, m)
  if (m < SHOT.to) return lerpPt(foot(RUNNER, SHOT.from), GOAL_MOUTH, (m - SHOT.from) / (SHOT.to - SHOT.from))
  return lerpPt(GOAL_MOUTH, NET, clamp01((m - SHOT.to) / 0.12))
}

/** Who has the ball, or null while it's travelling (or in the net). */
export function holder(m: number): number | null {
  if (m < PASS_1.from) return idx('b', 10)
  if (m >= PASS_1.to && m < KEY_PASS.from) return PASSER
  if (m >= KEY_PASS.to && m < SHOT.from) return RUNNER
  return null
}

/** xThreat as the move goes: the chance it ends in a goal from where the ball is. Steps up with each touch. */
const XT: [m: number, v: number][] = [
  [0, 0.04],
  [PASS_1.to, 0.11],
  [KEY_PASS.to, 0.27],
  [3.6, 0.58],
]
export const XT_MAX = 0.7
export function xThreat(m: number): number {
  let v = XT[0][1]
  for (const [k, val] of XT) if (m >= k) v = val
  return v
}
/** The move time of the most recent xThreat step at or before m. */
export function xThreatStep(m: number): number {
  let s = -Infinity
  for (const [k] of XT) if (m >= k && k > 0) s = k
  return s
}
/** A smoothed version for the graph: each step ramps over 0.15s. */
export function xThreatCurve(m: number): number {
  let v = XT[0][1]
  for (let i = 1; i < XT.length; i++) {
    const t = clamp01((m - XT[i][0]) / 0.15)
    v += (XT[i][1] - XT[i - 1][1]) * t
  }
  return v
}
