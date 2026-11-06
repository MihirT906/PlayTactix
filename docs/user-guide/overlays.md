# Overlays

Overlays are analytical layers drawn over the pitch. Open **Overlays** in the
sidebar and press **Add** to see the four available.

| Overlay | Shows |
|---|---|
| **Pitch** | The pitch markings behind the players |
| **Pitch Control** | Which team controls each area |
| **Pass Probability** | How likely each available pass is to be completed |
| **Events** | Chosen events drawn as lines from where they start to where they end |

The first three work the same way. Events works differently and has its own
section below.

## Pitch, Pitch Control and Pass Probability

### Switching on and off

In the **Add** menu, click an overlay to switch it on; click it again to
switch it off. An active overlay is highlighted in the menu.

Pitch Control and Pass Probability can also be toggled from **Settings**.

### Choosing when it shows

When switched on, an overlay covers the whole clip. It appears as a bar in
the **Overlays** section under the pitch.

| Action on the bar | Result |
|---|---|
| Drag an edge | The overlay shows only between those frames |
| Drag the bar | Moves that window along the clip |
| Right-click → **Delete** | Switches the overlay off |

This is how you bring pitch control in for the three seconds that matter
instead of leaving it on throughout.

Switching an overlay off and on again resets it to cover the whole clip.

### Pitch

The pitch markings. On by default. Turn it off for a plain background.

### Pitch Control

Shades the pitch by which team would reach each area first, given where the
players are and how they are moving. Areas held by a team take that team's
colour; contested areas are a blend.

Use it to show space: the gap behind a defensive line, an unmarked pocket
between the lines, how a press shrinks the area the team on the ball can play
into.

The colours follow the team colours in Settings. For how it is calculated,
see [pitch control](../concepts/pitch-control.md).

### Pass Probability

Draws a thick line from the player on the ball to each team-mate who is a
passing option.

| Line | Meaning |
|---|---|
| In the passing-option colour | A pass likely to be completed (65% or more) |
| In the opposite colour | A pass unlikely to be completed |
| More solid | Further from the 65% mark in either direction: clearly safe, or clearly risky |
| Fainter | Close to 65%: borderline |

Hover a line to read the exact value.

Lines only appear in frames where a player has the ball and passing options
have been recorded.

## Events

The Events overlay draws specific events you choose, so you can show, for
example, every run in behind in the passage you are looking at.

### Choosing events

In the **Add** menu click **Events**. A panel opens with filters and a list.

| Filter | Narrows by |
|---|---|
| **Event Type** | Possession, passing option, on-ball engagement, off-ball run |
| **Event Subtype** | The kind of run or pressure |
| **Start Type**, **End Type** | How the event began and ended |
| **Channel** | Which channel of the pitch it started or ended in |
| **Third** | Which third it started or ended in |
| **Player Position** | The position of the player involved |
| **Team** | Either team |
| **Lead to Shot**, **Lead to Goal** | Whether the move ended in one |

Filters combine: an event must satisfy every filter you have set.

Expand **Events** to see the matching list, with the count beside it. Tick
events to draw them. **Select All** ticks everything in the filtered list, up
to a total of 100 selected events.

The list covers the whole match, not only your clip.

### How they are drawn

Each selected event is a dotted line from where it started to where it ended,
with a marker at each end in the team's colour. Hover to see its type.

### Auto Disappear

| Auto Disappear | Behaviour |
|---|---|
| Off | Every selected event is drawn the whole time |
| On | Each event is hidden once the playhead passes the frame it ended on |

With it on, events drop away as play moves past them, which keeps the pitch
readable when many are selected.

## Event highlighting on players

Separate from the overlays above, and always on unless you hide it: in each
frame, players involved in an event get a coloured outline, and off-ball runs
are drawn as dash-dot lines. The colours, and whether each type is shown, are
in **Settings**. See [projects and settings](./projects-and-settings.md).

## Things to know

- **One of each.** An overlay is on or off, with one range. You cannot have
  pitch control in two separate windows of the same clip.
- **Overlays are timed against the clip.** If the clip gets longer or
  shorter, an overlay that covered all of it keeps covering all of it; one
  with a narrower range keeps that range.
- **Overlays and selected events are saved** with a project.
