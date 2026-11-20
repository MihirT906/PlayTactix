// The "Reading the pitch" clip for the docs' workspace page (frontend/public/docs-media/workspace-markers.mp4), 10s.
// Starts in the workspace: play, then pause, and the playback controls are boxed; a zoom onto the pitch names each
// marker; then Settings is boxed as where to change them.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { FPS, type Key, type Pt, clamp01, lerp, lerpPt, progress, track } from '../anim'
import { C } from '../act3/Pitch'
import { Cursor } from '../act3/Ui'
import { PASSER, PASS_OPTIONS, PLAYERS, ballPos, playerPos } from '../act3/play'
import {
  AppBar,
  CONTROLS_RECT,
  Callout,
  Controls,
  H,
  Highlight,
  MARK,
  PLAY_BTN,
  Pitch,
  RAIL_W,
  RED_6,
  RUN_LINE,
  Rail,
  W,
  fitPitch,
  fmt,
  railRect,
  toScreen,
} from './workspace'

const VIEW = fitPitch(H)
const P = (p: Pt) => toScreen(VIEW, p)
const CLIP_LEN = 120 // seconds: the first two minutes
const CLIP_AT = 64 // where in them the clip sits

// ---------------- The script ----------------

const START_M = 0.45 // move time on screen when the clip opens
const PLAY = 22 // frame play starts
const PAUSE = 64 // frame play stops (move time 1.85: blue 8 on the ball, 11 running in behind)
const CONTROLS_BOX = [70, 124] as const
const ZOOM_IN = [124, 148] as const
const CALLOUTS_AT = 150
const CALLOUT_GAP = 12
const ZOOM_OUT = [232, 254] as const
const SETTINGS_BOX = 254
const FADE = 290
export const READING_THE_PITCH_DURATION = 300

const CURSOR: Key<Pt>[] = [
  [0, { x: PLAY_BTN.x + 220, y: PLAY_BTN.y + 190 }],
  [6, { x: PLAY_BTN.x + 220, y: PLAY_BTN.y + 190 }],
  [20, PLAY_BTN],
  [PAUSE, PLAY_BTN],
  [PAUSE + 16, { x: PLAY_BTN.x + 90, y: PLAY_BTN.y + 140 }],
]
const CLICKS = [PLAY - 2, PAUSE - 1]

const moveTime = (f: number) => START_M + (clamp01((f - PLAY) / (PAUSE - PLAY)) * (PAUSE - PLAY)) / FPS

// The zoom onto the action while the markers are named.
const ZOOM = 2.4
const FOCUS = P({ x: 26, y: -4 })
const CENTRE: Pt = { x: W / 2, y: H / 2 }
const camera = (z: number) => {
  const s = lerp(1, ZOOM, z)
  const c = lerpPt(FOCUS, CENTRE, z)
  return { apply: (p: Pt): Pt => ({ x: c.x + s * (p.x - FOCUS.x), y: c.y + s * (p.y - FOCUS.y) }), transform: `translate(${c.x} ${c.y}) scale(${s}) translate(${-FOCUS.x} ${-FOCUS.y})` }
}

// The marker callouts: what each points at (pitch metres) and where its label sits (screen offset, zoomed in).
const CALLOUTS: { color: string; text: string; target: (m: number) => Pt; offset: Pt }[] = [
  { color: MARK.possession, text: 'The player on the ball', target: (m) => playerPos(PASSER, m), offset: { x: -250, y: 190 } },
  { color: MARK.option, text: 'A passing option', target: (m) => playerPos(PASS_OPTIONS[0].to, m), offset: { x: -260, y: -100 } },
  { color: MARK.press, text: 'A defender pressing the ball', target: (m) => playerPos(RED_6, m), offset: { x: 360, y: -170 } },
  { color: MARK.run, text: 'An off-ball run', target: () => lerpPt(RUN_LINE[0], RUN_LINE[1], 0.75), offset: { x: 240, y: 130 } },
]
const calloutShow = (f: number, i: number) => {
  const at = CALLOUTS_AT + i * CALLOUT_GAP
  return progress(f, at, at + 10) * (1 - progress(f, ZOOM_OUT[0] - 10, ZOOM_OUT[0]))
}

const SETTINGS_RECT = railRect('Settings')

const cursorAt = (f: number): Pt => ({
  x: track(f, CURSOR.map(([k, v]) => [k, v.x] as Key)),
  y: track(f, CURSOR.map(([k, v]) => [k, v.y] as Key)),
})

export const ReadingThePitch = () => {
  const f = useCurrentFrame()
  const cursor = cursorAt(f)
  const m = moveTime(f)
  const clip = CLIP_AT + m
  const cam = camera(progress(f, ...ZOOM_IN) * (1 - progress(f, ...ZOOM_OUT)))
  const down = CLICKS.some((c) => f >= c && f < c + 4)

  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <g transform={cam.transform}>
          <Pitch view={VIEW} bottom={H} players={PLAYERS.map((_, i) => playerPos(i, m))} ball={ballPos(m)} m={m} />
          <Controls playing={f >= PLAY && f < PAUSE} clip={clip} clipLen={CLIP_LEN} match={fmt(clip)} cursor={cursor} />
          <Rail />
          <AppBar />
        </g>

        {CALLOUTS.map((c, i) => (
          <Callout key={c.text} at={cam.apply(P(c.target(m)))} offset={c.offset} color={c.color} text={c.text} show={calloutShow(f, i)} />
        ))}

        <Highlight
          box={CONTROLS_RECT}
          label={{ x: W / 2 + RAIL_W / 2, y: CONTROLS_RECT.y + CONTROLS_RECT.h + 66, text: 'Playback controls' }}
          show={progress(f, CONTROLS_BOX[0], CONTROLS_BOX[0] + 8) * (1 - progress(f, CONTROLS_BOX[1] - 6, CONTROLS_BOX[1]))}
        />
        <Highlight
          box={SETTINGS_RECT}
          label={{ x: RAIL_W + 30, y: SETTINGS_RECT.y + SETTINGS_RECT.h / 2, text: 'Change or hide the markers in Settings', anchor: 'start' }}
          show={progress(f, SETTINGS_BOX, SETTINGS_BOX + 8)}
        />

        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1 - progress(f, PAUSE + 8, PAUSE + 16)} down={down} clicks={CLICKS.map((c) => (f - c) / 10)} />
        </g>

        <rect width={W} height={H} fill="#000" opacity={progress(f, FADE, READING_THE_PITCH_DURATION) + (1 - progress(f, 0, 6))} />
      </svg>
    </AbsoluteFill>
  )
}
