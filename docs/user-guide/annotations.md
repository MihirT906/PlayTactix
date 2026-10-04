# Annotations

Annotations are what you draw on the pitch to explain a moment. The tools are
at the bottom of the sidebar, under **Annotations**.

## The tools

| Tool | What it makes | Follows players? | Saved in a project? |
|---|---|---|---|
| **Player Focus** | A ring around a player | Yes | No |
| **Link Players** | A line between two players, labelled with the distance in metres | Yes | Yes |
| **Draw Rectangle** | A shaded rectangle | No, it stays where drawn | Yes |
| **Draw Line** | A straight line | No, it stays where drawn | Yes |
| **Erase** | Removes the selected shape | | |

Click a tool to switch it on; click it again to switch it off. Only one is
active at a time.

**Annotate while paused.** The active tool switches off whenever the frame
changes, so pause first, then pick the tool.

## Player Focus

Switch on **Player Focus** and click a player. A ring appears around them and
stays with them as they move. Click more players to ring several. Click a
ringed player again to remove the ring.

Focus rings are a quick highlight. They are not placed on the timeline, have
no start or end, and are not saved in a project.

## Link Players

Switch on **Link Players**, click one player, then another. A line joins
them and shows the distance between them in metres. As the players move, the
line and the distance update.

- Clicking the same player twice cancels the first click.
- Linking a pair that is already linked does nothing.
- If either player is not in a frame (missing data, or off the pitch), the
  line is hidden for that frame.

Good for showing the gap between two centre-backs, the distance a presser has
to cover, or how compact a line is.

## Draw Rectangle and Draw Line

Switch on the tool and drag on the pitch. Rectangles are shaded so players
remain visible through them.

These are fixed to the pitch. They mark a zone or a direction; they do not
follow anyone.

## When an annotation is visible

Every annotation except a focus ring has a **start frame** and an optional
**end frame**, both in clip frames.

- It starts at the frame you were on when you drew it.
- It has no end at first: it stays visible to the end of the clip.
- It is not visible before its start, so scrubbing back past it hides it.

The **Annotations** section under the pitch shows each one as a bar, in two
rows: **Player Lines** and **Draw Shapes**. A bar that runs to the right-hand
edge has no end yet.

| Action on a bar | Result |
|---|---|
| Drag the bar | Changes when it appears and disappears, keeping its length |
| Drag an edge | Changes the start or the end |
| Right-click → **Delete** | Removes the annotation completely |

Dragging a bar that had no end gives it one.

This is how you make a drawing appear at exactly the right beat: draw it
anywhere in the right stretch, then adjust the bar.

## Erasing

Two ways to remove something, with different effects:

| Method | Effect |
|---|---|
| Click a shape on the pitch to select it, then press **Erase** | The annotation **ends at the current frame**. It is still visible earlier in the clip. If you erase it on the same frame you drew it, it is removed completely. |
| Right-click its bar on the timeline → **Delete** | Removed completely, at every frame |

So **Erase** means "stop showing this from here", and **Delete** means "this
never existed".

## Things to know

- **Annotations are timed against the clip, not the match.** If you later
  move or trim a segment, an annotation stays at the same place on the clip's
  timeline and may end up over a different passage of play.
- **Drawn shapes do not move with play.** For something that should track a
  player, use Link Players or Player Focus.
- **Colours** of drawn shapes and link lines are fixed.
- **Players you have dragged by hand** (see
  [playback and clips](./playback-and-clips.md)) take their link lines with
  them, until the frame changes.
- Everything except focus rings is included when you
  [save a project](./projects-and-settings.md).
