import React, { useEffect, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import './PlayerLinks.css'

type Point = { x: number; y: number }

// A line between two players, in pitch metres.
export type PlayerLink = { key: string; a: Point; b: Point }

// The line the Link Players tool stretches from the first player picked: to the player it has snapped
// to, or to the cursor.
export type LinkDraft = { from: Point; to: Point }

// The player the Link Players tool would pick if clicked now.
export type LinkSnapTarget = Point & { playerId: number }

const TAUT_DURATION = 450 // ms for a new line to pull straight
const SNAP_DURATION = 250 // ms for a removed line's halves to recoil
const SLACK = 0.18 // How far a new line sags at first, as a share of its length
const SLACK_MAX = 40 // pixels
const SPRING_DECAY = 110 // ms
const SPRING_PERIOD = 300 // ms

// Tension: a line is thickest between players close together and thins as they move apart.
const CLOSE_DISTANCE = 5 // metres
const FAR_DISTANCE = 30
const CLOSE_WIDTH = 5 // pixels
const FAR_WIDTH = 1.5
const SELECTED_HALO_WIDTH = 6 // pixels beyond the line on each side
const SNAP_RING_RADIUS = 13 // pixels; clears a player marker

const lineWidthAt = (distance: number) => {
  const t = Math.min(1, Math.max(0, (distance - CLOSE_DISTANCE) / (FAR_DISTANCE - CLOSE_DISTANCE)))
  return CLOSE_WIDTH + (FAR_WIDTH - CLOSE_WIDTH) * t
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// Start times are stamped by the next animation frame (null until then), so rendering never reads the clock.
type StartedAt = number | null

// The animations still running at `time`, with any not yet started stamped as starting then.
function advanceAnimations(startTimes: Map<string, StartedAt>, time: number, duration: number) {
  const next = new Map<string, StartedAt>()
  for (const [key, start] of startTimes) {
    if (start === null) next.set(key, time)
    else if (time - start < duration) next.set(key, start)
  }
  return next
}

// The distance between two players, in a pill at the middle of their line.
const DistancePill: React.FC<{ x: number; y: number; metres: number; color: string; className?: string }> = ({ x, y, metres, color, className }) => {
  const text = `${metres.toFixed(1)}m`
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

type Leaving = PlayerLink & { removedAt: StartedAt }

// Player links drawn on a PitchKit layer, so they can animate. A new line appears slack and springs
// taut; a removed one breaks in the middle and its halves recoil into their players. Its thickness
// follows the gap between the players, with the distance in a pill at the middle. Plotly keeps an
// invisible copy of each line on top for selecting and erasing it. Must be rendered inside a <Pitch>.
const PlayerLinks: React.FC<{
  links: PlayerLink[]
  selectedKey: string | null
  draft: LinkDraft | null
  snapTarget: LinkSnapTarget | null
  color: string
}> = ({ links, selectedKey, draft, snapTarget, color }) => {
  const { transform } = usePitch()
  const [previousLinks, setPreviousLinks] = useState(links)
  const [addedAt, setAddedAt] = useState<Map<string, StartedAt>>(new Map())
  const [leaving, setLeaving] = useState<Leaving[]>([])
  const [now, setNow] = useState(0)

  // Lines are matched up by key while rendering, so a removed line never blinks out for a frame before
  // its snap is drawn. A line counts as new whenever it appears: when it is made, or when playback
  // reaches the start of its bar.
  if (links !== previousLinks) {
    setPreviousLinks(links)
    if (!prefersReducedMotion()) {
      const keys = new Set(links.map((link) => link.key))
      const previousKeys = new Set(previousLinks.map((link) => link.key))
      const added = links.filter((link) => !previousKeys.has(link.key))
      const removed = previousLinks.filter((link) => !keys.has(link.key))
      if (added.length > 0) {
        setAddedAt((prev) => new Map([...prev, ...added.map((link) => [link.key, null] as const)]))
      }
      if (removed.length > 0 || leaving.some((link) => keys.has(link.key))) {
        setLeaving((prev) => [...prev.filter((link) => !keys.has(link.key)), ...removed.map((link) => ({ ...link, removedAt: null }))])
      }
    }
  }

  // Re-renders every animation frame while anything animates, dropping each animation once it is over.
  const animating = addedAt.size > 0 || leaving.length > 0
  useEffect(() => {
    if (!animating) return
    let id = requestAnimationFrame(function tick(time) {
      setNow(time)
      setAddedAt((prev) => advanceAnimations(prev, time, TAUT_DURATION))
      setLeaving((prev) => prev.flatMap((link) => {
        if (link.removedAt === null) return [{ ...link, removedAt: time }]
        return time - link.removedAt < SNAP_DURATION ? [link] : []
      }))
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [animating])

  const toPixel = (point: Point) => {
    const [x, y] = transform.toPixel([point.x, point.y])
    return { x, y }
  }

  const renderLink = (link: PlayerLink) => {
    const a = toPixel(link.a)
    const b = toPixel(link.b)
    const metres = Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y)
    const width = lineWidthAt(metres)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    // Slack: the middle of the line is pulled sideways and springs back through straight to rest.
    const startedAt = addedAt.get(link.key)
    const age = startedAt === undefined ? Infinity : startedAt === null ? 0 : now - startedAt
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const sag = age < TAUT_DURATION
      ? Math.min(SLACK * length, SLACK_MAX) * Math.exp(-age / SPRING_DECAY) * Math.cos((2 * Math.PI * age) / SPRING_PERIOD)
      : 0
    const normal = length > 0 ? { x: -(b.y - a.y) / length, y: (b.x - a.x) / length } : { x: 0, y: 0 }
    // A quadratic curve passes through half its control point's offset, so double it for the sag.
    const control = { x: mid.x + normal.x * sag * 2, y: mid.y + normal.y * sag * 2 }
    const path = `M ${a.x} ${a.y} Q ${control.x} ${control.y} ${b.x} ${b.y}`

    return (
      <g key={link.key} className="player-link">
        {link.key === selectedKey && (
          <path d={path} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={width + SELECTED_HALO_WIDTH * 2} strokeLinecap="round" />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={Math.min(1, age / 80)} />
        <DistancePill x={mid.x} y={mid.y} metres={metres} color={color} className="player-link__pill" />
      </g>
    )
  }

  // Snapped: each half shrinks from the break back into its own player, fading as it goes, while a
  // spark at the break flashes out.
  const renderLeaving = (link: Leaving) => {
    const a = toPixel(link.a)
    const b = toPixel(link.b)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const progress = link.removedAt === null ? 0 : Math.min(1, (now - link.removedAt) / SNAP_DURATION)
    const recoil = 1 - (1 - progress) ** 3
    const width = lineWidthAt(Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y))
    const endOf = (end: Point) => ({ x: mid.x + (end.x - mid.x) * recoil, y: mid.y + (end.y - mid.y) * recoil })
    const endA = endOf(a)
    const endB = endOf(b)
    return (
      <g key={`leaving-${link.key}`} opacity={1 - progress}>
        <line x1={a.x} y1={a.y} x2={endA.x} y2={endA.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
        <line x1={b.x} y1={b.y} x2={endB.x} y2={endB.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
        {progress < 0.5 && <circle cx={mid.x} cy={mid.y} r={width + 6 * progress} fill="#ffffff" opacity={1 - progress * 2} />}
      </g>
    )
  }

  const renderDraft = ({ from, to }: LinkDraft) => {
    const start = toPixel(from)
    const end = toPixel(to)
    return (
      <g className="player-link-draft">
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" />
        <DistancePill x={end.x} y={end.y - 22} metres={Math.hypot(to.x - from.x, to.y - from.y)} color={color} />
      </g>
    )
  }

  // Keyed by player, so the ring pops again each time the snap moves to someone else.
  const renderSnapTarget = (target: LinkSnapTarget) => {
    const { x, y } = toPixel(target)
    return (
      <circle
        key={target.playerId}
        className="player-link-draft__target"
        cx={x}
        cy={y}
        r={SNAP_RING_RADIUS}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
      />
    )
  }

  return (
    <g className="player-links">
      {leaving.map(renderLeaving)}
      {links.map(renderLink)}
      {snapTarget && renderSnapTarget(snapTarget)}
      {draft && renderDraft(draft)}
    </g>
  )
}

export default PlayerLinks
