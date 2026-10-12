import type { Segment } from '../../types/ClipInterfaces'
import type { Event } from '../../types/FrameDataInterfaces'
import { buildTrailLinks } from './sequenceTrailsOverlay'

// A carry and an off ball run are a player moving (drawn as arrows); a pass is the ball moving
// (drawn as a comet).
export type EventMapKind = 'carry' | 'pass' | 'off_ball_run'

export const EVENT_MAP_KINDS: EventMapKind[] = ['carry', 'pass', 'off_ball_run']

// One thing the Event Map can draw, with the attributes its filters work on.
export type EventMapItem = {
  id: string
  kind: EventMapKind
  teamId: number
  playerId: number
  playerName: string
  receiverName?: string // The team-mate a pass is played to
  playerPosition: string
  frameStart: number
  frameEnd: number
  clock: string // Match clock when it starts, "MM:SS"; empty when the data has none
  x: number
  y: number
  x2: number
  y2: number
  subtype: string
  startType: string
  endType: string
  channels: string[]
  thirds: string[]
  leadToShot: boolean
  leadToGoal: boolean
}

const FRAME_RATE = 10 // Tracking frames per second

const isPoint = (x: unknown, y: unknown) => Number.isFinite(x) && Number.isFinite(y)

// The match clock at `frame`. An event only carries the clock at its end ("MM:SS.s"), so it is
// walked back from there by the frames in between.
function clockAt(event: Event, frame: number): string {
  const [minutes, seconds] = String(event.time_end ?? '').split(':').map(Number)
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return ''
  const total = Math.max(0, minutes * 60 + seconds - (event.frame_end - frame) / FRAME_RATE)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(Math.floor(total % 60)).padStart(2, '0')}`
}

// Every carry, pass and off ball run of the match, sorted by start frame. Carries and passes are the
// same links the sequence trails draw; a pass is not an event of its own, so it takes its team,
// player and outcome from the possession it was played from.
export function buildEventMapItems(events: Event[] | null | undefined): EventMapItem[] {
  const links = buildTrailLinks(events).map((link): EventMapItem => {
    const { event, nextEvent } = link
    return {
      // A possession's own carry keeps the event's id; the link onwards from it is prefixed to stay distinct.
      id: nextEvent ? `${link.kind}:${event.event_id}` : event.event_id,
      kind: link.kind,
      teamId: link.teamId,
      playerId: link.playerId,
      playerName: event.player_name,
      receiverName: link.kind === 'pass' ? nextEvent?.player_name : undefined,
      playerPosition: event.player_position,
      frameStart: link.frameStart,
      frameEnd: link.frameEnd,
      clock: clockAt(event, link.frameStart),
      x: link.x,
      y: link.y,
      x2: link.x2,
      y2: link.y2,
      subtype: '',
      startType: nextEvent ? '' : event.start_type ?? '',
      endType: nextEvent ? '' : event.end_type ?? '',
      channels: nextEvent ? [event.channel_end, nextEvent.channel_start] : [event.channel_start, event.channel_end],
      thirds: nextEvent ? [event.third_end, nextEvent.third_start] : [event.third_start, event.third_end],
      leadToShot: event.lead_to_shot,
      leadToGoal: event.lead_to_goal,
    }
  })

  const runs = (events ?? [])
    .filter(
      (event) =>
        event.event_type === 'off_ball_run' && isPoint(event.x_start, event.y_start) && isPoint(event.x_end, event.y_end),
    )
    .map(
      (event): EventMapItem => ({
        id: event.event_id,
        kind: 'off_ball_run',
        teamId: event.team_id,
        playerId: event.player_id,
        playerName: event.player_name,
        playerPosition: event.player_position,
        frameStart: event.frame_start,
        frameEnd: event.frame_end,
        clock: clockAt(event, event.frame_start),
        x: event.x_start,
        y: event.y_start,
        x2: event.x_end,
        y2: event.y_end,
        subtype: event.event_subtype ?? '',
        startType: event.start_type ?? '',
        endType: event.end_type ?? '',
        channels: [event.channel_start, event.channel_end],
        thirds: [event.third_start, event.third_end],
        leadToShot: event.lead_to_shot,
        leadToGoal: event.lead_to_goal,
      }),
    )

  return [...links, ...runs].sort((a, b) => a.frameStart - b.frameStart)
}

// What the Event Map shows: everything matching these filters is drawn. An empty list means "any",
// except for `kinds`, where nothing chosen draws nothing.
export type EventMapFilters = {
  scope: 'clip' | 'match' // Only what happens in the clip's match segments, or the whole match
  kinds: EventMapKind[]
  teamId: number | null
  playerIds: number[]
  ledTo: 'any' | 'shot' | 'goal'
  channels: string[]
  thirds: string[]
  positions: string[]
  runTypes: string[] // Narrows off ball runs only
  carryStartTypes: string[] // Narrows carries only
  carryEndTypes: string[] // Narrows carries only
}

export const DEFAULT_EVENT_MAP_FILTERS: EventMapFilters = {
  scope: 'clip',
  kinds: [],
  teamId: null,
  playerIds: [],
  ledTo: 'any',
  channels: [],
  thirds: [],
  positions: [],
  runTypes: [],
  carryStartTypes: [],
  carryEndTypes: [],
}

// The most marks drawn at once; past this the pitch is unreadable and slow to draw.
export const MAX_EVENT_MAP_MARKS = 300

const anyOf = <T,>(wanted: T[], value: T) => wanted.length === 0 || wanted.includes(value)

function matchesFilters(item: EventMapItem, filters: EventMapFilters, matchSegments: Segment[]) {
  if (
    filters.scope === 'clip' &&
    !matchSegments.some((s) => item.frameStart <= s.sourceFrameEnd && item.frameEnd >= s.sourceFrameStart)
  ) {
    return false
  }
  if (filters.teamId !== null && item.teamId !== filters.teamId) return false
  if (filters.ledTo === 'shot' && !item.leadToShot) return false
  if (filters.ledTo === 'goal' && !item.leadToGoal) return false
  if (item.kind === 'off_ball_run' && !anyOf(filters.runTypes, item.subtype)) return false
  if (item.kind === 'carry' && !(anyOf(filters.carryStartTypes, item.startType) && anyOf(filters.carryEndTypes, item.endType))) {
    return false
  }
  return (
    anyOf(filters.playerIds, item.playerId) &&
    anyOf(filters.positions, item.playerPosition) &&
    (filters.channels.length === 0 || item.channels.some((channel) => filters.channels.includes(channel))) &&
    (filters.thirds.length === 0 || item.thirds.some((third) => filters.thirds.includes(third)))
  )
}

// Applies the filters to the match's items.
//   candidates: matching everything but the chosen kinds, so each kind can show how many it would add
//   matched:    the candidates of the chosen kinds
//   drawn:      the matched items the user has not unticked, up to MAX_EVENT_MAP_MARKS
//   overflow:   how many were left undrawn by that limit
export function resolveEventMap(
  items: EventMapItem[],
  filters: EventMapFilters,
  excludedIds: string[],
  matchSegments: Segment[],
) {
  const candidates = items.filter((item) => matchesFilters(item, filters, matchSegments))
  const matched = candidates.filter((item) => filters.kinds.includes(item.kind))
  const excluded = new Set(excludedIds)
  const picked = matched.filter((item) => !excluded.has(item.id))
  const drawn = picked.slice(0, MAX_EVENT_MAP_MARKS)
  return { candidates, matched, drawn, overflow: picked.length - drawn.length }
}
