import React from 'react'
import { usePitch } from '@pitchkit/react'
import { markHandles, rectCorners, type DrawShape, type EditableMark, type Point } from '../plot/annotationGeometry'

// Rectangles and lines drawn on the pitch, and the halo and handles of a selected rectangle, line or
// arrow (arrows themselves are PitchKit's <Arrows>). Must be rendered inside a <Pitch>.

const HALO_WIDTH = 6 // pixels beyond the mark on each side
const HANDLE_RADIUS = 5 // pixels

type ShapeStyle = { lineColor: string; lineWidth: number; fillColor: string }

const usePixels = () => {
  const { transform } = usePitch()
  return (point: Point) => {
    const [x, y] = transform.toPixel([point.x, point.y])
    return { x, y }
  }
}

const pointsAttribute = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')

// The drawn rectangles and lines, and the one being dragged out.
export const DrawnShapes: React.FC<{ shapes: Array<{ key: string; shape: DrawShape }>; style: ShapeStyle }> = ({ shapes, style }) => {
  const toPixel = usePixels()
  return (
    <g>
      {shapes.map(({ key, shape }) => {
        if (shape.type === 'rect') {
          return (
            <polygon
              key={key}
              points={pointsAttribute(rectCorners(shape).map(toPixel))}
              fill={style.fillColor}
              stroke={style.lineColor}
              strokeWidth={style.lineWidth}
            />
          )
        }
        const a = toPixel({ x: shape.x0, y: shape.y0 })
        const b = toPixel({ x: shape.x1, y: shape.y1 })
        return <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={style.lineColor} strokeWidth={style.lineWidth} strokeLinecap="round" />
      })}
    </g>
  )
}

// A soft white glow round the selected mark, drawn beneath it.
export const SelectionHalo: React.FC<{ mark: EditableMark; width: number }> = ({ mark, width }) => {
  const toPixel = usePixels()
  const halo = { fill: 'none', stroke: '#ffffff', strokeOpacity: 0.45, strokeWidth: width + HALO_WIDTH * 2, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  if (mark.kind === 'rect') return <polygon points={pointsAttribute(rectCorners(mark.geometry).map(toPixel))} {...halo} />
  const a = toPixel({ x: mark.geometry.x0, y: mark.geometry.y0 })
  const b = toPixel({ x: mark.geometry.x1, y: mark.geometry.y1 })
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...halo} />
}

// The handles a selected mark is reshaped by: a rectangle's corners, a line's or arrow's ends.
export const EditHandles: React.FC<{ mark: EditableMark; color: string }> = ({ mark, color }) => {
  const toPixel = usePixels()
  return (
    <g>
      {markHandles(mark).map(toPixel).map((handle, i) => (
        <circle key={i} cx={handle.x} cy={handle.y} r={HANDLE_RADIUS} fill="#ffffff" stroke={color} strokeWidth={2} />
      ))}
    </g>
  )
}
