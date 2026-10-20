import React from 'react'
import { usePitch } from '@pitchkit/react'
import './pitchFx.css'

// Building blocks shared by the animated annotation layers (player links, team shapes). The components
// must be rendered inside a <Pitch>.

export type Point = { x: number; y: number }

// The player a pick tool (Link Players, Team Shape) would pick if clicked now, in pitch metres.
export type SnapTarget = Point & { playerId: number }

// A measurement in a dark pill, centred on (x, y) in pixels. `className` animates its entrance.
export const PitchPill: React.FC<{ x: number; y: number; text: string; color: string; className?: string }> = ({ x, y, text, color, className }) => {
  const width = text.length * 6.5 + 12
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <rect x={-width / 2} y={-9} width={width} height={18} rx={9} fill="rgba(16, 20, 24, 0.85)" stroke={color} strokeWidth={1} />
        <text textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize={11} fontWeight={600}>
          {text}
        </text>
      </g>
    </g>
  )
}

const SNAP_RING_RADIUS = 13 // pixels; clears a player marker

// The ring on the player a pick tool has snapped to. Keyed by player where it is used, so it pops again
// each time the snap moves to someone else.
export const SnapRing: React.FC<{ target: SnapTarget; color: string }> = ({ target, color }) => {
  const { transform } = usePitch()
  const [x, y] = transform.toPixel([target.x, target.y])
  return <circle className="pitch-fx-snap-ring" cx={x} cy={y} r={SNAP_RING_RADIUS} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
}

// The players of an insight event hovered on the timeline, in pitch metres: a ring on the player the
// event is about and, when someone else has the ball (the passer of a passing option, the carrier being
// pressed), a thinner ring on them and a dashed line across to the player. Keyed by event where it is
// used, so it pops again for each event.
export const EventHighlight: React.FC<{ player: Point; carrier: Point | null; color: string }> = ({ player, carrier, color }) => {
  const { transform } = usePitch()
  const [x, y] = transform.toPixel([player.x, player.y])
  const carrierPixel = carrier ? transform.toPixel([carrier.x, carrier.y]) : null
  return (
    <g className="pitch-fx-fade-in">
      {carrierPixel && (
        <>
          <line x1={carrierPixel[0]} y1={carrierPixel[1]} x2={x} y2={y} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.85} />
          <circle cx={carrierPixel[0]} cy={carrierPixel[1]} r={SNAP_RING_RADIUS} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
        </>
      )}
      <circle className="pitch-fx-snap-ring" cx={x} cy={y} r={SNAP_RING_RADIUS + 2} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2.5} />
    </g>
  )
}

// A line from a to b (pixels) breaking: each half shrinks from the break back into its own end, fading
// as it goes, while a spark at the break flashes out. `progress` runs from 0 to 1.
export const SnappingEdge: React.FC<{ a: Point; b: Point; progress: number; width: number; color: string }> = ({ a, b, progress, width, color }) => {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const recoil = 1 - (1 - progress) ** 3
  const endOf = (end: Point) => ({ x: mid.x + (end.x - mid.x) * recoil, y: mid.y + (end.y - mid.y) * recoil })
  const endA = endOf(a)
  const endB = endOf(b)
  return (
    <g opacity={1 - progress}>
      <line x1={a.x} y1={a.y} x2={endA.x} y2={endA.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={b.x} y1={b.y} x2={endB.x} y2={endB.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {progress < 0.5 && <circle cx={mid.x} cy={mid.y} r={width + 6 * progress} fill="#ffffff" opacity={1 - progress * 2} />}
    </g>
  )
}
