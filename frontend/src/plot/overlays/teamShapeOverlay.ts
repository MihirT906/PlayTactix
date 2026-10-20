type Point = { x: number; y: number }

// Geometry for drawing team shapes: the hull around their players, measured, and resampled so that two
// different hulls can be blended into each other.

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

// The convex hull of the points, anticlockwise, without collinear points (Andrew's monotone chain).
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((p, q) => p.x - q.x || p.y - q.y)
  if (sorted.length < 3) return sorted
  const half = (chain: Point[]) => {
    const hull: Point[] = []
    for (const point of chain) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop()
      hull.push(point)
    }
    hull.pop() // Each half's last point starts the other half
    return hull
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

export function polygonArea(polygon: Point[]): number {
  let twiceArea = 0
  polygon.forEach((point, i) => {
    const next = polygon[(i + 1) % polygon.length]
    twiceArea += point.x * next.y - next.x * point.y
  })
  return Math.abs(twiceArea) / 2
}

// The polygon's centre of area, or the mean of its points when it encloses none.
export function polygonCentroid(polygon: Point[]): Point {
  let twiceArea = 0
  let x = 0
  let y = 0
  polygon.forEach((point, i) => {
    const next = polygon[(i + 1) % polygon.length]
    const step = point.x * next.y - next.x * point.y
    twiceArea += step
    x += (point.x + next.x) * step
    y += (point.y + next.y) * step
  })
  if (Math.abs(twiceArea) < 1e-9) {
    return {
      x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
      y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
    }
  }
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) }
}

// A block's size the way it is usually quoted: width across the pitch and depth along it, in metres.
export function blockSize(points: Point[]): { width: number; depth: number } {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return { width: Math.max(...ys) - Math.min(...ys), depth: Math.max(...xs) - Math.min(...xs) }
}

// `count` points spaced evenly round the polygon's outline, starting at its first point.
export function resamplePolygon(polygon: Point[], count: number): Point[] {
  const edges = polygon.map((point, i) => {
    const next = polygon[(i + 1) % polygon.length]
    return { from: point, to: next, length: Math.hypot(next.x - point.x, next.y - point.y) }
  })
  const perimeter = edges.reduce((sum, edge) => sum + edge.length, 0)
  if (perimeter === 0) return Array.from({ length: count }, () => ({ ...polygon[0] }))

  const samples: Point[] = []
  let edgeIndex = 0
  let edgeStart = 0 // Distance round the outline at which the current edge starts
  for (let i = 0; i < count; i++) {
    const distance = (i / count) * perimeter
    while (edgeIndex < edges.length - 1 && edgeStart + edges[edgeIndex].length < distance) {
      edgeStart += edges[edgeIndex].length
      edgeIndex++
    }
    const { from, to, length } = edges[edgeIndex]
    const t = length === 0 ? 0 : (distance - edgeStart) / length
    samples.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
  }
  return samples
}

// `to` rotated so its points line up with `from`'s: of every starting point, the one the points have to
// travel least from. Both are resampled to the same count and run the same way round.
export function alignPolygon(from: Point[], to: Point[]): Point[] {
  let bestOffset = 0
  let bestCost = Infinity
  for (let offset = 0; offset < to.length; offset++) {
    let cost = 0
    for (let i = 0; i < from.length && cost < bestCost; i++) {
      const point = to[(i + offset) % to.length]
      cost += (point.x - from[i].x) ** 2 + (point.y - from[i].y) ** 2
    }
    if (cost < bestCost) {
      bestCost = cost
      bestOffset = offset
    }
  }
  return from.map((_, i) => to[(i + bestOffset) % to.length])
}
