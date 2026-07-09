import type { BackgroundKind, Clip, ResolvedClipFrame } from '../types/ClipInterfaces'

export const DEFAULT_CLIP_LENGTH = 1000
export const DEFAULT_SEGMENT_SOURCE_RANGE = { start: 10, end: 1000 }

export function createDefaultClip(matchId: number | null): Clip {
  return {
    length: DEFAULT_CLIP_LENGTH,
    matchSegments: [
      {
        matchId,
        clipStart: 0,
        clipEnd: DEFAULT_SEGMENT_SOURCE_RANGE.end - DEFAULT_SEGMENT_SOURCE_RANGE.start,
        sourceFrameStart: DEFAULT_SEGMENT_SOURCE_RANGE.start,
        sourceFrameEnd: DEFAULT_SEGMENT_SOURCE_RANGE.end,
      },
    ],
    overlaySegments: [],
  }
}

// Replaces the clip's match segment with one spanning the given source frame range.
// Overlay segments are left untouched since they're independent of which match footage is placed.
export function addSegment(clip: Clip, matchId: number | null, sourceFrameStart: number, sourceFrameEnd: number): Clip {
  return {
    ...clip,
    length: DEFAULT_CLIP_LENGTH,
    matchSegments: [
      {
        matchId,
        clipStart: 0,
        clipEnd: sourceFrameEnd - sourceFrameStart,
        sourceFrameStart,
        sourceFrameEnd,
      },
    ],
  }
}

// Given a frame on the Clip's own timeline, finds which Segment covers it and
// translates the frame into a source match frame. Falls back to the first
// segment when the clip frame falls outside every segment's range (matches
// legacy behaviour where the scrubber could extend past the placed segment).
export function resolveClipFrame(clip: Clip, clipFrame: number): ResolvedClipFrame | null {
  const segment =
    clip.matchSegments.find((s) => clipFrame >= s.clipStart && clipFrame <= s.clipEnd) ?? clip.matchSegments[0]

  if (!segment) return null

  return {
    matchId: segment.matchId,
    sourceFrame: segment.sourceFrameStart + (clipFrame - segment.clipStart),
  }
}

// Adds (or replaces) the overlay of the given type on the clip, spanning the full
// clip whenever it's (re)activated, same as a freshly placed segment would start at clipStart 0.
// Only one overlay per type is supported at a time.
export function addOverlay(clip: Clip, type: BackgroundKind): Clip {
  return {
    ...clip,
    overlaySegments: [
      ...clip.overlaySegments.filter((overlay) => overlay.type !== type),
      { type, clipStart: 0, clipEnd: clip.length },
    ],
  }
}

export function removeOverlay(clip: Clip, type: BackgroundKind): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.filter((overlay) => overlay.type !== type),
  }
}

export function setOverlayRange(clip: Clip, type: BackgroundKind, clipStart: number, clipEnd: number): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.map((overlay) =>
      overlay.type === type ? { ...overlay, clipStart, clipEnd } : overlay
    ),
  }
}
