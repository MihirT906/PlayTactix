// Act 0: Cold open. A viewer on the couch flicks through three channels of pundits breaking down a play,
// then switches the TV off: "Ever wanted to do it yourself?"
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { hump, progress } from '../anim'
import { Basketball } from './channels/Basketball'
import { Football } from './channels/Football'
import { Soccer } from './channels/Soccer'
import { RoomBack, RoomDefs, TV_H, TV_W, Tv, Viewer } from './LivingRoom'
import {
  type Caption,
  OFF,
  OFF_CAPTION,
  OSD_FRAMES,
  PRESSES,
  ROLL_FRAMES,
  ROOM_IN,
  STATIC_FRAMES,
  TITLE,
  camera,
  channelAt,
} from './timeline'

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'

type ChannelArt = { Picture: (props: { c: number }) => React.ReactNode; Ink: (props: { c: number }) => React.ReactNode; glow: string }
const ART: Record<number, ChannelArt> = {
  4: { ...Football, glow: '#9fc09a' },
  7: { ...Basketball, glow: '#c9b48a' },
  9: { ...Soccer, glow: '#8fbf8a' },
}
const STATIC_GLOW = '#9aa6b8'

const ScreenDefs = ({ f }: { f: number }) => (
  <defs>
    <filter id="washout" filterUnits="userSpaceOnUse" x={0} y={0} width={TV_W} height={TV_H} colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values="0.5" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="0.8" intercept="0.1" />
        <feFuncG type="linear" slope="0.8" intercept="0.1" />
        <feFuncB type="linear" slope="0.8" intercept="0.11" />
      </feComponentTransfer>
    </filter>
    <filter id="static" filterUnits="userSpaceOnUse" x={0} y={0} width={TV_W} height={TV_H} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.55 0.9" numOctaves={2} seed={f} />
      <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="2.2" intercept="-0.55" />
        <feFuncG type="linear" slope="2.2" intercept="-0.55" />
        <feFuncB type="linear" slope="2.2" intercept="-0.52" />
      </feComponentTransfer>
    </filter>
    <pattern id="scanlines" width={8} height={6} patternUnits="userSpaceOnUse">
      <rect width={8} height={2} fill="#000" opacity={0.18} />
    </pattern>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.45" />
    </radialGradient>
  </defs>
)

const Static = () => <rect width={TV_W} height={TV_H} filter="url(#static)" />

/** What's on the screen, in TV space. */
const Screen = ({ f }: { f: number }) => {
  const ch = channelAt(f)
  const art = ch ? ART[ch.num] : undefined
  const c = ch ? f - ch.start : 0
  // After the static, the picture rolls down into place.
  const roll = ch ? 1 - progress(c, STATIC_FRAMES, STATIC_FRAMES + ROLL_FRAMES) : 0

  // Switching off: squash to a bright line, then to a dot, then nothing.
  const k = f - OFF
  const sy = f < OFF ? 1 : Math.max(0.006, 1 - progress(k, 0, 5))
  const sx = f < OFF ? 1 : 1 - progress(k, 5, 10) * 0.995
  const white = f < OFF ? 0 : progress(k, 0, 4)
  const gone = f < OFF ? 0 : progress(k, 10, 16)

  return (
    <g>
      <ScreenDefs f={f} />
      <g opacity={1 - gone} transform={`translate(${TV_W / 2} ${TV_H / 2}) scale(${sx} ${sy}) translate(${-TV_W / 2} ${-TV_H / 2})`}>
        {art && (!ch || c >= STATIC_FRAMES) ? (
          <g transform={`translate(0 ${-TV_H * 0.35 * roll})`}>
            <g filter="url(#washout)">
              <art.Picture c={c} />
            </g>
            <art.Ink c={c} />
            {roll > 0 && <rect y={TV_H * (1 - 0.35 * roll)} width={TV_W} height={TV_H} fill="#0c0d10" />}
          </g>
        ) : (
          <Static />
        )}
        {ch && c < OSD_FRAMES && (
          <text
            x={TV_W - 60}
            y={96}
            fontFamily="Menlo, monospace"
            fontSize={68}
            fontWeight={700}
            fill="#6ef08a"
            textAnchor="end"
            stroke="#0b2a12"
            strokeWidth={4}
            paintOrder="stroke"
          >
            {`CH ${String(ch.num).padStart(2, '0')}`}
          </text>
        )}
        <rect width={TV_W} height={TV_H} fill="url(#scanlines)" />
        <rect width={TV_W} height={TV_H} fill="url(#vignette)" />
        {white > 0 && <rect width={TV_W} height={TV_H} fill="#f4f6ff" opacity={white} />}
      </g>
    </g>
  )
}

const CentredCaption = ({ f, c }: { f: number; c: Caption }) => {
  const opacity = progress(f, c.from, c.from + 8) * (1 - progress(f, c.to - 6, c.to))
  if (opacity <= 0) return null
  return (
    <text x={960} y={560} opacity={opacity} fontFamily={FONT} fontSize={72} fontWeight={700} fill="#f4f1ea" textAnchor="middle">
      {c.text}
    </text>
  )
}

export const Act0 = () => {
  const f = useCurrentFrame()
  const cam = camera(f)
  const ch = channelAt(f)
  const glowColor = (ch && ART[ch.num]?.glow) || STATIC_GLOW
  const glow = f < OFF ? 1 : 1 - progress(f - OFF, 2, 12)
  const press = Math.max(...PRESSES.map((p) => hump(f, p, p + 1, p + 3, p + 5)))
  const led = Math.max(...PRESSES.map((p) => hump(f, p, p + 1, p + 2, p + 4)))
  // Black until the title has been read, then the room fades up; it falls dark again once the TV is off.
  const dark = f < OFF ? 1 - progress(f, ROOM_IN.from, ROOM_IN.to) : progress(f - OFF, 4, 16)

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <RoomDefs glowColor={glowColor} />
        <g transform={`translate(960 540) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})`}>
          <RoomBack glow={glow} />
          <Tv>
            <Screen f={f} />
          </Tv>
          <Viewer rim={glowColor} press={press} led={led} />
        </g>
        {dark > 0 && <rect width={1920} height={1080} fill="#000" opacity={dark} />}
        <CentredCaption f={f} c={TITLE} />
        <CentredCaption f={f} c={OFF_CAPTION} />
      </svg>
    </AbsoluteFill>
  )
}
