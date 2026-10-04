# Projects and settings

How to change the look of the pitch, and how to save your work and open it
again.

## Settings

Open **Settings** in the sidebar. Each row has an eye icon to show or hide
that item, and most have a colour swatch that opens a colour picker.

### Teams

| Row | Controls |
|---|---|
| **Home Team** | Colour of the home players, and whether they are shown |
| **Away Team** | The same for the away side |

Team colours start as the kit colours from the match data. Changing one
changes it everywhere that team's colour is used: player dots, the match
header, pitch control shading, event markers.

Hiding a team is useful for looking at one side's shape in isolation.

### Events

| Row | What it colours on the pitch |
|---|---|
| **Player Possession** | The outline on the player with the ball |
| **Passing Options** | The outline on team-mates who are passing options, and the pass probability lines |
| **On Ball Engagement** | The outline on opponents engaging the ball carrier |
| **Off Ball Runs** | The dash-dot run lines |

Hide a type to remove that highlighting.

### Overlays

| Row | Controls |
|---|---|
| **Pass Option Probability** | Switches the pass probability overlay on or off |
| **Pitch Control** | Switches the pitch control overlay on or off |

These are the same switches as in the Overlays panel. See
[overlays](./overlays.md).

## Saving a project

Press **Save Project** in the header. A file downloads, named like:

```
playtactix-1886347-2026-10-03.playtactix.json
```

The button is disabled until a match has finished loading.

### What is saved

| Saved | Not saved |
|---|---|
| Which match | The match data itself |
| The clip: every segment and its position | Where the playhead was |
| Overlays and the range each covers | Playback speed |
| Selected events and the Auto Disappear setting | Player Focus rings |
| Link lines and drawn shapes, with their timing | Players moved by hand |
| Custom event timelines | Filters chosen in the Search and Events panels |
| Team colours, event colours, what is hidden | Which sidebar panel was open |

The file is small, a few KB, because it names the match and does not contain
it. It is plain JSON.

**There is no autosave.** Closing or reloading the tab loses anything not
saved.

## Opening a project

Press **Load Project** and choose a file.

- If the project is for the match already open, it is applied immediately.
- If it is for a different match, that match is loaded first. The button
  reads "Loading…" until it is ready.

Opening a project **replaces** the current clip, annotations, timelines and
settings. Save first if you want to keep what you have.

After loading, the playhead is at the start of the clip and playback is
paused.

### Messages

| Message | Meaning |
|---|---|
| Project saved. | The file was downloaded |
| Project loaded. | Everything was restored |
| Project loaded. N selected event(s) no longer exist and were skipped. | The match data has changed since the project was saved, and some chosen events could not be found. Everything else was restored. |
| This file is not valid JSON. | The file is damaged or is not a project |
| This file is not a PlayTactix project. | It is JSON, but not one of these files |
| This project file has no version. | It is missing its version marker |
| This project was saved by a newer version of PlayTactix. | Update the app to open it |
| This project file is incomplete or corrupted. | Some required part is missing |
| Could not load the match this project refers to. | The server could not load that match |

## Sharing

To share your work, send the project file. The other person needs access to a
running copy of Tapp'd, and opens the file with **Load Project**. The match
data is fetched for them; it is the same public data for everyone.

There is no export to video or image.

## Things to know

- **A project depends on the match data being available** on the server it is
  opened against.
- **Projects carry a format version**, so files saved now can still be opened
  after the format changes.
- **Saving happens entirely in your browser.** Nothing is uploaded.
