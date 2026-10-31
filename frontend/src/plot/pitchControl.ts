import type { FrameData } from '../types/FrameDataInterfaces'

// Pitch control from "Wide Open Spaces" (Fernández & Bornn, 2018), ported from databallpy's
// get_pitch_control_single_frame (databallpy 0.6.2) so it runs in the browser and follows dragged players.
// Each player's influence is a 2D Gaussian, centred half a second ahead along their velocity, stretched
// along it the faster they run and widened the further they are from the ball. Each team's influences are
// summed and the grid holds sigmoid(away - home): near 1 the away team controls the spot, near 0 the home team.

export const PITCH_LENGTH = 106
export const PITCH_WIDTH = 68
// One grid point per metre, laid out like databallpy's meshgrid: rows run along y, columns along x, both
// spanning the pitch edge to edge.
export const PITCH_CONTROL_COLS = 106
export const PITCH_CONTROL_ROWS = 68

const MIN_RADIUS = 4
const MAX_RADIUS = 10
const MAX_SPEED = 13
const MIN_MINOR_AXIS = 0.001

const gridAxis = (span: number, count: number) =>
  Array.from({ length: count }, (_, i) => -span / 2 + (i * span) / (count - 1))

const GRID_X = gridAxis(PITCH_LENGTH, PITCH_CONTROL_COLS)
const GRID_Y = gridAxis(PITCH_WIDTH, PITCH_CONTROL_ROWS)
const CELLS = PITCH_CONTROL_ROWS * PITCH_CONTROL_COLS

// Adds one player's influence (1 at their strongest cell, falling off as a Gaussian) to a team's grid.
function addPlayerInfluence(
  teamInfluence: Float64Array,
  squaredDistances: Float64Array,
  x: number,
  y: number,
  vx: number,
  vy: number,
  distanceToBall: number,
) {
  const meanX = x + 0.5 * vx
  const meanY = y + 0.5 * vy

  // The influence radius grows with distance to the ball; speed stretches it along the direction of
  // running and squeezes it across.
  const radius = Math.min(MIN_RADIUS + distanceToBall ** 3 / 972, MAX_RADIUS)
  const speedRatio = Math.min(Math.hypot(vx, vy), MAX_SPEED) ** 2 / MAX_SPEED ** 2
  const majorAxis = radius + radius * speedRatio
  const minorAxis = Math.max(radius - radius * speedRatio, MIN_MINOR_AXIS)

  // The covariance is R·S²·Rᵀ with R the rotation to the velocity angle, so the Mahalanobis distance is
  // the offset rotated into the velocity frame and divided by each axis.
  const angle = Math.atan2(vy, vx)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  let minSquaredDistance = Infinity
  let cell = 0
  for (let row = 0; row < PITCH_CONTROL_ROWS; row++) {
    const dy = GRID_Y[row] - meanY
    for (let col = 0; col < PITCH_CONTROL_COLS; col++) {
      const dx = GRID_X[col] - meanX
      const along = (dx * cos + dy * sin) / majorAxis
      const across = (-dx * sin + dy * cos) / minorAxis
      const squaredDistance = along * along + across * across
      squaredDistances[cell++] = squaredDistance
      if (squaredDistance < minSquaredDistance) minSquaredDistance = squaredDistance
    }
  }

  // databallpy divides the density by its maximum over the grid. The Gaussian's constant cancels, so this
  // is the same ratio taken in log space, which stays finite for a player far off the pitch.
  for (let i = 0; i < CELLS; i++) {
    teamInfluence[i] += Math.exp(-0.5 * (squaredDistances[i] - minSquaredDistance))
  }
}

// The pitch control grid (rows along y, columns along x) for a frame, with any temporary dragged positions
// applied. Null without a frame or a ball position, which the influence radius depends on.
export function computePitchControl(
  frameData: FrameData | null,
  positionOverrides: Map<number, { x: number; y: number }>,
): number[][] | null {
  if (!frameData) return null
  const { ball_x: ballX, ball_y: ballY } = frameData.ball
  if (ballX === null || ballY === null) return null

  const home = new Float64Array(CELLS)
  const away = new Float64Array(CELLS)
  const squaredDistances = new Float64Array(CELLS)

  const { player_id, team, x, y, vx, vy } = frameData.players
  player_id.forEach((playerId, index) => {
    const override = positionOverrides.get(playerId)
    const playerX = override?.x ?? x[index]
    const playerY = override?.y ?? y[index]
    if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) return
    const teamInfluence = team[index] === 'home' ? home : team[index] === 'away' ? away : null
    if (!teamInfluence) return
    // A player's first visible frame has no velocity yet; they count as standing still.
    addPlayerInfluence(
      teamInfluence,
      squaredDistances,
      playerX,
      playerY,
      vx[index] ?? 0,
      vy[index] ?? 0,
      Math.hypot(playerX - ballX, playerY - ballY),
    )
  })

  const grid: number[][] = []
  for (let row = 0; row < PITCH_CONTROL_ROWS; row++) {
    const values = new Array<number>(PITCH_CONTROL_COLS)
    for (let col = 0; col < PITCH_CONTROL_COLS; col++) {
      const i = row * PITCH_CONTROL_COLS + col
      values[col] = 1 / (1 + Math.exp(-(away[i] - home[i])))
    }
    grid.push(values)
  }
  return grid
}
