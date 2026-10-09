# Tapp'd

**A telestrator for football tracking data.**

Think of it like the tool a TV analyst uses to draw on match footage — except instead of video, you're working directly on tracking and event data. Tapp'd lets you find the moments that matter, layer on analytical overlays (pitch control, phases of play, possession sequences), annotate them in football language, and save the result as a project file you can share.

Built for coaches, analysts, and anyone who wants to go beyond the numbers and tell a story with data.

> Tapp'd is the app's name; the repository, Docker image, and paths below still use the original project name, PlayTactix.

## Features

- Replay matches from SkillCorner tracking data through an interactive pitch visualizer
- Find moments to analyze manually or using filters — phases of play, transitions, shots, goals
- Add freehand annotations and tactical overlays (pitch control, pass probability) to any frame
- Build a timeline of clips, then save it as a project file that coaches or analysts can load

## Quick Start

You need Node.js 24+, Python 3.13, and internet access (the backend downloads prebuilt match data from this repo's [`match-data` release](https://github.com/MihirT906/PlayTactix/releases/tag/match-data) the first time you open a match — no manual download required).

In one terminal, start the backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

## Usage

1. **Pick a match.** Choose a game from the top bar. The first time a match is opened, the backend downloads its data, so it takes a little longer than later visits.
2. **Pull in a moment.** Open **Search** in the left sidebar and narrow the list of passages of play with the filters: attacking or defending team, attacking phase, defending phase, half, and whether it led to a shot or a goal. Click a passage to add it to your clip as a match segment, or use **Create Custom Moment** to enter a start and end frame yourself.
3. **Discover the clip.** Open **Insights** in the sidebar and add event and metric tracks, then press **Insights** at the bottom of the pitch. The tracks show who was involved, what they did, and how metrics such as xthreat moved across the clip.
4. **Make the clip yours.** Open **Overlays** to add Pitch Control, Pass Probability or Events, then pick a tool under **Annotations** — Player Focus, Link Players, Draw Rectangle, Draw Line — and mark the pitch. With playback paused and no tool on, you can also drag a player to show where they could have been.
5. **Set the timing.** The rows under the pitch lay the clip out in time: match segments, overlays and annotations. Drag the middle of a bar to move it or either end to resize it; right-click a bar to delete it.
6. **Save your work.** **Save Project** in the top bar downloads a `.playtactix.json` file holding your clip, overlays, annotations, insights tracks and colours. **Load Project** reads it back and opens the match it belongs to, on any machine.

The same guide, with more detail on each panel, is built into the app's right-hand column.

## How It Works

```
SkillCorner open data
        │  build_match_data.py (kloppy) — offline, via GitHub Action
        ▼
match-data release        tracking + events (Parquet), metadata (JSON) per match
        │  downloaded once per match, on first request
        ▼
FastAPI backend           on-disk cache in data/, pitch control computed per frame
        │  /data/frames in 300-frame chunks
        ▼
React frontend            in-memory frame buffer, Plotly pitch, clip state
        │
        ▼
.playtactix.json          the saved project file
```

- **Match data is built ahead of time.** Parsing raw tracking data peaks above 1GB of RAM per match, so the server never does it. `backend/scripts/build_match_data.py` parses each match with kloppy and writes three small files — tracking, events and metadata — which the **Build match data** GitHub Action publishes to the `match-data` release.
- **The backend caches each match on first use.** `GET /data/match/{match_id}` streams those three files into `data/`. A lock per match id stops two concurrent requests from downloading the same match twice, without blocking anyone loading a different match. The metadata file is written last, so its presence marks the set as complete; until then the other endpoints answer `409`.
- **Frames are served by range.** `/data/frames` slices the requested frames, attaches the events active on each one, and computes pitch control for each frame with databallpy, returning it as an overlay embedded in the frame.
- **The frontend buffers and draws.** It requests frames in chunks of 300 and keeps up to 5,000 in memory, evicting older ones. Everything on the pitch is a Plotly layer; Pass Probability is drawn in the browser from the expected pass completion values in the event data.
- **A clip lives entirely in the browser.** Segments, overlays, annotations, insights tracks and colours are client-side state, and the project file is that state serialized. The backend stores nothing per user, which is why a project file opens on any machine.

See [Design Notes](#design-notes) for the reasoning behind the caching decisions.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Plotly.js |
| Backend | Python, FastAPI, pandas, databallpy (pitch control) |
| Data build | kloppy (parses SkillCorner tracking data ahead of time) |

## Development

### Configuration

Backend configuration (CORS origins, port, log level, match-data URL) is read from environment variables — see `backend/.env.example` for what's available. Copy it to `backend/.env` and adjust if you need something other than the defaults; `.env` is gitignored, so each environment sets its own.

The frontend reads the backend's URL from `VITE_API_URL` (see `frontend/.env.example`) — defaults to `http://localhost:8000` if unset. Set it to your deployed backend's URL when building for production.

Dependency versions in `backend/requirements.txt` are pinned to a known-working set — a `backend/.python-version` file pins the Python version for pyenv/asdf users.

### Tests

To run the tests, install `requirements-dev.txt` instead of `requirements.txt` (it layers the build dependencies and `pytest` on top):

```bash
pip install -r requirements-dev.txt
```

The route tests are timing checks against a running server: they call `http://localhost:8000` and write their results to `tests/test_results/`. Start the backend first, then run them from the repository root:

```bash
pytest tests/route_tests.py
```

The file has to be named explicitly, since `route_tests.py` doesn't match pytest's default `test_*.py` discovery pattern. Both tests are marked `integration` and `slow` (see `pytest.ini`). `--label`, `--start`, and `--end` set the label stored with the results and the frame range requested.

### Building match data

Re-run the **Build match data** action whenever the ingestion code changes the shape of the stored data. To build matches locally instead (this also primes a local server's cache in `data/`), run from `backend/`:

```bash
pip install -r requirements-build.txt
python scripts/build_match_data.py            # every match
python scripts/build_match_data.py 1886347    # just these ids
```

The source is [SkillCorner's open data](https://github.com/SkillCorner/opendata).

### Running the backend in Docker

```bash
cd backend
docker build -t playtactix-backend .
docker run -p 8000:8000 -v playtactix-data:/data playtactix-backend
```

The `-v playtactix-data:/data` flag gives the container a named volume for its match-data cache, so it survives container restarts (without it, every restart re-downloads any previously cached match). In production, this should be a real persistent disk provided by your host, mounted at `/data`.

## Project Structure

```
PlayTactix/
├── .github/workflows/   # Build match data action
├── backend/
│   ├── routes/          # FastAPI route definitions
│   ├── services/        # Match cache, frame serving, key moments, pitch control
│   ├── scripts/         # build_match_data.py (prebuilds per-match data files)
│   ├── tests/           # Helpers for calling the API from scripts and notebooks
│   ├── notebooks/       # Exploratory notebooks
│   ├── main.py          # App entry point
│   ├── config.py        # Environment-variable configuration
│   ├── Dockerfile
│   └── requirements*.txt
├── frontend/
│   └── src/
│       ├── pages/       # Landing page
│       ├── components/  # UI components (pitch plot, controls, sidebar, timelines)
│       ├── plot/        # Plotly overlays (pitch control, pass probability, events)
│       ├── services/    # Data fetching, annotation store, overlay manager, project save/load
│       ├── context/     # Match session and style config providers
│       ├── styles/      # Design tokens and base styles
│       └── types/       # TypeScript interfaces
├── data/                # Match-data cache, written the first time a match is requested
├── docs/                # Design notes
└── tests/               # Route timing tests (need a running backend)
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/data/match/{match_id}` | Download and cache a match's prebuilt tracking + event data |
| GET | `/data/frames?match_id&start&end` | Fetch tracking frames for a frame range |
| GET | `/data/match_meta?match_id` | Fetch match metadata (teams, players, score) |
| GET | `/data/match_key_moments?match_id` | Fetch phases of play, goals, and shots |

`/data/frames`, `/data/match_meta`, and `/data/match_key_moments` require the match to have been loaded through `/data/match/{match_id}` first. Pitch control is served as an embedded overlay on each frame returned by `/data/frames`, not as a separate endpoint.

FastAPI also serves interactive API docs at `http://localhost:8000/docs` while the backend is running.

## Design Notes

- [Frame data caching](./docs/frame-data-caching.md) — proposed tiered cache architecture for tracking-frame playback, and the multi-segment problems it addresses (proposal, not yet implemented).
- [Multi-user match caching](./docs/multi-user-match-caching.md) — the per-match backend cache that lets concurrent users load different matches independently (implemented; kept as a decision record).

## License

MIT — see [LICENSE](./LICENSE).

## Data

Match data is sourced from [SkillCorner's open data repository](https://github.com/SkillCorner/opendata). All data is subject to SkillCorner's terms of use.
