# API reference

The backend exposes four data endpoints and three health-check endpoints. This
page is the lookup for their parameters, responses and status codes. For what
happens inside each one, see [backend flow](../architecture/backend-flow.md).

## Conventions

- **Base URL**: `http://localhost:8000` in development. The frontend reads it
  from `VITE_API_URL`.
- **Method**: every endpoint is `GET`. Only `/data/match/{match_id}` has a
  side effect (it may download files to the server's disk), and calling it
  again is harmless.
- **Authentication**: none.
- **CORS**: only origins listed in `ALLOWED_ORIGINS` may call the API from a
  browser. The default is `http://localhost:5173`.
- **Errors**: returned as `{"detail": "..."}` with the status codes listed
  per endpoint, apart from one exception noted under `/data/frames`.
- **Missing values**: `NaN` is never sent. Missing numbers are `null`.
- **Match ids** are SkillCorner's integer match ids, for example `1886347`.
- **Frame numbers** are SkillCorner's frame ids, at 10 per second. They do
  not start at 0 and they have gaps.

## Call order

A match must be loaded before anything can be read from it:

```
GET /data/match/{match_id}          once per match, wait for 200
GET /data/match_meta                 any order after that
GET /data/match_key_moments
GET /data/frames                     repeatedly, one chunk at a time
```

Calling a read endpoint first returns `409`.

## Summary

| Endpoint | Purpose | Typical size |
|---|---|---|
| `GET /data/match/{match_id}` | Make sure a match's files are on the server | under 100 bytes |
| `GET /data/match_meta` | Teams, players, score, pitch | about 30 KB |
| `GET /data/match_key_moments` | Phases of play, shots, goals, all events | about 6 MB |
| `GET /data/frames` | Tracking frames for a range, with events and pitch control | about 1.3 MB per 300 frames before pitch control |
| `GET /`, `GET /hello`, `GET /data/hello` | Health checks | under 50 bytes |

Sizes were measured on match `1886347`.

---

## `GET /data/match/{match_id}`

Ensures the three prebuilt files for a match are in the server's disk cache,
downloading them from the `match-data` release if they are not.

**Path parameters**

| Name | Type | Description |
|---|---|---|
| `match_id` | integer | SkillCorner match id |

**Responses**

| Status | When | Body |
|---|---|---|
| `200` | The match is cached, whether it was already or was just downloaded | `{"message": "Data for match 1886347 has been ingested and cached."}` |
| `404` | No prebuilt data has been published for this id | `{"detail": "No prebuilt data published for match 1886347"}` |
| `422` | `match_id` is not an integer | FastAPI validation error |
| `500` | The download failed or timed out | `{"detail": "<exception text>"}` |

**Notes**

- A cached match returns immediately. A first load transfers about 9 MB to
  the server before responding.
- Concurrent calls for the same match are safe: one downloads, the others
  wait and then return `200`.
- The word "ingested" in the message is historical. The server no longer
  ingests anything; it copies finished files.

---

## `GET /data/match_meta`

Returns SkillCorner's match metadata file, unchanged.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `match_id` | integer | yes | A match that has been loaded |

**Responses**

| Status | When | Body |
|---|---|---|
| `200` | Success | The metadata object |
| `409` | The match is not loaded | `{"detail": "Match 1886347 is not loaded. Call GET /data/match/1886347 first."}` |
| `422` | `match_id` missing or not an integer | FastAPI validation error |
| `500` | The file could not be read | `{"detail": "..."}` |

**Body** (top-level keys; nested objects abbreviated)

```json
{
  "id": 1886347,
  "date_time": "2024-11-30T04:00:00Z",
  "home_team_score": 2,
  "away_team_score": 0,
  "home_team": { "id": 4177, "name": "Auckland FC", "short_name": "Auckland FC", "acronym": "AUC" },
  "away_team": { "...": "same shape" },
  "home_team_kit": { "jersey_color": "..." },
  "away_team_kit": { "...": "same shape" },
  "home_team_side": "...",
  "pitch_length": 104,
  "pitch_width": 68,
  "players": [
    {
      "id": 0,
      "team_id": 4177,
      "short_name": "...",
      "number": 0,
      "player_role": { "acronym": "..." },
      "start_time": "...",
      "end_time": "...",
      "playing_time": {}
    }
  ],
  "stadium": {},
  "competition_edition": {},
  "competition_round": {},
  "match_periods": [],
  "referees": [],
  "home_team_coach": {},
  "away_team_coach": {},
  "home_team_playing_time": {},
  "away_team_playing_time": {},
  "ball": {},
  "status": "..."
}
```

Unlike the other read endpoints, this one is not wrapped in a
`requested_match_id` / `data` envelope.

---

## `GET /data/match_key_moments`

Returns the passages of play worth jumping to, derived from the event data,
plus the full event list.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `match_id` | integer | yes | A match that has been loaded |

**Responses**

| Status | When | Body |
|---|---|---|
| `200` | Success | See below |
| `409` | The match is not loaded | `{"detail": "Match ... is not loaded. ..."}` |
| `422` | `match_id` missing or not an integer | FastAPI validation error |
| `500` | The event file could not be read or processed | `{"detail": "..."}` |

**Body**

```json
{
  "requested_match_id": 1886347,
  "data": {
    "pops":   [ { "phase_index": 0, "frame_start": 0, "frame_end": 143, "time_end": "00:11.3",
                  "team_id": 1805,
                  "team_in_possession_phase_type": "build_up",
                  "team_out_of_possession_phase_type": "medium_block",
                  "lead_to_shot": false, "lead_to_goal": false } ],
    "shots":  [ { "Sequence_ID": 12, "frame_start": 4100, "frame_end": 4380,
                  "lead_to_shot": true, "player_name": "...", "time_end": "07:18.0" } ],
    "goals":  [ { "Sequence_ID": 57, "frame_start": 20110, "frame_end": 20420,
                  "lead_to_goal": true, "player_name": "...", "time_end": "34:02.0" } ],
    "events": [ { "event_id": "8_0", "...": "all event columns, see below" } ]
  }
}
```

The values above illustrate the shape; they are not real rows.

| List | One entry is | Frame range |
|---|---|---|
| `pops` | One phase of play | Earliest to latest frame of its events, widened by 30 frames each side |
| `shots` | One phase that led to a shot | Player-possession events only, widened by 30 frames each side |
| `goals` | One phase that led to a goal | Player-possession events only, widened by 30 frames each side |
| `events` | One SkillCorner dynamic event | Its own `frame_start` and `frame_end`, not widened |

`Sequence_ID` in `shots` and `goals` is the same value as `phase_index` in
`pops`. `frame_start` is never below 0.

---

## `GET /data/frames`

Returns every frame number in a range, with player and ball positions, the
events active in each frame, and a pitch control grid.

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `match_id` | integer | yes | | A match that has been loaded |
| `start` | integer | no | `1` | First frame number, inclusive |
| `end` | integer | no | `50` | Last frame number, inclusive |

The range is not validated or capped. If `end` is less than `start`, `frames`
comes back empty.

**Responses**

| Status | When | Body |
|---|---|---|
| `200` | Success | See below |
| `200` | The files could not be read or processed | `{"error": "Failed to read data files."}` |
| `409` | The match is not loaded | `{"detail": "Match ... is not loaded. ..."}` |
| `422` | A parameter is missing or not an integer | FastAPI validation error |
| `500` | Failure outside the service, for example while serialising | `{"detail": "..."}` |

A failure inside the service comes back as `200` with an `error` key. Clients
should check for `frames` in the body, not only the status.

**Body**

```json
{
  "requested_match_id": 1886347,
  "requested_start": 10,
  "requested_end": 310,
  "missing_frames": [57, 58, 59],
  "frames": {
    "10": {
      "period": 1,
      "players": {
        "x":         [-12.4, 3.1],
        "y":         [5.0, -20.7],
        "player_id": [12345, 67890],
        "team":      ["home", "away"],
        "vx":        [1.2, null],
        "vy":        [-0.4, null],
        "speed":     [1.26, null]
      },
      "ball": { "ball_x": 0.3, "ball_y": -1.1, "ball_z": 0.2 },
      "events": [ { "event_id": "8_0", "...": "all event columns" } ],
      "overlays": {
        "pitch_control": { "type": "pitch_control", "data": [[0.52, 0.55], [0.49, 0.51]] }
      }
    },
    "57": {
      "period": null,
      "players": { "x": [], "y": [], "player_id": [], "team": [], "vx": [], "vy": [], "speed": [] },
      "ball": { "ball_x": null, "ball_y": null, "ball_z": null },
      "events": [],
      "overlays": {}
    }
  }
}
```

The values above illustrate the shape; they are not real rows.

**Fields**

| Field | Description |
|---|---|
| `frames` | An object keyed by frame number (as a string, since JSON keys are strings). Contains every number from `start` to `end`, including missing ones. |
| `missing_frames` | Frame numbers in the range that have no tracking row. Their entry in `frames` is the empty placeholder shown for `"57"`. |
| `period` | Match period, `1` or `2`. |
| `players` | Parallel arrays: index `i` in every array is the same player. Only players with a position in this frame are included, so the length varies from frame to frame. |
| `players.team` | `"home"` or `"away"`. |
| `players.x`, `players.y` | Position in metres, with the origin at the centre of the pitch. |
| `players.vx`, `players.vy`, `players.speed` | Metres per second, derived at build time from the change in position since the previous frame. `null` where that could not be computed. |
| `ball` | Ball position; any coordinate may be `null`. |
| `events` | Every event whose `frame_start` to `frame_end` range covers this frame. The same event object appears in each frame it spans. |
| `overlays.pitch_control.data` | A two-dimensional grid of numbers covering the pitch. Absent if the computation failed for this frame. |

## Event object

Events appear in `/data/match_key_moments` (`events`) and inside each frame
from `/data/frames`. Both carry the same 44 columns, taken from SkillCorner's
dynamic events file.

| Group | Fields |
|---|---|
| Identity | `event_id`, `index`, `phase_index` |
| Timing | `frame_start`, `frame_end`, `time_end` |
| Team and phase | `team_id`, `attacking_side`, `team_in_possession_phase_type`, `team_out_of_possession_phase_type` |
| Type | `event_type` (`player_possession`, `passing_option`, `on_ball_engagement`, `off_ball_run`), `event_subtype`, `start_type`, `end_type` |
| Player | `player_id`, `player_name`, `player_position`, `player_in_possession_id` |
| Location | `x_start`, `y_start`, `x_end`, `y_end`, `channel_start`, `channel_end`, `third_start`, `third_end` |
| Outcome | `lead_to_shot`, `lead_to_goal` |
| Physical | `distance_covered`, `speed_avg`, `separation_gain` |
| Passing | `pass_angle`, `pass_distance`, `n_opponents_overtaken`, `xpass_completion`, `player_targeted_xpass_completion` |
| Threat and risk | `xthreat`, `player_targeted_xthreat`, `xloss_player_possession_start`, `xloss_player_possession_end`, `xloss_player_possession_max`, `xshot_player_possession_start`, `xshot_player_possession_end`, `xshot_player_possession_max` |

Event coordinates are normalised at build time to a single attacking
direction, left to right: events recorded with any other `attacking_side`
have their x and y coordinates negated. `attacking_side` keeps the original
value.

Many fields are `null` for event types they do not apply to.

---

## Health checks

| Endpoint | Body |
|---|---|
| `GET /` | `{"message": "hello world"}` |
| `GET /hello` | `{"message": "hello world"}` |
| `GET /data/hello` | `{"message": "Hello, World!"}` |

None of them touch the disk or the cache, so they confirm only that the
process is up.

## Interactive docs

FastAPI serves generated documentation at `/docs` (Swagger UI) and `/redoc`
while the server is running. No response models are declared in the code, so
those pages show parameters but not response shapes; this page is the
reference for the shapes.
