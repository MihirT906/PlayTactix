import React, { useEffect, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import { PitchPill, SnappingEdge, type Point } from './pitchFx'
import { ENTRANCE_DURATION, advanceAnimations, animationProgress, entranceScale, prefersReducedMotion, type StartedAt } from '../plot/fxAnimation'

// A line between two players, in pitch metres.
export type PlayerLink = { key: string; a: Point; b: Point }

// The line the Link Players tool stretches from the first player picked: to the player it has snapped
// to, or to the cursor.
export type LinkDraft = { from: Point; to: Point }

const SNAP_DURATION = 250 // ms for a removed line's halves to recoil
const FADE_IN = 150 // ms for a new line to fade in as it grows
const PILL_DELAY = '450ms' // The pill pops in as the line settles

// Tension: a line is thickest between players close together and thins as they move apart.
const CLOSE_DISTANCE = 5 // metres
const FAR_DISTANCE = 30
const CLOSE_WIDTH = 5 // pixels
const FAR_WIDTH = 1.5
const SELECTED_HALO_WIDTH = 6 // pixels beyond the line on each side

const lineWidthAt = (distance: number) => {
  const t = Math.min(1, Math.max(0, (distance - CLOSE_DISTANCE) / (FAR_DISTANCE - CLOSE_DISTANCE)))
  return CLOSE_WIDTH + (FAR_WIDTH - CLOSE_WIDTH) * t
}

const distanceText = (a: Point, b: Point) => `${Math.hypot(b.x - a.x, b.y - a.y).toFixed(1)}m`

type Leaving = PlayerLink & { startedAt: StartedAt }

// Player links drawn on a PitchKit layer, so they can animate. A new line grows from its middle out past
// its players and springs back to them, the way a new team shape inflates; a removed one breaks in the
// middle and its halves recoil into their players. Its thickness follows the gap between the players,
// with the distance in a pill at the middle. Must be rendered inside a <Pitch>.
const PlayerLinks: React.FC<{
  links: PlayerLink[]
  selectedKey: string | null
  draft: LinkDraft | null
  color: string
}> = ({ links, selectedKey, draft, color }) => {
  const { transform } = usePitch()
  const [previousLinks, setPreviousLinks] = useState(links)
  const [growing, setGrowing] = useState<Map<string, { startedAt: StartedAt }>>(new Map())
  const [leaving, setLeaving] = useState<Map<string, Leaving>>(new Map())
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
        setGrowing((prev) => new Map([...prev, ...added.map((link) => [link.key, { startedAt: null }] as const)]))
      }
      if (removed.length > 0 || [...leaving.keys()].some((key) => keys.has(key))) {
        setLeaving((prev) => new Map([
          ...[...prev].filter(([key]) => !keys.has(key)),
          ...removed.map((link) => [link.key, { ...link, startedAt: null }] as const),
        ]))
      }
    }
  }

  // Re-renders every animation frame while anything animates, dropping each animation once it is over.
  const animating = growing.size > 0 || leaving.size > 0
  useEffect(() => {
    if (!animating) return
    let id = requestAnimationFrame(function tick(time) {
      setNow(time)
      setGrowing((prev) => advanceAnimations(prev, time, ENTRANCE_DURATION))
      setLeaving((prev) => advanceAnimations(prev, time, SNAP_DURATION))
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
    const width = lineWidthAt(Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y))
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    // Growing: both ends spring out from the middle, past the players, and back to them.
    const startedAt = growing.get(link.key)?.startedAt
    const age = startedAt === undefined ? Infinity : startedAt === null ? 0 : now - startedAt
    const scale = entranceScale(age)
    const endOf = (end: Point) => ({ x: mid.x + (end.x - mid.x) * scale, y: mid.y + (end.y - mid.y) * scale })
    const start = endOf(a)
    const end = endOf(b)
    const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`

    return (
      <g key={link.key} style={{ '--pill-delay': PILL_DELAY } as React.CSSProperties}>
        {link.key === selectedKey && (
          <path d={path} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={width + SELECTED_HALO_WIDTH * 2} strokeLinecap="round" />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={Math.min(1, age / FADE_IN)} />
        <PitchPill x={mid.x} y={mid.y} text={distanceText(link.a, link.b)} color={color} className="pitch-fx-pill-in" />
      </g>
    )
  }

  const renderLeaving = (link: Leaving) => (
    <SnappingEdge
      key={`leaving-${link.key}`}
      a={toPixel(link.a)}
      b={toPixel(link.b)}
      progress={animationProgress(link.startedAt, now, SNAP_DURATION)}
      width={lineWidthAt(Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y))}
      color={color}
    />
  )

  const renderDraft = ({ from, to }: LinkDraft) => {
    const start = toPixel(from)
    const end = toPixel(to)
    return (
      <g>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" />
        <PitchPill x={end.x} y={end.y - 22} text={distanceText(from, to)} color={color} />
      </g>
    )
  }

  return (
    <g>
      {[...leaving.values()].map(renderLeaving)}
      {links.map(renderLink)}
      {draft && renderDraft(draft)}
    </g>
  )
}

export default PlayerLinks
