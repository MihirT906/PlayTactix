import type { Event } from '../../types/FrameDataInterfaces'

// A carry is one player moving with the ball (drawn as an arrow); a pass is the ball travelling
// between two players (drawn as a comet).
export type TrailLinkKind = 'carry' | 'pass'

export type TrailLink = {
  kind: TrailLinkKind
  playerId: number // The carrier, or the passer for a pass
  teamId: number
  frameStart: number
  frameEnd: number
  x: number
  y: number
  x2: number
  y2: number
}

export type SequenceTrail = {
  carries: TrailLink[]
  passes: TrailLink[]
}

type Point = { x: number; y: number }

export const EMPTY_SEQUENCE_TRAIL: SequenceTrail = { carries: [], passes: [] }

const MIN_LINK_LENGTH = 0.5 // metres; anything shorter is a touch on the spot, not a movement worth drawing

const isPoint = (x: unknown, y: unknown) => Number.isFinite(x) && Number.isFinite(y)
const linkLength = (link: TrailLink) => Math.hypot(link.x2 - link.x, link.y2 - link.y)

// Chains the match's possession events into carries and passes, sorted by start frame. A pass joins a
// possession that ended in one to the next possession when that is a team-mate receiving it, whichever
// phase of play each belongs to. Anything else (a turnover, a set piece, a shot) leaves a gap.
export function buildTrailLinks(events: Event[] | null | undefined): TrailLink[] {
  const possessions = (events ?? [])
    .filter((event) => event.event_type === 'player_possession' && isPoint(event.x_start, event.y_start))
    .sort((a, b) => a.frame_start - b.frame_start || a.frame_end - b.frame_end)

  const links: TrailLink[] = []
  possessions.forEach((possession, index) => {
    const teamId = possession.team_id
    // A possession can be missing where it ended; the ball then leaves from where it started.
    const hasEnd = isPoint(possession.x_end, possession.y_end)
    const end = hasEnd ? { x: possession.x_end, y: possession.y_end } : { x: possession.x_start, y: possession.y_start }
    if (hasEnd) {
      links.push({
        kind: 'carry',
        playerId: possession.player_id,
        teamId,
        frameStart: possession.frame_start,
        frameEnd: possession.frame_end,
        x: possession.x_start,
        y: possession.y_start,
        x2: end.x,
        y2: end.y,
      })
    }

    const next = possessions[index + 1]
    if (!next || next.team_id !== teamId) return
    // The same player picking the ball up again (keep_possession) is still them carrying it.
    const samePlayer = next.player_id === possession.player_id
    const isPass = !samePlayer && possession.end_type === 'pass' && next.start_type === 'pass_reception'
    if (!samePlayer && !isPass) return
    links.push({
      kind: samePlayer ? 'carry' : 'pass',
      playerId: possession.player_id,
      teamId,
      frameStart: possession.frame_end,
      frameEnd: Math.max(next.frame_start, possession.frame_end),
      x: end.x,
      y: end.y,
      x2: next.x_start,
      y2: next.y_start,
    })
  })

  return links.filter((link) => linkLength(link) >= MIN_LINK_LENGTH).sort((a, b) => a.frameStart - b.frameStart)
}

// The trail to draw at a match frame for a sequence that began at `sequenceStartFrame`: every link
// played since then, with the one in progress cut short at its head. Nothing is dropped as play moves
// on, so the whole trail stays drawn until the sequence ends.
//
// `resolveHead` gives the live end of the link in progress (the carrier, or the ball in flight), so
// the trail stays attached to what is on screen; without one the head moves along the straight line.
export function getSequenceTrailAt(
  links: TrailLink[],
  frame: number,
  sequenceStartFrame: number,
  resolveHead?: (link: TrailLink) => Point | null,
): SequenceTrail {
  const trail: SequenceTrail = { carries: [], passes: [] }
  for (const link of links) {
    if (link.frameStart > frame) break
    // A link already under way when the sequence starts is kept; one finished before it is not.
    if (link.frameEnd <= sequenceStartFrame) continue

    let drawn = link
    if (frame < link.frameEnd) {
      const progress = (frame - link.frameStart) / (link.frameEnd - link.frameStart)
      const head = resolveHead?.(link) ?? {
        x: link.x + (link.x2 - link.x) * progress,
        y: link.y + (link.y2 - link.y) * progress,
      }
      drawn = { ...link, x2: head.x, y2: head.y }
      if (linkLength(drawn) < MIN_LINK_LENGTH) continue
    }

    if (drawn.kind === 'carry') trail.carries.push(drawn)
    else trail.passes.push(drawn)
  }
  return trail
}
