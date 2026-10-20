import React, { useEffect, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import { SnappingEdge, type Point } from './pitchFx'
import {
  ENTRANCE_DURATION,
  SETTLE_DURATION,
  advanceAnimations,
  animationProgress,
  entranceScale,
  prefersReducedMotion,
  settledShare,
  type StartedAt,
} from '../plot/fxAnimation'
import { blendSegments, markHandles, rectCorners, sameSegment, type Segment } from '../plot/annotationGeometry'

// A rectangle drawn with Draw Rectangle: two opposite corners, in pitch metres.
export type RectangleMark = { key: string; geometry: Segment }

type RectangleStyle = { lineColor: string; lineWidth: number; fillColor: string }

const OUTLINE_FADE_IN = 150 // ms
const SNAP_DURATION = 250 // ms for a removed rectangle's edges to recoil
const HALO_WIDTH = 6 // pixels beyond the outline on each side
const HANDLE_RADIUS = 5 // pixels

type Settle = { startedAt: StartedAt; from: Segment } // `from`: where it was drawn when it last changed
type Leaving = { startedAt: StartedAt; geometry: Segment }

// Rectangles drawn on a PitchKit layer, so they can animate, the way team shapes do. One being dragged
// out is a dashed ghost; once drawn its fill inflates from the centre past the edges and springs back;
// moved or resized, it eases after the pointer; removed, its edges snap at their middles and recoil
// into the corners. The selected one is haloed, with its handles when it can be edited. Must be
// rendered inside a <Pitch>.
const Rectangles: React.FC<{
  rects: RectangleMark[]
  draft: Segment | null
  selectedKey: string | null
  showHandles: boolean
  style: RectangleStyle
}> = ({ rects, draft, selectedKey, showHandles, style }) => {
  const { transform } = usePitch()
  const [previousRects, setPreviousRects] = useState(rects)
  const [inflating, setInflating] = useState<Map<string, { startedAt: StartedAt }>>(new Map())
  const [settling, setSettling] = useState<Map<string, Settle>>(new Map())
  const [leaving, setLeaving] = useState<Map<string, Leaving>>(new Map())
  const [now, setNow] = useState(0)

  // Where a rectangle is drawn: where it is, or still easing there from where it was.
  const shownGeometry = ({ key, geometry }: RectangleMark): Segment => {
    const settle = settling.get(key)
    if (!settle) return geometry
    const age = settle.startedAt === null ? 0 : now - settle.startedAt
    return blendSegments(settle.from, geometry, settledShare(age))
  }

  // Rectangles are matched up by key while rendering, so a change never jumps for a frame before its
  // animation is drawn. Each change while one is edited restarts its easing from where it is drawn.
  if (rects !== previousRects) {
    setPreviousRects(rects)
    if (!prefersReducedMotion()) {
      const previousByKey = new Map(previousRects.map((rect) => [rect.key, rect]))
      const keys = new Set(rects.map((rect) => rect.key))
      const added = rects.filter((rect) => !previousByKey.has(rect.key))
      const changed = rects.filter((rect) => {
        const previous = previousByKey.get(rect.key)
        return previous !== undefined && !sameSegment(previous.geometry, rect.geometry)
      })
      const removed = previousRects.filter((rect) => !keys.has(rect.key))
      if (added.length > 0) {
        setInflating((prev) => new Map([...prev, ...added.map((rect) => [rect.key, { startedAt: null }] as const)]))
      }
      if (changed.length > 0) {
        setSettling((prev) => new Map([
          ...prev,
          ...changed.map((rect) => [rect.key, { startedAt: null, from: shownGeometry(previousByKey.get(rect.key)!) }] as const),
        ]))
      }
      if (removed.length > 0 || [...leaving.keys()].some((key) => keys.has(key))) {
        setLeaving((prev) => new Map([
          ...[...prev].filter(([key]) => !keys.has(key)),
          ...removed.map((rect) => [rect.key, { startedAt: null, geometry: shownGeometry(rect) }] as const),
        ]))
      }
    }
  }

  // Re-renders every animation frame while anything animates, dropping each animation once it is over.
  const animating = inflating.size > 0 || settling.size > 0 || leaving.size > 0
  useEffect(() => {
    if (!animating) return
    let id = requestAnimationFrame(function tick(time) {
      setNow(time)
      setInflating((prev) => advanceAnimations(prev, time, ENTRANCE_DURATION))
      setSettling((prev) => advanceAnimations(prev, time, SETTLE_DURATION))
      setLeaving((prev) => advanceAnimations(prev, time, SNAP_DURATION))
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [animating])

  const toPixel = (point: Point) => {
    const [x, y] = transform.toPixel([point.x, point.y])
    return { x, y }
  }
  const pointsAttribute = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')

  const renderRect = (rect: RectangleMark) => {
    const corners = rectCorners(shownGeometry(rect)).map(toPixel)
    const centre = { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 }

    // Inflating: the fill swells from the centre past the edges, then springs back to them.
    const startedAt = inflating.get(rect.key)?.startedAt
    const age = startedAt === undefined ? Infinity : startedAt === null ? 0 : now - startedAt
    const scale = entranceScale(age)
    const fill = corners.map((corner) => ({ x: centre.x + (corner.x - centre.x) * scale, y: centre.y + (corner.y - centre.y) * scale }))

    return (
      <g key={rect.key}>
        {rect.key === selectedKey && (
          <polygon
            points={pointsAttribute(corners)}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.45}
            strokeWidth={style.lineWidth + HALO_WIDTH * 2}
            strokeLinejoin="round"
          />
        )}
        <polygon points={pointsAttribute(fill)} fill={style.fillColor} stroke="none" />
        <polygon
          points={pointsAttribute(corners)}
          fill="none"
          stroke={style.lineColor}
          strokeWidth={style.lineWidth}
          opacity={Math.min(1, age / OUTLINE_FADE_IN)}
        />
      </g>
    )
  }

  // Snapped: every edge breaks at its middle and recoils into its two corners while the fill fades.
  const renderLeaving = ([key, rect]: [string, Leaving]) => {
    const progress = animationProgress(rect.startedAt, now, SNAP_DURATION)
    const corners = rectCorners(rect.geometry).map(toPixel)
    return (
      <g key={`leaving-${key}`}>
        <polygon points={pointsAttribute(corners)} fill={style.fillColor} opacity={(1 - progress) ** 2} stroke="none" />
        {corners.map((corner, i) => (
          <SnappingEdge key={i} a={corner} b={corners[(i + 1) % 4]} progress={progress} width={style.lineWidth} color={style.lineColor} />
        ))}
      </g>
    )
  }

  // The rectangle being dragged out: a dashed ghost until it is let go.
  const renderDraft = (geometry: Segment) => (
    <polygon
      points={pointsAttribute(rectCorners(geometry).map(toPixel))}
      fill={style.fillColor}
      fillOpacity={0.5}
      stroke={style.lineColor}
      strokeWidth={style.lineWidth}
      strokeDasharray="6 5"
    />
  )

  const selected = showHandles ? rects.find((rect) => rect.key === selectedKey) : undefined
  return (
    <g>
      {[...leaving].map(renderLeaving)}
      {rects.map(renderRect)}
      {draft && renderDraft(draft)}
      {selected && markHandles({ kind: 'rect', geometry: shownGeometry(selected) }).map(toPixel).map((handle, i) => (
        <circle key={i} cx={handle.x} cy={handle.y} r={HANDLE_RADIUS} fill="#ffffff" stroke={style.lineColor} strokeWidth={2} />
      ))}
    </g>
  )
}

export default Rectangles
