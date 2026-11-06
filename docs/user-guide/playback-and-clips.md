# Playback and clips

How to play, scrub and assemble the passages of a match into a clip.

## What a clip is

A clip is what you are building. It has its own timeline starting at 0, and
is made of one or more **segments**, each a passage of the match. A clip with
two segments can run from the 12th minute straight into the 70th.

The readout above the pitch shows both positions, for example
`Match Frame: 4310 | Clip Frame: 120`. The clip frame is where you are in
your clip; the match frame is where that is in the match. There are 10 frames
per second.

A new match opens with a short default clip: the first ten seconds of data.

The idea is explained in full in
[clips, segments and frames](../concepts/clips-segments-frames.md).

## Playing

| Control | Effect |
|---|---|
| Play / pause button | Starts or stops playback |
| Slow-down button | Halves the speed, down to 0.125x |
| Speed-up button | Doubles the speed, up to 8x |
| The number above the play button | Current speed |

The clip loops: at the end it starts again from the beginning.

If playback pauses briefly by itself, the next stretch of frames is being
fetched. It carries on when they arrive.

## Scrubbing

Drag the scrubber to move through the clip. Scrubbing pauses playback.

The scrubber's track is coloured to show the state of the data:

| Colour band | Meaning |
|---|---|
| Played | Behind the current position |
| Loaded | Already fetched, ahead of the current position |
| Not loaded | Will be fetched when you get there |
| Missing | The tracking data has no frames here |

Missing bands are normal. The data omits frames where nothing could be
tracked. The pitch is empty for those frames.

## Adding passages to the clip

From the **Search** panel in the sidebar:

- **Click a phase of play.** It is added to the end of the clip.
- **Enter a start and end match frame** under "Create Custom Moment" and
  press **Submit**.

Either way the new segment goes immediately after the last one, the clip
grows to fit, the playhead jumps to the start of what was added, and playback
pauses. Existing segments and annotations are left alone.

See [finding key moments](./finding-key-moments.md).

## Arranging segments

The **Match Segments** row under the pitch shows each segment as a bar.

| Action | Result |
|---|---|
| Drag a bar | Moves the same passage to a different place in the clip |
| Drag the left or right edge | Trims or extends the passage, changing which match frames are included |
| Right-click → **Delete** | Removes the segment |

Limits while dragging:

- a segment cannot overlap the one before or after it;
- it cannot be extended past the start or end of the match;
- pulling an edge beyond the visible end makes the timeline grow to follow.

The clip's length always ends at the last segment. If an overlay covered the
whole clip (the pitch background does by default), it stretches or shrinks
with it.

## Moving a player by hand

While **paused**, with no annotation tool selected, you can drag a player to
a different position. The cursor changes to a hand over a player.

This is for illustration, to show where a player could have been. It is
temporary: as soon as the frame changes, by playing or scrubbing, every
player returns to their tracked position. Moved positions are not saved.

Lines linking players follow a moved player, and their distance labels
update.

## Things to know

- **Annotations belong to the clip, not the match.** They are timed in clip
  frames. If you move or trim a segment, annotations stay where they were on
  the clip's timeline and may now sit over different play.
- **With more than one segment**, the loaded and missing bands on the
  scrubber, and the event timelines, reflect the first segment only.
- **A gap between segments** shows the first segment's footage instead of an
  empty pitch.
- **Nothing is saved automatically.** Use **Save Project**.
