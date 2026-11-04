import type { Event, FrameData } from '../types/FrameDataInterfaces'

// The events active on a frame (frame_start <= frame <= frame_end), in match order, looked up from every
// event of the match rather than shipped with each frame. Taken from the frame itself, not the playhead,
// so the events always describe the positions on screen. A frame without tracking data gets none.
export function eventsActiveAt(events: Event[] | null, frameData: FrameData | null): Event[] {
  if (!events || !frameData || frameData.players.player_id.length === 0) return []
  const { frame } = frameData
  return events.filter((event) => event.frame_start <= frame && frame <= event.frame_end)
}
