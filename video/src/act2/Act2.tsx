// Act 2: Enter Tapp'd. Answers Act 0's "Ever wanted to do it yourself?" straight away: Tapp'd, full screen, "Now it's
// your turn." Then the same viewer, the TV now off, opens a laptop. The screen wakes on a match, which tilts up into
// Tapp'd's top-down plot. The viewer leans in and the camera pushes into the screen until the app fills the frame.
// Ends on black.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { FPS, type Key, clamp01, progress, track } from '../anim'
import { BH, BW, Broadcast, PASS_AT, mix } from '../match/Broadcast'
import { TV_H, TV_W } from '../act0/LivingRoom'
import { LAPTOP_SCREEN as SCREEN, LaptopDefs, LaptopScene } from './Laptop'
import { LogoLockup } from '../Logo'
import { DISPLAY } from '../fonts'

// The full-screen introduction, straight out of Act 0's black, then back to black.
const INTRO = { in: [0, 10] as const, logo: [6, 22] as const, line: [20, 34] as const, out: [76, 90] as const }

// The laptop scene, in frames from L0: the room fades up dimly with the laptop closed.
const L0 = 90
const FADE_UP = [2, 18] as const
const LID = [22, 48] as const
const WAKE = [52, 64] as const // the screen comes on
const PASS_FRAME = 80 // the pass is played shortly after

const TILT = [104, 170] as const
const MARKERS = [168, 180] as const
const APP_BAR = [174, 186] as const
const LEAN = [180, 198] as const
const PUSH = [222, 256] as const // into the screen
const TO_BLACK = [270, 284] as const // after a moment on the app, black for Act 3's first title card

export const ACT2_DURATION = L0 + 286 // 12.5s

/** The match clock on the laptop at frame f. */
const gameTime = (f: number) => PASS_AT - (PASS_FRAME - f) / FPS

// Camera: a wide over-the-shoulder shot, a slow push while the match turns into the plot, then into the screen
// until it fills the frame.
const SCREEN_CX = SCREEN.x + SCREEN.w / 2
const SCREEN_CY = SCREEN.y + SCREEN.h / 2
const FILL_Z = 1920 / SCREEN.w
const CAM: Key<[number, number, number]>[] = [
  [0, [960, 540, 1]],
  [WAKE[0], [960, 540, 1]],
  [PUSH[0], [1050, 470, 1.18]],
  [PUSH[1], [SCREEN_CX, SCREEN_CY, FILL_Z]],
]

const BROADCAST_GLOW = '#8fbf8a'
const APP_GLOW = '#5fd68f'

// The match picture is 640x356; scale it to cover the screen and centre it.
const PIC_SCALE = Math.max(TV_W / BW, TV_H / BH)
const PIC_X = (TV_W - BW * PIC_SCALE) / 2
const PIC_Y = (TV_H - BH * PIC_SCALE) / 2

/** Where the 640x356 match picture sits on screen once the camera has filled the frame with the laptop's screen:
 * screen = (x + s * picX, y + s * picY). Act 3's app is laid out on exactly this picture. */
export const APP_ON_SCREEN = (() => {
  const room = SCREEN.w / TV_W
  return {
    s: room * PIC_SCALE * FILL_Z,
    x: 960 + (SCREEN.x + room * PIC_X - SCREEN_CX) * FILL_Z,
    y: 540 + (SCREEN.y + room * PIC_Y - SCREEN_CY) * FILL_Z,
  }
})()

/** What's on the laptop, in TV space: the match, waking from black. */
const Screen = ({ f, tilt }: { f: number; tilt: number }) => {
  const wake = progress(f, ...WAKE)
  if (wake <= 0) return null
  // A little broadcast vignette, gone once the picture is Tapp'd.
  const broadcast = 1 - clamp01((tilt - 0.35) / 0.65)
  return (
    <g opacity={wake}>
      <defs>
        <radialGradient id="a2Vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <g transform={`translate(${PIC_X} ${PIC_Y}) scale(${PIC_SCALE})`}>
        <Broadcast
          gt={gameTime(f)}
          tilt={tilt}
          markers={progress(f, ...MARKERS)}
          appBar={progress(f, ...APP_BAR)}
        />
      </g>
      {broadcast > 0 && <rect width={TV_W} height={TV_H} fill="url(#a2Vignette)" opacity={broadcast} />}
    </g>
  )
}

export const Act2 = () => {
  const frame = useCurrentFrame()
  const f = frame - L0
  const pick = (i: number) => CAM.map(([k, v]) => [k, v[i]] as const)
  const cam = { cx: track(f, pick(0)), cy: track(f, pick(1)), z: track(f, pick(2)) }

  const tilt = progress(f, ...TILT)
  const glowColor = mix(BROADCAST_GLOW, APP_GLOW, progress(f, 120, 186))
  const glow = progress(f, WAKE[0], WAKE[1] + 10)
  // Dim while the laptop is closed; once the screen is on, the room stays dark but the viewer is lit by it.
  const dim = 0.55 - 0.3 * glow
  const black = 1 - progress(f, ...FADE_UP)

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <LaptopDefs glowColor={glowColor} />
        <g transform={`translate(960 540) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})`}>
          <LaptopScene open={progress(f, ...LID)} glow={glow} lean={progress(f, ...LEAN)} dim={dim}>
            <Screen f={f} tilt={tilt} />
          </LaptopScene>
        </g>
        {black > 0 && <rect width={1920} height={1080} fill="#000" opacity={black} />}
      </svg>
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: progress(f, ...TO_BLACK) }} />
      <Intro f={frame} />
    </AbsoluteFill>
  )
}

/** Tapp'd, full screen: the logo, then the answer to Act 0's "Ever wanted to do it yourself?" */
const Intro = ({ f }: { f: number }) => {
  const card = progress(f, ...INTRO.in) * (1 - progress(f, ...INTRO.out))
  if (card <= 0) return null
  const logo = progress(f, ...INTRO.logo)
  const line = progress(f, ...INTRO.line)
  return (
    <AbsoluteFill style={{ opacity: card }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #233d4d 0%, #0e171e 75%)' }} />
      <LogoLockup
        size={210}
        style={{ position: 'absolute', top: 330, left: 0, width: 1920, opacity: logo, transform: `scale(${0.9 + 0.1 * logo})` }}
      />
      <div
        style={{
          position: 'absolute',
          top: 600,
          width: 1920,
          textAlign: 'center',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 104,
          color: '#fff',
          opacity: line,
          transform: `translateY(${(1 - line) * 20}px)`,
        }}
      >
        Now it's <span style={{ color: '#fe7f2d' }}>your turn.</span>
      </div>
    </AbsoluteFill>
  )
}
