import type { FrameData } from '../../types/FrameDataInterfaces'

// A player the Voronoi overlay draws a cell around: the part of the pitch they are closest to.
export type VoronoiPoint = {
  playerId: number
  team: string
  x: number
  y: number
}

// The players of a frame as Voronoi points, with any temporary dragged positions applied. Players
// without a position are left out, and of two players on the exact same spot only the first is kept,
// since they would share a cell.
export function buildVoronoiPoints(
  frameData: FrameData | null,
  positionOverrides: Map<number, { x: number; y: number }>,
): VoronoiPoint[] {
  if (!frameData) return []

  const { player_id, team, x, y } = frameData.players
  const seen = new Set<string>()
  const points: VoronoiPoint[] = []
  player_id.forEach((playerId, index) => {
    const override = positionOverrides.get(playerId)
    const point = { playerId, team: team[index], x: override?.x ?? x[index], y: override?.y ?? y[index] }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return
    const key = `${point.x},${point.y}`
    if (seen.has(key)) return
    seen.add(key)
    points.push(point)
  })
  return points
}
