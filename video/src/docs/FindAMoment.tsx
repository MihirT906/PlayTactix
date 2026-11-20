// The "Find a moment" clip for the docs' workspace page (frontend/public/docs-media/workspace-moment.mp4), 13s.
// The match has opened on its first two minutes, boxed on the timeline. The cursor opens Moments, opens the filters,
// filters by team, attacking phase and outcome, and clicks the moment left. It loads, and replaces the opening two
// minutes on the timeline, boxed again.
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { type Key, type Pt, lerp, progress, track } from '../anim'
import { C, SANS } from '../act3/Pitch'
import { Cursor } from '../act3/Ui'
import { PLAYERS, ballPos, playerPos } from '../act3/play'
import { type Box, AppBar, BG, BORDER, Controls, H, HOME, AWAY, HOVER, Highlight, KICKOFF, MUTED, PITCH_TOP, Pitch, RAIL_W, Rail, Step, TEXT, W, fitPitch, inside, railButton, railRect } from './workspace'

// ---------------- Layout ----------------

const TL_H = 196
const TL_TOP = H - TL_H
const VIEW = fitPitch(TL_TOP)

// The timeline: a column of row labels, then the track.
const TL = { x0: 270, x1: 1880 }
const MOMENTS_ROW = { y: TL_TOP + 70, h: 42 }

// The Moments panel, in the rail's place.
const PANEL_W = 560
const BACK = { x: 24, y: 64 + 18, w: 120, h: 46 }
const RH = 64 + 214 // the results heading
const FILTER_BTN = { x: PANEL_W - 68, y: RH - 30, w: 44, h: 44 }
const FS = RH + 30 // the filters' top
const F_ROW = 58
const FILTERS = ['Team in possession', 'Attacking phase', 'Defending phase', 'Half', 'Led to'] as const
const FH = FILTERS.length * F_ROW
const CTRL_X = 250
const CTRL_W = PANEL_W - 24 - CTRL_X
const SEG_H = 40
const segCentre = (row: number, i: number, n: number): Pt => ({ x: CTRL_X + (CTRL_W / n) * (i + 0.5), y: FS + row * F_ROW + F_ROW / 2 })
const PHASES = ['Any', 'Build Up', 'Create', 'Finish', 'Quick Break', 'Transition', 'Chaotic']
const MENU = { x: CTRL_X, y: FS + 2 * F_ROW - 6, w: CTRL_W, row: 40 }
const menuOption = (i: number): Pt => ({ x: MENU.x + 120, y: MENU.y + 8 + i * MENU.row + MENU.row / 2 })
const CARD = { x: 24, w: PANEL_W - 48, h: 112, gap: 10 }

// ---------------- Moments ----------------

type Moment = { at: string; len: string; team: 'HAR' | 'RIV'; phase: string; against: string; tag?: string; chain: string }
const MOMENTS: Moment[] = [
  { at: '03:12', len: '18s', team: 'HAR', phase: 'Build Up', against: 'Medium Block', chain: 'Kerr → Moss → Hale' },
  { at: '07:45', len: '9s', team: 'RIV', phase: 'Quick Break', against: 'Def. Quick Break', tag: 'Shot', chain: 'Reyes → Vance  shot' },
  { at: '12:30', len: '22s', team: 'HAR', phase: 'Create', against: 'Low Block', tag: 'Led to shot', chain: 'Moss → Arlo' },
  { at: '18:04', len: '14s', team: 'RIV', phase: 'Build Up', against: 'High Block', chain: 'Ortiz → Lane → Reyes' },
  { at: '24:51', len: '11s', team: 'HAR', phase: 'Build Up', against: 'High Block', chain: 'Dunn → Kerr  lost possession' },
  { at: '31:20', len: '16s', team: 'HAR', phase: 'Build Up', against: 'Medium Block', chain: 'Kerr → Hale → Moss' },
  { at: '38:09', len: '8s', team: 'HAR', phase: 'Transition', against: 'Def. Transition', tag: 'Shot', chain: 'Arlo  shot' },
  { at: '52:10', len: '34s', team: 'HAR', phase: 'Build Up', against: 'Medium Block', tag: 'Goal', chain: 'Kerr → Moss → +2 → Arlo  shot' },
  { at: '61:47', len: '12s', team: 'HAR', phase: 'Build Up', against: 'Low Block', tag: 'Led to goal', chain: 'Hale → Moss → Kerr' },
]
const PICKED = '52:10'
const TOTAL = 48

// ---------------- The script ----------------

const CURSOR: [number, Pt][] = []
const CLICKS: number[] = []
const M: Record<string, number> = {}
let t = 0
let pos: Pt = { x: 1300, y: 560 }
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

key()
mark('opening') // the first two minutes, boxed on the timeline
wait(64)
move(railButton('Moments'), 16)
click('moments')
wait(20)
move({ x: FILTER_BTN.x + FILTER_BTN.w / 2, y: FILTER_BTN.y + FILTER_BTN.h / 2 }, 18)
click('filters')
wait(18)
move(segCentre(0, 1, 3), 16)
click('team')
wait(4)
move({ x: CTRL_X + CTRL_W / 2, y: FS + F_ROW * 1.5 }, 14)
click('phaseMenu')
wait(4)
move(menuOption(1), 12)
click('phase')
wait(8)
move(segCentre(4, 2, 3), 16)
click('goal')
wait(12)
const LIST_TOP = FS + FH + 16
move({ x: CARD.x + CARD.w / 2, y: LIST_TOP + CARD.h / 2 }, 18)
wait(2)
click('pick')
wait(6)
move({ x: 1250, y: 520 }, 18)
mark('loaded') // the moment, boxed on the timeline
wait(84)
mark('fade')
wait(18)
export const FIND_A_MOMENT_DURATION = t

// ---------------- State from the script ----------------

const after = (name: string, f: number, d = 2) => f >= M[name] + d

/** The moments the filters leave at frame f, and how many of the match's that is. */
function results(f: number): { list: Moment[]; count: number | null } {
  if (after('goal', f)) return { list: MOMENTS.filter((m) => m.team === 'HAR' && m.phase === 'Build Up' && (m.tag === 'Goal' || m.tag === 'Led to goal')), count: 2 }
  if (after('phase', f)) return { list: MOMENTS.filter((m) => m.team === 'HAR' && m.phase === 'Build Up'), count: 6 }
  if (after('team', f)) return { list: MOMENTS.filter((m) => m.team === 'HAR'), count: 21 }
  return { list: MOMENTS, count: null }
}

// ---------------- Pieces ----------------

const Funnel = ({ x, y, color }: { x: number; y: number; color: string }) => (
  <path d={`M${x - 12} ${y - 10} h24 l-9 11 v9 l-6 3 v-12 Z`} fill={color} />
)

const Segmented = ({ row, options, active, cursor }: { row: number; options: { label: string; dot?: string }[]; active: number; cursor: Pt | null }) => {
  const y = FS + row * F_ROW + (F_ROW - SEG_H) / 2
  const w = CTRL_W / options.length
  return (
    <g>
      <rect x={CTRL_X} y={y} width={CTRL_W} height={SEG_H} rx={8} fill="#1a2b37" stroke={BORDER} strokeWidth={2} />
      {options.map((o, i) => {
        const x = CTRL_X + i * w
        const on = i === active
        const hover = inside(cursor, x, y, w, SEG_H)
        return (
          <g key={o.label}>
            {(on || hover) && <rect x={x + 3} y={y + 3} width={w - 6} height={SEG_H - 6} rx={6} fill={on ? C.accent : HOVER} fillOpacity={on ? 0.9 : 1} />}
            {o.dot && <circle cx={x + w / 2 - 26} cy={y + SEG_H / 2} r={6} fill={o.dot} />}
            <text x={x + w / 2 + (o.dot ? 8 : 0)} y={y + SEG_H / 2 + 7} fontFamily={SANS} fontSize={19} fontWeight={700} fill={on ? '#fff' : TEXT} textAnchor="middle">
              {o.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

const Dropdown = ({ row, value, cursor }: { row: number; value: string; cursor: Pt | null }) => {
  const y = FS + row * F_ROW + (F_ROW - SEG_H) / 2
  const on = value !== 'Any'
  const hover = inside(cursor, CTRL_X, y, CTRL_W, SEG_H)
  return (
    <g>
      <rect x={CTRL_X} y={y} width={CTRL_W} height={SEG_H} rx={8} fill={hover ? HOVER : '#1a2b37'} stroke={on ? C.accent : BORDER} strokeWidth={2} />
      <text x={CTRL_X + 16} y={y + SEG_H / 2 + 7} fontFamily={SANS} fontSize={19} fontWeight={600} fill={on ? '#fff' : TEXT}>
        {value}
      </text>
      <path d={`M${CTRL_X + CTRL_W - 30} ${y + 16} l7 7 l7 -7`} stroke={TEXT} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

const Tag = ({ x, y, text, accent }: { x: number; y: number; text: string; accent?: boolean }) => {
  const w = text.length * 10 + 20
  return (
    <g>
      <rect x={x - w} y={y - 20} width={w} height={28} rx={4} fill={accent ? 'none' : '#2d4658'} stroke={accent ? C.accent : '#4d6b7d'} strokeWidth={2} />
      <text x={x - w / 2} y={y} fontFamily={SANS} fontSize={16} fontWeight={700} fill={accent ? C.accent : TEXT} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

const MomentCard = ({ y, m, added, hover }: { y: number; m: Moment; added: boolean; hover: boolean }) => {
  const x = CARD.x
  const home = m.team === 'HAR'
  const tags = [m.tag, added ? 'Added' : undefined].filter(Boolean) as string[]
  return (
    <g>
      <rect x={x} y={y} width={CARD.w} height={CARD.h} rx={10} fill={hover || added ? '#2d4658' : '#253a4a'} stroke={added ? C.accent : hover ? '#4d6b7d' : '#33505f'} strokeWidth={added ? 3 : 1.5} />
      <text x={x + 18} y={y + 34} fontFamily={SANS} fontSize={22} fontWeight={800} fill="#fff">
        {m.at}
        <tspan fontSize={17} fontWeight={500} fill={MUTED} dx={10}>
          {m.len}
        </tspan>
      </text>
      {tags.reverse().map((tag, i) => (
        <Tag key={tag} x={x + CARD.w - 16 - i * 100} y={y + 34} text={tag} accent={tag === 'Added'} />
      ))}
      <rect x={x + 18} y={y + 50} width={4} height={24} fill={home ? HOME : AWAY} />
      <text x={x + 30} y={y + 68} fontFamily={SANS} fontSize={18} fontWeight={800} fill="#fff">
        {m.team}
        <tspan fontWeight={500} fill={TEXT} dx={10}>
          {m.phase}
        </tspan>
      </text>
      <rect x={x + CARD.w - 22} y={y + 50} width={4} height={24} fill={home ? AWAY : HOME} />
      <text x={x + CARD.w - 30} y={y + 68} fontFamily={SANS} fontSize={18} fontWeight={500} fill={TEXT} textAnchor="end">
        {m.against}
        <tspan fontWeight={800} fill="#fff" dx={10}>
          {home ? 'RIV' : 'HAR'}
        </tspan>
      </text>
      <text x={x + 18} y={y + 98} fontFamily={SANS} fontSize={16} fill={MUTED}>
        {m.chain}
      </text>
    </g>
  )
}

const MomentsPanel = ({ f, x, cursor }: { f: number; x: number; cursor: Pt | null }) => {
  if (x <= -PANEL_W) return null
  const local = cursor && { x: cursor.x - x, y: cursor.y }
  const open = progress(f, M.filters + 2, M.filters + 14)
  const { list, count } = results(f)
  const listTop = FS + FH * open + 16
  const menu = progress(f, M.phaseMenu + 1, M.phaseMenu + 5) * (1 - progress(f, M.phase + 3, M.phase + 7))
  const filtering = count !== null
  const added = after('pick', f)
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <clipPath id="momentsPanel">
          <rect x={0} y={64} width={PANEL_W} height={TL_TOP - 64} />
        </clipPath>
        <clipPath id="filterRows">
          <rect x={0} y={FS} width={PANEL_W} height={FH * open} />
        </clipPath>
      </defs>
      <g clipPath="url(#momentsPanel)">
        <rect x={0} y={64} width={PANEL_W} height={TL_TOP - 64} fill={BG} />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx={9} fill="none" stroke={BORDER} strokeWidth={2} />
        <path d={`M${BACK.x + 22} ${BACK.y + 23} h18 M${BACK.x + 29} ${BACK.y + 15} l-8 8 l8 8`} stroke={TEXT} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={BACK.x + 52} y={BACK.y + 30} fontFamily={SANS} fontSize={20} fontWeight={600} fill={TEXT}>
          Back
        </text>
        <text x={24} y={64 + 112} fontFamily={SANS} fontSize={34} fontWeight={800} fill="#fff">
          Moments
        </text>
        <text x={24} y={64 + 142} fontFamily={SANS} fontSize={18} fill={MUTED}>
          Click a moment to add it to your clip,
        </text>
        <text x={24} y={64 + 166} fontFamily={SANS} fontSize={18} fill={MUTED}>
          or create your own below.
        </text>

        <text x={24} y={RH} fontFamily={SANS} fontSize={22} fontWeight={800} fill="#fff">
          Moments
          {filtering && <tspan fontWeight={500} fill={TEXT}>{` · ${count} of ${TOTAL}`}</tspan>}
        </text>
        {filtering && (
          <text x={FILTER_BTN.x - 20} y={RH} fontFamily={SANS} fontSize={19} fontWeight={600} fill={TEXT} textAnchor="end">
            Reset
          </text>
        )}
        <rect
          {...FILTER_BTN}
          rx={8}
          fill={open > 0 ? 'rgba(254,127,45,0.15)' : inside(local, FILTER_BTN.x, FILTER_BTN.y, FILTER_BTN.w, FILTER_BTN.h) ? HOVER : 'none'}
          stroke={open > 0 || filtering ? C.accent : BORDER}
          strokeWidth={2}
        />
        <Funnel x={FILTER_BTN.x + FILTER_BTN.w / 2} y={FILTER_BTN.y + FILTER_BTN.h / 2 - 2} color={filtering ? C.accent : TEXT} />

        {open > 0 && (
          <g clipPath="url(#filterRows)">
            {FILTERS.map((label, i) => (
              <text key={label} x={24} y={FS + i * F_ROW + F_ROW / 2 + 6} fontFamily={SANS} fontSize={18} fontWeight={600} fill={TEXT}>
                {label}
              </text>
            ))}
            <Segmented row={0} options={[{ label: 'Any' }, { label: 'HAR', dot: HOME }, { label: 'RIV', dot: AWAY }]} active={after('team', f) ? 1 : 0} cursor={local} />
            <Dropdown row={1} value={after('phase', f) ? 'Build Up' : 'Any'} cursor={local} />
            <Dropdown row={2} value="Any" cursor={null} />
            <Segmented row={3} options={[{ label: 'Any' }, { label: '1st' }, { label: '2nd' }]} active={0} cursor={local} />
            <Segmented row={4} options={[{ label: 'Any' }, { label: 'Shot' }, { label: 'Goal' }]} active={after('goal', f) ? 2 : 0} cursor={local} />
          </g>
        )}

        {list.map((m, i) => {
          const y = listTop + i * (CARD.h + CARD.gap)
          if (y > TL_TOP) return null
          return <MomentCard key={m.at} y={y} m={m} added={added && m.at === PICKED} hover={inside(local, CARD.x, y, CARD.w, CARD.h)} />
        })}

        {menu > 0 && (
          <g opacity={menu}>
            <rect x={MENU.x} y={MENU.y} width={MENU.w} height={PHASES.length * MENU.row + 16} rx={8} fill="#0f172a" stroke="#334155" strokeWidth={2} />
            {PHASES.map((p, i) => {
              const y = MENU.y + 8 + i * MENU.row
              const hover = inside(local, MENU.x, y, MENU.w, MENU.row)
              const checked = after('phase', f) ? p === 'Build Up' : p === 'Any'
              return (
                <g key={p}>
                  {hover && <rect x={MENU.x + 6} y={y} width={MENU.w - 12} height={MENU.row} rx={5} fill="#2563eb" />}
                  {checked && <path d={`M${MENU.x + 18} ${y + 20} l5 5 l10 -11`} stroke="#f8fafc" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                  <text x={MENU.x + 46} y={y + 27} fontFamily={SANS} fontSize={19} fill="#f8fafc">
                    {p}
                  </text>
                </g>
              )
            })}
          </g>
        )}
      </g>
      <rect x={PANEL_W - 2} y={64} width={2} height={TL_TOP - 64} fill={BORDER} />
    </g>
  )
}

/** The timeline's Clip section: a ruler, and the Moments row with its one bar. */
const Timeline = ({ swap }: { swap: number }) => {
  const label = (y: number, text: string, head = false) => (
    <text x={28} y={y} fontFamily={SANS} fontSize={head ? 15 : 20} fontWeight={head ? 700 : 600} fill={head ? MUTED : TEXT} letterSpacing={head ? 2 : 0}>
      {text}
    </text>
  )
  const ruler = (len: number, step: number, opacity: number) =>
    opacity > 0 && (
      <g opacity={opacity}>
        {Array.from({ length: Math.floor(len / step) + 1 }, (_, i) => {
          const x = TL.x0 + ((i * step) / len) * (TL.x1 - TL.x0)
          return (
            <g key={i}>
              <rect x={x - 1} y={TL_TOP + 22} width={2} height={10} fill={MUTED} opacity={0.7} />
              <text x={x} y={TL_TOP + 17} fontFamily={SANS} fontSize={14} fill={MUTED} textAnchor="middle">
                {`${Math.floor((i * step) / 60)}:${String((i * step) % 60).padStart(2, '0')}`}
              </text>
            </g>
          )
        })}
      </g>
    )
  const bar = (text: string, show: number) =>
    show > 0 && (
      <g opacity={show} transform={`translate(0 ${(1 - show) * -14})`}>
        <rect x={TL.x0} y={MOMENTS_ROW.y + 5} width={TL.x1 - TL.x0} height={MOMENTS_ROW.h - 10} rx={6} fill="url(#matchBar)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
        <text x={TL.x0 + 16} y={MOMENTS_ROW.y + MOMENTS_ROW.h / 2 + 7} fontFamily={SANS} fontSize={19} fontWeight={700} fill="#fff">
          {text}
        </text>
      </g>
    )
  return (
    <g>
      <defs>
        <linearGradient id="matchBar" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(56,189,248)" stopOpacity={0.88} />
          <stop offset="1" stopColor="rgb(14,165,233)" stopOpacity={0.72} />
        </linearGradient>
      </defs>
      <rect x={0} y={TL_TOP} width={W} height={TL_H} fill="#15222b" />
      <rect x={0} y={TL_TOP} width={W} height={2} fill="#2c4352" />
      {ruler(120, 15, 1 - swap)}
      {ruler(34, 5, swap)}
      {label(TL_TOP + 58, 'CLIP', true)}
      {label(MOMENTS_ROW.y + MOMENTS_ROW.h / 2 + 7, 'Moments')}
      <rect x={TL.x0} y={MOMENTS_ROW.y + 4} width={TL.x1 - TL.x0} height={MOMENTS_ROW.h - 8} rx={6} fill="#1b2b36" />
      {bar('Opening clip · 2:00', 1 - swap)}
      {bar('52:10 · 0:34', swap)}
      {label(TL_TOP + 142, 'Overlays')}
      {label(TL_TOP + 178, 'Annotations')}
      <rect x={TL.x0 - 1.5} y={TL_TOP + 8} width={3} height={TL_H} fill={C.accent} />
      <path d={`M${TL.x0 - 8} ${TL_TOP + 2} L${TL.x0 + 8} ${TL_TOP + 2} L${TL.x0} ${TL_TOP + 12} Z`} fill={C.accent} />
    </g>
  )
}

// ---------------- The clip ----------------

const cursorAt = (f: number): Pt => ({
  x: track(f, CURSOR.map(([k, v]) => [k, v.x] as Key)),
  y: track(f, CURSOR.map(([k, v]) => [k, v.y] as Key)),
})

const ROW_BOX = { x: 16, y: MOMENTS_ROW.y - 2, w: W - 32, h: MOMENTS_ROW.h + 4 }
// The steps, each called out while it's done: what's outlined, where the label sits, and when.
const MOMENTS_BTN = railRect('Moments')
const STEPS: { text: string; box: Box; labelAt: Pt; from: number; to: number }[] = [
  { text: 'Click Moments', box: MOMENTS_BTN, labelAt: { x: RAIL_W + 30, y: PITCH_TOP + 52 }, from: M.opening + 64, to: M.moments + 10 },
  {
    text: 'Open the filters',
    box: { x: FILTER_BTN.x - 4, y: FILTER_BTN.y - 4, w: FILTER_BTN.w + 8, h: FILTER_BTN.h + 8 },
    labelAt: { x: PANEL_W + 30, y: FILTER_BTN.y + FILTER_BTN.h / 2 },
    from: M.moments + 12,
    to: M.filters + 10,
  },
  {
    text: 'Filter by team, phase and outcome',
    box: { x: 12, y: FS - 2, w: PANEL_W - 24, h: FH + 4 },
    labelAt: { x: PANEL_W + 30, y: FS + FH / 2 },
    from: M.filters + 12,
    to: M.goal + 10,
  },
  {
    text: 'Click a moment to add it',
    box: { x: CARD.x - 4, y: LIST_TOP - 4, w: CARD.w + 8, h: CARD.h + 8 },
    labelAt: { x: PANEL_W + 30, y: LIST_TOP + CARD.h / 2 },
    from: M.goal + 12,
    to: M.pick + 12,
  },
]

const MOVE_AT = 0.9 // where the picked moment opens in play.ts's move: blue 8 on the ball

export const FindAMoment = () => {
  const f = useCurrentFrame()
  const cursor = cursorAt(f)
  const panel = progress(f, M.moments + 2, M.moments + 14)
  const swap = progress(f, M.pick + 2, M.pick + 12)
  const loaded = swap >= 0.5
  const down = CLICKS.some((c) => f >= c && f < c + 4)

  return (
    <AbsoluteFill style={{ backgroundColor: C.frame }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <g opacity={1 - swap}>
          <Pitch view={VIEW} bottom={TL_TOP} players={KICKOFF} ball={{ x: 0, y: 0 }} />
        </g>
        {swap > 0 && (
          <g opacity={swap}>
            <Pitch view={VIEW} bottom={TL_TOP} players={PLAYERS.map((_, i) => playerPos(i, MOVE_AT))} ball={ballPos(MOVE_AT)} m={MOVE_AT} />
          </g>
        )}
        <Controls playing={false} clip={0} clipLen={loaded ? 34 : 120} match={loaded ? '52:10' : '00:00'} cursor={cursor} left={lerp(RAIL_W, PANEL_W, panel)} />
        <Rail bottom={TL_TOP} cursor={cursor} />
        <MomentsPanel f={f} x={lerp(-PANEL_W, 0, panel)} cursor={cursor} />
        <Timeline swap={swap} />
        <AppBar />

        {STEPS.map((s) => (
          <Step key={s.text} box={s.box} label={{ x: s.labelAt.x, y: s.labelAt.y, text: s.text, anchor: 'start' }} show={progress(f, s.from, s.from + 6) * (1 - progress(f, s.to - 6, s.to))} />
        ))}

        <Highlight
          box={ROW_BOX}
          label={{ x: W / 2, y: ROW_BOX.y - 70, text: 'A match opens on its first two minutes' }}
          show={progress(f, M.opening + 8, M.opening + 16) * (1 - progress(f, M.opening + 58, M.opening + 64))}
        />
        <Highlight
          box={ROW_BOX}
          label={{ x: (PANEL_W + W) / 2, y: ROW_BOX.y - 70, text: 'The moment is loaded and on the timeline' }}
          show={progress(f, M.loaded, M.loaded + 8)}
        />

        <g transform={`translate(${cursor.x} ${cursor.y}) scale(1.35) translate(${-cursor.x} ${-cursor.y})`}>
          <Cursor x={cursor.x} y={cursor.y} opacity={1 - progress(f, M.loaded - 4, M.loaded + 6)} down={down} clicks={CLICKS.map((c) => (f - c) / 10)} />
        </g>

        <rect width={W} height={H} fill="#000" opacity={progress(f, M.fade, FIND_A_MOMENT_DURATION) + (1 - progress(f, 0, 6))} />
      </svg>
    </AbsoluteFill>
  )
}
