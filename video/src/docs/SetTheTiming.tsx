// The "Set the timing" clip for the docs' workspace page (frontend/public/docs-media/workspace-timeline.mp4), 12s.
// The timeline's Clip rows are boxed: everything added gets a bar. The Pitch Control bar is dragged to move it (the
// overlay goes off as the bar leaves the playhead), then its end is dragged to trim it. Play then shows each mark
// only while the playhead is in its bar.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { type Key, type Pt, clamp01, linear, progress, track } from '../anim'
import { C, PitchControl, SANS } from '../act3/Pitch'
import { Cursor } from '../act3/Ui'
import { MOVE_END, PLAYERS, RUNNER, ballPos, playerPos } from '../act3/play'
import { AWAY, AppBar, BORDER, Controls, H, HOME, Highlight, MUTED, PITCH_TOP, PLAY_BTN, Pitch, RAIL_W, Rail, Step, TEXT, W, fitPitch, fmt, toScreen } from './workspace'

// ---------------- Layout ----------------

const CLIP_LEN = 34 // seconds: the moment in the clip
const TL_H = 320
const TL_TOP = H - TL_H
const VIEW = fitPitch(TL_TOP)
const P = (p: Pt) => toScreen(VIEW, p)

// The timeline's rows, from its top.
const ROW_H = 50
const Y = { ruler: 0, insights: 36, clip: 68, moments: 100, overlays: 150, pc: 180, annotations: 230, focus: 260 }
const TRACK = { x0: 300, x1: 1880 }
const cx = (c: number) => TRACK.x0 + (c / CLIP_LEN) * (TRACK.x1 - TRACK.x0)

// The Pitch Control bar: where it starts, then moved, then trimmed.
const PC_START = { from: 6, to: 19 }
const MOVE_BY = 6
const TRIM_TO = 20
const FOCUS_BAR = { from: 16, to: 28 }

// ---------------- The script ----------------

const PLAYHEAD = 10 // where the playhead sits until play
const PLAY_TO = 30
const BOXED = [8, 60] as const // the Clip rows boxed
const MOVE = { step: 60, press: 82, release: 108 }
const TRIM = { step: 132, press: 152, release: 174 }
const PLAY = { step: 198, click: 218, end: 318 }
const FADE = 336
export const SET_THE_TIMING_DURATION = 354

const barY = (row: number) => TL_TOP + row + ROW_H / 2
const CURSOR: Key<Pt>[] = [
  [0, { x: 1300, y: 520 }],
  [MOVE.step + 2, { x: 1300, y: 520 }],
  [MOVE.press - 2, { x: cx(12.5), y: barY(Y.pc) }],
  [MOVE.press, { x: cx(12.5), y: barY(Y.pc) }],
  [MOVE.release, { x: cx(12.5 + MOVE_BY), y: barY(Y.pc) }],
  [TRIM.step + 4, { x: cx(12.5 + MOVE_BY), y: barY(Y.pc) }],
  [TRIM.press - 2, { x: cx(PC_START.to + MOVE_BY) - 6, y: barY(Y.pc) }],
  [TRIM.press, { x: cx(PC_START.to + MOVE_BY) - 6, y: barY(Y.pc) }],
  [TRIM.release, { x: cx(TRIM_TO) - 6, y: barY(Y.pc) }],
  [PLAY.step + 2, { x: cx(TRIM_TO) - 6, y: barY(Y.pc) }],
  [PLAY.click - 2, PLAY_BTN],
  [PLAY.click + 20, PLAY_BTN],
  [PLAY.click + 40, { x: PLAY_BTN.x + 120, y: PLAY_BTN.y + 160 }],
]
const CLICKS = [MOVE.press, TRIM.press, PLAY.click]

/** The Pitch Control bar at frame f. */
function pcBar(f: number) {
  const moved = MOVE_BY * progress(f, MOVE.press, MOVE.release, linear)
  const trimmed = (PC_START.to + MOVE_BY - TRIM_TO) * progress(f, TRIM.press, TRIM.release, linear)
  return { from: PC_START.from + moved, to: PC_START.to + moved - trimmed }
}

/** The playhead (clip seconds) at frame f. */
const playhead = (f: number) => track(f, [[PLAY.click + 2, PLAYHEAD], [PLAY.end, PLAY_TO]], linear)
const isPlaying = (f: number) => f >= PLAY.click + 2 && f < PLAY.end

/** On inside [from, to], easing over a third of a second at each end. */
const within = (c: number, from: number, to: number) => clamp01(Math.min(c - from, to - c) / 0.35 + 0.5)

// ---------------- Timeline ----------------

const dur = (s: number) => {
  const v = Math.round(s)
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

const Bar = ({ row, from, to, text, fill, dashed }: { row: number; from: number; to: number; text: string; fill: string; dashed?: boolean }) => {
  const x0 = cx(from)
  const x1 = cx(to)
  const y = TL_TOP + row + 7
  const h = ROW_H - 14
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={h} rx={6} fill={fill} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray={dashed ? '6 4' : undefined} />
      <rect x={x0 + 5} y={y + 9} width={3} height={h - 18} rx={1.5} fill="#fff" opacity={0.6} />
      <rect x={x1 - 8} y={y + 9} width={3} height={h - 18} rx={1.5} fill="#fff" opacity={0.6} />
      <text x={x0 + 16} y={y + h / 2 + 7} fontFamily={SANS} fontSize={19} fontWeight={700} fill="#fff">
        {text}
      </text>
    </g>
  )
}

const Timeline = ({ c, pc }: { c: number; pc: { from: number; to: number } }) => {
  const label = (row: number, text: string, kind: 'section' | 'group' | 'row') => (
    <text
      x={kind === 'row' ? 40 : 28}
      y={TL_TOP + row + (kind === 'row' ? ROW_H / 2 + 7 : 22)}
      fontFamily={SANS}
      fontSize={kind === 'row' ? 20 : 15}
      fontWeight={kind === 'row' ? 600 : 700}
      fill={kind === 'row' ? TEXT : MUTED}
      letterSpacing={kind === 'row' ? 0 : 2}
    >
      {text}
    </text>
  )
  const lane = (row: number) => <rect x={TRACK.x0} y={TL_TOP + row + 5} width={TRACK.x1 - TRACK.x0} height={ROW_H - 10} rx={6} fill="#1b2b36" />
  return (
    <g>
      <defs>
        <linearGradient id="momentBar" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(56,189,248)" stopOpacity={0.88} />
          <stop offset="1" stopColor="rgb(14,165,233)" stopOpacity={0.72} />
        </linearGradient>
        <linearGradient id="pcBar" x1="0" x2="1">
          <stop offset="0" stopColor={AWAY} stopOpacity={0.55} />
          <stop offset="1" stopColor={HOME} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect x={0} y={TL_TOP} width={W} height={TL_H} fill="#15222b" />
      <rect x={0} y={TL_TOP} width={W} height={2} fill={BORDER} />

      {Array.from({ length: Math.floor(CLIP_LEN / 5) + 1 }, (_, i) => (
        <g key={i}>
          <rect x={cx(i * 5) - 1} y={TL_TOP + 22} width={2} height={10} fill={MUTED} opacity={0.7} />
          <text x={cx(i * 5)} y={TL_TOP + 17} fontFamily={SANS} fontSize={14} fill={MUTED} textAnchor="middle">
            {dur(i * 5)}
          </text>
        </g>
      ))}

      {label(Y.insights, '▸ INSIGHTS', 'section')}
      {label(Y.clip, '▾ CLIP', 'section')}
      {label(Y.moments, 'Moments', 'row')}
      {lane(Y.moments)}
      <Bar row={Y.moments} from={0} to={CLIP_LEN} text="52:10 · 0:34" fill="url(#momentBar)" />
      {label(Y.overlays, 'Overlays', 'group')}
      {label(Y.pc, 'Pitch Control', 'row')}
      {lane(Y.pc)}
      <Bar row={Y.pc} from={pc.from} to={pc.to} text={`Pitch Control · ${dur(pc.to - pc.from)}`} fill="url(#pcBar)" />
      {label(Y.annotations, 'Annotations', 'group')}
      {label(Y.focus, 'Player Focus', 'row')}
      {lane(Y.focus)}
      <Bar row={Y.focus} from={FOCUS_BAR.from} to={FOCUS_BAR.to} text={`Arlo · ${dur(FOCUS_BAR.to - FOCUS_BAR.from)}`} fill="rgba(148,163,184,0.28)" />

      <rect x={cx(c) - 1.5} y={TL_TOP + 8} width={3} height={TL_H} fill={C.accent} />
      <path d={`M${cx(c) - 9} ${TL_TOP + 2} L${cx(c) + 9} ${TL_TOP + 2} L${cx(c)} ${TL_TOP + 13} Z`} fill={C.accent} />
    </g>
  )
}

// ---------------- Pitch ----------------

/** Pitch Control under the players, and Player Focus on blue 11, each as on as the playhead is in its bar. */
const Marks = ({ pos, pc, focus }: { pos: Pt[]; pc: number; focus: number }) => {
  const k = VIEW.k
  const pitch = { a: P({ x: -52.5, y: 34 }), b: P({ x: 52.5, y: -34 }) }
  return (
    <g>
      <defs>
        <clipPath id="timing-pitch">
          <rect x={pitch.a.x} y={pitch.a.y} width={pitch.b.x - pitch.a.x} height={pitch.b.y - pitch.a.y} />
        </clipPath>
        <filter id="timing-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={k * 1.3} />
        </filter>
      </defs>
      {pc > 0 && <PitchControl id="timing" P={(x, y) => P({ x, y })} k={k} pos={pos} opacity={pc} />}
      {focus > 0 && (
        <g opacity={focus}>
          <circle cx={P(pos[RUNNER]).x} cy={P(pos[RUNNER]).y} r={k * 4} fill="#fff" opacity={0.2} />
          <circle cx={P(pos[RUNNER]).x} cy={P(pos[RUNNER]).y} r={k * 2.6} fill="#fff" opacity={0.22} />
        </g>
      )}
    </g>
  )
}

const FocusRing = ({ at, show }: { at: Pt; show: number }) => {
  if (show <= 0) return null
  const r = 1.25 * VIEW.k
  return (
    <g opacity={show}>
      <circle cx={at.x} cy={at.y} r={r * 1.7} fill="none" stroke="#d85e1d" strokeWidth={4} />
      <rect x={at.x - 34} y={at.y - r - 46} width={68} height={32} rx={16} fill={C.pill} opacity={0.9} />
      <text x={at.x} y={at.y - r - 23} fontFamily={SANS} fontSize={20} fontWeight={700} fill="#fff" textAnchor="middle">
        Arlo
      </text>
    </g>
  )
}

// ---------------- The clip ----------------

const ROWS_BOX = { x: 16, y: TL_TOP + Y.moments, w: W - 32, h: Y.focus + ROW_H - Y.moments + 4 }
const STEP_LABEL = { x: RAIL_W + 30, y: TL_TOP - 50 }

export const SetTheTiming = () => {
  const f = useCurrentFrame()
  const cursor: Pt = { x: track(f, CURSOR.map(([kk, v]) => [kk, v.x] as Key)), y: track(f, CURSOR.map(([kk, v]) => [kk, v.y] as Key)) }
  const c = playhead(f)
  const m = (c / CLIP_LEN) * MOVE_END
  const pos = PLAYERS.map((_, i) => playerPos(i, m))
  const pc = pcBar(f)
  const pcBox = { x: cx(pc.from) - 6, y: TL_TOP + Y.pc + 1, w: cx(pc.to) - cx(pc.from) + 12, h: ROW_H - 2 }
  const down = CLICKS.some((cl) => f >= cl && f < cl + 4) || (f >= MOVE.press && f < MOVE.release + 2) || (f >= TRIM.press && f < TRIM.release + 2)
  const show = (from: number, to: number) => progress(f, from, from + 6) * (1 - progress(f, to - 5, to))

  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Pitch view={VIEW} bottom={TL_TOP} players={pos} ball={ballPos(m)}>
          <Marks pos={pos} pc={within(c, pc.from, pc.to)} focus={within(c, FOCUS_BAR.from, FOCUS_BAR.to)} />
        </Pitch>
        <FocusRing at={P(pos[RUNNER])} show={within(c, FOCUS_BAR.from, FOCUS_BAR.to)} />
        <Controls playing={isPlaying(f)} clip={c} clipLen={CLIP_LEN} match={fmt(52 * 60 + 10 + c)} cursor={cursor} />
        <Rail bottom={TL_TOP} />
        <Timeline c={c} pc={pc} />
        <AppBar />

        <Highlight box={ROWS_BOX} label={{ x: (RAIL_W + W) / 2, y: TL_TOP - 50, text: 'Everything you add gets a bar' }} show={show(...BOXED)} />
        <Step box={pcBox} label={{ ...STEP_LABEL, text: 'Drag a bar to move it', anchor: 'start' }} show={show(MOVE.step, TRIM.step)} />
        <Step box={pcBox} label={{ ...STEP_LABEL, text: 'Drag its ends to trim it', anchor: 'start' }} show={show(TRIM.step, PLAY.step)} />
        <Step
          box={{ x: PLAY_BTN.x - 32, y: PLAY_BTN.y - 32, w: 64, h: 64 }}
          label={{ x: RAIL_W + 30, y: PITCH_TOP + 52, text: 'Each shows only while the playhead is in its bar', anchor: 'start' }}
          show={show(PLAY.step, FADE)}
        />

        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1 - progress(f, PLAY.click + 30, PLAY.click + 40)} down={down} clicks={CLICKS.map((cl) => (f - cl) / 10)} />
        </g>

        <rect width={W} height={H} fill="#000" opacity={progress(f, FADE, SET_THE_TIMING_DURATION) + (1 - progress(f, 0, 6))} />
      </svg>
    </AbsoluteFill>
  )
}
