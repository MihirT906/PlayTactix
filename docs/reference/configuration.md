# Configuration

Everything that can be changed without editing logic: environment variables,
build inputs, and the constants that are fixed in code but worth knowing.

## Backend environment variables

Read in `backend/config.py` and `backend/logger.py`. In development, put them
in `backend/.env` (copy `backend/.env.example`); the file is gitignored. In
production, set them on the host.

| Variable | Default | What it does |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated list of origins allowed to call the API from a browser (CORS). Set it to the deployed frontend's URL in production. |
| `MATCH_DATA_BASE_URL` | `https://github.com/MihirT906/PlayTactix/releases/download/match-data` | Where prebuilt match files are downloaded from. The server requests `{base}/tracking_data_{id}.parquet` and so on. Change it to point at a fork's release or a local file server. A trailing slash is stripped. |
| `PORT` | `8000` | Port the server listens on. Many hosts inject this themselves. |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING` or `ERROR`. |

`config.py` is imported first in `main.py` so that `.env` is loaded before
any other module reads the environment.

## Frontend environment variables

Read at build time by Vite. Put them in `frontend/.env` or `.env.local` (see
`frontend/.env.example`).

| Variable | Default | What it does |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the backend. Because Vite inlines it at build time, changing it means rebuilding the frontend. |

Frontend log level is not configurable: `debug` and above in development,
`warn` and above in a production build.

## Build workflow inputs

Set when starting the **Build match data** workflow by hand.

| Input | Default | What it does |
|---|---|---|
| `match_ids` | empty | Space-separated match ids to build. Empty builds every match in SkillCorner's index. |

The release tag, `match-data`, is fixed in the workflow file. If it is
changed there, `MATCH_DATA_BASE_URL` must change to match.

## Docker

| Setting | Value | Notes |
|---|---|---|
| Base image | `python:3.13-slim` | |
| Port | `PORT`, default `8000` | Passed to uvicorn at start |
| Data directory | `/data` | Mount a persistent volume here, or every restart re-downloads matches |
| Log directory | `/logs` | Inside the container; not persisted unless mounted |
| User | `appuser`, non-root | Owns `/app`, `/data` and `/logs` |
| Processes | One uvicorn process | The per-match locks rely on this |

Why `/data` and `/logs`: `paths.py` and `logger.py` resolve those directories
as "two levels above this file". In the repository that is the repo root. In
the image, the backend's contents are copied straight into `/app`, so two
levels up is `/`.

## Constants fixed in code

Not configurable, but they explain behaviour you will see.

### Backend

| Constant | Value | Where | Effect |
|---|---|---|---|
| Download timeout | 10 s connect, 60 s read | `match_cache.py` | A stalled download fails instead of holding a thread and a lock |
| Download chunk size | 1 MB | `match_cache.py` | Memory used while streaming a file to disk |
| Key moment padding | 30 frames each side | `key_moments_service.py` | Three seconds of run-up and aftermath around each phase, shot and goal |
| Pitch control grid | 106 by 68 | `pitch_control_overlay.py` | Size of the pitch assumed and of the grid returned |
| Frame interval | 0.1 s | `data_ingestor_github.py` | Used to derive velocities at build time |
| `/data/frames` defaults | `start=1`, `end=50` | `data_routes.py` | Used when the parameters are omitted |

### Frontend

| Constant | Value | Where | Effect |
|---|---|---|---|
| Chunk size | 300 frames | `config.ts` | How many frames one `/data/frames` request asks for (30 seconds of play) |
| Playback interval | 100 ms | `config.ts` | Time between frames at 1x; divided by the playback speed |
| Playback speed range | 0.125x to 8x | `MatchSessionContext.tsx` | Limits of the halve and double buttons |
| Frame buffer limit | 5,000 frames | `DataManager.ts` | About eight minutes of play kept in memory before the oldest is dropped |
| Fetch retries | 3 | `DataManager.ts` | Attempts for a chunk before giving up on a frame |
| Default segment | Match frames 10 to 110 | `clipManager.ts` | What a new clip shows before the user picks anything |
| Project format | `playtactix-project`, schema version 1 | `SavedProject.ts` | Identifies and versions saved project files |
| Default team colours | Home `#3B82F6`, away `#EF4444` | `config.ts` | Used when a kit colour is not available |

Most visual defaults (marker sizes, event colours, theme) live in
`APP_CONFIG` in `frontend/src/config.ts`.

## Production checklist

1. Set `ALLOWED_ORIGINS` on the backend to the frontend's real origin.
2. Set `VITE_API_URL` when building the frontend to the backend's real URL.
3. Mount a persistent volume at `/data`.
4. Leave `MATCH_DATA_BASE_URL` alone unless the data lives somewhere else.
5. Let the host set `PORT`.
6. Keep it to one process per container.

## Things that go wrong

| Symptom | Likely cause |
|---|---|
| Browser console shows a CORS error | The frontend's origin is not in `ALLOWED_ORIGINS`. Origins must match exactly, including scheme and port. |
| Every match load returns `404` | `MATCH_DATA_BASE_URL` points somewhere without the files, or the workflow has not been run. |
| Matches reload slowly after every deploy | No volume at `/data`, so the cache is lost with the container. |
| Frontend calls `localhost:8000` in production | `VITE_API_URL` was not set when the frontend was built. |
| Data looks out of date after a rebuild | The server cached the old files. Clear `/data`. |
