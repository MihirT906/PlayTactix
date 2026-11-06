# Documentation

This folder documents Tapp'd end to end: what it is, how people use it, how it
works, the ideas it relies on, why it was built this way, and what it depends on.

> **Work in progress.** The Status columns below are the review tracker.
> **draft** means written and awaiting review; **done** means reviewed. Remove
> the Status columns and this note when every page is done.

## Where to look

| If you want to know... | Go to |
|---|---|
| What this project is | [Overview](./overview.md) |
| How to use the app | [User guide](#user-guide) |
| How a request or a click turns into pixels | [Architecture](#architecture) |
| What a term or mechanism means (locks, cache, clips) | [Concepts](#concepts) |
| Why something was built the way it was | [Decisions](#decisions) |
| What we depend on outside this repo | [Integrations](#integrations) |
| An endpoint, an env var, a setup command | [Reference](#reference) |

## Suggested reading order

To understand the system from scratch, or to prepare to explain it:

1. [Overview](./overview.md), then [system overview](./architecture/system-overview.md)
2. [Backend flow](./architecture/backend-flow.md), with the three backend
   concepts: [match cache](./concepts/match-cache.md),
   [locks and concurrency](./concepts/locks-and-concurrency.md),
   [atomic writes](./concepts/atomic-writes.md)
3. [Data pipeline](./architecture/data-pipeline.md) and
   [decision 002](./decisions/002-prebuilt-match-data.md)
4. [Frontend flow](./architecture/frontend-flow.md), with
   [clips, segments and frames](./concepts/clips-segments-frames.md) and
   [frame buffering](./concepts/frame-buffering.md)
5. Everything else as needed

Most architecture, concept and decision pages end with "Trade-offs and
limits" and "Questions to expect".

## Pages

### Start here

| Page | Covers | Status |
|---|---|---|
| [Overview](./overview.md) | What Tapp'd is, the problem it solves, features, tech stack | done |

### Architecture

| Page | Covers | Status |
|---|---|---|
| [System overview](./architecture/system-overview.md) | Every part on one diagram, a session step by step, the decisions behind the shape | draft |
| [Backend flow](./architecture/backend-flow.md) | Each request from route to response | draft |
| [Frontend flow](./architecture/frontend-flow.md) | Where state lives, the playback loop, how a frame is drawn | draft |
| [Data pipeline](./architecture/data-pipeline.md) | From SkillCorner's raw data to the files the server serves | draft |
| [Data model](./architecture/data-model.md) | The three per-match files, the frame object, the project file | draft |

### Concepts

| Page | Covers | Status |
|---|---|---|
| [Match cache](./concepts/match-cache.md) | What "cached" means and why one file proves it | draft |
| [Locks and concurrency](./concepts/locks-and-concurrency.md) | Per-match locks, checking twice, threads versus the event loop | draft |
| [Atomic writes](./concepts/atomic-writes.md) | Temporary file and rename | draft |
| [Clips, segments and frames](./concepts/clips-segments-frames.md) | The clip's timeline versus the match's | draft |
| [Frame buffering](./concepts/frame-buffering.md) | Chunks, the buffer, missing frames, eviction | draft |
| [Pitch control](./concepts/pitch-control.md) | What it means, how it is computed and drawn, what it costs | draft |

### Decisions

| Page | Covers | Status |
|---|---|---|
| [Index](./decisions/README.md) | All records, how they connect, smaller decisions | draft |
| [001 Per-match cache](./decisions/001-per-match-cache.md) | One cache shared safely by many users | done (pre-existing) |
| [002 Prebuilt match data](./decisions/002-prebuilt-match-data.md) | Why the server never parses raw tracking data | draft |
| [003 Release as data store](./decisions/003-release-as-data-store.md) | Why a GitHub release holds the built files | draft |
| [004 Frame data caching](./decisions/004-frame-data-caching.md) | Proposed browser frame cache, not built | done (pre-existing) |

### Integrations

| Page | Covers | Status |
|---|---|---|
| [SkillCorner open data](./integrations/skillcorner-open-data.md) | The source data and the three places it is read | draft |
| [kloppy](./integrations/kloppy.md) | The build-time tracking parser | draft |
| [databallpy](./integrations/databallpy.md) | The pitch control model | draft |
| [GitHub Actions and releases](./integrations/github-actions-and-releases.md) | The build workflow and the `match-data` release | draft |
| [Docker and deployment](./integrations/docker-and-deployment.md) | The image, the volume, connecting frontend and backend | draft |

### User guide

Written from the code. Not yet checked against the running app.

| Page | Covers | Status |
|---|---|---|
| [Getting around](./user-guide/getting-around.md) | The screens and the workspace layout | draft |
| [Playback and clips](./user-guide/playback-and-clips.md) | Playing, scrubbing, building a clip from segments | draft |
| [Finding key moments](./user-guide/finding-key-moments.md) | Phases of play, filters, custom event timelines | draft |
| [Annotations](./user-guide/annotations.md) | Drawing tools and when each annotation shows | draft |
| [Overlays](./user-guide/overlays.md) | Pitch, pitch control, pass probability, events | draft |
| [Projects and settings](./user-guide/projects-and-settings.md) | Colours and visibility, saving and opening | draft |

### Reference

| Page | Covers | Status |
|---|---|---|
| [API](./reference/api.md) | Endpoints, parameters, responses, status codes | draft |
| [Configuration](./reference/configuration.md) | Environment variables, build inputs, fixed constants | draft |
| [Development](./reference/development.md) | Setup, building data locally, tests, notebooks | draft |

## Still to do

| Task | Status |
|---|---|
| Review every page marked draft | in progress |
| Fill the "To fill in" and "To confirm" blocks (origin, deployment host, reasons marked *inferred*) | not started |
| Measure a 300-frame request with pitch control and add the numbers | not started |
| Check the user guide against the running app | not started |
| Trim the root `README.md` to pitch, quick start and links into this folder | not started |
