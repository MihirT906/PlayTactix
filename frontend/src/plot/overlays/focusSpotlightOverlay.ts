import type { FrameData } from '../../types/FrameDataInterfaces'

type Point = { x: number; y: number }

// A focused player as the spotlight draws them: where they stand and the trail of where they have been.
export type FocusSpot = {
  playerId: number
  x: number
  y: number
  trail: Point[] // From the player back to the oldest position, one point per frame
}

export const FOCUS_TRAIL_FRAMES = 20 // 2 seconds of tracking at 10 frames per second

// The focused players in this frame. Each trail walks back from the player's position through the
// frames already loaded, and stops at the first frame that is missing (or lacks the player) or that
// is before `firstFrame`, so it never bridges a gap or a cut between match segments.
export function buildFocusSpots(
  playerIds: number[],
  currentFrame: number,
  firstFrame: number,
  frameAt: (frame: number) => FrameData | undefined,
  positionOf: (playerId: number) => Partial<Point>,
): FocusSpot[] {
  const oldestFrame = Math.max(firstFrame, currentFrame - FOCUS_TRAIL_FRAMES)
  return playerIds.flatMap((playerId) => {
    const { x, y } = positionOf(playerId)
    if (typeof x !== 'number' || typeof y !== 'number') return []

    const trail: Point[] = [{ x, y }]
    for (let frame = currentFrame - 1; frame >= oldestFrame; frame--) {
      const players = frameAt(frame)?.players
      const index = players?.player_id.indexOf(playerId) ?? -1
      if (!players || index === -1) break
      const point = { x: players.x[index], y: players.y[index] }
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) break
      trail.push(point)
    }
    return [{ playerId, x, y, trail }]
  })
}
