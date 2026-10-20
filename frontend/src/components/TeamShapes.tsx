import React, { useEffect, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import { PitchPill, SnappingEdge, type Point } from './pitchFx'
import { advanceAnimations, animationProgress, prefersReducedMotion, type StartedAt } from '../plot/fxAnimation'
import { alignPolygon, blockSize, convexHull, polygonArea, polygonCentroid, resamplePolygon } from '../plot/overlays/teamShapeOverlay'

// A team shape: the hull around its players' positions, in pitch metres.
export type TeamShapeMark = { key: string; players: number[]; points: Point[]; color: string }

// What the shape being built would become if the snapped player were picked (or let go): a hull, or a
// line while there are only two players.
export type TeamShapeGhost = { key: string; points: Point[]; color: string }

const INFLATE_DURATION = 550 // ms for a new shape's fill to swell past its outline and settle
const INFLATE_DECAY = 80 // ms
const INFLATE_PERIOD = 360 // ms
const OUTLINE_FADE_IN = 150 // ms
const MORPH_DURATION = 350 // ms for a shape to reshape after a player is added or let go
const MORPH_SAMPLES = 64 // Points round the outline while morphing, so hulls of any corner count blend
const SNAP_DURATION = 250 // ms for a removed shape's edges to recoil
const PILL_DELAY = '450ms' // The pill pops in as the fill settles

// Compactness: the fill is strongest round a tight block and fades as it stretches.
const COMPACT_AREA_PER_PLAYER = 40 // square metres
const STRETCHED_AREA_PER_PLAYER = 200
const COMPACT_FILL_OPACITY = 0.4
const STRETCHED_FILL_OPACITY = 0.1

const fillOpacityOf = (shape: TeamShapeMark) => {
  const areaPerPlayer = polygonArea(convexHull(shape.points)) / shape.points.length
  const t = Math.min(1, Math.max(0, (areaPerPlayer - COMPACT_AREA_PER_PLAYER) / (STRETCHED_AREA_PER_PLAYER - COMPACT_AREA_PER_PLAYER)))
  return COMPACT_FILL_OPACITY + (STRETCHED_FILL_OPACITY - COMPACT_FILL_OPACITY) * t
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

const samePlayers = (a: number[], b: number[]) => a.length === b.length && a.every((player) => b.includes(player))

type Morph = { startedAt: StartedAt; from: Point[] } // `from`: the outline as it was drawn, resampled
type Leaving = { startedAt: StartedAt; outline: Point[]; color: string; fillOpacity: number }

// Team shapes drawn on a PitchKit layer, so they can animate. A new shape's fill inflates from its
// centre, overshooting the outline before settling; adding or letting go of a player morphs the outline
// smoothly into the new hull; a removed shape's edges snap at their middles and recoil into the players.
// The fill follows how compact the block is, with its width and depth in a pill at the centre. Must be
// rendered inside a <Pitch>.
const TeamShapes: React.FC<{ shapes: TeamShapeMark[]; ghost: TeamShapeGhost | null; strokeWidth: number }> = ({ shapes, ghost, strokeWidth }) => {
  const { transform } = usePitch()
  const [previousShapes, setPreviousShapes] = useState(shapes)
  const [inflating, setInflating] = useState<Map<string, { startedAt: StartedAt }>>(new Map())
  const [morphs, setMorphs] = useState<Map<string, Morph>>(new Map())
  const [leaving, setLeaving] = useState<Map<string, Leaving>>(new Map())
  const [now, setNow] = useState(0)

  // The outline as drawn: the hull, or partway through morphing into it.
  const outlineOf = (shape: TeamShapeMark): Point[] => {
    const hull = convexHull(shape.points)
    const morph = morphs.get(shape.key)
    if (!morph) return hull
    const t = easeInOutCubic(animationProgress(morph.startedAt, now, MORPH_DURATION))
    const target = alignPolygon(morph.from, resamplePolygon(hull, MORPH_SAMPLES))
    return morph.from.map((from, i) => ({ x: from.x + (target[i].x - from.x) * t, y: from.y + (target[i].y - from.y) * t }))
  }

  // Shapes are matched up by key while rendering, so a changed shape never jumps for a frame before its
  // animation is drawn. Only a change of players morphs a shape; players moving just redraw it.
  if (shapes !== previousShapes) {
    setPreviousShapes(shapes)
    if (!prefersReducedMotion()) {
      const previousByKey = new Map(previousShapes.map((shape) => [shape.key, shape]))
      const keys = new Set(shapes.map((shape) => shape.key))
      const added = shapes.filter((shape) => !previousByKey.has(shape.key))
      const reshaped = shapes.filter((shape) => {
        const previous = previousByKey.get(shape.key)
        return previous !== undefined && !samePlayers(previous.players, shape.players)
      })
      const removed = previousShapes.filter((shape) => !keys.has(shape.key))
      if (added.length > 0) {
        setInflating((prev) => new Map([...prev, ...added.map((shape) => [shape.key, { startedAt: null }] as const)]))
      }
      if (reshaped.length > 0) {
        setMorphs((prev) => new Map([
          ...prev,
          ...reshaped.map((shape) => [shape.key, { startedAt: null, from: resamplePolygon(outlineOf(previousByKey.get(shape.key)!), MORPH_SAMPLES) }] as const),
        ]))
      }
      if (removed.length > 0 || [...leaving.keys()].some((key) => keys.has(key))) {
        setLeaving((prev) => new Map([
          ...[...prev].filter(([key]) => !keys.has(key)),
          ...removed.map((shape) => [
            shape.key,
            { startedAt: null, outline: convexHull(outlineOf(shape)), color: shape.color, fillOpacity: fillOpacityOf(shape) },
          ] as const),
        ]))
      }
    }
  }

  // Re-renders every animation frame while anything animates, dropping each animation once it is over.
  const animating = inflating.size > 0 || morphs.size > 0 || leaving.size > 0
  useEffect(() => {
    if (!animating) return
    let id = requestAnimationFrame(function tick(time) {
      setNow(time)
      setInflating((prev) => advanceAnimations(prev, time, INFLATE_DURATION))
      setMorphs((prev) => advanceAnimations(prev, time, MORPH_DURATION))
      setLeaving((prev) => advanceAnimations(prev, time, SNAP_DURATION))
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [animating])

  const toPixel = (point: Point) => {
    const [x, y] = transform.toPixel([point.x, point.y])
    return { x, y }
  }
  const pointsAttribute = (polygon: Point[]) => polygon.map((point) => `${point.x},${point.y}`).join(' ')

  const renderShape = (shape: TeamShapeMark) => {
    const outline = outlineOf(shape).map(toPixel)
    const centre = polygonCentroid(outline)

    // Inflating: the fill swells from the centre past the outline, then springs back to it.
    const startedAt = inflating.get(shape.key)?.startedAt
    const age = startedAt === undefined ? Infinity : startedAt === null ? 0 : now - startedAt
    const scale = age < INFLATE_DURATION
      ? 1 - Math.exp(-age / INFLATE_DECAY) * Math.cos((2 * Math.PI * age) / INFLATE_PERIOD)
      : 1
    const fill = outline.map((point) => ({ x: centre.x + (point.x - centre.x) * scale, y: centre.y + (point.y - centre.y) * scale }))

    const { width, depth } = blockSize(shape.points)
    return (
      <g key={shape.key} style={{ '--pill-delay': PILL_DELAY } as React.CSSProperties}>
        <polygon points={pointsAttribute(fill)} fill={shape.color} fillOpacity={fillOpacityOf(shape)} stroke="none" />
        <polygon
          points={pointsAttribute(outline)}
          fill="none"
          stroke={shape.color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          opacity={Math.min(1, age / OUTLINE_FADE_IN)}
        />
        <PitchPill x={centre.x} y={centre.y} text={`${width.toFixed(0)} × ${depth.toFixed(0)}m`} color={shape.color} className="pitch-fx-pill-in" />
      </g>
    )
  }

  // Snapped: every edge breaks at its middle and recoils into its two players while the fill fades.
  const renderLeaving = ([key, shape]: [string, Leaving]) => {
    const progress = animationProgress(shape.startedAt, now, SNAP_DURATION)
    const outline = shape.outline.map(toPixel)
    return (
      <g key={`leaving-${key}`}>
        <polygon points={pointsAttribute(outline)} fill={shape.color} fillOpacity={shape.fillOpacity * (1 - progress) ** 2} stroke="none" />
        {outline.map((point, i) => (
          <SnappingEdge key={i} a={point} b={outline[(i + 1) % outline.length]} progress={progress} width={strokeWidth} color={shape.color} />
        ))}
      </g>
    )
  }

  // Keyed by what it previews, so it fades in again each time the snap moves to another player.
  const renderGhost = ({ key, points, color }: TeamShapeGhost) => {
    const outline = convexHull(points).map(toPixel)
    const dashed = { stroke: color, strokeOpacity: 0.8, strokeWidth: 2, strokeDasharray: '6 5', strokeLinejoin: 'round', strokeLinecap: 'round' } as const
    return (
      <g key={key} className="pitch-fx-fade-in">
        {outline.length >= 3
          ? <polygon points={pointsAttribute(outline)} fill={color} fillOpacity={0.1} {...dashed} />
          : <polyline points={pointsAttribute(outline)} fill="none" {...dashed} />}
      </g>
    )
  }

  return (
    <g>
      {[...leaving].map(renderLeaving)}
      {shapes.map(renderShape)}
      {ghost && ghost.points.length >= 2 && renderGhost(ghost)}
    </g>
  )
}

export default TeamShapes
