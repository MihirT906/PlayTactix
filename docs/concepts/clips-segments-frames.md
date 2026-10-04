# Clips, segments and frames

Tapp'd has two timelines: the match's and the clip's. Almost every piece of
frontend logic is on one side or the other of the translation between them.
This page defines the terms and explains that translation.

Code: `frontend/src/types/ClipInterfaces.tsx`,
`frontend/src/services/clipManager.ts`.

## Two kinds of frame number

| | Match frame | Clip frame |
|---|---|---|
| What it counts | Position in the source match | Position in the thing the user is building |
| Starts at | Whatever SkillCorner's first frame is (10 in the match measured) | Always 0 |
| Continuous? | No, there are gaps | Yes |
| Who understands it | The backend, the frame buffer | The slider, the timelines, annotations, overlays |

The controls show both: `Match Frame: 4310 | Clip Frame: 120`.

## The structures

```ts
type Clip = {
  length: number
  matchSegments: Segment[]
  overlaySegments: OverlaySegment[]
}

type Segment = {
  matchId: number | null
  clipStart: number         // where it sits on the clip's timeline
  clipEnd: number
  sourceFrameStart: number  // which match frames it shows
  sourceFrameEnd: number
}

type OverlaySegment = {
  type: 'pitch' | 'pitch_control' | 'pass_option_prob'
  clipStart: number
  clipEnd: number
}
```

A **clip** is the user's own timeline, from 0 to `length`.

A **segment** is a passage of the match placed on that timeline. It has two
ranges: where it sits in the clip, and which match frames it shows.

An **overlay segment** says "show this overlay between these clip frames". It
has no match frames of its own.

```
Clip timeline     0         100        200        300
                  |----------|----------|----------|
Match segments    [ Segment 1 ][   Segment 2    ]
                    frames       frames
                    4100-4200    31050-31250

Overlays          [ pitch ................................ ]
                              [ pitch control ]

Annotations            [ line A–B ]      [ rectangle ......
```

Everything below the top line is positioned in clip frames. Only the segments
know about match frames.

## Translating a clip frame to a match frame

`resolveClipFrame(clip, clipFrame)`:

1. Find the segment whose clip range contains the frame.
2. Take the offset from the start of that segment.
3. Add it to the segment's first match frame.

```
clip frame 150, in Segment 2 (clip 100-300, match 31050-31250)
offset = 150 - 100 = 50
match frame = 31050 + 50 = 31100
```

This runs every time the playhead moves. `advanceFrame` adds one to the clip
frame (wrapping to 0 at the end, so clips loop), resolves it, and stores both
numbers in the session. The match frame is what gets fetched and drawn.

## Building a clip

A new match starts with a default clip: one segment showing match frames 10
to 110 (ten seconds), and the pitch overlay across all of it.

| Operation | What it does |
|---|---|
| `appendSegment` | Places a new segment immediately after the last one and grows the clip to fit. This is what clicking a key moment does. |
| `addSegment` | Replaces all segments with one. |
| `removeSegment` | Drops a segment. The others stay where they are. |
| `setSegmentRange` | Moves or resizes a segment (below). |
| `addOverlay` / `removeOverlay` | Switches an overlay on across the whole clip, or off. One overlay per type. |
| `setOverlayRange` | Changes the clip range an overlay covers. |

Every one of these is a pure function: it takes a clip and returns a new one.
That makes them easy to reason about and lets React detect the change.

## Move versus resize

Dragging a segment on the timeline can mean two things, and they change
different ranges.

| | Move (drag the bar) | Resize (drag an edge) |
|---|---|---|
| Clip range | Changes | Changes |
| Match frames shown | **Unchanged** | **Change by the same amount** |
| In words | The same footage, at a different point in the clip | More or less footage |

Resizing the end of a segment by +20 clip frames also extends its match range
by 20 frames, so one clip frame always equals one match frame within a
segment. There is no speeding up or slowing down inside a segment.

Limits enforced while dragging: a segment cannot overlap its neighbours, and
cannot be extended beyond the first or last frame of the match (taken from
the match periods in the metadata).

## The clip length follows the segments

After a move or resize, the clip's length is set to the end of the furthest
segment. Overlays are then adjusted:

- an overlay that covered the **whole** clip is stretched or shrunk to cover
  the whole new length (so the pitch background keeps covering everything);
- any other overlay keeps its range, clamped so it does not extend past a
  shortened clip.

## Why annotations use clip frames

An annotation records the clip frame it starts at and, optionally, where it
ends. It does not record a match frame.

That is a deliberate choice: an annotation belongs to the story being told,
not to the match. "This line appears two seconds into the clip" stays true
however the footage underneath is arranged. The cost is the other side of the
same coin: move or trim a segment, and an annotation that was drawn over one
passage of play may now sit over a different one.

Player-link lines are the exception in one respect. They store two player
ids, and are drawn between wherever those players are in the current frame,
so they follow the players even though their timing is in clip frames.

## Trade-offs and limits

- **A gap falls back to the first segment.** If the clip frame is not inside
  any segment (after removing or moving one), `resolveClipFrame` uses the
  first segment, clamped to its range. Scrubbing into a gap therefore shows
  footage from the start of the clip instead of nothing.
- **`matchId` on a segment is not used.** The type allows a clip to mix
  matches, but the frame buffer is bound to one match and ignores it. Clips
  are single-match in practice.
- **Several parts of the app only read the first segment**: the scrubber's
  loaded and missing bands, and the event timelines. They are correct for
  single-segment clips only.
- **Annotations can drift** when segments change, as described above.
- **No speed changes within a clip.** One clip frame is always one match
  frame.

Several of these are discussed in the
[frame data caching proposal](../decisions/004-frame-data-caching.md), under "Related open
questions".

## Questions to expect

**Why have a separate clip timeline at all?**
So a clip can be assembled from passages that are far apart in the match and
still play as one continuous thing. With only match frames, "the 12th minute
followed by the 70th" has no single timeline to put annotations and overlays
on.

**How does playback cross from one segment to the next?**
The playhead just keeps counting clip frames. Each one is resolved
independently, so when it passes the end of one segment it lands in the next
and the match frame jumps. Nothing special happens at the boundary, which is
also why there can be a stall there: the new match frames may not be in the
buffer yet.

**Why are the clip functions pure?**
A clip is plain data, and each edit returns a new clip. That makes edits
predictable and testable, works naturally with React's change detection, and
is what makes saving a project trivial: the clip is serialised as it is.

**What would you change?**
Decide whether segments must tile the clip with no gaps. If yes, enforce it
on every edit and the fallback disappears. If gaps are allowed, return "no
footage" for them and show an empty pitch.
