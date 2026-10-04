# Finding key moments

Two tools help you get to the part of a match you want: the Key Moments
Finder, which lists passages of play you can add to your clip, and custom
event timelines, which show what is happening across the clip you already
have.

## Key Moments Finder

Open **Search** in the sidebar.

### Phases of play

SkillCorner's data divides a match into phases of play: stretches in which
one team has the ball in a particular way while the other defends in a
particular way. A match has a few hundred.

The **Phases of Play** group shows a count. Click the arrow to expand the
list. Each entry shows:

- the phase number;
- the match time at which it ends;
- what each team was doing, for example `build_up` against `medium_block`.

**Click an entry to add that phase to your clip.** Three seconds are included
on either side, so you see the lead-in and what followed.

### Filters

Above the list. Each is a multi-select; choose several values in one filter
to match any of them. Filters combine, so a phase must satisfy all of the
ones you have set. The count updates as you go.

| Filter | Options |
|---|---|
| **Team** | Either team; the team in possession during the phase |
| **Lead to Goal** | True or false |
| **Lead to Shot** | True or false |
| **In Possession** | `build_up`, `create`, `finish`, `quick_break`, `transition`, `chaotic`, `direct`, `set_play`, `disruption` |
| **Out of Possession** | `low_block`, `medium_block`, `high_block`, `defending_transition`, `defending_quick_break`, `defending_set_play`, `defending_direct`, `chaotic`, `disruption` |

Some useful combinations:

| To find | Set |
|---|---|
| Every move that ended in a goal | Lead to Goal: true |
| One team's chances | Team, and Lead to Shot: true |
| Counter-attacks | In Possession: `quick_break` or `transition` |
| Build-up against a high press | In Possession: `build_up`; Out of Possession: `high_block` |

There are no separate "Goals" and "Shots" lists. Use the Lead to Goal and
Lead to Shot filters.

### A custom range

Under **Create Custom Moment**, enter a start and end match frame and press
**Submit**. The range is added to the clip as a segment. Frame numbers are
shown in the readout above the pitch; there are 10 per second.

## Custom event timelines

Event timelines show, across the length of your clip, where certain events
happen or how a measure changes. They help you find the exact frame to pause
on.

### Adding one

Open **Timeline** in the sidebar and press **Add**. Choose one of two kinds.

**Filter**: shows every event matching a condition, as bars.

| Column | Values |
|---|---|
| `event_type` | `player_possession`, `passing_option`, `on_ball_engagement` |
| `event_subtype` | Types of run and of pressure, such as `overlap`, `underlap`, `run_ahead_of_the_ball`, `pressing`, `counter_press` |

**Metric**: shows a value over time.

| Metric | Shown as |
|---|---|
| `xpass_completion` | A line: average chance of the available passes being completed |
| `xthreat` | A line: the highest threat on offer |
| `xloss_player_possession` | Bands per possession: risk of losing the ball at its start, end and peak |
| `xshot_player_possession` | Bands per possession: chance of a shot at its start, end and peak |

Press **Save**. The timeline is listed in the panel.

### Reading them

Click **Event Timelines** at the bottom of the pitch to open the strip. Each
timeline you added is a row on the same frame scale as the clip.

- **Filter rows** show a bar for each matching event, labelled with the
  player's name and coloured by team. Events that overlap in time are stacked.
- **Metric rows** show a line or a set of bands. Hover to read the value.

### Limits

- Timelines are drawn from the most recently loaded stretch of frames (about
  30 seconds), not the whole clip. Play or scrub to a part of the clip to see
  its events.
- With more than one segment in the clip, timelines are positioned relative
  to the first segment.
- A timeline cannot be removed from the panel once added, other than by
  loading a project or reloading the page.
- Custom timelines are saved with a project.
