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

// Refits overlays after the clip's length changes: one that spanned the whole clip follows the
// new length, any other is clamped so it can't dangle past a shrunk clip.
function fitOverlaysToLength(overlaySegments: OverlaySegment[], previousLength: number, length: number): OverlaySegment[] {
  return overlaySegments.map((overlay) => {
    if (overlay.clipStart === 0 && overlay.clipEnd === previousLength) {
      return { ...overlay, clipEnd: length }
    }
    const nextStart = Math.min(overlay.clipStart, length)
    return { ...overlay, clipStart: nextStart, clipEnd: Math.max(Math.min(overlay.clipEnd, length), nextStart) }
  })
}

// Whether the clip still holds the placeholder a match opens with.
export function hasPlaceholder(clip: Clip): boolean {
  return clip.matchSegments.some((segment) => segment.isDefault)
}

// Whether the clip is still the placeholder exactly as it opened: one untrimmed segment and no overlays.
export function isPlaceholderUntouched(clip: Clip): boolean {
  const [segment, ...rest] = clip.matchSegments
  return (
    rest.length === 0 &&
    segment?.isDefault === true &&
    segment.clipStart === 0 &&
    segment.sourceFrameStart === DEFAULT_SEGMENT_SOURCE_RANGE.start &&
    segment.sourceFrameEnd === DEFAULT_SEGMENT_SOURCE_RANGE.end &&
    clip.overlaySegments.length === 0
  )
}

// Places a new segment immediately after the last one on the clip's own timeline,
// growing the clip (and any overlay that currently spans the whole clip) to fit.
// Existing segments and their annotations are left untouched.
//
// The segment a match opens with is only a placeholder. Unless keepPlaceholder is set, the
// first segment added starts the clip afresh: the placeholder and its overlays are dropped.
// With keepPlaceholder, the placeholder becomes an ordinary segment and the new one goes after it.
export function appendSegment(
  clip: Clip,
  matchId: number | null,
  sourceFrameStart: number,
  sourceFrameEnd: number,
  keepPlaceholder = false
): Clip {
  const span = Math.max(sourceFrameEnd - sourceFrameStart, 1)

  if (hasPlaceholder(clip) && !keepPlaceholder) {
    return {
      length: span,
      matchSegments: [{ matchId, clipStart: 0, clipEnd: span, sourceFrameStart, sourceFrameEnd }],
      overlaySegments: [],
    }
  }

  const keptSegments = clip.matchSegments.map((segment) => {
    const kept = { ...segment }
    delete kept.isDefault
    return kept
  })
  const clipStart = keptSegments.reduce((end, segment) => Math.max(end, segment.clipEnd), 0)
  const clipEnd = clipStart + span
  const length = Math.max(clip.length, clipEnd)

  return {
    ...clip,
    length,
    matchSegments: [
      ...keptSegments,
      { matchId, clipStart, clipEnd, sourceFrameStart, sourceFrameEnd },
    ],
    overlaySegments: fitOverlaysToLength(clip.overlaySegments, clip.length, length),
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

// Cuts the match segment at `index` in two at clipFrame, the source footage cut at the same point, so
// playback is unchanged but each half can be trimmed, moved or removed on its own. The halves share
// the cut frame, as appended segments share their boundary. Unchanged unless clipFrame is inside it.
export function splitSegmentAt(clip: Clip, index: number, clipFrame: number): Clip {
  const segment = clip.matchSegments[index]
  if (!segment || clipFrame <= segment.clipStart || clipFrame >= segment.clipEnd) return clip

  const sourceCut = segment.sourceFrameStart + (clipFrame - segment.clipStart)
  const first = { ...segment, clipEnd: clipFrame, sourceFrameEnd: sourceCut }
  const second = { ...segment, clipStart: clipFrame, sourceFrameStart: sourceCut }

  return {
    ...clip,
    matchSegments: [...clip.matchSegments.slice(0, index), first, second, ...clip.matchSegments.slice(index + 1)],
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

// Turns off the overlay of the given type showing at clipFrame, from that frame on: it now ends on the
// frame before, or is removed when clipFrame is its first frame. The clip is unchanged when none is showing.
export function endOverlayAt(clip: Clip, type: OverlaySegmentKind, clipFrame: number): Clip {
  const showing = findOverlayAt(clip, type, clipFrame)
  if (!showing) return clip

  return {
    ...clip,
    overlaySegments:
      clipFrame <= showing.clipStart
        ? clip.overlaySegments.filter((overlay) => overlay !== showing)
        : clip.overlaySegments.map((overlay) => (overlay === showing ? { ...overlay, clipEnd: clipFrame - 1 } : overlay)),
  }
}

// Removes the single overlay segment at the given index.
export function removeOverlayAt(clip: Clip, index: number): Clip {
  return {
    ...clip,
    overlaySegments: clip.overlaySegments.filter((_, i) => i !== index),
  }
}

// Cuts the overlay segment at `index` in two at clipFrame: the first half ends on the frame before and the
// second starts on it, as overlay ranges include both ends. Unchanged unless clipFrame is inside it.
export function splitOverlayAt(clip: Clip, index: number, clipFrame: number): Clip {
  const overlay = clip.overlaySegments[index]
  if (!overlay || clipFrame <= overlay.clipStart || clipFrame >= overlay.clipEnd) return clip

  return {
    ...clip,
    overlaySegments: [
      ...clip.overlaySegments.slice(0, index),
      { ...overlay, clipEnd: clipFrame - 1 },
      { ...overlay, clipStart: clipFrame },
      ...clip.overlaySegments.slice(index + 1),
    ],
  }
}

// A type can have several segments, so a segment is addressed by its index. A moved segment may pass the
// others of its type, which reorders them (see arrangeAfterMove); overlay ranges include both ends, so two
// are always kept a frame apart.
export function setOverlayRange(
  clip: Clip,
  index: number,
  clipStart: number,
  clipEnd: number,
  kind: 'move' | 'resize' = 'resize'
): Clip {
  const overlay = clip.overlaySegments[index]
  if (overlay && kind === 'move') {
    const sameType = clip.overlaySegments.flatMap((current, i) => (current.type === overlay.type ? [i] : []))
    const arranged = arrangeAfterMove(
      sameType.map((i) => ({ start: clip.overlaySegments[i].clipStart, end: clip.overlaySegments[i].clipEnd })),
      sameType.indexOf(index),
      clipStart,
      1
    )
    const placed = new Map(arranged.map(({ from, start, end }) => [sameType[from], { start, end }]))
    return {
      ...clip,
      overlaySegments: clip.overlaySegments.map((current, i) => {
        const range = placed.get(i)
        return range ? { ...current, clipStart: range.start, clipEnd: range.end } : current
      }),
    }
  }

  return {
    ...clip,
    overlaySegments: clip.overlaySegments.map((overlay, i) =>
      i === index ? { ...overlay, clipStart, clipEnd } : overlay
    ),
  }
}

type Span = { start: number; end: number }

// Where every bar of a row lands once the bar at `index` is dropped at `start`, in time order, each with the
// index it came from. `gap` is the least room kept between two bars (0 when they may share a frame).
//
// Dropped with its leading edge (its start moving left, its end moving right) past another bar's centre,
// the bar trades places with the ones it passed: they
// are laid out again in the new order over the stretch they took up together, keeping the gaps between
// them where they were, so nothing else on the row moves. Dropped without passing one, it goes where it
// was dropped, held to the room between its neighbours.
export function arrangeAfterMove(spans: Span[], index: number, start: number, gap: number): (Span & { from: number })[] {
  const ordered = spans.map((span, from) => ({ ...span, from })).sort((a, b) => a.start - b.start)
  const position = ordered.findIndex((span) => span.from === index)
  if (position === -1) return ordered

  const moved = ordered[position]
  const length = moved.end - moved.start
  // The edge leading the move decides what it passed: a long bar could never get its centre past a short
  // one at the very start or end of the row, but its leading edge always can.
  const center = (span: Span) => (span.start + span.end) / 2
  const leadingEdge = start < moved.start ? start : start + length
  const target =
    start === moved.start
      ? position
      : ordered.filter((span) => span.from !== index && center(span) < leadingEdge).length

  if (target === position) {
    const previous = ordered[position - 1]
    const next = ordered[position + 1]
    const lo = previous ? previous.end + gap : Number.NEGATIVE_INFINITY
    const hi = next ? next.start - gap - length : Number.POSITIVE_INFINITY
    const placed = Math.min(Math.max(start, lo), hi)
    return ordered.map((span) => (span.from === index ? { ...span, start: placed, end: placed + length } : span))
  }

  const first = Math.min(position, target)
  const last = Math.max(position, target)
  const gaps = ordered.slice(first, last).map((span, i) => ordered[first + i + 1].start - span.end)
  const reordered = [...ordered]
  reordered.splice(position, 1)
  reordered.splice(target, 0, moved)

  let cursor = ordered[first].start
  for (let i = first; i <= last; i++) {
    const span = reordered[i]
    const spanLength = span.end - span.start
    reordered[i] = { ...span, start: cursor, end: cursor + spanLength }
    cursor += spanLength + (gaps[i - first] ?? 0)
  }
  return reordered
}

// Moves/resizes the match segment at `index` to the given clip-relative range. A 'move' relocates
// the same fixed source footage to a different spot on the clip timeline, so the source frame
// range is left untouched; dropped past another segment, it changes places with it. A 'resize' trims/extends which source footage is included, so the
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

  // A moved segment keeps its footage and may pass the others, which reorders them (see arrangeAfterMove);
  // the array stays in time order, as the timeline reads neighbours by index.
  const matchSegments =
    kind === 'move'
      ? arrangeAfterMove(
          clip.matchSegments.map((current) => ({ start: current.clipStart, end: current.clipEnd })),
          index,
          clipStart,
          0
        ).map(({ from, start, end }) => ({ ...clip.matchSegments[from], clipStart: start, clipEnd: end }))
      : clip.matchSegments.map((current, i) =>
          i === index
            ? {
                ...current,
                clipStart,
                clipEnd,
                sourceFrameStart: current.sourceFrameStart + clipStart - segment.clipStart,
                sourceFrameEnd: current.sourceFrameEnd + clipEnd - segment.clipEnd,
              }
            : current
        )

  const previousLength = clip.length
  const length = Math.max(1, ...matchSegments.map((current) => current.clipEnd))

  const overlaySegments = fitOverlaysToLength(clip.overlaySegments, previousLength, length)

  return { ...clip, length, matchSegments, overlaySegments }
}
