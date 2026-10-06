import type { Clip, OverlaySegment, OverlaySegmentKind, ResolvedClipFrame } from '../types/ClipInterfaces'

// The clip a match opens with: its first two minutes. Tracking data is 10 frames per second.
const FRAMES_PER_SECOND = 10
const DEFAULT_CLIP_SECONDS = 120
const DEFAULT_SEGMENT_SOURCE_START = 10
export const DEFAULT_SEGMENT_SOURCE_RANGE = {
  start: DEFAULT_SEGMENT_SOURCE_START,
  end: DEFAULT_SEGMENT_SOURCE_START + DEFAULT_CLIP_SECONDS * FRAMES_PER_SECOND,
}
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
        isDefault: true,
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

// Refits overlays after the clip's length changes: one that spanned the whole clip (e.g. the
// pitch) follows the new length, any other is clamped so it can't dangle past a shrunk clip.
function fitOverlaysToLength(overlaySegments: OverlaySegment[], previousLength: number, length: number): OverlaySegment[] {
  return overlaySegments.map((overlay) => {
    if (overlay.clipStart === 0 && overlay.clipEnd === previousLength) {
      return { ...overlay, clipEnd: length }
    }
    const nextStart = Math.min(overlay.clipStart, length)
    return { ...overlay, clipStart: nextStart, clipEnd: Math.max(Math.min(overlay.clipEnd, length), nextStart) }
  })
}

// Places a new segment immediately after the last one on the clip's own timeline,
// growing the clip (and any overlay that currently spans the whole clip, e.g. the
// pitch) to fit. Existing segments and their annotations are left untouched.
//
// The segment a match opens with is only a placeholder: the first segment added replaces
// it, and the clip is refitted to the new segment. Every later one is appended.
export function appendSegment(
  clip: Clip,
  matchId: number | null,
  sourceFrameStart: number,
  sourceFrameEnd: number
): Clip {
  const keptSegments = clip.matchSegments.filter((segment) => !segment.isDefault)
  const replacesDefault = keptSegments.length !== clip.matchSegments.length

  const span = Math.max(sourceFrameEnd - sourceFrameStart, 1)
  const clipStart = keptSegments.reduce((end, segment) => Math.max(end, segment.clipEnd), 0)
  const clipEnd = clipStart + span
  const length = replacesDefault ? clipEnd : Math.max(clip.length, clipEnd)

  return {
    ...clip,
    length,
    matchSegments: [
      ...keptSegments,
      { matchId, clipStart, clipEnd, sourceFrameStart, sourceFrameEnd },
    ],
    // Replacing the default can shrink the clip; an overlay left with no length is dropped.
    overlaySegments: fitOverlaysToLength(clip.overlaySegments, clip.length, length).filter(
      (overlay) => !replacesDefault || overlay.clipEnd > overlay.clipStart
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

// The overlay of the given type that is showing at a clip frame, if any.
export function findOverlayAt(clip: Clip, type: OverlaySegmentKind, clipFrame: number): OverlaySegment | undefined {
  return clip.overlaySegments.find(
    (overlay) => overlay.type === type && clipFrame >= overlay.clipStart && clipFrame <= overlay.clipEnd
  )
}

// Adds an overlay of the given type starting at clipFrame and running to the end of the clip,
// or up to the next overlay of the same type so two never overlap. The clip is returned
// unchanged when that type is already showing at clipFrame, or there is no clip left after it.
export function addOverlayFrom(clip: Clip, type: OverlaySegmentKind, clipFrame: number): Clip {
  if (findOverlayAt(clip, type, clipFrame)) return clip

  const clipEnd = clip.overlaySegments
    .filter((overlay) => overlay.type === type && overlay.clipStart > clipFrame)
    .reduce((end, overlay) => Math.min(end, overlay.clipStart), clip.length)
  if (clipEnd <= clipFrame) return clip

  return {
    ...clip,
    overlaySegments: [...clip.overlaySegments, { type, clipStart: clipFrame, clipEnd }],
  }
}

// Replaces every overlay of the given type with a single one spanning the full clip,
// same as a freshly placed segment would start at clipStart 0.
export function addOverlay(clip: Clip, type: OverlaySegmentKind): Clip {
  return {
    ...clip,
    overlaySegments: [
      ...clip.overlaySegments.filter((overlay) => overlay.type !== type),
      { type, clipStart: 0, clipEnd: clip.length },
    ],
  }
}

// Removes every overlay of the given type.
export function removeOverlay(clip: Clip, type: OverlaySegmentKind): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.filter((overlay) => overlay.type !== type),
  }
}

// Removes the single overlay segment at the given index.
export function removeOverlayAt(clip: Clip, index: number): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.filter((_, i) => i !== index),
  }
}

// A type can have several segments, so a segment is addressed by its index.
export function setOverlayRange(clip: Clip, index: number, clipStart: number, clipEnd: number): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.map((overlay, i) =>
      i === index ? { ...overlay, clipStart, clipEnd } : overlay
    ),
  }
}

// Moves/resizes the match segment at `index` to the given clip-relative range. A 'move' relocates
// the same fixed source footage to a different spot on the clip timeline, so the source frame
// range is left untouched. A 'resize' trims/extends which source footage is included, so the
// corresponding source edge shifts by the same delta as the clip edge that moved.
//
// The clip length is kept exactly fitted to the furthest segment end, so resizing the
// length-defining segment grows or shrinks the clip. Overlays that spanned the whole clip
// stretch to the new length; any other overlay is clamped so it can't dangle past a shrunk clip.
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

  const matchSegments = clip.matchSegments.map((current, i) =>
    i === index
      ? {
          ...current,
          clipStart,
          clipEnd,
          sourceFrameStart: current.sourceFrameStart + startDelta,
          sourceFrameEnd: current.sourceFrameEnd + endDelta,
        }
      : current
  )

  const previousLength = clip.length
  const length = Math.max(1, ...matchSegments.map((current) => current.clipEnd))

  const overlaySegments = fitOverlaysToLength(clip.overlaySegments, previousLength, length)

  return { ...clip, length, matchSegments, overlaySegments }
}
