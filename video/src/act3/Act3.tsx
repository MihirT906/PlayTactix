// Act 3: The payoff. Opens on black after Act 2. Each feature gets a title card first (a line centred on black),
// then the feature itself, done in the app the way a user would: the cursor opens panels from the left rail, picks
// overlays and tools, clicks players and plays the clip.
// 3.0 finds the moment in the Moments panel, 3.1 marks the play up four ways in a grid, 3.2 reads the numbers
// (Pass Probability, xThreat, the goal), 3.3 builds the clip (Pitch Control, then Player Focus on the scorer) and
// watches it, and 3.4 saves it.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { FPS, type Key, clamp01, hump, lerp, linear, progress, track } from '../anim'
import { AppBar, BH, Broadcast } from '../match/Broadcast'
import { CARD_LEN, type Card, TitleCard } from '../TitleCard'
import { A, BAR_BOTTOM, PANEL_W, RAIL_W, SAVE_BUTTON } from './layout'
import { C, type Layers, PitchView, type Rect, type View, lerpRect, lerpView } from './Pitch'
import { MOVE_END, PAUSE_AT, RUNNER, SHOT, playerPos, xThreat, xThreatStep } from './play'
import { BACK_BUTTON, MomentsPanel, OverlaysPanel, Rail, momentCard, overlayRow, railButton } from './Sidebar'
import { type Bar, CellLabel, Cursor, TIMELINE_H, Timeline, Toast, XThreatCard, playButton } from './Ui'

type XY = [number, number]

// ---------------- Layouts ----------------

/** The timeline's top: Insights only (3.2), and with the Clip rows too (3.3 on). */
const T1 = 1080 - TIMELINE_H.insights
const T2 = 1080 - TIMELINE_H.full
const SCREEN_RECT: Rect = { x: 0, y: 0, w: 1920, h: 1080 }

/** The pitch (with its margin) fitted into a box. */
const fitView = (left: number, top: number, right: number, bottom: number): View => {
  const pad = 12
  return { cx: (left + right) / 2, cy: (top + bottom) / 2, k: Math.min((right - left - 2 * pad) / 116, (bottom - top - 2 * pad) / 76) }
}

/** Where a player stands on the plot while the clip is built, for the cursor to click. */
const BUILD_VIEW = fitView(RAIL_W, BAR_BOTTOM, 1920, T2)
const onPitch = (i: number, m: number): XY => {
  const p = playerPos(i, m)
  return [BUILD_VIEW.cx + BUILD_VIEW.k * p.x, BUILD_VIEW.cy - BUILD_VIEW.k * p.y]
}

// 3.1: the 2x2 grid, beside the rail. Each cell is framed on the attacking end, where the move happens.
const GUTTER = 14
const CELL_W = (1920 - RAIL_W - 3 * GUTTER) / 2
const CELL_H = (1080 - BAR_BOTTOM - 3 * GUTTER) / 2
const CELL_K = 7.6
const CELL_FOCUS = { x: 8, y: -8 }
type Cell = { rect: Rect; view: View; label: string; color: string; layer: keyof Layers; order: number }
const cell = (col: number, row: number, label: string, color: string, layer: keyof Layers, order: number): Cell => {
  const rect = { x: RAIL_W + GUTTER + col * (CELL_W + GUTTER), y: BAR_BOTTOM + GUTTER + row * (CELL_H + GUTTER), w: CELL_W, h: CELL_H }
  const view = { cx: rect.x + rect.w / 2 - CELL_K * CELL_FOCUS.x, cy: rect.y + rect.h / 2 + CELL_K * CELL_FOCUS.y, k: CELL_K }
  return { rect, view, label, color, layer, order }
}
// Drawn bottom-right first so the top-left cell (Pitch Control, which stays on into 3.2) ends up on top.
const CELLS: Cell[] = [
  cell(1, 1, 'Player Focus', C.mark, 'playerFocus', 3),
  cell(0, 1, 'Link Players', C.mark, 'linkPlayers', 2),
  cell(1, 0, 'Team Shape', C.awayShade, 'teamShape', 1),
  cell(0, 0, 'Pitch Control', C.homeShade, 'pitchControl', 0),
]

// ---------------- The script ----------------
// The cursor's moves and clicks, in order. Each step advances the clock; the app's state below is keyed off the
// frames recorded here (M), so retiming a step moves everything after it.

const CURSOR: [number, XY][] = []
const CLICKS: number[] = []
const M: Record<string, number> = {}
const CARDS: Card[] = []
let t = 0
let pos: XY = [1100, 640]

const key = () => {
  const last = CURSOR[CURSOR.length - 1]
  if (last && last[0] === t) last[1] = pos
  else CURSOR.push([t, pos])
}
const wait = (d: number) => {
  t += d
}
const mark = (name: string) => {
  M[name] = t
}
const jump = (p: XY) => {
  pos = p
  key()
}
const move = (p: XY, d: number) => {
  key()
  t += d
  pos = p
  key()
}
const click = (name: string) => {
  key()
  CLICKS.push(t)
  M[name] = t
  t += 8
}
/** A title card. The first one starts on black (Act 2 ends on black). */
const card = (lead: string, accent: string, name: string) => {
  const fromBlack = CARDS.length === 0
  const at = fromBlack ? t - 10 : t
  CARDS.push({ at, lead, accent, fromBlack })
  M[name] = at
  t = at + CARD_LEN
  M[`${name}Reveal`] = t
}

const GRID_LEN = 186 // 3.1 runs this long after its card
const PLAY_ON_LEN = 96 // 3.2: from the pause to just after the goal
const FOCUS_AT = 2.3 // 3.3: where play is paused to put Player Focus on the scorer (the pass is on its way to him)
const PLAY_TO_FOCUS = 66 // 3.3: frames from the start of the clip to that pause
const PLAY_ON_TO_END = 100 // 3.3: frames from there to the end of the clip

// 3.0 Find the moment: three clicks
card('Find the', 'moment.', 'c0')
jump([1100, 640])
wait(16)
move(railButton('Moments'), 16)
click('moments')
wait(14)
move(momentCard(3), 18)
wait(4)
click('pick')
wait(32)
move(BACK_BUTTON, 16)
click('back0')
wait(18)

// 3.1 Mark up the play (no cursor: the grid shows what the tools draw)
card('Mark up the', 'play.', 'c1')
wait(GRID_LEN)

// 3.2 Read the numbers
card('Read the', 'numbers.', 'c2')
jump([1150, 600])
wait(24)
move(railButton('Overlays'), 18)
click('overlays1')
wait(16)
move(overlayRow('Pass Probability'), 16)
click('passProb')
wait(30)
move(BACK_BUTTON, 16)
click('back1')
wait(10)
move([1450, 760], 24)
wait(26)
move(playButton(T1), 18)
click('play1')
wait(PLAY_ON_LEN + 12)

// 3.3 Build the clip: an overlay, play on, follow the scorer, watch it through
card('Build the', 'clip.', 'c3')
jump([1200, 600])
wait(26)
move(railButton('Overlays'), 18)
click('overlays2')
wait(14)
move(overlayRow('Pitch Control'), 16)
click('pc')
wait(26)
move(BACK_BUTTON, 16)
click('back2')
wait(10)
move(playButton(T2), 20)
click('play2')
wait(PLAY_TO_FOCUS - 6)
click('pause2')
wait(6)
move(railButton('Player Focus'), 18)
click('focusTool')
wait(4)
move(onPitch(RUNNER, FOCUS_AT), 16)
click('focus')
wait(28)
move(playButton(T2), 20)
click('play3')
wait(PLAY_ON_TO_END + 28)

// 3.4 Save it
card('Save it.', 'Share it.', 'c4')
jump([1500, 640])
wait(10)
move([SAVE_BUTTON.x, SAVE_BUTTON.y], 18)
click('save')
wait(28)
mark('shrink')
wait(24)

export const ACT3_DURATION = t

// ---------------- Timing derived from the script ----------------

const SHRINK = [M.shrink, M.shrink + 24] as const
const SWITCH = [M.pick + 2, M.pick + 12] as const // the live match gives way to the picked moment
const G = M.c1Reveal
const GRID = { split: [G + 4, G + 20] as const, play: [G + 20, G + 150] as const, close: [G + 156, G + 172] as const, labels: [G + 20, G + 28, G + 148, G + 156] as const }
const TO_L1 = [M.c2Reveal + 4, M.c2Reveal + 26] as const
const TO_L2 = [M.c3Reveal + 4, M.c3Reveal + 24] as const
const JUMP_TO_START = TO_L2[1]
const PLAY1 = M.play1 + 2
const PLAY2 = M.play2 + 2
const PLAY3 = M.play3 + 2

// Until a moment is picked, the plot is a live match, well away from the move.
const LIVE_FROM = 4060.2
const liveTime = (f: number) => LIVE_FROM + (f - M.c0Reveal) / FPS
// The broadcast picture at tilt 1: the pitch centre and pixels per metre, in its own 640x356 units.
const LIVE = { cx: 320, cy: BH / 2 + 14, k: 1000 / 238 }

/** Move time on the pitch at frame f. */
function moveTime(f: number) {
  if (f < GRID.play[0]) return 0
  if (f < GRID.play[1]) return track(f, [[GRID.play[0], 0], [GRID.play[1], PAUSE_AT]], linear)
  if (f < PLAY1) return PAUSE_AT // paused for the passing options
  if (f < JUMP_TO_START) return track(f, [[PLAY1, PAUSE_AT], [PLAY1 + PLAY_ON_LEN, 4.9]], linear)
  if (f < PLAY3) return track(f, [[PLAY2, 0], [PLAY2 + PLAY_TO_FOCUS, FOCUS_AT]], linear)
  return track(f, [[PLAY3, FOCUS_AT], [PLAY3 + PLAY_ON_TO_END, MOVE_END]], linear)
}

/** A panel opened by one click and closed by another. */
const panelOpen = (f: number, open: number, close: number) => progress(f, open + 2, open + 18) * (1 - progress(f, close + 2, close + 18))
const soft = (m: number, a: number, b: number) => clamp01(Math.min(m - a, b - m) / 0.08 + 1)

/**
 * The app as it stands at frame f of Act 3, with the plot at move time m. `cursor` drives hover highlights. Act 4
 * reuses it with Act 3's last frame, replaying the finished clip inside the card. `toast` scales the save toast.
 */
export const AppScreen = ({ f, m, cursor = null, toast = 1 }: { f: number; m: number; cursor?: XY | null; toast?: number }) => {
  // The left column: the rail, or a panel in its place.
  const moments = panelOpen(f, M.moments, M.back0)
  const overlays = Math.max(panelOpen(f, M.overlays1, M.back1), panelOpen(f, M.overlays2, M.back2))
  const column = lerp(RAIL_W, PANEL_W, Math.max(moments, overlays))

  // The timeline under the plot: hidden → Insights → Insights and the Clip rows.
  const timelineTop = lerp(lerp(1080, T1, progress(f, ...TO_L1)), T2, progress(f, ...TO_L2))
  const view = fitView(column, BAR_BOTTOM, 1920, timelineTop)

  // The clip, as it's built.
  // Each overlay and mark runs from where it was switched on to the end of the clip.
  const bar = (row: Bar['row'], at: number, from = 0, label?: string): Bar => ({ row, from, to: MOVE_END, show: progress(f, at, at + 7), label })
  const bars: Bar[] = [
    bar('Moments', M.pick + 4, 0, '67:05 · BLU build-up v RED mid block'),
    bar('Pitch Control', M.pc),
    bar('Pass Probability', M.passProb, PAUSE_AT),
    bar('Player Focus', M.focus, FOCUS_AT),
  ]
  const shown = (row: Bar['row']) => bars.find((b) => b.row === row)!.show

  // What's drawn on the main plot.
  let layers: Layers = {}
  if (f >= GRID.split[0] && f < M.c3Reveal) {
    // 3.1's Pitch Control carries over, then 3.2 turns on Pass Probability at the pause.
    layers = {
      pitchControl: 1 - progress(f, M.c2Reveal + 4, M.c2Reveal + 18),
      passProb: progress(f, M.passProb, M.passProb + 6),
      passDraw: progress(f, M.passProb + 4, M.passProb + 28, linear),
    }
  } else if (f >= M.c3Reveal) {
    layers = {
      pitchControl: shown('Pitch Control') * soft(m, 0, MOVE_END),
      passProb: shown('Pass Probability') * soft(m, PAUSE_AT, MOVE_END),
      passDraw: 1,
      // On as soon as the scorer is clicked (play is paused there), then wherever its bar is on.
      playerFocus: shown('Player Focus') * (f < PLAY3 ? 1 : soft(m, FOCUS_AT, MOVE_END)),
    }
  }

  const grid = progress(f, ...GRID.split) * (1 - progress(f, ...GRID.close))
  const inGrid = f >= GRID.split[0] && f < GRID.close[1]

  // 3.2's numbers.
  const graphTo = f < JUMP_TO_START ? m : Math.max(4.9, m)
  const goal = f < JUMP_TO_START ? clamp01((m - SHOT.to) / 0.15) : 1
  const xtCard = hump(f, M.back1 + 10, M.back1 + 20, M.c3, M.c3 + 10)
  const pulse = 1 - clamp01((m - xThreatStep(m)) / 0.3)
  const playing = (f >= PLAY1 && f < PLAY1 + PLAY_ON_LEN) || (f >= PLAY2 && f < M.pause2) || (f >= PLAY3 && f < PLAY3 + PLAY_ON_TO_END)

  // The tools on the rail stay lit while they're switched on.
  const tool = (on: number, off = Infinity) => progress(f, on, on + 4) * (1 - progress(f, off, off + 4))

  const live = f < SWITCH[1]

  return (
    <g>
      <rect width={1920} height={1080} fill={C.frame} />
      {live && (
        <g transform={`translate(${view.cx} ${view.cy}) scale(${view.k / LIVE.k}) translate(${-LIVE.cx} ${-LIVE.cy})`}>
          <Broadcast gt={liveTime(f)} tilt={1} />
        </g>
      )}
      <g opacity={progress(f, ...SWITCH)}>
        {inGrid ? (
          CELLS.map((c) => {
            const draw = progress(f, G + 22 + c.order * 10, G + 36 + c.order * 10)
            const keep = c.layer === 'pitchControl' ? 1 : 1 - progress(f, ...GRID.close)
            return <PitchView key={c.label} id={`cell-${c.layer}`} view={lerpView(view, c.view, grid)} clip={lerpRect(SCREEN_RECT, c.rect, grid)} m={m} layers={{ [c.layer]: draw * keep }} />
          })
        ) : (
          <PitchView id="main" view={view} clip={SCREEN_RECT} m={m} layers={layers} />
        )}
      </g>
      {inGrid &&
        CELLS.map((c) => <CellLabel key={c.label} x={c.rect.x + 18} y={c.rect.y + 18} text={c.label} color={c.color} opacity={hump(f, ...GRID.labels)} />)}

      <XThreatCard x={1920 - 250 - 36} y={BAR_BOTTOM + 28} value={xThreat(m)} pulse={pulse} opacity={xtCard} />
      <Timeline top={timelineTop} m={m} graphTo={graphTo} goal={goal} bars={bars} playing={playing} />

      <Rail
        bottom={timelineTop}
        cursor={cursor}
        active={{ 'Player Focus': tool(M.focusTool) }}
      />
      <MomentsPanel
        x={lerp(-PANEL_W, 0, moments)}
        bottom={timelineTop}
        cursor={cursor}
        picked={progress(f, M.pick, M.pick + 6)}
      />
      <OverlaysPanel
        x={lerp(-PANEL_W, 0, overlays)}
        bottom={timelineTop}
        cursor={cursor}
        on={{ 'Pass Probability': progress(f, M.passProb, M.passProb + 5), 'Pitch Control': progress(f, M.pc, M.pc + 5) }}
      />

      <g transform={`translate(${A.x} ${A.y}) scale(${A.s})`}>
        <AppBar show={1} saved={progress(f, M.save, M.save + 6)} />
      </g>
      <Toast x={SAVE_BUTTON.x + 110} y={BAR_BOTTOM + 16} show={toast * progress(f, M.save + 2, M.save + 10)} />
    </g>
  )
}

/** The app shrunk into a card on the navy backdrop: Act 3's last frame, and Act 4's starting point. */
export const CARD_END = { cx: 960, cy: 520, scale: 0.64 }

/** The app as a card: scale 1 fills the screen; below 1 it gets rounded corners and a shadow. */
export const AppCard = ({ scale, cx = CARD_END.cx, cy = CARD_END.cy, children }: { scale: number; cx?: number; cy?: number; children: React.ReactNode }) => {
  const k = clamp01((1 - scale) / (1 - CARD_END.scale))
  return (
    <g>
      <defs>
        <clipPath id="appCard">
          <rect width={1920} height={1080} rx={k > 0 ? 28 / scale : 0} />
        </clipPath>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={30} />
        </filter>
      </defs>
      <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(-960 -540)`}>
        {k > 0 && <rect x={40} y={60} width={1840} height={1040} rx={40} fill="#000" opacity={0.55 * k} filter="url(#cardShadow)" />}
        <g clipPath="url(#appCard)">{children}</g>
      </g>
    </g>
  )
}

export const Backdrop = () => (
  <g>
    <defs>
      <radialGradient id="backdrop" cx="0.5" cy="0.45" r="0.7">
        <stop offset="0" stopColor={C.navy} />
        <stop offset="1" stopColor="#0e171e" />
      </radialGradient>
    </defs>
    <rect width={1920} height={1080} fill="url(#backdrop)" />
  </g>
)

const cursorAt = (f: number): XY => [track(f, CURSOR.map(([k, v]) => [k, v[0]] as Key)), track(f, CURSOR.map(([k, v]) => [k, v[1]] as Key))]
// Hidden through 3.1 (under its cards), and as the app shrinks away.
const cursorOpacity = (f: number) => (f >= M.c1 + 20 && f < M.c2 + 30 ? 0 : 1 - progress(f, SHRINK[0] + 6, SHRINK[0] + 12))

export const Act3 = () => {
  const f = useCurrentFrame()
  const m = moveTime(f)
  const cursor = cursorAt(f)
  const down = CLICKS.some((c) => f >= c && f < c + 4)

  // 3.4: after the save, the app shrinks into a card.
  const sc = lerp(1, CARD_END.scale, progress(f, ...SHRINK))
  const cy = lerp(540, CARD_END.cy, progress(f, ...SHRINK))

  return (
    <AbsoluteFill style={{ backgroundColor: '#0e171e' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Backdrop />
        <AppCard scale={sc} cy={cy}>
          <AppScreen f={f} m={m} cursor={cursor} />
        </AppCard>
        <g transform={`translate(960 ${cy}) scale(${sc}) translate(-960 -540)`}>
          <Cursor x={cursor[0]} y={cursor[1]} opacity={cursorOpacity(f)} down={down} clicks={CLICKS.map((c) => (f - c) / 10)} />
        </g>
      </svg>
      {CARDS.map((c) => (
        <TitleCard key={c.at} f={f} card={c} />
      ))}
    </AbsoluteFill>
  )
}
