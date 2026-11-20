// The workspace as the docs clips draw it: the top bar, the rail, the playback controls, the pitch, and the boxes and
// labels that call parts of it out. Laid out like the real app at 1920x1080, but drawn larger so it reads at the
// docs' size.
import type { Pt } from '../anim'
import { C, LINES, SANS } from '../act3/Pitch'
import { PASSER, PASS_OPTIONS, PLAYERS, RUNNER, holder, idx, playerPos } from '../act3/play'

export const W = 1920
export const H = 1080
export const BAR_H = 64
export const RAIL_W = 240
export const CTRL_H = 116
export const PITCH_TOP = BAR_H + CTRL_H

export const BG = '#1f3140'
export const BORDER = '#2c4352'
export const HOVER = '#2a4152'
export const TEXT = '#c7d3db'
export const MUTED = '#7f97a6'
export const BOX = C.accent

// The app's default colours (frontend/src/config.ts and constants/sliderColors.ts).
export const HOME = '#3B82F6'
export const AWAY = '#EF4444'
export const MARK = { possession: '#FFD60A', option: '#32D7FF', press: '#FF4D9D', run: '#FF6B3D' }
const SLIDER = { played: 'red', loaded: 'darkgray', thumb: 'red' }

export const inside = (p: Pt | null, x: number, y: number, w: number, h: number) => !!p && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
export const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// ---------------- Pitch ----------------

/** Where the pitch sits: centre and pixels per metre. */
export type View = { cx: number; cy: number; k: number }

/** The pitch fitted under the controls, beside the rail, down to `bottom`. */
export const fitPitch = (bottom: number): View => {
  const pad = 14
  const k = Math.min((W - RAIL_W - 2 * pad) / 116, (bottom - PITCH_TOP - 2 * pad) / 76)
  return { cx: (RAIL_W + W) / 2, cy: (PITCH_TOP + bottom) / 2, k }
}
export const toScreen = (v: View, p: Pt): Pt => ({ x: v.cx + v.k * p.x, y: v.cy - v.k * p.y })

// Kick-off, where a match opens. In roster order (play.ts): blue 1 2 4 5 3 6 10 8 11 9 7, red 1 2 4 5 3 6 8 10 7 9 11.
export const KICKOFF: Pt[] = [
  [-48, 0], [-30, -24], [-36, -8], [-36, 8], [-30, 24], [-20, 0], [-12, 9], [-14, -8], [-3, -9], [-1, 1.5], [-6, -24],
  [48, 0], [30, -22], [34, -8], [34, 8], [30, 22], [20, -8], [21, 8], [16, 0], [12, 18], [10, -4], [10, 5],
].map(([x, y]) => ({ x, y }))

// The markers on at move time m of play.ts's move, as the app would show them.
export const RED_6 = idx('r', 6)
const RUN = { from: 1.2, to: 2.9 } // blue 11's run in behind
export const RUN_LINE = [playerPos(RUNNER, RUN.from), playerPos(RUNNER, RUN.to)] as const
const markersAt = (m: number) => {
  const h = holder(m)
  return {
    possession: h,
    options: h === PASSER ? PASS_OPTIONS.map((o) => o.to) : [],
    press: h === PASSER && m >= 1.1 ? RED_6 : null,
    run: m >= RUN.from && m < RUN.to,
  }
}

/**
 * The pitch with players at `players` and the ball at `ball`; `m` (move time) turns the markers on. `children` are
 * drawn on the grass, under the players.
 */
export const Pitch = ({ view, bottom, players, ball, m = null, children }: { view: View; bottom: number; players: Pt[]; ball: Pt; m?: number | null; children?: React.ReactNode }) => {
  const { k } = view
  const P = (p: Pt) => toScreen(view, p)
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const a = P({ x: x0, y: y1 })
    return { x: a.x, y: a.y, width: (x1 - x0) * k, height: (y1 - y0) * k }
  }
  const scr = players.map(P)
  const dotR = 1.25 * k
  const ringR = dotR + 0.75 * k
  const mk = m === null ? null : markersAt(m)
  const a = P(RUN_LINE[0])
  const b = P(RUN_LINE[1])
  const bp = P(ball)

  return (
    <g>
      <rect x={RAIL_W} y={PITCH_TOP} width={W - RAIL_W} height={bottom - PITCH_TOP} fill={C.frame} />
      <rect {...rect(-58, -38, 58, 38)} fill={C.margin} />
      <rect {...rect(-52.5, -34, 52.5, 34)} fill={C.grass} />
      {[0, 2, 4, 6, 8, 10].map((s) => (
        <rect key={s} {...rect(-52.5 + s * 8.75, -34, -52.5 + (s + 1) * 8.75, 34)} fill={C.stripe} />
      ))}
      <g fill="none" stroke={C.line} strokeWidth={k / 3} strokeLinejoin="round">
        {LINES.map((l, i) => (
          <polyline key={i} points={l.map(([x, y]) => `${(view.cx + k * x).toFixed(1)},${(view.cy - k * y).toFixed(1)}`).join(' ')} />
        ))}
      </g>

      {children}

      {mk?.run && (
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={MARK.run} strokeWidth={0.5 * k} strokeDasharray={`${1.6 * k} ${0.8 * k} ${0.4 * k} ${0.8 * k}`} strokeLinecap="round" />
      )}

      {scr.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={dotR} fill={PLAYERS[i].team === 'b' ? HOME : AWAY} stroke="#0d1a22" strokeWidth={k * 0.18} />
          <text x={s.x} y={s.y + dotR * 0.38} fontFamily={SANS} fontSize={dotR * 1.05} fontWeight={700} fill="#fff" textAnchor="middle">
            {PLAYERS[i].num}
          </text>
        </g>
      ))}

      {mk && (
        <g fill="none" strokeWidth={0.42 * k}>
          {mk.possession !== null && <circle cx={scr[mk.possession].x} cy={scr[mk.possession].y} r={ringR} stroke={MARK.possession} />}
          {mk.options.map((i) => (
            <circle key={i} cx={scr[i].x} cy={scr[i].y} r={ringR} stroke={MARK.option} />
          ))}
          {mk.press !== null && <circle cx={scr[mk.press].x} cy={scr[mk.press].y} r={ringR} stroke={MARK.press} />}
        </g>
      )}

      <circle cx={bp.x} cy={bp.y} r={0.6 * k} fill="#fff" stroke="#1d2128" strokeWidth={0.18 * k} />
    </g>
  )
}

// ---------------- Top bar ----------------

export const AppBar = () => (
  <g>
    <rect width={W} height={BAR_H} fill={C.navy} />
    <rect y={BAR_H - 2} width={W} height={2} fill="#36566a" />
    <path d="M30 46 L46 18 M38 18 L54 46" stroke={C.accent} strokeWidth={5} strokeLinecap="round" />
    <text x={66} y={44} fontFamily={SANS} fontSize={30} fontWeight={800} fontStyle="italic" fill="#fff">
      TAPP'D
    </text>
    <text x={232} y={42} fontFamily={SANS} fontSize={21} fill={TEXT}>
      Choose Match
    </text>
    <rect x={W - 330} y={14} width={170} height={36} rx={6} fill="none" stroke="#4d6b7d" strokeWidth={2} />
    <circle cx={W - 310} cy={32} r={5} fill={C.accent} />
    <text x={W - 236} y={39} fontFamily={SANS} fontSize={18} fill="#e4ecf0" textAnchor="middle">
      Save Project
    </text>
    <text x={W - 90} y={39} fontFamily={SANS} fontSize={18} fill="#e4ecf0" textAnchor="middle">
      Docs
    </text>
  </g>
)

// ---------------- Playback controls ----------------

export const CY = BAR_H + 44
export const PLAY_BTN: Pt = { x: RAIL_W + 52, y: CY }
const SPEED_BTN: Pt = { x: W - 62, y: CY }
export const CONTROLS_RECT = { x: RAIL_W + 10, y: BAR_H + 8, w: W - RAIL_W - 20, h: CTRL_H - 14 }

const SpeedIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round">
    <path d="M-18 8 A19 19 0 1 1 18 8" />
    <path d="M0 4 L10 -9" />
    <circle cy={4} r={3.5} fill="#fff" />
  </g>
)

/**
 * Play, the slider, the speed picker and the clocks, from `left` (the rail's edge, or an open panel's) across. Times
 * are in seconds; `clip` runs from 0 to `clipLen`.
 */
export const Controls = ({ playing, clip, clipLen, match, cursor, left = RAIL_W }: { playing: boolean; clip: number; clipLen: number; match: string; cursor: Pt | null; left?: number }) => {
  const play = { x: left + 52, y: CY }
  const SL = { x0: left + 104, x1: W - 116, y: CY }
  const thumb = SL.x0 + (clip / clipLen) * (SL.x1 - SL.x0)
  const hover = inside(cursor, play.x - 28, play.y - 28, 56, 56)
  return (
    <g>
      <rect x={left} y={BAR_H} width={W - left} height={CTRL_H} fill={C.frame} />
      <rect x={left} y={BAR_H + CTRL_H - 2} width={W - left} height={2} fill={BORDER} />

      <rect x={play.x - 28} y={play.y - 28} width={56} height={56} rx={10} fill={hover ? HOVER : 'none'} />
      {playing ? (
        <path d={`M${play.x - 8} ${play.y - 13} v26 M${play.x + 8} ${play.y - 13} v26`} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
      ) : (
        <path d={`M${play.x - 10} ${play.y - 15} L${play.x + 15} ${play.y} L${play.x - 10} ${play.y + 15} Z`} fill="#fff" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
      )}

      <rect x={SL.x0} y={SL.y - 5} width={SL.x1 - SL.x0} height={10} rx={5} fill={SLIDER.loaded} />
      {thumb > SL.x0 && <rect x={SL.x0} y={SL.y - 5} width={thumb - SL.x0} height={10} rx={5} fill={SLIDER.played} />}
      <circle cx={thumb} cy={SL.y} r={20} fill="#fff" opacity={0.08} />
      <circle cx={thumb} cy={SL.y} r={14} fill={SLIDER.thumb} stroke="#0f172a" strokeWidth={4} />

      <text x={SL.x0} y={CY + 50} fontFamily={SANS} fontSize={20} fontWeight={600} fill="#f8fafc" fillOpacity={0.62} letterSpacing={1}>
        {`MATCH TIME: ${match}  |  CLIP TIME: ${fmt(clip)} / ${fmt(clipLen)}`}
      </text>

      <SpeedIcon x={SPEED_BTN.x} y={SPEED_BTN.y} />
    </g>
  )
}

// ---------------- Rail ----------------

const BUILD = ['Moments', 'Insights', 'Overlays', 'Settings']
const DRAW = ['Player Focus', 'Link Players', 'Team Shape', 'Draw Rectangle', 'Draw Line', 'Draw Arrow', 'Erase']
const BTN = { x: 16, w: RAIL_W - 32, h: 46, step: 54 }
const BUILD_Y = BAR_H + 52
const DRAW_Y = BUILD_Y + BUILD.length * BTN.step + 56
const railTop = (name: string) => (BUILD.includes(name) ? BUILD_Y + BUILD.indexOf(name) * BTN.step : DRAW_Y + DRAW.indexOf(name) * BTN.step)
export const railButton = (name: string): Pt => ({ x: BTN.x + 80, y: railTop(name) + BTN.h / 2 })
export const railRect = (name: string) => ({ x: BTN.x - 4, y: railTop(name) - 4, w: BTN.w + 8, h: BTN.h + 8 })

/** The rail of tools, from the top bar down to `bottom`. `active` is the tool switched on, if any. */
export const Rail = ({ bottom = H, cursor = null, active = null }: { bottom?: number; cursor?: Pt | null; active?: string | null }) => {
  const kicker = (y: number, text: string) => (
    <text x={BTN.x + 8} y={y} fontFamily={SANS} fontSize={15} fontWeight={700} fill={MUTED} letterSpacing={2}>
      {text}
    </text>
  )
  return (
    <g>
      <rect x={0} y={BAR_H} width={RAIL_W} height={bottom - BAR_H} fill={BG} />
      <rect x={RAIL_W - 2} y={BAR_H} width={2} height={bottom - BAR_H} fill={BORDER} />
      {kicker(BUILD_Y - 14, 'BUILD')}
      {kicker(DRAW_Y - 14, 'DRAW')}
      {[...BUILD, ...DRAW].map((n) => {
        const y = railTop(n)
        if (y + BTN.h > bottom) return null
        const on = n === active
        return (
          <g key={n}>
            {on ? (
              <rect x={BTN.x} y={y} width={BTN.w} height={BTN.h} rx={9} fill={C.accent} fillOpacity={0.2} stroke={C.accent} strokeWidth={2} />
            ) : (
              inside(cursor, BTN.x, y, BTN.w, BTN.h) && <rect x={BTN.x} y={y} width={BTN.w} height={BTN.h} rx={9} fill={HOVER} />
            )}
            <text x={BTN.x + 16} y={y + BTN.h / 2 + 7} fontFamily={SANS} fontSize={20} fontWeight={600} fill={on ? '#fff' : TEXT}>
              {n}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ---------------- Callouts ----------------

const LABEL = { size: 34, h: 66 }
export const labelWidth = (text: string) => text.length * LABEL.size * 0.54 + 84

/** A dark pill with a coloured dot and white text. `anchor` says which point (x, y) is: its centre or left end. */
export const Label = ({ x, y, color, text, anchor = 'middle' }: { x: number; y: number; color: string; text: string; anchor?: 'middle' | 'start' }) => {
  const w = labelWidth(text)
  const left = anchor === 'middle' ? x - w / 2 : x
  return (
    <g>
      <rect x={left} y={y - LABEL.h / 2} width={w} height={LABEL.h} rx={LABEL.h / 2} fill={C.pill} opacity={0.94} />
      <rect x={left} y={y - LABEL.h / 2} width={w} height={LABEL.h} rx={LABEL.h / 2} fill="none" stroke={color} strokeWidth={3} />
      <circle cx={left + 34} cy={y} r={11} fill={color} />
      <text x={left + 58} y={y + LABEL.size * 0.36} fontFamily={SANS} fontSize={LABEL.size} fontWeight={700} fill="#fff">
        {text}
      </text>
    </g>
  )
}

/** A marker callout: a leader line from the marker at `at` to its label, `offset` away. */
export const Callout = ({ at, offset, color, text, show }: { at: Pt; offset: Pt; color: string; text: string; show: number }) => {
  if (show <= 0) return null
  const w = labelWidth(text)
  const c = { x: at.x + offset.x, y: at.y + offset.y }
  const d = Math.hypot(offset.x, offset.y)
  const start = { x: at.x + (offset.x / d) * 44, y: at.y + (offset.y / d) * 44 }
  const cut = 1 / Math.max(Math.abs(offset.x) / (w / 2), Math.abs(offset.y) / (LABEL.h / 2))
  const end = { x: c.x - offset.x * cut, y: c.y - offset.y * cut }
  return (
    <g opacity={show}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <g transform={`translate(${c.x} ${c.y}) scale(${0.9 + 0.1 * show}) translate(${-c.x} ${-c.y})`}>
        <Label x={c.x} y={c.y} color={color} text={text} />
      </g>
    </g>
  )
}

export type Box = { x: number; y: number; w: number; h: number }

/** An orange box drawn round part of the app, the rest dimmed, with a label beside it. */
export const Highlight = ({ box, label, show }: { box: Box; label: { x: number; y: number; text: string; anchor?: 'middle' | 'start' }; show: number }) => {
  if (show <= 0) return null
  const pad = 10 * (1 - show)
  return (
    <g opacity={show}>
      <path d={`M0 0 H${W} V${H} H0 Z M${box.x} ${box.y} V${box.y + box.h} H${box.x + box.w} V${box.y} Z`} fill="#000" fillOpacity={0.45} fillRule="evenodd" />
      <rect x={box.x - pad} y={box.y - pad} width={box.w + 2 * pad} height={box.h + 2 * pad} rx={12} fill="none" stroke={BOX} strokeWidth={6} />
      <Label x={label.x} y={label.y} color={BOX} text={label.text} anchor={label.anchor} />
    </g>
  )
}

/** A step being done: an orange outline round what's being used, and a label saying what to do. Nothing is dimmed. */
export const Step = ({ box, label, show }: { box: Box; label: { x: number; y: number; text: string; anchor?: 'middle' | 'start' }; show: number }) => {
  if (show <= 0) return null
  const pad = 8 * (1 - show)
  return (
    <g opacity={show}>
      <rect x={box.x - pad} y={box.y - pad} width={box.w + 2 * pad} height={box.h + 2 * pad} rx={10} fill="none" stroke={BOX} strokeWidth={5} />
      <Label x={label.x} y={label.y} color={BOX} text={label.text} anchor={label.anchor} />
    </g>
  )
}
