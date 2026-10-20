import React, { useId, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import { FOCUS_TRAIL_FRAMES, type FocusSpot } from '../plot/overlays/focusSpotlightOverlay'
import './FocusSpotlight.css'

const POOL_RADIUS = 3 // metres
const TRAIL_WIDTH = 3 // pixels
const TRAIL_HEAD_OPACITY = 0.8

// Focused players lit by a pool of light on the grass, trailed by where they have been. A pool switches
// on when a player is focused and off when they are unfocused: a spot that leaves the list is kept,
// frozen where it was last drawn, until its exit animation ends. Must be rendered inside a <Pitch>.
const FocusSpotlight: React.FC<{ spots: FocusSpot[] }> = ({ spots }) => {
  const { transform } = usePitch()
  // useId's punctuation would break the url(#...) reference to the gradient
  const gradientId = `focus-pool-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [previousSpots, setPreviousSpots] = useState(spots)
  const [leavingSpots, setLeavingSpots] = useState<FocusSpot[]>([])

  // Updated while rendering rather than in an effect, so an unfocused pool never blinks out for a frame
  // before its exit animation is mounted.
  if (spots !== previousSpots) {
    const ids = new Set(spots.map((spot) => spot.playerId))
    const gone = previousSpots.filter((spot) => !ids.has(spot.playerId))
    setPreviousSpots(spots)
    // A player focused again mid-exit gets a fresh entrance instead.
    if (gone.length > 0 || leavingSpots.some((spot) => ids.has(spot.playerId))) {
      setLeavingSpots((prev) => [...prev.filter((spot) => !ids.has(spot.playerId)), ...gone])
    }
  }

  const removeLeavingSpot = (playerId: number) =>
    setLeavingSpots((prev) => prev.filter((spot) => spot.playerId !== playerId))

  const renderSpot = (spot: FocusSpot, leaving: boolean) => {
    const [cx, cy] = transform.toPixel([spot.x, spot.y])
    const trail = spot.trail.map((point) => transform.toPixel([point.x, point.y]))
    const segmentCount = trail.length - 1
    return (
      <g
        key={leaving ? `leaving-${spot.playerId}` : spot.playerId}
        className={leaving ? 'focus-spot focus-spot--leaving' : 'focus-spot'}
        style={{ '--segments': segmentCount } as React.CSSProperties}
      >
        {/* Segment i runs from i frames ago to i + 1, fading out towards the oldest. Keyed by that
            age so the segments stay mounted during playback and their entrance only plays once. */}
        {trail.slice(0, -1).map(([x1, y1], i) => (
          <line
            key={i}
            className="focus-spot__trail-segment"
            style={{ '--i': i } as React.CSSProperties}
            x1={x1}
            y1={y1}
            x2={trail[i + 1][0]}
            y2={trail[i + 1][1]}
            stroke="#ffffff"
            strokeOpacity={TRAIL_HEAD_OPACITY * (1 - i / FOCUS_TRAIL_FRAMES)}
            strokeWidth={TRAIL_WIDTH}
            strokeLinecap="round"
          />
        ))}
        <circle
          className="focus-spot__pool"
          cx={cx}
          cy={cy}
          r={POOL_RADIUS * transform.scale}
          fill={`url(#${gradientId})`}
          onAnimationEnd={leaving ? () => removeLeavingSpot(spot.playerId) : undefined}
        />
      </g>
    )
  }

  return (
    <g className="focus-spotlight">
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {leavingSpots.map((spot) => renderSpot(spot, true))}
      {spots.map((spot) => renderSpot(spot, false))}
    </g>
  )
}

export default FocusSpotlight
