// The "Draw on the play" clip for the docs' workspace page (frontend/public/docs-media/workspace-draw.mp4).
// Play is paused. Each Draw tool is used in turn, called out as it's used: Player Focus, Link Players, Team Shape,
// Draw Rectangle, Draw Line, Draw Arrow. Then Erase: the tool is switched off, a mark is clicked to select it, and
// Erase deletes it.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { type Key, type Pt, clamp01, lerpPt, progress, track } from '../anim'
import { C, SANS } from '../act3/Pitch'
import { Cursor } from '../act3/Ui'
import { PLAYERS, RUNNER, ballPos, idx, playerPos } from '../act3/play'
import { AppBar, AWAY, Controls, H, Pitch, RAIL_W, Rail, Step, W, fitPitch, fmt, railButton, railRect, toScreen } from './workspace'

const VIEW = fitPitch(H)
const P = (p: Pt) => toScreen(VIEW, p)
const k = VIEW.k

// The paused frame: blue 8 on the ball, 11 running in behind.
const M0 = 1.85
const AT = PLAYERS.map((_, i) => playerPos(i, M0))
const at = (team: 'b' | 'r', num: number) => P(AT[idx(team, num)])

// The app's annotation colours (frontend/src/config.ts).
const MARK = '#d85e1d'
const RECT_FILL = 'rgba(0, 0, 0, 0.2)'
const STROKE = 0.5 * k
const DOT_R = 1.25 * k

// What's drawn, in pitch metres.
const FOCUS = RUNNER
const LINK = [idx('r', 2), idx('r', 4)] // red's left-back and centre-back: the gap between them
const SHAPE = [idx('r', 6), idx('r', 8), idx('r', 7), idx('r', 10)] // red's midfield
const RECT = { a: { x: 40, y: -6 }, b: { x: 50, y: -22 } } // the space in behind
const LINE = { a: { x: 39.5, y: -1 }, b: { x: 39.5, y: 24 } } // red's back line
const ARROW = { a: { x: 31.5, y: -14 }, b: { x: 45, y: -10 } } // blue 11's run

// ---------------- The script ----------------

const CURSOR: [number, Pt][] = []
const CLICKS: number[] = []
const M: Record<string, number> = {}
let t = 0
let pos: Pt = { x: 1200, y: 560 }
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
const move = (p: Pt, d: number) => {
  key()
  t += d
  pos = p
  key()
}
const click = (name: string) => {
  key()
  CLICKS.push(t)
  M[name] = t
  t += 4
}
/** Press at `from`, drag to `to`, let go. */
const drag = (name: string, from: Pt, to: Pt) => {
  move(from, 14)
  wait(2)
  key()
  CLICKS.push(t)
  M[`${name}Press`] = t
  move(to, 22)
  M[`${name}Release`] = t
  wait(2)
}

key()
wait(10)

mark('focusStep')
move(railButton('Player Focus'), 16)
click('focusTool')
wait(8)
move(P(AT[FOCUS]), 18)
click('focus')
wait(40)

mark('linkStep')
move(railButton('Link Players'), 18)
click('linkTool')
wait(6)
move(P(AT[LINK[0]]), 16)
click('link0')
wait(4)
move(P(AT[LINK[1]]), 14)
click('link1')
wait(36)

mark('shapeStep')
move(railButton('Team Shape'), 18)
click('shapeTool')
wait(6)
SHAPE.forEach((p, i) => {
  move(P(AT[p]), 12)
  click(`shape${i}`)
})
wait(40)

mark('rectStep')
move(railButton('Draw Rectangle'), 18)
click('rectTool')
drag('rect', P(RECT.a), P(RECT.b))
wait(30)

mark('lineStep')
move(railButton('Draw Line'), 18)
click('lineTool')
drag('line', P(LINE.a), P(LINE.b))
wait(30)

mark('arrowStep')
move(railButton('Draw Arrow'), 18)
click('arrowTool')
drag('arrow', P(ARROW.a), P(ARROW.b))
wait(30)

mark('offStep')
move(railButton('Draw Arrow'), 18)
click('arrowOff')
wait(18)
mark('selectStep')
move(P({ x: 46, y: -17 }), 18)
click('select')
wait(22)
mark('eraseStep')
move(railButton('Erase'), 18)
click('erase')
wait(34)
mark('fade')
wait(16)
export const DRAW_ON_THE_PLAY_DURATION = t

// ---------------- State from the script ----------------

const after = (name: string, f: number, d = 1) => f >= M[name] + d
const appear = (f: number, name: string) => progress(f, M[name] + 1, M[name] + 7)

/** The tool switched on at frame f. */
function activeTool(f: number): string | null {
  const tools: [string, string][] = [
    ['focusTool', 'Player Focus'],
    ['linkTool', 'Link Players'],
    ['shapeTool', 'Team Shape'],
    ['rectTool', 'Draw Rectangle'],
    ['lineTool', 'Draw Line'],
    ['arrowTool', 'Draw Arrow'],
  ]
  if (after('arrowOff', f)) return null
  let on: string | null = null
  for (const [mk, name] of tools) if (after(mk, f)) on = name
  return on
}

/** A shape dragged out: from its press to the cursor while dragging, then fixed. Null before the press. */
const dragged = (f: number, name: string, a: Pt, b: Pt) => {
  if (f < M[`${name}Press`]) return null
  const tt = clamp01((f - M[`${name}Press`]) / (M[`${name}Release`] - M[`${name}Press`]))
  return { a: P(a), b: lerpPt(P(a), P(b), track(tt, [[0, 0], [1, 1]])), draft: f < M[`${name}Release`] }
}

// ---------------- Marks ----------------

const Pill = ({ x, y, text, color = '#fff' }: { x: number; y: number; text: string; color?: string }) => {
  const size = 22
  const w = text.length * size * 0.58 + 26
  return (
    <g>
      <rect x={x - w / 2} y={y - 17} width={w} height={34} rx={17} fill={C.pill} opacity={0.9} />
      <text x={x} y={y + 8} fontFamily={SANS} fontSize={size} fontWeight={700} fill={color} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

const FocusMark = ({ show }: { show: number }) => {
  const now = P(AT[FOCUS])
  const N = 14
  const trail = Array.from({ length: N + 1 }, (_, j) => P(playerPos(FOCUS, Math.max(0, M0 - ((N - j) / N) * 1.4))))
  return (
    <g opacity={show}>
      {trail.slice(1).map((p, j) => (
        <line key={j} x1={trail[j].x} y1={trail[j].y} x2={p.x} y2={p.y} stroke={MARK} strokeOpacity={(j + 1) / N} strokeWidth={0.45 * k} strokeLinecap="round" />
      ))}
      <circle cx={now.x} cy={now.y} r={k * 4} fill="#fff" opacity={0.2} />
      <circle cx={now.x} cy={now.y} r={k * 2.6} fill="#fff" opacity={0.22} />
    </g>
  )
}
const FocusLabel = ({ show }: { show: number }) => {
  const now = P(AT[FOCUS])
  return (
    <g opacity={show}>
      <circle cx={now.x} cy={now.y} r={DOT_R * 1.6} fill="none" stroke={MARK} strokeWidth={4} />
      <Pill x={now.x} y={now.y - DOT_R - 30} text="Arlo" />
    </g>
  )
}

const LinkMark = ({ show }: { show: number }) => {
  const [a, b] = LINK.map((i) => AT[i])
  const d = Math.hypot(a.x - b.x, a.y - b.y)
  const sa = P(a)
  const sb = P(b)
  return (
    <g opacity={show}>
      <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke={MARK} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Down the line towards the left-back, clear of the run in behind. */}
      <Pill x={sa.x + (sb.x - sa.x) * 0.25 - 46} y={sa.y + (sb.y - sa.y) * 0.25} text={`${Math.round(d)}m`} />
    </g>
  )
}

/** Players picked for a link or a shape, ringed until the mark forms. */
const Picked = ({ players, show }: { players: number[]; show: number }) => (
  <g opacity={show}>
    {players.map((i) => (
      <circle key={i} cx={P(AT[i]).x} cy={P(AT[i]).y} r={DOT_R + 6} fill="none" stroke="#fff" strokeWidth={3} />
    ))}
  </g>
)

function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (list: Pt[]) => {
    const out: Pt[] = []
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop()
      out.push(q)
    }
    return out.slice(0, -1)
  }
  return [...half(p), ...half([...p].reverse())]
}

const ShapeMark = ({ players, show }: { players: number[]; show: number }) => {
  if (players.length < 3) return null
  const pts = players.map((i) => AT[i])
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const top = P({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: Math.max(...ys) })
  return (
    <g opacity={show}>
      <polygon points={hull(pts).map((p) => `${P(p).x},${P(p).y}`).join(' ')} fill={AWAY} fillOpacity={0.25} stroke={AWAY} strokeWidth={4} strokeLinejoin="round" />
      <Pill x={top.x} y={top.y - DOT_R - 34} text={`${Math.round(Math.max(...ys) - Math.min(...ys))}m × ${Math.round(Math.max(...xs) - Math.min(...xs))}m`} />
    </g>
  )
}

const Handles = ({ pts }: { pts: Pt[] }) => (
  <g>
    {pts.map((p, i) => (
      <circle key={i} cx={p.x} cy={p.y} r={8} fill="#fff" stroke={MARK} strokeWidth={2.5} />
    ))}
  </g>
)

const RectMark = ({ a, b, draft, selected, gone }: { a: Pt; b: Pt; draft: boolean; selected: number; gone: number }) => {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)
  if (gone >= 1) return null
  const s = 1 - 0.4 * gone
  const c = { x: x + w / 2, y: y + h / 2 }
  return (
    <g opacity={1 - gone} transform={`translate(${c.x} ${c.y}) scale(${s}) translate(${-c.x} ${-c.y})`}>
      {selected > 0 && <rect x={x} y={y} width={w} height={h} fill="none" stroke="#fff" strokeOpacity={0.45 * selected} strokeWidth={STROKE + 8} strokeLinejoin="round" />}
      <rect x={x} y={y} width={w} height={h} fill={RECT_FILL} fillOpacity={draft ? 0.5 : 1} stroke={MARK} strokeWidth={STROKE} strokeDasharray={draft ? '12 10' : undefined} />
      {selected > 0 && (
        <g opacity={selected}>
          <Handles pts={[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]} />
        </g>
      )}
    </g>
  )
}

const StrokeMark = ({ a, b, draft, head }: { a: Pt; b: Pt; draft: boolean; head: boolean }) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const u = { x: (b.x - a.x) / d, y: (b.y - a.y) / d }
  const hs = 26
  const tip = head ? { x: b.x - u.x * hs * 0.6, y: b.y - u.y * hs * 0.6 } : b
  const headPts = [b, { x: b.x - u.x * hs - u.y * hs * 0.6, y: b.y - u.y * hs + u.x * hs * 0.6 }, { x: b.x - u.x * hs + u.y * hs * 0.6, y: b.y - u.y * hs - u.x * hs * 0.6 }]
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={tip.x} y2={tip.y} stroke={MARK} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={draft ? '12 10' : undefined} />
      {head && d > hs && <polygon points={headPts.map((p) => `${p.x},${p.y}`).join(' ')} fill={MARK} />}
    </g>
  )
}

// ---------------- Steps ----------------

const STEP_X = RAIL_W + 30
const railStep = (tool: string, text: string, from: string, to: string) => {
  const box = railRect(tool)
  return { text, box, labelAt: { x: STEP_X, y: box.y + box.h / 2 }, from: M[from], to: M[to] }
}
const RECT_BOX = (() => {
  const a = P(RECT.a)
  const b = P(RECT.b)
  return { x: Math.min(a.x, b.x) - 14, y: Math.min(a.y, b.y) - 14, w: Math.abs(b.x - a.x) + 28, h: Math.abs(b.y - a.y) + 28 }
})()
const STEPS = [
  railStep('Player Focus', 'Player Focus: click a player', 'focusStep', 'linkStep'),
  railStep('Link Players', 'Link Players: click two players', 'linkStep', 'shapeStep'),
  railStep('Team Shape', 'Team Shape: click three or more players', 'shapeStep', 'rectStep'),
  railStep('Draw Rectangle', 'Draw Rectangle: drag on the pitch', 'rectStep', 'lineStep'),
  railStep('Draw Line', 'Draw Line: drag on the pitch', 'lineStep', 'arrowStep'),
  railStep('Draw Arrow', 'Draw Arrow: drag on the pitch', 'arrowStep', 'offStep'),
  railStep('Draw Arrow', 'Switch the tool off', 'offStep', 'selectStep'),
  { text: 'Click a mark to select it', box: RECT_BOX, labelAt: { x: RECT_BOX.x + RECT_BOX.w / 2 - 300, y: H - 60 }, from: M.selectStep, to: M.eraseStep },
  railStep('Erase', 'Press Erase to delete it', 'eraseStep', 'fade'),
]

// ---------------- The clip ----------------

const cursorAt = (f: number): Pt => ({
  x: track(f, CURSOR.map(([kk, v]) => [kk, v.x] as Key)),
  y: track(f, CURSOR.map(([kk, v]) => [kk, v.y] as Key)),
})

export const DrawOnThePlay = () => {
  const f = useCurrentFrame()
  const cursor = cursorAt(f)
  const down = CLICKS.some((c) => f >= c && f < c + 4) || ['rect', 'line', 'arrow'].some((n) => f >= M[`${n}Press`] && f < M[`${n}Release`] + 2)

  const linkPicked = after('link0', f) && !after('link1', f) ? [LINK[0]] : []
  const shapeCount = SHAPE.filter((_, i) => after(`shape${i}`, f)).length
  const rect = dragged(f, 'rect', RECT.a, RECT.b)
  const line = dragged(f, 'line', LINE.a, LINE.b)
  const arrow = dragged(f, 'arrow', ARROW.a, ARROW.b)
  const selected = progress(f, M.select + 1, M.select + 5)
  const gone = progress(f, M.erase + 2, M.erase + 12)

  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Pitch view={VIEW} bottom={H} players={AT} ball={ballPos(M0)}>
          {/* The marks, under the players. */}
          {after('focus', f) && <FocusMark show={appear(f, 'focus')} />}
          {rect && <RectMark {...rect} selected={selected} gone={gone} />}
          {after('link1', f) && <LinkMark show={appear(f, 'link1')} />}
          <ShapeMark players={SHAPE.slice(0, shapeCount)} show={shapeCount >= 3 ? appear(f, 'shape2') : 0} />
          {line && <StrokeMark {...line} head={false} />}
          {arrow && <StrokeMark {...arrow} head />}
        </Pitch>
        <Picked players={shapeCount > 0 && shapeCount < 3 ? SHAPE.slice(0, shapeCount) : linkPicked} show={1} />
        {after('focus', f) && <FocusLabel show={appear(f, 'focus')} />}

        <Controls playing={false} clip={64 + M0} clipLen={120} match={fmt(64 + M0)} cursor={cursor} />
        <Rail cursor={cursor} active={activeTool(f)} />
        <AppBar />

        {STEPS.map((s, i) => (
          <Step key={i} box={s.box} label={{ x: s.labelAt.x, y: s.labelAt.y, text: s.text, anchor: 'start' }} show={progress(f, s.from, s.from + 6) * (1 - progress(f, s.to - 5, s.to))} />
        ))}

        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1} down={down} clicks={CLICKS.map((c) => (f - c) / 10)} />
        </g>

        <rect width={W} height={H} fill="#000" opacity={progress(f, M.fade, DRAW_ON_THE_PLAY_DURATION) + (1 - progress(f, 0, 6))} />
      </svg>
    </AbsoluteFill>
  )
}
