import { useState } from 'react'
import { TIMELINE_CHART_HEIGHT, TIMELINE_CHART_PADDING, type MetricRow } from './rows'

type MetricTrackProps = {
  row: MetricRow
  scaleStart: number
  visibleFrameSpan: number
  timelineTrackWidth: number
}

const MetricTrack: React.FC<MetricTrackProps> = ({ row, scaleStart, visibleFrameSpan, timelineTrackWidth }) => {
  const [hover, setHover] = useState<{ x: number; value: number } | null>(null)

  const { points, min, max } = row
  const range = max - min || 1
  const innerHeight = TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING * 2

  type SvgPoint = { x: number; value: number; frame: number }
  const svgPoints: SvgPoint[] = []
  const segments: string[][] = []
  let current: string[] = []

  for (const { frame, value } of points) {
    if (value == null) {
      if (current.length > 0) { segments.push(current); current = [] }
      continue
    }
    const x = ((frame - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const y = TIMELINE_CHART_PADDING + innerHeight - ((value - min) / range) * innerHeight
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    svgPoints.push({ x, value, frame })
  }
  if (current.length > 0) segments.push(current)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left
    if (svgPoints.length === 0) return

    const left = svgPoints.filter((p) => p.x <= mouseX)
    const right = svgPoints.filter((p) => p.x > mouseX)

    let value: number
    let displayX: number

    if (left.length === 0) {
      value = right[0].value; displayX = right[0].x
    } else if (right.length === 0) {
      const p = left[left.length - 1]; value = p.value; displayX = p.x
    } else {
      const p1 = left[left.length - 1]
      const p2 = right[0]
      const hasGap = points.some((p) => p.value == null && p.frame > p1.frame && p.frame < p2.frame)
      if (hasGap) {
        const nearest = mouseX - p1.x <= p2.x - mouseX ? p1 : p2
        value = nearest.value; displayX = nearest.x
      } else {
        const t = (mouseX - p1.x) / (p2.x - p1.x)
        value = p1.value + (p2.value - p1.value) * t
        displayX = mouseX
      }
    }

    setHover({ x: displayX, value })
  }

  const TOOLTIP_W = 64
  const tooltipX = hover != null
    ? (hover.x + 8 + TOOLTIP_W > timelineTrackWidth ? hover.x - 8 - TOOLTIP_W : hover.x + 8)
    : 0
  const hoverY = hover != null
    ? TIMELINE_CHART_PADDING + innerHeight - ((hover.value - min) / range) * innerHeight
    : 0

  return (
    <svg
      width={timelineTrackWidth}
      height={TIMELINE_CHART_HEIGHT}
      className="event-display__metric-svg"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <text x={4} y={10} className="event-display__metric-scale">{max.toFixed(3)}</text>
      <text x={4} y={TIMELINE_CHART_HEIGHT - 3} className="event-display__metric-scale">{min.toFixed(3)}</text>
      {segments.map((pts, i) => (
        <polyline key={i} points={pts.join(' ')} className="event-display__metric-line" />
      ))}
      {hover != null && (
        <>
          <line
            x1={hover.x} y1={TIMELINE_CHART_PADDING}
            x2={hover.x} y2={TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING}
            className="event-display__metric-crosshair"
          />
          <circle cx={hover.x} cy={hoverY} r={3.5} className="event-display__metric-dot" />
          <rect x={tooltipX} y={TIMELINE_CHART_PADDING} width={TOOLTIP_W} height={18} rx={4} className="event-display__metric-tooltip-bg" />
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_CHART_PADDING + 13} textAnchor="middle" className="event-display__metric-tooltip">
            {hover.value.toFixed(3)}
          </text>
        </>
      )}
    </svg>
  )
}

export default MetricTrack
