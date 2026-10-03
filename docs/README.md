# Documentation

This folder documents Tapp'd end to end: what it is, how people use it, how it
works, the ideas it relies on, why it was built this way, and what it depends on.

> **Work in progress.** The tables below double as the writing tracker. A page
> is linked once it exists. Remove the Status columns and this note when
> everything is done.

## Where to look

| If you want to know... | Go to |
|---|---|
| What this project is | `overview.md` |
| How to use the app | `user-guide/` |
| How a request or a click turns into pixels | `architecture/` |
| What a term or mechanism means (locks, cache, clips) | `concepts/` |
| Why something was built the way it was | `decisions/` |
| What we depend on outside this repo | `integrations/` |
| An endpoint, an env var, a setup command | `reference/` |

## Pages

Status is one of: **not started**, **outline** (headings and open questions
agreed), **draft** (written, awaiting review), **done** (reviewed).

### Phase 1: Foundation

| Page | Covers | Status |
|---|---|---|
| [`overview.md`](./overview.md) | What Tapp'd is, who it's for, features, tech stack | done |
| [`architecture/system-overview.md`](./architecture/system-overview.md) | Every part on one diagram, a session step by step, and the decisions behind the shape | draft |

### Phase 2: Backend

| Page | Covers | Status |
|---|---|---|
| `architecture/backend-flow.md` | Request lifecycle: load match, metadata, frames, key moments | not started |
| `architecture/data-pipeline.md` | SkillCorner, build script, release, server cache | not started |
| `architecture/data-model.md` | The three per-match files, frame JSON shape | not started |
| `concepts/match-cache.md` | Cache check, completeness marker, the 409 gate | not started |
| `concepts/locks-and-concurrency.md` | Per-match locks, double-checked download, threadpool routes | not started |
| `concepts/atomic-writes.md` | Temp file and rename, on build and on download | not started |
| `reference/api.md` | Endpoints, parameters, status codes | not started |
| `reference/configuration.md` | Every environment variable, backend and frontend | not started |

### Phase 3: Decisions

| Page | Covers | Status |
|---|---|---|
| `decisions/README.md` | Index of decision records with their status | not started |
| [`multi-user-match-caching.md`](./multi-user-match-caching.md) (to become `decisions/001-per-match-cache.md`) | Per-match cache for concurrent users | done, move pending |
| `decisions/002-prebuilt-match-data.md` | Why the server never parses raw tracking data | not started |
| `decisions/003-release-as-data-store.md` | Why a GitHub release holds the prebuilt files | not started |
| [`frame-data-caching.md`](./frame-data-caching.md) (to become `decisions/004-frame-data-caching.md`) | Proposed tiered frontend frame cache | done, move pending |

### Phase 4: Integrations

| Page | Covers | Status |
|---|---|---|
| `integrations/skillcorner-open-data.md` | Source data, what we pull, terms | not started |
| `integrations/kloppy.md` | How ingestion uses it, build-only dependency | not started |
| `integrations/github-actions-and-releases.md` | The build workflow and the `match-data` release | not started |
| `integrations/docker-and-deployment.md` | Dockerfile, data volume, port, CORS, frontend API URL | not started |

### Phase 5: Frontend

| Page | Covers | Status |
|---|---|---|
| `architecture/frontend-flow.md` | Session context, data manager, stores, plot overlays | not started |
| `concepts/clips-segments-frames.md` | Clip frames versus match frames | not started |
| `concepts/frame-buffering.md` | Chunked fetch, buffer limit, eviction, missing frames | not started |
| `concepts/pitch-control.md` | What it is and how it reaches the plot | not started |

### Phase 6: User guide

| Page | Covers | Status |
|---|---|---|
| `user-guide/getting-around.md` | Landing page, match picker, workspace layout | not started |
| `user-guide/playback-and-clips.md` | Controls, timeline, clips and segments | not started |
| `user-guide/finding-key-moments.md` | Key moment finder, filters, event display | not started |
| `user-guide/annotations.md` | Drawing tools, player focus, context menu | not started |
| `user-guide/overlays.md` | Pitch control, pass probability, event visualisation | not started |
| `user-guide/projects-and-settings.md` | Saving a project, style settings | not started |

### Phase 7: Wrap-up

| Task | Status |
|---|---|
| `reference/development.md`: local setup, building data locally, tests, logs, notebooks | not started |
| Trim the root `README.md` to pitch, quick start and links into this folder | not started |
| Check every cross-link and every code reference against the code | not started |
