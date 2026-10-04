# Tapp'd

**A telestrator for football tracking data.**

Think of it like the tool a TV analyst uses to draw on match footage — except instead of video, you're working directly on tracking and event data. Tapp'd lets you find the moments that matter, layer on analytical overlays (pitch control, phases of play, possession sequences), annotate them in football language, and export clips you can actually share.

Built for coaches, analysts, and anyone who wants to go beyond the numbers and tell a story with data.

## Features

- Replay matches from SkillCorner tracking data through an interactive pitch visualizer
- Find moments to analyze manually or using filters — phases of play, transitions, shots, goals
- Add freehand annotations and tactical overlays (pitch control, pass probability) to any frame
- Build a timeline of clips and share them with coaches or analysts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Plotly.js |
| Backend | Python, FastAPI, pandas, mplsoccer, kloppy |

## Prerequisites

- Node.js v24.13.0 and npm 11.6.2
- Python 3.13
- Internet access (the backend downloads prebuilt match data from this repo's [`match-data` release](https://github.com/MihirT906/PlayTactix/releases/tag/match-data) at runtime — no manual download required)

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

Dependency versions in `requirements.txt` are pinned to a known-working set — a `backend/.python-version` file pins the Python version for pyenv/asdf users. To also run the test suite, install `requirements-dev.txt` instead (it layers `pytest` on top):

```bash
pip install -r requirements-dev.txt
```

#### Match data

The server never parses raw tracking data itself — doing so peaks above 1GB of RAM per match. Instead, `backend/scripts/build_match_data.py` builds each match's files ahead of time from [SkillCorner's open data](https://github.com/SkillCorner/opendata), the **Build match data** GitHub Action publishes them to the `match-data` release, and the server downloads the finished files (a few MB each) the first time a match is requested.

Re-run the action whenever the ingestion code changes the shape of the stored data. To build matches locally instead (this also primes a local server's cache in `data/`):

```bash
pip install -r requirements-build.txt
python scripts/build_match_data.py            # every match
python scripts/build_match_data.py 1886347    # just these ids
```

Configuration (CORS origins, port, log level, match-data URL) is read from environment variables — see `backend/.env.example` for what's available. Copy it to `backend/.env` and adjust if you need something other than the defaults; `.env` is gitignored, so each environment sets its own.

#### Running the backend in Docker

```bash
cd backend
docker build -t playtactix-backend .
docker run -p 8000:8000 -v playtactix-data:/data playtactix-backend
```

The `-v playtactix-data:/data` flag gives the container a named volume for its match-data cache, so it survives container restarts (without it, every restart re-downloads any previously cached match). In production, this should be a real persistent disk provided by your host, mounted at `/data`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`. Make sure the backend is running first.

The backend's URL is read from `VITE_API_URL` (see `frontend/.env.example`) — defaults to `http://localhost:8000` if unset. Set it to your deployed backend's URL when building for production.

## Project Structure

```
PlayTactix/
├── backend/
│   ├── routes/          # FastAPI route definitions
│   ├── services/        # Data ingestion, frame serving, key moments, pitch control
│   ├── main.py          # App entry point
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/  # UI components (pitch plot, controls, sidebar, timeline)
│       ├── services/    # Data fetching, annotation store, overlay manager
│       ├── context/     # Match session and style config providers
│       └── types/       # TypeScript interfaces
├── data/                # Cached parquet files written after first data load
└── tests/               # Backend route tests
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/data/match/{match_id}` | Download and cache a match's prebuilt tracking + event data |
| GET | `/data/frames?match_id&start&end` | Fetch tracking frames for a frame range |
| GET | `/data/match_meta?match_id` | Fetch match metadata (teams, players, score) |
| GET | `/data/match_key_moments?match_id` | Fetch phases of play, goals, and shots |

Pitch control is served as an embedded overlay on each frame returned by `/data/frames`, not as a separate endpoint — an earlier standalone `/data/pitch_control_overlay` route was removed (it was broken and unused).

## Documentation

Full documentation is in [`docs/`](./docs/README.md): a user guide, how the backend and frontend work, the concepts behind the cache and locking, and the reasons for the main design decisions.

- [System overview](./docs/architecture/system-overview.md): every part on one diagram.
- [Decisions](./docs/decisions/README.md): why matches are cached per id, why match data is prebuilt, where it is stored, and a proposed frame cache for the browser.

## License

MIT — see [LICENSE](./LICENSE).

## Data

Match data is sourced from [SkillCorner's open data repository](https://github.com/SkillCorner/opendata). All data is subject to SkillCorner's terms of use.
