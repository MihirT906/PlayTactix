import { polygonArea, polygonContains } from './overlays/teamShapeOverlay'

// Geometry for selecting and editing annotations on the pitch: what a click lands on, and how dragging
// a selected rectangle, line or arrow (or one of its handles) changes it.

export type Point = { x: number; y: number }

// Two ends in pitch metres: a line's or arrow's, or two opposite corners of a rectangle.
export type Segment = { x0: number; y0: number; x1: number; y1: number }

// A shape drawn with Draw Rectangle or Draw Line, as stored.
export type DrawShape = Segment & { type: 'rect' | 'line' }

// An annotation that can be moved and reshaped once selected.
export type EditableMark = { key: string; kind: 'rect' | 'line' | 'arrow'; geometry: Segment }

// Something a click can select, in pixels: a line-like annotation or an area.
export type HitTarget = { key: string; segment: [Point, Point] } | { key: string; polygon: Point[] }

// How a drag reshapes the selected mark: moving it whole, or dragging one of its handles.
export type MarkEdit = { kind: 'move'; from: Point; original: Segment } | { kind: 'handle'; index: number; original: Segment }

export const distanceToSegment = (point: Point, a: Point, b: Point) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

// The annotation a click at `point` selects. A line within `tolerance` beats an area, the nearest line
// winning; otherwise the smallest area containing the point.
export function hitTest(targets: HitTarget[], point: Point, tolerance: number): string | null {
  let nearestLine: string | null = null
  let nearestDistance = tolerance
  let smallestArea: string | null = null
  let smallestSize = Infinity
  for (const target of targets) {
    if ('segment' in target) {
      const distance = distanceToSegment(point, ...target.segment)
      if (distance <= nearestDistance) {
        nearestDistance = distance
        nearestLine = target.key
      }
    } else {
      const size = polygonArea(target.polygon)
      if (size < smallestSize && polygonContains(target.polygon, point)) {
        smallestSize = size
        smallestArea = target.key
      }
    }
  }
  return nearestLine ?? smallestArea
}

// A rectangle's corners, clockwise from its smallest x and y.
export const rectCorners = ({ x0, y0, x1, y1 }: Segment): Point[] => {
  const [left, right] = [Math.min(x0, x1), Math.max(x0, x1)]
  const [bottom, top] = [Math.min(y0, y1), Math.max(y0, y1)]
  return [{ x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: top }]
}

// Where a mark's handles are: a rectangle's corners, or a line's or arrow's two ends.
export const markHandles = (mark: Pick<EditableMark, 'kind' | 'geometry'>): Point[] =>
  mark.kind === 'rect'
    ? rectCorners(mark.geometry)
    : [{ x: mark.geometry.x0, y: mark.geometry.y0 }, { x: mark.geometry.x1, y: mark.geometry.y1 }]

// The mark's geometry with the pointer dragged to `to`. A rectangle's dragged corner moves while the
// opposite one stays put; a line's or arrow's dragged end moves while the other stays put.
export function applyMarkEdit(kind: EditableMark['kind'], edit: MarkEdit, to: Point): Segment {
  const { original } = edit
  if (edit.kind === 'move') {
    const dx = to.x - edit.from.x
    const dy = to.y - edit.from.y
    return { x0: original.x0 + dx, y0: original.y0 + dy, x1: original.x1 + dx, y1: original.y1 + dy }
  }
  if (kind === 'rect') {
    const opposite = rectCorners(original)[(edit.index + 2) % 4]
    return { x0: opposite.x, y0: opposite.y, x1: to.x, y1: to.y }
  }
  return edit.index === 0 ? { ...original, x0: to.x, y0: to.y } : { ...original, x1: to.x, y1: to.y }
}
