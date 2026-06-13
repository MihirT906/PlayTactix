# PlayTactix

**A telestrator for football tracking data.**

Think of it like the tool a TV analyst uses to draw on match footage — except instead of video, you're working directly on tracking and event data. PlayTactix lets you find the moments that matter, layer on analytical overlays (pitch control, phases of play, possession sequences), annotate them in football language, and export clips you can actually share.

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
- Internet access (match data is fetched directly from [SkillCorner's open data repository](https://github.com/SkillCorner/opendata) at runtime — no manual download required)

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`. Make sure the backend is running first.

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
| GET | `/data/match/{match_id}` | Download and cache tracking + event data for a match |
| GET | `/data/frames?match_id&start&end` | Fetch tracking frames for a frame range |
| GET | `/data/match_meta?match_id` | Fetch match metadata (teams, players, score) |
| GET | `/data/match_key_moments?match_id` | Fetch phases of play, goals, and shots |
| GET | `/data/pitch_control_overlay?match_id&start&end` | Compute pitch control for a frame range |

## License

MIT — see [LICENSE](./LICENSE).

## Data

Match data is sourced from [SkillCorner's open data repository](https://github.com/SkillCorner/opendata). All data is subject to SkillCorner's terms of use.
