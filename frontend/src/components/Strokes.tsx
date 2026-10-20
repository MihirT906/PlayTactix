import React, { useEffect, useState } from 'react'
import { usePitch } from '@pitchkit/react'
import { SnappingEdge, type Point } from './pitchFx'
import { SETTLE_DURATION, advanceAnimations, animationProgress, prefersReducedMotion, settledShare, type StartedAt } from '../plot/fxAnimation'
import { blendSegments, sameSegment, type Segment } from '../plot/annotationGeometry'

// A line or arrow drawn on the pitch: from its start (an arrow's tail) to its end, in pitch metres.
export type StrokeMark = { key: string; geometry: Segment }

const DRAW_ON_DURATION = 300 // ms for a new stroke to trace itself from its start to its end
const HEAD_POP_DURATION = 120 // ms for an arrow's head to appear once its shaft is drawn
const SNAP_DURATION = 250 // ms for a removed stroke's halves to recoil
const HALO_WIDTH = 6 // pixels beyond the stroke on each side
const HANDLE_RADIUS = 5 // pixels
const HEAD_HALF_ANGLE = Math.PI / 7 // As PitchKit's <Arrows> draws its heads

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

// An arrow's head at `end`, pointing away from `start`, `size` pixels along each side.
const headCorners = (start: Point, end: Point, size: number): Point[] => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  return [end, ...[-1, 1].map((side) => ({
    x: end.x - size * Math.cos(angle + side * HEAD_HALF_ANGLE),
    y: end.y - size * Math.sin(angle + side * HEAD_HALF_ANGLE),
  }))]
}

type Settle = { startedAt: StartedAt; from: Segment } // `from`: where it was drawn when it last changed
type Leaving = { startedAt: StartedAt; geometry: Segment }

// Lines or arrows drawn on a PitchKit layer, so they can animate. One being dragged out is a dashed
// ghost; once drawn it traces itself from its start to its end, an arrow's head appearing last; moved or
// reshaped, it eases after the pointer; removed, it breaks in the middle and its halves recoil into its
// ends. The selected one is haloed, with its handles when it can be edited. Must be rendered inside a
// <Pitch>.
const Strokes: React.FC<{
  strokes: StrokeMark[]
  draft: Segment | null
  selectedKey: string | null
  showHandles: boolean
  color: string
  width: number
  headSize?: number // Arrows have heads, lines do not
}> = ({ strokes, draft, selectedKey, showHandles, color, width, headSize }) => {
  const { transform } = usePitch()
  const [previousStrokes, setPreviousStrokes] = useState(strokes)
  const [drawing, setDrawing] = useState<Map<string, { startedAt: StartedAt }>>(new Map())
  const [settling, setSettling] = useState<Map<string, Settle>>(new Map())
  const [leaving, setLeaving] = useState<Map<string, Leaving>>(new Map())
  const [now, setNow] = useState(0)
  const entranceDuration = DRAW_ON_DURATION + (headSize ? HEAD_POP_DURATION : 0)

  // Where a stroke is drawn: where it is, or still easing there from where it was.
  const shownGeometry = ({ key, geometry }: StrokeMark): Segment => {
    const settle = settling.get(key)
    if (!settle) return geometry
    return blendSegments(settle.from, geometry, settledShare(settle.startedAt === null ? 0 : now - settle.startedAt))
  }

  // Strokes are matched up by key while rendering, so a change never jumps for a frame before its
  // animation is drawn. Each change while one is edited restarts its easing from where it is drawn.
  if (strokes !== previousStrokes) {
    setPreviousStrokes(strokes)
    if (!prefersReducedMotion()) {
      const previousByKey = new Map(previousStrokes.map((stroke) => [stroke.key, stroke]))
      const keys = new Set(strokes.map((stroke) => stroke.key))
      const added = strokes.filter((stroke) => !previousByKey.has(stroke.key))
      const changed = strokes.filter((stroke) => {
        const previous = previousByKey.get(stroke.key)
        return previous !== undefined && !sameSegment(previous.geometry, stroke.geometry)
      })
      const removed = previousStrokes.filter((stroke) => !keys.has(stroke.key))
      if (added.length > 0) {
        setDrawing((prev) => new Map([...prev, ...added.map((stroke) => [stroke.key, { startedAt: null }] as const)]))
      }
      if (changed.length > 0) {
        setSettling((prev) => new Map([
          ...prev,
          ...changed.map((stroke) => [stroke.key, { startedAt: null, from: shownGeometry(previousByKey.get(stroke.key)!) }] as const),
        ]))
      }
      if (removed.length > 0 || [...leaving.keys()].some((key) => keys.has(key))) {
        setLeaving((prev) => new Map([
          ...[...prev].filter(([key]) => !keys.has(key)),
          ...removed.map((stroke) => [stroke.key, { startedAt: null, geometry: shownGeometry(stroke) }] as const),
        ]))
      }
    }
  }

  // Re-renders every animation frame while anything animates, dropping each animation once it is over.
  const animating = drawing.size > 0 || settling.size > 0 || leaving.size > 0
  useEffect(() => {
    if (!animating) return
    let id = requestAnimationFrame(function tick(time) {
      setNow(time)
      setDrawing((prev) => advanceAnimations(prev, time, entranceDuration))
      setSettling((prev) => advanceAnimations(prev, time, SETTLE_DURATION))
      setLeaving((prev) => advanceAnimations(prev, time, SNAP_DURATION))
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [animating, entranceDuration])

  const toPixel = (point: Point) => {
    const [x, y] = transform.toPixel([point.x, point.y])
    return { x, y }
  }
  const endsOf = (geometry: Segment) => [toPixel({ x: geometry.x0, y: geometry.y0 }), toPixel({ x: geometry.x1, y: geometry.y1 })]
  const pointsAttribute = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')
  const head = (start: Point, end: Point, scale = 1) =>
    headSize ? <polygon points={pointsAttribute(headCorners(start, end, headSize * scale))} fill={color} /> : null

  const renderStroke = (stroke: StrokeMark) => {
    const [start, end] = endsOf(shownGeometry(stroke))

    // Drawing on: the stroke traces from its start to its end, then an arrow's head grows in.
    const startedAt = drawing.get(stroke.key)?.startedAt
    const age = startedAt === undefined ? Infinity : startedAt === null ? 0 : now - startedAt
    const drawn = easeOutCubic(Math.min(1, age / DRAW_ON_DURATION))
    const tip = { x: start.x + (end.x - start.x) * drawn, y: start.y + (end.y - start.y) * drawn }
    const headScale = Math.min(1, Math.max(0, (age - DRAW_ON_DURATION) / HEAD_POP_DURATION))

    return (
      <g key={stroke.key}>
        {stroke.key === selectedKey && (
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={width + HALO_WIDTH * 2} strokeLinecap="round" />
        )}
        <line x1={start.x} y1={start.y} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
        {headScale > 0 && head(start, end, headScale)}
      </g>
    )
  }

  // Snapped: the stroke breaks at its middle and the halves recoil into its ends, an arrow's head fading.
  const renderLeaving = ([key, stroke]: [string, Leaving]) => {
    const progress = animationProgress(stroke.startedAt, now, SNAP_DURATION)
    const [start, end] = endsOf(stroke.geometry)
    return (
      <g key={`leaving-${key}`}>
        <SnappingEdge a={start} b={end} progress={progress} width={width} color={color} />
        <g opacity={1 - progress}>{head(start, end)}</g>
      </g>
    )
  }

  // The stroke being dragged out: a dashed ghost until it is let go.
  const renderDraft = (geometry: Segment) => {
    const [start, end] = endsOf(geometry)
    return (
      <g>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeDasharray="6 5" strokeLinecap="round" />
        {head(start, end)}
      </g>
    )
  }

  const selected = showHandles ? strokes.find((stroke) => stroke.key === selectedKey) : undefined
  return (
    <g>
      {[...leaving].map(renderLeaving)}
      {strokes.map(renderStroke)}
      {draft && renderDraft(draft)}
      {selected && endsOf(shownGeometry(selected)).map((handle, i) => (
        <circle key={i} cx={handle.x} cy={handle.y} r={HANDLE_RADIUS} fill="#ffffff" stroke={color} strokeWidth={2} />
      ))}
    </g>
  )
}

export default Strokes
