import React from 'react'
import { usePitch } from '@pitchkit/react'
import type { FocusSpot } from '../plot/overlays/focusSpotlightOverlay'
import './FocusNameTags.css'

// The box is drawn in HTML (inside a foreignObject) so it shares the app's panel styling; this is
// the room it is laid out in, wider and taller than any name needs, centred on the player.
const TAG_BOX_WIDTH = 220 // pixels
const TAG_BOX_HEIGHT = 28 // pixels
const GAP_ABOVE_PLAYER = 4 // pixels between the player's marker and the box

type FocusNameTagsProps = {
  spots: FocusSpot[]
  // The name shown for a player, e.g. "#10 B. Gibson"; null leaves them without a tag.
  getLabel: (playerId: number) => string | null
  // The player marker's diameter in pixels, so the box sits clear of it.
  markerSize: number
}

// A box with each focused player's name, just above them. Near the top of the pitch, where there is
// no room above, it goes below them instead. Must be rendered inside a <Pitch>.
const FocusNameTags: React.FC<FocusNameTagsProps> = ({ spots, getLabel, markerSize }) => {
  const { transform } = usePitch()

  return (
    <g className="focus-name-tags">
      {spots.map((spot) => {
        const label = getLabel(spot.playerId)
        if (!label) return null

        const [cx, cy] = transform.toPixel([spot.x, spot.y])
        const clearance = markerSize / 2 + GAP_ABOVE_PLAYER
        const above = cy - clearance - TAG_BOX_HEIGHT >= 0
        return (
          <foreignObject
            key={spot.playerId}
            x={cx - TAG_BOX_WIDTH / 2}
            y={above ? cy - clearance - TAG_BOX_HEIGHT : cy + clearance}
            width={TAG_BOX_WIDTH}
            height={TAG_BOX_HEIGHT}
          >
            <div className={`focus-name-tag${above ? '' : ' focus-name-tag--below'}`}>
              <span className="focus-name-tag__box">{label}</span>
            </div>
          </foreignObject>
        )
      })}
    </g>
  )
}

export default FocusNameTags
