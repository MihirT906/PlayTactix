import { useState } from 'react'
import { TIMELINE_CHART_HEIGHT, TIMELINE_CHART_PADDING, type PossessionBand, type PossessionBandRow } from './rows'

const POSSESSION_BAND_MIN_WIDTH = 6

type PossessionBandTrackProps = {
  row: PossessionBandRow
  scaleStart: number
  visibleFrameSpan: number
  timelineTrackWidth: number
}

const PossessionBandTrack: React.FC<PossessionBandTrackProps> = ({
  row,
  scaleStart,
  visibleFrameSpan,
  timelineTrackWidth,
}) => {
  const [hover, setHover] = useState<{ x: number; band: PossessionBand } | null>(null)

  const { bands, min, max } = row
  const range = max - min || 1
  const innerHeight = TIMELINE_CHART_HEIGHT - TIMELINE_CHART_PADDING * 2
  const yFor = (value: number) => TIMELINE_CHART_PADDING + innerHeight - ((value - min) / range) * innerHeight
  const yZero = yFor(0)

  const bars = bands.map((band) => {
    const xStart = ((band.frameStart - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const xEndRaw = ((band.frameEnd - scaleStart) / visibleFrameSpan) * timelineTrackWidth
    const xEnd = Math.max(xEndRaw, xStart + POSSESSION_BAND_MIN_WIDTH)
    const centerX = (xStart + xEnd) / 2
    const yStart = yFor(band.start)
    const yEnd = yFor(band.end)
    const wickTop = yFor(band.max)
    const wickBottom = Math.min(yStart, yEnd)
    const hasSignal = band.start !== 0 || band.end !== 0 || band.max !== 0

    return { band, xStart, xEnd, centerX, yStart, yEnd, wickTop, wickBottom, hasSignal }
  })

  type LineSegment = { x1: number; y1: number; x2: number; y2: number; hasSignal: boolean }
  const segments: LineSegment[] = []

  bars.forEach((bar, index) => {
    segments.push({ x1: bar.xStart, y1: bar.yStart, x2: bar.xEnd, y2: bar.yEnd, hasSignal: bar.hasSignal })

    const next = bars[index + 1]
    if (next) {
      segments.push({ x1: bar.xEnd, y1: bar.yEnd, x2: bar.xEnd, y2: yZero, hasSignal: false })
      segments.push({ x1: bar.xEnd, y1: yZero, x2: next.xStart, y2: yZero, hasSignal: false })
      segments.push({ x1: next.xStart, y1: yZero, x2: next.xStart, y2: next.yStart, hasSignal: false })
    }
  })

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (bars.length === 0) return
    const mouseX = e.clientX - e.currentTarget.getBoundingClientRect().left

    let nearest = bars[0]
    let nearestDistance = Math.abs(bars[0].centerX - mouseX)
    for (const bar of bars) {
      const distance = Math.abs(bar.centerX - mouseX)
      if (distance < nearestDistance) {
        nearest = bar
        nearestDistance = distance
      }
    }

    setHover({ x: nearest.centerX, band: nearest.band })
  }

  const TOOLTIP_W = 96
  const TOOLTIP_H = 44
  const tooltipX = hover != null
    ? (hover.x + 8 + TOOLTIP_W > timelineTrackWidth ? hover.x - 8 - TOOLTIP_W : hover.x + 8)
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
      {segments.map((segment, index) => (
        <line
          key={index}
          x1={segment.x1} y1={segment.y1}
          x2={segment.x2} y2={segment.y2}
          className={[
            'event-display__band-line',
            segment.hasSignal ? 'event-display__band--signal' : 'event-display__band--flat',
          ].join(' ')}
        />
      ))}
      {bars.map((bar, index) => (
        <g key={index} className={bar.hasSignal ? 'event-display__band--signal' : 'event-display__band--flat'}>
          <line
            x1={bar.centerX} y1={bar.wickTop}
            x2={bar.centerX} y2={bar.wickBottom}
            className="event-display__band-wick"
          />
          <circle cx={bar.centerX} cy={bar.wickTop} r={bar.hasSignal ? 2.5 : 1.5} className="event-display__band-max-dot" />
        </g>
      ))}
      {hover != null && (
        <>
          <rect
            x={tooltipX} y={TIMELINE_CHART_PADDING}
            width={TOOLTIP_W} height={TOOLTIP_H}
            rx={4} className="event-display__metric-tooltip-bg"
          />
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_CHART_PADDING + 13} textAnchor="middle" className="event-display__metric-tooltip">
            start {hover.band.start.toFixed(2)}
          </text>
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_CHART_PADDING + 26} textAnchor="middle" className="event-display__metric-tooltip">
            end {hover.band.end.toFixed(2)}
          </text>
          <text x={tooltipX + TOOLTIP_W / 2} y={TIMELINE_CHART_PADDING + 39} textAnchor="middle" className="event-display__metric-tooltip">
            max {hover.band.max.toFixed(2)}
          </text>
        </>
      )}
    </svg>
  )
}

export default PossessionBandTrack
