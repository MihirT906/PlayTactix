# Getting around

A tour of the screens and what each area is for. The other pages in this
guide go into each feature.

> These user-guide pages were written from the code, not from clicking
> through the app. Labels and behaviour should be right; layout descriptions
> are worth checking against the running app.

## The three screens

| Screen | How you get there | What it is for |
|---|---|---|
| Landing page | Open the app | What Tapp'd is and how it works |
| Match picker | **Choose Game** in the header | Pick a match to work on |
| Workspace | Pick a match, or load a project | Where everything else happens |

The app lives at `/app`. Reloading the page returns to the landing page and
discards anything not saved to a project file.

## The header

Always visible.

| Control | What it does |
|---|---|
| **Choose Game** | Opens the match picker |
| **Save Project** | Downloads the current work as a file. Enabled once a match has finished loading. |
| **Load Project** | Opens a saved project file |

Messages such as "Project saved." appear next to these buttons for a few
seconds. See [projects and settings](./projects-and-settings.md).

## The match picker

A list of cards, one per match, under the heading "Australian A-League", each
showing the two teams in their kit colours and the score.

Click a card to load the match. A spinner covers the list while the server
fetches the match's data. The first time anyone loads a given match this
takes a few seconds; after that it is immediate. When it finishes, the
workspace opens.

If loading fails, a message appears above the list: "Failed to load match
…. Please try again." A match that is listed but has not been prepared on
the server will fail this way.

## The workspace

```
┌──────────────────────────────────────────────────────────────────┐
│  Tapp'd                    Choose Game   Save Project  Load Project│
├──────────────────────────────────────────────────────────────────┤
│  Match header: competition, date, venue, teams, score, scorers   │
├──────────┬───────────────────────────────────────────────────────┤
│ Sidebar  │  Playback controls and scrubber                        │
│          ├───────────────────────────────────────────────────────┤
│ Settings │                                                        │
│ Search   │                     Pitch                              │
│ Timeline │                                                        │
│ Overlays │            ▲ Event Timelines (collapsible)             │
│          ├───────────────────────────────────────────────────────┤
│ Player   │  Match Segments                                        │
│  Focus   │  Overlays                                              │
│ Link     │  Annotations                                           │
│  Players │                                                        │
│ Draw …   │                                                        │
│ Erase    │                                                        │
└──────────┴───────────────────────────────────────────────────────┘
```

### Match header

Competition and round, date, venue, both teams with the score, and the
scorers for each side.

### Sidebar

A rail of buttons in four groups. The first four open a panel beside the
rail; clicking the same button again closes it.

| Group | Button | Opens or does | Covered in |
|---|---|---|---|
| Navigation | **Settings** | Colours and visibility | [Projects and settings](./projects-and-settings.md) |
| Match | **Search** | Key Moments Finder | [Finding key moments](./finding-key-moments.md) |
| Match | **Timeline** | Custom event timelines | [Finding key moments](./finding-key-moments.md) |
| Layers | **Overlays** | Pitch, pitch control, pass probability, events | [Overlays](./overlays.md) |
| Annotations | **Player Focus**, **Link Players**, **Draw Rectangle**, **Draw Line**, **Erase** | Drawing tools, used directly on the pitch | [Annotations](./annotations.md) |

### Playback controls

Play and pause, halve and double the speed, a readout of the current match
frame and clip frame, and a scrubber. See
[playback and clips](./playback-and-clips.md).

### The pitch

Players as coloured dots, the ball as a smaller white dot. Hover a player to
see their name and position. Players involved in what is happening in the
current frame get a coloured outline:

| Outline | Meaning |
|---|---|
| Possession colour | The player on the ball |
| Passing option colour | Team-mates who are a passing option |
| Engagement colour | Opponents engaging the ball carrier |
| Dash-dot lines | Off-ball runs |

Those colours can be changed, and each type hidden, in Settings.

### Event Timelines

A collapsible strip docked at the bottom of the pitch. It shows any custom
timelines you have added. See
[finding key moments](./finding-key-moments.md).

### The three timelines under the pitch

All three share one scale, the clip's frames, and a marker for the current
frame.

| Section | Shows | You can |
|---|---|---|
| **Match Segments** | The passages of the match that make up the clip | Drag to move, drag an edge to trim or extend, right-click to delete |
| **Overlays** | One bar per active overlay, covering the frames it is shown for | Drag to change the range, right-click to remove |
| **Annotations** | One bar per annotation, grouped into Player Lines and Draw Shapes | Drag to change when it appears and disappears, right-click to delete |

## A typical session

1. **Choose Game**, pick a match.
2. Open **Search**, filter to what you are after, click a phase of play. It
   is added to the clip and the playhead jumps to it.
3. Play it through. Pause where something is worth pointing at.
4. Add an overlay from **Overlays**, or draw on the pitch with the annotation
   tools.
5. Adjust when each overlay and annotation appears by dragging its bar on the
   timelines.
6. Add more passages from **Search** to build a longer clip.
7. **Save Project**.
