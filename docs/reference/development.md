# Development

Setting up, running, testing and finding your way around the repository. For
environment variables see [configuration](./configuration.md).

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.13 (pinned in `backend/.python-version`) |
| Node.js | v24 |
| npm | 11 |
| Docker | Optional, for running the backend in a container |

## Repository layout

```
PlayTactix/
├── .github/workflows/     Build match data workflow
├── backend/
│   ├── main.py            App entry point
│   ├── config.py          Environment variables
│   ├── paths.py           File names for a match's data
│   ├── logger.py          Logging setup
│   ├── routes/            The four data endpoints
│   ├── services/          Cache, frames, key moments, pitch control, ingestion
│   ├── scripts/           build_match_data.py
│   ├── notebooks/         Exploration, not used by the app
│   ├── tests/             Helper functions for calling the API
│   ├── requirements.txt         Server
│   ├── requirements-build.txt   Server + kloppy, for building data
│   ├── requirements-dev.txt     Build + pytest
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── components/    UI
│       ├── context/       Session and style state
│       ├── services/      Data fetching, stores, clip logic
│       ├── plot/overlays/ Overlay trace builders
│       ├── types/         TypeScript types
│       └── config.ts      Constants and theme
├── data/                  Match cache (gitignored)
├── logs/                  Backend log
├── tests/                 Route timing tests
└── docs/
```

## Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API is at `http://localhost:8000`, with generated docs at `/docs`.

### Which requirements file

| File | Contains | Use it to |
|---|---|---|
| `requirements.txt` | What the server needs | Run the API |
| `requirements-build.txt` | The above plus kloppy | Build match data locally |
| `requirements-dev.txt` | The above plus pytest | Do everything, including tests |

Each includes the one before, so installing `requirements-dev.txt` covers all
three. Versions are pinned.

If an import fails after pulling changes, the virtual environment is probably
behind the requirements files. Reinstall.

### Getting match data locally

There are two ways for a local server to have a match.

**Let it download.** Start the server and load a match. It fetches the
prebuilt files from the release into `data/`. Needs internet access the first
time for each match.

**Build it yourself.** Runs the full ingestion and writes straight into
`data/`.

```bash
pip install -r requirements-build.txt
python scripts/build_match_data.py 1886347     # one match
python scripts/build_match_data.py             # every match
```

This needs about 1.3 GB of free memory per match while it runs. A match that
is already in `data/` is skipped; delete its three files to rebuild it.

To work entirely offline, or against your own build, point
`MATCH_DATA_BASE_URL` at a local file server, or just build into `data/`.

### Logs

The backend logs to the console and to `logs/playtactix.log`. Set
`LOG_LEVEL=DEBUG` for more detail. The file is cleared each time a match is
loaded.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is at `http://localhost:5173`. Start the backend first.

| Script | Does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check, then build static files into `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the built files locally |

The frontend logs to the browser console: everything in development,
warnings and errors only in a production build.

## Tests

The tests in `tests/route_tests.py` are **integration timing tests**. They
call a running server and record how long it took.

1. Start the backend on `localhost:8000`.
2. From the repository root:

```bash
pytest tests/route_tests.py --label my-run
pytest tests/route_tests.py --label my-run --start 10 --end 310
```

| Option | Default | Meaning |
|---|---|---|
| `--label` | `manual` | A name stored with the results |
| `--start` | `10` | First frame for the frames test |
| `--end` | `110` | Last frame for the frames test |

| Test | Checks |
|---|---|
| Match download | `GET /data/match/1886347` returns `200` in under 30 seconds |
| Frames retrieval | `GET /data/frames` for the range returns `200` in under 30 seconds |

Each writes its timing and response size to a JSON file in
`tests/test_results/`, overwriting the previous run.

Things to know:

- The file must be named on the command line. It is called `route_tests.py`,
  which pytest does not pick up automatically.
- Both tests are marked `integration` and `slow` (markers are declared in
  `pytest.ini`).
- The frames test is out of date: it sends `start` and `end` but no
  `match_id`, which the endpoint now requires, so it fails with `422` until
  the parameter is added. It also assumes the match is already loaded.
- There are no unit tests. `backend/tests/test_backend_utils.py` is a set of
  helper functions for calling the API from notebooks, not tests, and one of
  them calls an endpoint that no longer exists.

## Notebooks

In `backend/notebooks/`. Exploration and scratch work; nothing imports them
and they are left out of the Docker image.

| Notebook | Explores |
|---|---|
| `test_kloppy.ipynb` | Loading SkillCorner data with kloppy |
| `test_data_ingestion.ipynb` | The ingestion transform |
| `test_key_moment_finder.ipynb` | Deriving key moments from events |
| `test_pitch_control_copy.ipynb` | The pitch control call |
| `test_backend.ipynb` | Calling the API |
| `download_image.ipynb` | Fetching the pitch background image |

## Common tasks

| Task | Where |
|---|---|
| Add or change an API endpoint | `backend/routes/data_routes.py`, with logic in a service |
| Change what is stored per match | `backend/services/data_ingestor_github.py`, then rebuild and clear caches |
| Change the frame JSON shape | `backend/services/frame_data_service.py` and `frontend/src/types/FrameDataInterfaces.tsx` together |
| Add an overlay | A builder in `frontend/src/plot/overlays/`, the overlay kind in `types/ClipInterfaces.tsx`, a menu entry in `OverlaysTab.tsx`, and drawing in `PlotComponent.tsx` |
| Add a field to saved projects | `frontend/src/types/SavedProject.ts`: bump the schema version, add a migration, extend the validator, and update `projectSerializer.ts` |
| Change a visual default | `frontend/src/config.ts` |

## Troubleshooting

| Symptom | Cause |
|---|---|
| `409` from a data endpoint | The match has not been loaded. Call `GET /data/match/{id}` first. |
| `404` loading a match | No prebuilt data for that id in the release |
| CORS error in the browser console | The frontend's origin is not in `ALLOWED_ORIGINS` |
| The match picker is empty | The GitHub API request failed, possibly rate limited |
| Stale data after changing ingestion | Delete the match's files from `data/` |
| `ModuleNotFoundError` on start | Reinstall from the requirements file |
