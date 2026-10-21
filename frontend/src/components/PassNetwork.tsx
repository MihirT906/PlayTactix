import React from 'react'
import { usePitch } from '@pitchkit/react'
import type { PassNetworkLine } from '../plot/overlays/passNetworkOverlay'

const WIDTH_TRANSITION = 'stroke-width 300ms ease-out, stroke-opacity 300ms ease-out' // A line thickening as passes are added

// The pass network on a PitchKit layer: a line between team-mates for the passes they completed, thicker
// and more solid the more passes it stands for. Must be rendered inside a <Pitch>.
const PassNetwork: React.FC<{
  lines: PassNetworkLine[]
  maxCount: number // The count the thickest line stands for
  colorOf: (line: PassNetworkLine) => string
  minWidth: number
  maxWidth: number
  minOpacity: number
  maxOpacity: number
}> = ({ lines, maxCount, colorOf, minWidth, maxWidth, minOpacity, maxOpacity }) => {
  const { transform } = usePitch()

  const renderLine = (line: PassNetworkLine) => {
    const share = maxCount > 0 ? Math.min(1, line.count / maxCount) : 1
    const [x1, y1] = transform.toPixel([line.from.x, line.from.y])
    const [x2, y2] = transform.toPixel([line.to.x, line.to.y])
    return (
      <line
        key={line.key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={colorOf(line)}
        strokeLinecap="round"
        style={{
          strokeWidth: minWidth + (maxWidth - minWidth) * share,
          strokeOpacity: minOpacity + (maxOpacity - minOpacity) * share,
          transition: WIDTH_TRANSITION,
        }}
      />
    )
  }

  return <g>{lines.map(renderLine)}</g>
}

export default PassNetwork
