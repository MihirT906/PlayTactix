import type { Clip, OverlaySegmentKind, ResolvedClipFrame } from '../types/ClipInterfaces'

export const DEFAULT_SEGMENT_SOURCE_RANGE = { start: 10, end: 110 }
export const DEFAULT_CLIP_LENGTH = DEFAULT_SEGMENT_SOURCE_RANGE.end - DEFAULT_SEGMENT_SOURCE_RANGE.start

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
    overlaySegments: [{ type: 'pitch', clipStart: 0, clipEnd: DEFAULT_CLIP_LENGTH }],
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

// Places a new segment immediately after the last one on the clip's own timeline,
// growing the clip (and any overlay that currently spans the whole clip, e.g. the
// pitch) to fit. Existing segments and their annotations are left untouched.
export function appendSegment(
  clip: Clip,
  matchId: number | null,
  sourceFrameStart: number,
  sourceFrameEnd: number
): Clip {
  const span = Math.max(sourceFrameEnd - sourceFrameStart, 1)
  const clipStart = clip.matchSegments.reduce((end, segment) => Math.max(end, segment.clipEnd), 0)
  const clipEnd = clipStart + span
  const length = Math.max(clip.length, clipEnd)

  return {
    ...clip,
    length,
    matchSegments: [
      ...clip.matchSegments,
      { matchId, clipStart, clipEnd, sourceFrameStart, sourceFrameEnd },
    ],
    overlaySegments: clip.overlaySegments.map((overlay) =>
      overlay.clipStart === 0 && overlay.clipEnd === clip.length ? { ...overlay, clipEnd: length } : overlay
    ),
  }
}

// Drops the match segment at the given index. resolveClipFrame returns null once
// there are no segments left, and the Match Segments row renders an empty state.
export function removeSegment(clip: Clip, index: number): Clip {
  return {
    ...clip,
    matchSegments: clip.matchSegments.filter((_, i) => i !== index),
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

  const clipLen = segment.clipEnd - segment.clipStart
  const offset = Math.min(Math.max(clipFrame - segment.clipStart, 0), clipLen)

  return {
    matchId: segment.matchId,
    sourceFrame: segment.sourceFrameStart + offset,
  }
}

// Adds (or replaces) the overlay of the given type on the clip, spanning the full
// clip whenever it's (re)activated, same as a freshly placed segment would start at clipStart 0.
// Only one overlay per type is supported at a time.
export function addOverlay(clip: Clip, type: OverlaySegmentKind): Clip {
  return {
    ...clip,
    overlaySegments: [
      ...clip.overlaySegments.filter((overlay) => overlay.type !== type),
      { type, clipStart: 0, clipEnd: clip.length },
    ],
  }
}

export function removeOverlay(clip: Clip, type: OverlaySegmentKind): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.filter((overlay) => overlay.type !== type),
  }
}

export function setOverlayRange(clip: Clip, type: OverlaySegmentKind, clipStart: number, clipEnd: number): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.map((overlay) =>
      overlay.type === type ? { ...overlay, clipStart, clipEnd } : overlay
    ),
  }
}

// Moves/resizes the match segment at `index` to the given clip-relative range. A 'move' relocates
// the same fixed source footage to a different spot on the clip timeline, so the source frame
// range is left untouched. A 'resize' trims/extends which source footage is included, so the
// corresponding source edge shifts by the same delta as the clip edge that moved.
export function setSegmentRange(
  clip: Clip,
  index: number,
  clipStart: number,
  clipEnd: number,
  kind: 'move' | 'resize'
): Clip {
  const segment = clip.matchSegments[index]
  if (!segment) return clip

  const startDelta = kind === 'move' ? 0 : clipStart - segment.clipStart
  const endDelta = kind === 'move' ? 0 : clipEnd - segment.clipEnd

  return {
    ...clip,
    matchSegments: clip.matchSegments.map((current, i) =>
      i === index
        ? {
            ...current,
            clipStart,
            clipEnd,
            sourceFrameStart: current.sourceFrameStart + startDelta,
            sourceFrameEnd: current.sourceFrameEnd + endDelta,
          }
        : current
    ),
  }
}
