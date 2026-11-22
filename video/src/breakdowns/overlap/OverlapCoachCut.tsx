// Breakdown 2, the coach cut: the screen recording of the two overlaps, paused while a coach in the corner talks
// through it. Script: video/breakdowns/02-the-overlap-coach-cut.md. Timing and positions: ./timeline.ts.
//
// It opens on a title card (the Tapp'd logo and tagline), which fades into the recording.
//
// The recording is the only thing on the pitch. The video adds just the coach's speech bubbles and the palm cursor:
// no tags, rings, lines, chips or cards on the plot.
import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { FPS, type Pt, hump, lerp, lerpPt, progress, smooth } from '../../anim'
import { SANS } from '../../act3/Pitch'
import { DISPLAY } from '../../fonts'
import { LogoLockup } from '../../Logo'
import { Coach, Palm } from './Coach'
import { OVERLAP_COACH_DURATION as CUT_FRAMES, POS, SEGMENTS, fr, out, recAt } from './timeline'

// The title card runs 3.5s; the cut starts under it at 3.0s, so the card's fade-out reveals the first frame.
const TITLE = { logo: [0, 0.7], line: [0.6, 1.2], out: [3.0, 3.5] } as const
const CUT_START = Math.round(TITLE.out[0] * FPS)
export const OVERLAP_COACH_DURATION = CUT_START + CUT_FRAMES

// ---------------- Layout ----------------

const REC_W = 1844
const REC_H = 1124
const K = 1080 / REC_H // the recording, scaled to the frame's height
const X0 = 1920 - REC_W * K // and pushed right, leaving the bottom-left for the coach
const S = (p: Pt): Pt => ({ x: X0 + p.x * K, y: p.y * K })
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

const BG = '#1f3444'
const INK = '#14232d'

const sec = (s: number) => Math.round(s * FPS)

// Output-second helpers for points inside each hold.
const H1 = (k: number) => out(1.0, k)
const H16 = (k: number) => out(16.2, k)
const H23 = (k: number) => out(23.4, k)
const H28 = (k: number) => out(28.3, k)
const H32 = (k: number) => out(32.0, k)
const H47 = (k: number) => out(47.1, k)
const H48 = (k: number) => out(48.7, k)
const H54 = (k: number) => out(54.2, k)

// ---------------- The script ----------------

type Line = { from: number; to: number; text: string }
const LINES: Line[] = [
  // Beat 1: two overlaps (hold at rec 1.0)
  { from: out(0.6), to: H1(2.6), text: 'Here are traces of two overlaps.' },
  { from: H1(2.9), to: H1(7.2), text: "Long arrow: the full-back's run. Short arrow: the winger's carry." },
  { from: H1(7.5), to: H1(10.1), text: 'Perth: carry at goal. Goal.' },
  { from: H1(10.4), to: H1(13.3), text: 'Brisbane: carry toward the touchline. Nothing.' },
  { from: H1(13.6), to: out(2.5), text: 'Same run. Different carry.' },
  // Beat 3: Brisbane plays
  { from: out(9.6), to: out(12.8), text: 'Brisbane first. 19, Hingert, is the right-back.' },
  { from: out(13.0), to: out(15.6), text: '23, Jelacic, is the winger.' },
  // Beat 4: the carry (hold at rec 16.2)
  { from: out(15.8), to: H16(3.6), text: 'The coloured patches are the space each player controls.' },
  { from: H16(3.9), to: H16(6.8), text: 'Jelacic carries it toward the touchline.' },
  { from: H16(7.1), to: H16(10.5), text: 'So Hingert has to go even wider round him.' },
  { from: H16(10.8), to: H16(13.9), text: 'And 26 can cover both of them.' },
  { from: H16(14.2), to: H16(18.4), text: 'This arrow is where he should have gone. At goal.' },
  // Beat 5: what if
  { from: out(16.3), to: out(19.2), text: "What if he'd carried it there?" },
  { from: H23(0.1), to: H23(3.6), text: '2 and 26 both have to step up to him.' },
  { from: out(24.6), to: H28(1.0), text: 'And look at the space Hingert can run into.' },
  { from: H28(1.3), to: H28(3.7), text: "That's the overlap working." },
  // Beat 6: what happened (hold at rec 32.0)
  { from: out(28.5), to: out(30.9), text: 'Back to what happened.' },
  { from: H32(0.2), to: H32(3.4), text: 'Hingert gets it out on the touchline.' },
  { from: H32(3.7), to: H32(8.5), text: 'But this box is still theirs. 2 and 26 are both in it.' },
  { from: out(33.8), to: out(36.95), text: 'Nowhere to go. So it goes back.' },
  // Beat 7: Perth
  { from: out(38.4), to: out(40.8), text: 'Now Perth. Same move.' },
  { from: out(41.4), to: out(45.2), text: '17, Carluccio, has it. 19, Risdon, goes round him.' },
  // Beat 8: the carry (hold at rec 47.1)
  { from: H47(0.2), to: H47(3.1), text: 'He carries it straight at goal.' },
  { from: H47(3.4), to: H47(6.9), text: '21 and 26 both have to come to him.' },
  { from: H47(7.2), to: H47(9.6), text: "So nobody's with Risdon." },
  { from: H47(9.9), to: H47(13.2), text: "Look at this box. It's all his." },
  // Beat 9: where he gets it (hold at rec 48.7)
  { from: H48(0.2), to: H48(3.4), text: 'Risdon gets it right by the byline.' },
  { from: H48(3.7), to: H48(6.1), text: "Only the keeper's goal-side." },
  // Beat 10: goal
  { from: out(50.8), to: out(52.4), text: 'Goal.' },
  // Beat 11: the lesson (hold at rec 54.2)
  { from: H54(0.4), to: H54(3.9), text: 'Brisbane carried it wide. One defender covered both.' },
  { from: H54(4.2), to: H54(8.3), text: 'Perth carried it at goal. Two defenders went to the ball.' },
  { from: H54(8.6), to: H54(13.0), text: 'The full-back makes the run. The winger decides where it goes.' },
]

// ---------------- The palm ----------------

// Where the palm rests, in recording pixels: a fixed point, a path swept across the stop, or a player tracked by rec.
type Target = Pt | { path: Pt[] } | { rec: [number, Pt][] }
// `angle` is the direction from fingertips to wrist (45 = the hand trails down-right of the target).
type Stop = { from: number; to: number; at: Target; angle?: number }

const PALM: Stop[] = [
  // Beat 1
  { from: H1(3.0), to: H1(5.0), at: { x: 860, y: 440 } }, // Perth's run (clear of the carry arrow)
  { from: H1(5.3), to: H1(10.1), at: mid(POS.perthCarry[0], POS.perthCarry[1]) }, // Perth's carry
  { from: H1(10.4), to: H1(13.3), at: mid(POS.brisCarry[0], POS.brisCarry[1]) }, // Brisbane's carry
  // Beat 3
  { from: out(10.0), to: out(12.6), at: { rec: POS.hingertRun } },
  { from: out(13.1), to: out(15.6), at: POS.pause.jelacic },
  // Beat 4
  { from: out(16.0), to: H16(3.6), at: { path: [{ x: 1030, y: 520 }, { x: 1150, y: 600 }, { x: 1210, y: 700 }] }, angle: 30 },
  { from: H16(3.9), to: H16(6.8), at: mid(POS.brisCarry[0], POS.brisCarry[1]), angle: 0 },
  { from: H16(7.1), to: H16(10.5), at: POS.pause.hingert, angle: 120 },
  { from: H16(10.8), to: H16(13.9), at: POS.pause.white26, angle: 20 },
  { from: H16(14.2), to: out(16.9), at: POS.drawnArrow[1], angle: -45 }, // off before the drag starts at ~17
  // Beat 5
  { from: H23(0.1), to: H23(1.7), at: POS.whatIf.white2, angle: -20 },
  { from: H23(1.9), to: H23(3.6), at: POS.whatIf.white26, angle: 60 },
  { from: out(27.3), to: H28(1.0), at: { x: 1170, y: 905 } }, // Hingert's patch, once the drag is done
  // Beat 6
  { from: H32(0.2), to: H32(3.4), at: POS.recv.hingert, angle: 160 },
  { from: H32(3.7), to: H32(8.5), at: { x: POS.brisBox.right, y: (POS.brisBox.top + POS.brisBox.bottom) / 2 }, angle: 0 },
  // Beat 7
  { from: out(41.6), to: out(43.4), at: { rec: POS.carluccioRun }, angle: 90 },
  { from: out(43.6), to: out(45.2), at: { rec: POS.risdonRun }, angle: 20 },
  // Beat 8
  { from: H47(0.2), to: H47(3.1), at: mid(POS.perthCarry[0], POS.perthCarry[1]), angle: 70 },
  { from: H47(3.4), to: H47(5.1), at: POS.release.orange21, angle: 135 },
  { from: H47(5.3), to: H47(6.9), at: POS.release.orange26, angle: 60 },
  { from: H47(7.2), to: H47(9.6), at: POS.release.risdon, angle: 0 },
  { from: H47(9.9), to: H47(13.2), at: { x: 395, y: POS.perthBox.top }, angle: -110 },
  // Beat 9
  { from: H48(0.2), to: H48(3.4), at: POS.risdonRecv, angle: 180 },
  { from: H48(3.7), to: H48(6.1), at: POS.keeper, angle: 180 },
]

// Off the pitch, by the coach: where the palm comes from and goes back to.
const PARK: Pt = { x: 330, y: 820 }
const GLIDE = 0.45 // seconds to glide between targets
const CHAIN = 1.0 // stops closer than this glide straight across rather than going back to the coach
const GAP = 14 // px between the fingertips and the target

function trackRec(keys: [number, Pt][], rec: number): Pt {
  if (rec <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [r1, p1] = keys[i]
    const [r0, p0] = keys[i - 1]
    if (rec <= r1) return lerpPt(p0, p1, (rec - r0) / (r1 - r0))
  }
  return keys[keys.length - 1][1]
}

function pathAt(pts: Pt[], u: number): Pt {
  const n = pts.length - 1
  const x = Math.min(n - 1e-6, Math.max(0, u * n))
  const i = Math.floor(x)
  return lerpPt(pts[i], pts[i + 1], smooth(x - i))
}

/** The stop's target in output pixels at output second `t`. */
function targetAt(s: Stop, t: number): Pt {
  const a = s.at
  if ('rec' in a) return S(trackRec(a.rec, recAt(t)))
  if ('path' in a) return S(pathAt(a.path, (t - s.from) / (s.to - s.from)))
  return S(a)
}

/** Where the fingertips go, just off the target on the wrist side. */
function tipFor(target: Pt, angle: number): Pt {
  const r = (angle * Math.PI) / 180
  return { x: target.x + Math.cos(r) * GAP, y: target.y + Math.sin(r) * GAP }
}

function palmAt(t: number): { at: Pt; angle: number; v: number; press: number } | null {
  for (let i = 0; i < PALM.length; i++) {
    const s = PALM[i]
    const prev = PALM[i - 1]
    const next = PALM[i + 1]
    const angle = s.angle ?? 45
    const chainedIn = prev !== undefined && s.from - prev.to < CHAIN
    const chainedOut = next !== undefined && next.from - s.to < CHAIN
    const inStart = chainedIn ? prev.to : s.from - GLIDE
    const arriveEnd = chainedIn ? Math.max(s.from, prev.to + GLIDE) : s.from
    const outEnd = chainedOut ? s.to : s.to + GLIDE
    if (t < inStart || t > outEnd) continue

    if (t < arriveEnd) {
      const e = smooth((t - inStart) / (arriveEnd - inStart))
      const dest = tipFor(targetAt(s, arriveEnd), angle)
      if (chainedIn) {
        const pa = prev.angle ?? 45
        const src = tipFor(targetAt(prev, prev.to), pa)
        return { at: lerpPt(src, dest, e), angle: lerp(pa, angle, e), v: 1, press: 0 }
      }
      return { at: lerpPt(PARK, dest, e), angle, v: e, press: 0 }
    }
    if (t <= s.to) {
      // a small press as it lands
      const since = t - arriveEnd
      const press = since < 0.3 ? Math.sin((since / 0.3) * Math.PI) : 0
      return { at: tipFor(targetAt(s, t), angle), angle, v: 1, press }
    }
    const e = smooth((t - s.to) / GLIDE)
    return { at: lerpPt(tipFor(targetAt(s, s.to), angle), PARK, e), angle, v: 1 - e, press: 0 }
  }
  return null
}

// ---------------- Pieces ----------------

/** 0..1 visibility for a window in seconds, with quick fades. */
const vis = (f: number, from: number, to: number, fadeIn = 0.2, fadeOut = 0.16) =>
  hump(f, sec(from), sec(from + fadeIn), sec(to - fadeOut), sec(to))

const Recording = () => {
  let t = 0
  const parts: ReactNode[] = []
  SEGMENTS.forEach((s, i) => {
    const start = sec(t)
    if (s.kind === 'play') {
      const dur = sec(t + s.to - s.from) - start
      parts.push(
        <Sequence key={i} from={start} durationInFrames={dur}>
          <OffthreadVideo src={staticFile('overlap-recording.mp4')} trimBefore={sec(s.from)} muted style={{ width: '100%', height: '100%' }} />
        </Sequence>,
      )
      t += s.to - s.from
    } else {
      const dur = sec(t + s.dur) - start
      // Holds show a still extracted from the recording at that moment (public/overlap-holds/hold-<rec>.png).
      parts.push(
        <Sequence key={i} from={start} durationInFrames={dur}>
          <Img src={staticFile(`overlap-holds/hold-${s.at.toFixed(1)}.png`)} style={{ width: '100%', height: '100%' }} />
        </Sequence>,
      )
      t += s.dur
    }
  })
  return <div style={{ position: 'absolute', left: X0, top: 0, width: REC_W * K, height: 1080 }}>{parts}</div>
}

/** Which line is up, and how far it's in or out. */
function activeLine(f: number) {
  for (const l of LINES) {
    const v = vis(f, l.from, l.to)
    if (v > 0) return { line: l, v }
  }
  return null
}

const Bubble = ({ f }: { f: number }) => {
  const a = activeLine(f)
  if (!a) return null
  const { line, v } = a
  const big = line.text.length < 8
  const style: CSSProperties = {
    position: 'absolute',
    left: 336,
    bottom: 48,
    maxWidth: 640,
    padding: '20px 28px',
    background: '#ffffff',
    color: INK,
    borderRadius: 24,
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: big ? 52 : 34,
    lineHeight: 1.22,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    opacity: v,
    transform: `scale(${0.88 + 0.12 * v})`,
    transformOrigin: '0% 100%',
  }
  return (
    <div style={style}>
      {line.text}
      {/* the tail, toward the coach's mouth */}
      <svg width={40} height={36} viewBox="0 0 40 36" style={{ position: 'absolute', left: -30, bottom: 40 }}>
        <path d="M40 4 L0 18 L40 32 Z" fill="#ffffff" />
      </svg>
    </div>
  )
}

const TitleCard = () => {
  const f = useCurrentFrame()
  const card = 1 - progress(f, sec(TITLE.out[0]), sec(TITLE.out[1]))
  if (card <= 0) return null
  const logo = progress(f, sec(TITLE.logo[0]), sec(TITLE.logo[1]))
  const line = progress(f, sec(TITLE.line[0]), sec(TITLE.line[1]))
  return (
    <AbsoluteFill style={{ opacity: card }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #233d4d 0%, #0e171e 75%)' }} />
      <LogoLockup
        size={190}
        style={{ position: 'absolute', top: 340, left: 0, width: 1920, opacity: logo, transform: `scale(${0.9 + 0.1 * logo})` }}
      />
      <div
        style={{
          position: 'absolute',
          top: 590,
          width: 1920,
          textAlign: 'center',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 88,
          color: '#fff',
          opacity: line,
          transform: `translateY(${(1 - line) * 20}px)`,
        }}
      >
        Turn a match into a <span style={{ color: '#fe7f2d' }}>tactical story.</span>
      </div>
    </AbsoluteFill>
  )
}

// ---------------- The composition ----------------

const END = H54(14.0)

export const OverlapCoachCut = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Sequence from={CUT_START}>
      <Cut />
    </Sequence>
    <TitleCard />
  </AbsoluteFill>
)

/** The breakdown itself; its frame 0 is the recording's first frame. */
const Cut = () => {
  const f = useCurrentFrame()
  const t = f / FPS
  const active = activeLine(f)
  const talk = active ? active.v * (0.35 + 0.65 * Math.abs(Math.sin(f / 2.6))) : 0
  const palm = palmAt(t)
  const black = progress(f, sec(END - 0.8), sec(END))

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Recording />
      {/* the recording's opening seconds have a macOS screenshot thumbnail in the corner: cover it */}
      {f < fr(2.0) && (
        <Img src={staticFile('overlap-holds/thumb-patch.png')} style={{ position: 'absolute', left: X0 + 1660 * K, top: 840 * K, width: 184 * K, height: 220 * K }} />
      )}
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute' }}>
        <Coach talk={talk} bob={2 * Math.sin(f / 20)} />
      </svg>
      <Bubble f={f} />
      {palm && palm.v > 0 && (
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute' }}>
          <Palm at={palm.at} angle={palm.angle} opacity={palm.v} scale={1 - 0.08 * palm.press} />
        </svg>
      )}
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: black }} />
    </AbsoluteFill>
  )
}
