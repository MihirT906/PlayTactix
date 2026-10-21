import type { Segment } from '../../types/ClipInterfaces'
import type { Event } from '../../types/FrameDataInterfaces'
import { clockSecondsAt } from './eventMapOverlay'
import { buildTrailLinks } from './sequenceTrailsOverlay'

type Point = { x: number; y: number }

// How much of the match the passes are counted over: all of it, the clip's match segments, or a span
// of the match clock.
export type PassNetworkWindow = 'match' | 'clip' | 'custom'

export const PASS_NETWORK_WINDOWS: PassNetworkWindow[] = ['match', 'clip', 'custom']

export type PassNetworkConfig = {
  window: PassNetworkWindow
  rangeStartMinute: number // For a 'custom' window: the match clock it runs between, in minutes
  rangeEndMinute: number
  build: 'full' | 'progressive' // The whole window at once, or grown pass by pass up to the frame on screen
  teamId: number | null // One team's network, or both
}

export const DEFAULT_PASS_NETWORK_CONFIG: PassNetworkConfig = {
  window: 'match',
  rangeStartMinute: 0,
  rangeEndMinute: 45,
  build: 'full',
  teamId: null,
}

// A pass that reached a team-mate.
export type CompletedPass = {
  teamId: number
  passerId: number
  receiverId: number
  frame: number // When it was received
  clock: number | null // The match clock when it was received, in seconds
}

// Every completed pass of the match, sorted by the frame it was received. These are the passes the
// sequence trails draw: a possession ending in a pass, followed by a team-mate receiving it.
export function buildCompletedPasses(events: Event[] | null | undefined): CompletedPass[] {
  return buildTrailLinks(events)
    .flatMap((link): CompletedPass[] => {
      const receiver = link.nextEvent
      if (link.kind !== 'pass' || !receiver) return []
      return [
        {
          teamId: link.teamId,
          passerId: link.playerId,
          receiverId: receiver.player_id,
          frame: link.frameEnd,
          clock: clockSecondsAt(receiver, link.frameEnd),
        },
      ]
    })
    .sort((a, b) => a.frame - b.frame)
}

export type PassNetworkPlayback = {
  currentFrame: number // Match frame on screen
  clipFrame: number
  matchSegments: Segment[]
}

type FrameRange = { start: number; end: number } // Inclusive match frames

// The match frames the window covers, given where playback is. Built progressively, it is cut off at
// the frame on screen, and clip segments still to come are left out.
export function passNetworkFrameRanges(config: PassNetworkConfig, playback: PassNetworkPlayback): FrameRange[] {
  const { currentFrame, clipFrame, matchSegments } = playback
  const progressive = config.build === 'progressive'

  if (config.window === 'clip') {
    return matchSegments.flatMap((segment) => {
      if (!progressive || segment.clipEnd < clipFrame) return [{ start: segment.sourceFrameStart, end: segment.sourceFrameEnd }]
      if (segment.clipStart <= clipFrame) return [{ start: segment.sourceFrameStart, end: Math.min(currentFrame, segment.sourceFrameEnd) }]
      return []
    })
  }

  // A 'custom' window is narrowed by the match clock when the passes are counted.
  return [{ start: -Infinity, end: progressive ? currentFrame : Infinity }]
}

// Index of the first pass received at or after `frame`.
function firstPassFrom(passes: CompletedPass[], frame: number): number {
  let low = 0
  let high = passes.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (passes[mid].frame < frame) low = mid + 1
    else high = mid
  }
  return low
}

// The passes inside the frame ranges, as [from, to) index ranges into `passes`, found by binary search.
// Overlapping ranges (a clip showing the same moment twice) are merged so no pass is counted twice.
export function passIndexRanges(passes: CompletedPass[], frameRanges: FrameRange[]): Array<[number, number]> {
  const ranges = frameRanges
    .map(({ start, end }): [number, number] => [firstPassFrom(passes, start), firstPassFrom(passes, end + 1)])
    .filter(([from, to]) => to > from)
    .sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const [from, to] of ranges) {
    const last = merged[merged.length - 1]
    if (last && from <= last[1]) last[1] = Math.max(last[1], to)
    else merged.push([from, to])
  }
  return merged
}

// A key that changes only when the passes picked out do, to recount the network only then.
export const passRangesKey = (ranges: Array<[number, number]>) => ranges.map(([from, to]) => `${from}-${to}`).join(',')

// The passes between two team-mates, both ways. `a` is the lower player id.
export type PassEdge = { key: string; teamId: number; a: number; b: number; count: number }

export function countPassEdges(passes: CompletedPass[], indexRanges: Array<[number, number]>, config: PassNetworkConfig): PassEdge[] {
  const minClock = config.rangeStartMinute * 60
  const maxClock = config.rangeEndMinute * 60
  const edges = new Map<string, PassEdge>()

  for (const [from, to] of indexRanges) {
    for (let i = from; i < to; i++) {
      const pass = passes[i]
      if (config.teamId !== null && pass.teamId !== config.teamId) continue
      if (config.window === 'custom' && (pass.clock === null || pass.clock < minClock || pass.clock > maxClock)) continue

      const a = Math.min(pass.passerId, pass.receiverId)
      const b = Math.max(pass.passerId, pass.receiverId)
      const key = `${pass.teamId}:${a}:${b}`
      const edge = edges.get(key) ?? { key, teamId: pass.teamId, a, b, count: 0 }
      edge.count++
      edges.set(key, edge)
    }
  }
  return [...edges.values()]
}

// The most passes between any one pair: what the thickest line stands for.
export const maxPassCount = (edges: PassEdge[]) => edges.reduce((max, edge) => Math.max(max, edge.count), 0)

// A line of the network, between two team-mates.
export type PassNetworkLine = { key: string; teamId: number; from: Point; to: Point; count: number }

// The network's lines between where the players are now. A pair is skipped while either of them is not
// on the pitch in this frame (substituted, or missing from the data).
export function buildPassNetworkLines(edges: PassEdge[], positionOf: (playerId: number) => Point | null): PassNetworkLine[] {
  const lines: PassNetworkLine[] = []
  for (const edge of edges) {
    const from = positionOf(edge.a)
    const to = positionOf(edge.b)
    if (from && to) lines.push({ key: edge.key, teamId: edge.teamId, from, to, count: edge.count })
  }
  // Thinnest first, so the busiest links are drawn on top.
  return lines.sort((x, y) => x.count - y.count)
}
