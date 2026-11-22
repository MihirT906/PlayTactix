// The coach cut of breakdown 2 (video/breakdowns/02-the-overlap-coach-cut.md), built on the screen recording in
// public/overlap-recording.mp4. The recording plays in stretches, with holds (freeze frames) between them while the
// coach talks. Everything here is in seconds of the recording ("rec") or seconds into a hold.
//
// Positions are in the recording's own pixels (1844x1124). The plot in the recording maps the pitch as
// rec = (903 + 11.52 x, 625.5 - 11.52 y), with x and y in metres from the centre spot, and this was checked to within
// a pixel against the tracking data. Rec → match time: Brisbane, frame 49396 + (rec - 8) * 10 up to the pause at
// rec 12.6, then 49442 + (rec - 28.5) * 10 after it; Perth, 44196 + (rec - 40) * 10.
import { FPS, type Pt } from '../../anim'

export type Seg = { kind: 'play'; from: number; to: number } | { kind: 'hold'; at: number; dur: number }

// The recording loops back to its start at rec ~54.5, so it ends on the hold at 54.2. Hold lengths follow the script's
// rule for bubbles: at least 1s plus 0.3s per word.
export const SEGMENTS: Seg[] = [
  { kind: 'play', from: 0, to: 1.0 },
  { kind: 'hold', at: 1.0, dur: 14.5 }, // Beat 1: two overlaps
  { kind: 'play', from: 1.0, to: 16.2 },
  { kind: 'hold', at: 16.2, dur: 18.6 }, // Beat 4: the carry (76:59)
  { kind: 'play', from: 16.2, to: 23.4 },
  { kind: 'hold', at: 23.4, dur: 3.7 }, // Beat 5: 2 and 26 step up (what if)
  { kind: 'play', from: 23.4, to: 28.3 },
  { kind: 'hold', at: 28.3, dur: 3.8 }, // Beat 5: Hingert's space (what if)
  { kind: 'play', from: 28.3, to: 32.0 },
  { kind: 'hold', at: 32.0, dur: 8.7 }, // Beat 6: Hingert receives, the box (77:02)
  { kind: 'play', from: 32.0, to: 47.1 },
  { kind: 'hold', at: 47.1, dur: 13.4 }, // Beat 8: Carluccio releases (68:21)
  { kind: 'play', from: 47.1, to: 48.7 },
  { kind: 'hold', at: 48.7, dur: 6.3 }, // Beat 9: Risdon receives (68:23)
  { kind: 'play', from: 48.7, to: 54.2 },
  { kind: 'hold', at: 54.2, dur: 14.0 }, // Beat 11: the lesson
]

const EPS = 1e-6

/** Output seconds at recording time `rec`, plus `k` seconds into the hold at `rec` if there is one. */
export function out(rec: number, k = 0): number {
  let t = 0
  for (const s of SEGMENTS) {
    if (s.kind === 'play') {
      if (rec < s.to - EPS) return t + Math.max(0, rec - s.from)
      t += s.to - s.from
    } else {
      if (Math.abs(rec - s.at) < EPS) return t + k
      t += s.dur
    }
  }
  return t
}

/** Recording time showing at output second `t` (a hold returns the rec it's frozen on). */
export function recAt(t: number): number {
  let acc = 0
  for (const s of SEGMENTS) {
    const len = s.kind === 'play' ? s.to - s.from : s.dur
    if (t < acc + len) return s.kind === 'play' ? s.from + (t - acc) : s.at
    acc += len
  }
  const last = SEGMENTS[SEGMENTS.length - 1]
  return last.kind === 'play' ? last.to : last.at
}

export const TOTAL_SECONDS = SEGMENTS.reduce((t, s) => t + (s.kind === 'play' ? s.to - s.from : s.dur), 0)
export const OVERLAP_COACH_DURATION = Math.round(TOTAL_SECONDS * FPS)

/** Output frame for `out(rec, k)`. */
export const fr = (rec: number, k = 0) => Math.round(out(rec, k) * FPS)

// ---------------- Positions, in recording pixels ----------------

export const POS = {
  // Beat 1 (rec 1.0): the Event Map arrows. Perth's run and carry (events 1_376, 8_788); Brisbane's (1_413, 8_859).
  perthCarry: [{ x: 694, y: 443 }, { x: 507, y: 478 }],
  brisCarry: [{ x: 996, y: 735 }, { x: 1038, y: 800 }],

  // Beat 3 (rec 10–12.6): Hingert and Jelacic as Brisbane play, from the tracking data. Keyed by rec.
  hingertRun: [
    [10.0, { x: 873, y: 740 }],
    [10.5, { x: 884, y: 762 }],
    [11.0, { x: 895, y: 784 }],
    [11.5, { x: 912, y: 807 }],
    [12.0, { x: 936, y: 829 }],
    [12.6, { x: 975, y: 852 }],
  ] as [number, Pt][],

  // Beat 4 (rec 16.2, 76:59): real positions.
  pause: {
    jelacic: { x: 1000, y: 759 },
    hingert: { x: 975, y: 852 },
    white26: { x: 998, y: 828 },
    white2: { x: 1119, y: 760 },
  },
  // The arrow drawn in the app: where Jelacic should have carried it.
  drawnArrow: [{ x: 1026, y: 750 }, { x: 1100, y: 722 }],

  // Beat 5 (rec 23.4 and 28.3): where the players were dragged to.
  whatIf: {
    white2: { x: 1118, y: 740 },
    white26: { x: 1052, y: 801 },
    hingert: { x: 1118, y: 861 },
  },

  // Beat 6 (rec 32.0, 77:02): Hingert receives, and the rectangle drawn ahead of him.
  recv: {
    hingert: { x: 1169, y: 977 },
  },
  brisBox: { left: 1117, top: 857, right: 1345, bottom: 945 },

  // Beat 7 (rec 41–46): Carluccio and Risdon as Perth play, from the tracking data. Keyed by rec.
  carluccioRun: [
    [41.0, { x: 802, y: 497 }],
    [42.0, { x: 742, y: 475 }],
    [43.0, { x: 709, y: 451 }],
    [44.0, { x: 682, y: 438 }],
  ] as [number, Pt][],
  risdonRun: [
    [43.0, { x: 850, y: 419 }],
    [44.0, { x: 764, y: 406 }],
    [45.0, { x: 671, y: 400 }],
    [46.0, { x: 584, y: 399 }],
  ] as [number, Pt][],

  // Beat 8 (rec 47.1, 68:21): Carluccio releases. Brisbane's 21 and 26 are on him; Risdon is in the rectangle.
  release: {
    carluccio: { x: 510, y: 477 },
    risdon: { x: 491, y: 400 },
    orange21: { x: 461, y: 485 },
    orange26: { x: 488, y: 496 },
  },
  perthBox: { left: 356, top: 367, right: 522, bottom: 430 },

  // Beat 9 (rec 48.7, 68:23): Risdon receives. The keeper (orange 1) is the only one goal-side.
  risdonRecv: { x: 363, y: 423 },
  keeper: { x: 317, y: 598 },
} satisfies Record<string, unknown>

