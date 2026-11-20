// The app's left column, as in the real Tapp'd: a rail of tools (Build: Moments, Insights, Overlays, Settings;
// Draw: the annotation tools), or an open panel in its place with a Back button. All in screen space.
import { BAR_BOTTOM, PANEL_W, RAIL_W } from './layout'
import { C, SANS } from './Pitch'

const MUTED = '#7f97a6'
const TEXT = '#c7d3db'
const BG = '#1f3140'
const BORDER = '#2c4352'
const HOVER = '#2a4152'

// ---------------- Rail ----------------

const BUILD = ['Moments', 'Insights', 'Overlays', 'Settings'] as const
const DRAW = ['Player Focus', 'Link Players', 'Team Shape', 'Draw Rectangle', 'Draw Line', 'Draw Arrow', 'Erase'] as const
export type RailItem = (typeof BUILD)[number] | (typeof DRAW)[number]

const BTN = { x: 14, w: RAIL_W - 28, h: 38, step: 44 }
const BUILD_Y = BAR_BOTTOM + 40
const DRAW_Y = BUILD_Y + BUILD.length * BTN.step + 46

const railTop = (name: RailItem) => {
  const i = (BUILD as readonly string[]).indexOf(name)
  return i >= 0 ? BUILD_Y + i * BTN.step : DRAW_Y + (DRAW as readonly string[]).indexOf(name) * BTN.step
}
/** The centre of a rail button, for the cursor. */
export const railButton = (name: RailItem): [number, number] => [BTN.x + 64, railTop(name) + BTN.h / 2]

const inside = (p: [number, number] | null, x: number, y: number, w: number, h: number) => !!p && p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h

/** Small line icons, drawn around (0, 0). */
const Icon = ({ name, color }: { name: RailItem; color: string }) => {
  const s = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'Moments':
      return (
        <g {...s}>
          <circle cx={-2} cy={-2} r={6} />
          <path d="M3 3 L8 8" />
        </g>
      )
    case 'Insights':
      return <path {...s} d="M-8 -5 H6 M-8 0 H8 M-8 5 H2" />
    case 'Overlays':
      return (
        <g {...s}>
          <rect x={-8} y={-6} width={12} height={12} rx={2} />
          <path d="M-4 -9 H8 V3 M-2 0 H2 M0 -2 V2" />
        </g>
      )
    case 'Settings':
      return (
        <g {...s}>
          <circle r={3} />
          <circle r={7.5} strokeDasharray="3 2.9" strokeWidth={3} />
        </g>
      )
    case 'Player Focus':
      return (
        <g {...s}>
          <circle cy={-6} r={3} />
          <path d="M-4 6 V0 Q0 -3 4 0 V6 M-8 7 Q0 11 8 7" />
        </g>
      )
    case 'Link Players':
      return (
        <g {...s}>
          <circle cx={-6} cy={4} r={2.6} />
          <circle cx={6} cy={-5} r={2.6} />
          <circle cx={6} cy={6} r={2.6} />
          <path d="M-4 3 L4 -4 M-3.5 4.5 L3.5 5.5" />
        </g>
      )
    case 'Team Shape':
      return <path {...s} d="M-7 6 L-8 -3 L0 -8 L8 -2 L5 7 Z" />
    case 'Draw Rectangle':
      return <rect {...s} x={-7} y={-6} width={14} height={12} rx={1.5} />
    case 'Draw Line':
      return <path {...s} d="M-6 7 L6 -7" />
    case 'Draw Arrow':
      return <path {...s} d="M-8 0 H7 M3 -4 L7 0 L3 4" />
    case 'Erase':
      return <path {...s} d="M-8 3 L1 -6 L7 0 L-2 9 H-6 Z M-3 -2 L3 4" />
  }
}

const RailButton = ({ name, hover, active }: { name: RailItem; hover: boolean; active: number }) => {
  const y = railTop(name)
  const color = active > 0.5 ? C.accent : TEXT
  return (
    <g>
      {(hover || active > 0) && (
        <rect
          x={BTN.x}
          y={y}
          width={BTN.w}
          height={BTN.h}
          rx={8}
          fill={active > 0 ? C.accent : HOVER}
          fillOpacity={active > 0 ? 0.16 * active + (hover ? 0.06 : 0) : 1}
          stroke={active > 0 ? C.accent : 'none'}
          strokeOpacity={active}
          strokeWidth={1.5}
        />
      )}
      <g transform={`translate(${BTN.x + 20} ${y + BTN.h / 2})`}>
        <Icon name={name} color={color} />
      </g>
      <text x={BTN.x + 40} y={y + BTN.h / 2 + 5.5} fontFamily={SANS} fontSize={15} fontWeight={600} fill={active > 0.5 ? '#fff' : TEXT}>
        {name}
      </text>
    </g>
  )
}

/** The rail, from the app bar down to `bottom`. `active` lights the tools that are switched on. */
export const Rail = ({ bottom, cursor, active }: { bottom: number; cursor: [number, number] | null; active: Partial<Record<RailItem, number>> }) => {
  const kicker = (y: number, text: string) => (
    <text x={BTN.x + 6} y={y} fontFamily={SANS} fontSize={12} fontWeight={700} fill={MUTED} letterSpacing={2}>
      {text}
    </text>
  )
  return (
    <g>
      <defs>
        <clipPath id="railClip">
          <rect x={0} y={BAR_BOTTOM} width={RAIL_W} height={Math.max(0, bottom - BAR_BOTTOM)} />
        </clipPath>
      </defs>
      <g clipPath="url(#railClip)">
        <rect x={0} y={BAR_BOTTOM} width={RAIL_W} height={1080} fill={BG} />
        {kicker(BUILD_Y - 12, 'BUILD')}
        {kicker(DRAW_Y - 12, 'DRAW')}
        {[...BUILD, ...DRAW].map((n) => (
          <RailButton key={n} name={n} hover={inside(cursor, BTN.x, railTop(n), BTN.w, BTN.h)} active={active[n] ?? 0} />
        ))}
      </g>
      <rect x={RAIL_W - 2} y={BAR_BOTTOM} width={2} height={Math.max(0, bottom - BAR_BOTTOM)} fill={BORDER} />
    </g>
  )
}

// ---------------- Panels ----------------

const BACK = { x: 20, y: BAR_BOTTOM + 16, w: 104, h: 38 }
export const BACK_BUTTON: [number, number] = [BACK.x + BACK.w / 2, BACK.y + BACK.h / 2]
const HEADING_Y = BAR_BOTTOM + 96

/** A panel in the rail's place: its background, the Back button and its heading. `x` slides it in. */
const PanelFrame = ({ id, x, bottom, title, cursor, children }: { id: string; x: number; bottom: number; title: string; cursor: [number, number] | null; children: React.ReactNode }) => {
  const backHover = inside(cursor, x + BACK.x, BACK.y, BACK.w, BACK.h)
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <clipPath id={id}>
          <rect x={0} y={BAR_BOTTOM} width={PANEL_W} height={Math.max(0, bottom - BAR_BOTTOM)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x={0} y={BAR_BOTTOM} width={PANEL_W} height={1080} fill={BG} />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx={8} fill={backHover ? HOVER : 'none'} stroke={BORDER} strokeWidth={1.5} />
        <path d={`M${BACK.x + 18} ${BACK.y + 19} h14 M${BACK.x + 24} ${BACK.y + 13} l-6 6 l6 6`} stroke={TEXT} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={BACK.x + 42} y={BACK.y + 25} fontFamily={SANS} fontSize={16} fontWeight={600} fill={TEXT}>
          Back
        </text>
        <text x={28} y={HEADING_Y} fontFamily={SANS} fontSize={28} fontWeight={800} fill="#fff">
          {title}
        </text>
        {children}
      </g>
      <rect x={PANEL_W - 2} y={BAR_BOTTOM} width={2} height={Math.max(0, bottom - BAR_BOTTOM)} fill={BORDER} />
    </g>
  )
}

// ---------------- Moments ----------------

type Moment = { time: string; len: string; tag?: string; desc: string; players: string }
const MOMENTS: Moment[] = [
  { time: '12:40', len: '0:09', tag: 'Shot', desc: 'BLU counter v RED high block', players: '6 → 10 → 9' },
  { time: '31:05', len: '0:14', desc: 'RED build-up v BLU mid block', players: '4 → 8 → 7' },
  { time: '44:52', len: '0:11', desc: 'BLU build-up v RED low block', players: '5 → 6 → 3' },
  { time: '67:05', len: '0:06', tag: 'Goal', desc: 'BLU build-up v RED mid block', players: '10 → 8 → 11' },
  { time: '82:11', len: '0:08', tag: 'Goal', desc: 'BLU counter v RED high block', players: '2 → 9' },
  { time: '88:40', len: '0:12', tag: 'Led to goal', desc: 'RED build-up v BLU low block', players: '3 → 7 → 10' },
]
const CARD = { x: 20, y0: BAR_BOTTOM + 168, w: PANEL_W - 40, h: 80, gap: 10 }
/** The centre of the i-th card in the list. */
export const momentCard = (i: number): [number, number] => [CARD.x + CARD.w / 2, CARD.y0 + i * (CARD.h + CARD.gap) + CARD.h / 2]
const FILTER_ICON: [number, number] = [PANEL_W - 46, HEADING_Y - 9]

/** The Moments list. `picked` tags the clicked moment In clip. */
export const MomentsPanel = ({ x, bottom, cursor, picked }: { x: number; bottom: number; cursor: [number, number] | null; picked: number }) => {
  if (x <= -PANEL_W) return null
  const local: [number, number] | null = cursor && [cursor[0] - x, cursor[1]]
  return (
    <PanelFrame id="momentsClip" x={x} bottom={bottom} title="Moments" cursor={cursor}>
      <text x={160} y={HEADING_Y} fontFamily={SANS} fontSize={17} fill={MUTED}>
        12 moments
      </text>
      <path
        d={`M${FILTER_ICON[0] - 14} ${FILTER_ICON[1] - 10} h28 l-11 13 v10 l-6 3 v-13 Z`}
        fill="none"
        stroke={TEXT}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {MOMENTS.map((c, i) => {
        const y = CARD.y0 + i * (CARD.h + CARD.gap)
        const isPicked = c.time === '67:05' && picked > 0
        const hover = inside(local, CARD.x, y, CARD.w, CARD.h)
        return (
          <g key={c.time} transform={`translate(${CARD.x} ${y})`}>
            <rect width={CARD.w} height={CARD.h} rx={10} fill={isPicked ? '#294356' : hover ? '#2d4658' : '#253a4a'} stroke={isPicked ? C.accent : hover ? '#4d6b7d' : '#33505f'} strokeWidth={isPicked ? 3 : 1.5} />
            <text x={18} y={30} fontFamily={SANS} fontSize={19} fontWeight={800} fill="#fff">
              {`${c.time}  ·  ${c.len}`}
            </text>
            {c.tag && (
              <g transform={`translate(${CARD.w - 20} 12)`}>
                <rect x={-c.tag.length * 8.6 - 18} width={c.tag.length * 8.6 + 18} height={26} rx={13} fill={c.tag === 'Shot' ? '#4d6b7d' : '#5fd68f'} />
                <text x={-(c.tag.length * 8.6 + 18) / 2} y={18} fontFamily={SANS} fontSize={14} fontWeight={800} fill="#0d1a22" textAnchor="middle">
                  {c.tag}
                </text>
              </g>
            )}
            {isPicked && (
              <g opacity={picked} transform={`translate(${CARD.w - 20} 46)`}>
                <rect x={-74} width={74} height={24} rx={12} fill={C.accent} />
                <text x={-37} y={17} fontFamily={SANS} fontSize={13} fontWeight={800} fill="#fff" textAnchor="middle">
                  In clip
                </text>
              </g>
            )}
            <text x={18} y={54} fontFamily={SANS} fontSize={15} fill={TEXT}>
              {c.desc}
            </text>
            <text x={18} y={72} fontFamily={SANS} fontSize={14} fill={MUTED}>
              {c.players}
            </text>
          </g>
        )
      })}
    </PanelFrame>
  )
}

// ---------------- Overlays ----------------

export const OVERLAYS = ['Pitch Control', 'Pass Probability', 'Sequence Trails', 'Voronoi', 'Event Map', 'Pass Network'] as const
export type OverlayName = (typeof OVERLAYS)[number]
const ROW = { x: 20, y0: HEADING_Y + 26, w: PANEL_W - 40, h: 52, step: 60 }
export const overlayRow = (name: OverlayName): [number, number] => [ROW.x + 150, ROW.y0 + OVERLAYS.indexOf(name) * ROW.step + ROW.h / 2]

export const OverlaysPanel = ({ x, bottom, cursor, on }: { x: number; bottom: number; cursor: [number, number] | null; on: Partial<Record<OverlayName, number>> }) => {
  if (x <= -PANEL_W) return null
  const local: [number, number] | null = cursor && [cursor[0] - x, cursor[1]]
  return (
    <PanelFrame id="overlaysClip" x={x} bottom={bottom} title="Overlays" cursor={cursor}>
      {OVERLAYS.map((name, i) => {
        const y = ROW.y0 + i * ROW.step
        const t = on[name] ?? 0
        const hover = inside(local, ROW.x, y, ROW.w, ROW.h)
        return (
          <g key={name}>
            <rect x={ROW.x} y={y} width={ROW.w} height={ROW.h} rx={10} fill={t > 0 ? C.accent : hover ? '#2d4658' : '#253a4a'} fillOpacity={t > 0 ? 0.08 + 0.14 * t : 1} stroke={t > 0 ? C.accent : '#33505f'} strokeOpacity={t > 0 ? t : 1} strokeWidth={t > 0 ? 2.5 : 1.5} />
            <text x={ROW.x + 20} y={y + 32} fontFamily={SANS} fontSize={18} fontWeight={700} fill={t > 0.5 ? '#fff' : TEXT}>
              {name}
            </text>
            {t > 0 && (
              <g opacity={t} transform={`translate(${ROW.x + ROW.w - 20} ${y + 14})`}>
                <rect x={-50} width={50} height={24} rx={12} fill={C.accent} />
                <text x={-25} y={17} fontFamily={SANS} fontSize={13} fontWeight={800} fill="#fff" textAnchor="middle">
                  On
                </text>
              </g>
            )}
          </g>
        )
      })}
    </PanelFrame>
  )
}
