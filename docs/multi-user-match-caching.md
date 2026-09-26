# Multi-User Match Caching — Deployment Plan

**Status:** Proposed. Not implemented. Written 2026-09-24.

This document describes why the backend's on-disk cache currently only works
for one person at a time, and the plan ("Option A" below) to make it safe for
multiple concurrent users without giving up the benefit of caching at all. It
is a decision record — see [Alternatives considered](#alternatives-considered)
for the two other designs that were weighed and rejected, and why.

---

## The problem today

The backend caches ingested match data as three fixed-name files on disk, and
uses their presence/contents as the *only* record of "what match is loaded":

| File | Written by | Read by |
|---|---|---|
| `bronze_meta_data.json` | `DataIngestor.load_data` (`backend/services/data_ingestor_github.py:88-90`) | `get_loaded_match_id()` (`data_ingestor_github.py:30-40`), `FrameDataService` (`frame_data_service.py:98,116`) |
| `silver_tracking_data_kloppy.parquet` | `data_ingestor_github.py:74-78` | `frame_data_service.py:114` |
| `silver_event_data.parquet` | `data_ingestor_github.py:81-85` | `frame_data_service.py:115`, `key_moments_service.py:77` |

Every request to `GET /data/match/{match_id}` overwrites all three files in
place (`data_ingestor_github.py:59,74-90`). Every other data endpoint —
`/data/frames`, `/data/match_meta`, `/data/match_key_moments` — is gated by
`require_loaded_match` (`backend/routes/data_routes.py:21-30`), which checks
whether the `match_id` in the request matches whatever id happens to be
sitting in `bronze_meta_data.json` *right now*, then reads from those same
three fixed paths regardless of which `match_id` was asked for.

In other words: there is exactly one slot of storage for "the match," shared
by every user hitting the server, and `match_id` on each request is only ever
used to validate against that one slot — never to select between multiple
cached matches.

> **Note:** a fourth endpoint, `/data/pitch_control_overlay`, used to exist
> here and was also gated by `require_loaded_match`. It has since been
> removed — it called `PitchControlOverlay.get_pitch_control` with arguments
> that method never accepted, so it always raised at runtime, and the
> frontend never called it (pitch control is served embedded in `/data/frames`
> via a different, working call site, `frame_data_service.py:182`). Removed
> as pre-existing dead code, unrelated to this plan.

### Why it breaks with more than one user

1. User A requests match `1886347`. It downloads and becomes "the" cached match.
2. User B requests match `1899585`. `data_ingestor_github.py:59` deletes the
   marker and overwrites all three files — match `1886347`'s data is gone.
3. User A's next request (e.g. scrubbing to a new frame range) still says
   `match_id=1886347`. `require_loaded_match` now sees the loaded id is
   `1899585`, so User A gets a `409` — or, if the request lands mid-overwrite,
   a worse outcome: frames read from a half-written file, or frames from
   `1899585` served under `1886347`'s label, since nothing atomic guards the
   read against a concurrent write.

This isn't a hypothetical edge case — it's the normal outcome of two people
using the tool at the same time.

---

## Facts that inform the design

These came from inspecting the actual data source, not estimation:

| Fact | Value | Source |
|---|---|---|
| Total matches in SkillCorner's open-data repo | **20**, fixed | `GET api.github.com/repos/SkillCorner/opendata/contents/data/matches`, checked 2026-09-24 |
| Cached size per match (tracking + event parquet + meta json) | **~8.5 MB** | measured from `data/silver_tracking_data_kloppy_{1886347,1899585}.parquet` (8.3 MB / 8.0 MB), `data/silver_event_data.parquet` (332 KB), `data/bronze_meta_data_{...}.json` (32 KB) |
| **Total ceiling if all 20 matches are cached** | **~170 MB** | 20 × ~8.5 MB — this is a hard ceiling, not a projection, since there are only ever 20 matches to cache |
| Raw payload pulled from GitHub per ingest (before compression to parquet) | **~90–94 MB** (~85–89 MB tracking jsonl + ~5 MB event csv + 27 KB meta) | `curl -I` against the actual GitHub URLs used in `data_ingestor_github.py:237,243,378` |
| Time budget for one ingest | **30 seconds** | `tests/route_tests.py` (`max_seconds = 30` for `GET /data/match/{id}`) |
| Is the source data static? | **Tracking + metadata: yes** (URLs pinned to commit `741bdb798...`, `data_ingestor_github.py:237,243`). **Event data: not pinned** — fetched from `refs/heads/master` (`data_ingestor_github.py:378`), the moving branch tip | code inspection |

The last row is a real, if small, caveat: tracking and metadata for a given
`match_id` can never change once fetched, so caching them forever carries zero
staleness risk. Event data technically could change if SkillCorner ever edits
that file on `master` — low-probability for a published open dataset, but
worth knowing, and an easy separate fix later (pin that URL to a commit too).

---

## Proposed design (Option A)

**Namespace the cache by `match_id`; stop treating "loaded" as a single global
slot.**

| Current (fixed) filename | Proposed (namespaced) filename |
|---|---|
| `bronze_meta_data.json` | `bronze_meta_data_{match_id}.json` |
| `silver_tracking_data_kloppy.parquet` | `silver_tracking_data_kloppy_{match_id}.parquet` |
| `silver_event_data.parquet` | `silver_event_data_{match_id}.parquet` |

(Note `data/` already contains files in exactly this naming shape for two
matches — `bronze_meta_data_1886347.json`, `silver_tracking_data_kloppy_1899585.parquet`
— so this is a pattern the codebase has partially anticipated, just not what
the live ingestion path currently produces.)

Consequences of this change:

- **`require_loaded_match` changes meaning** from "is this the one active
  match, globally" to "has this `match_id` been ingested yet" (i.e. do its
  namespaced files exist) — a check that's actually about the requested
  match, rather than about unrelated global state.
- Loading a new match no longer touches any other match's files. Two users
  viewing two different matches simply both work.
- Two users viewing the *same* match still share one on-disk copy — the
  expensive ~90 MB/30s ingest happens once, ever, per match, no matter how
  many users request it afterward.

### Concurrency safety (new requirement this introduces)

Namespacing removes the "different match" race, but a new one appears: two
requests for the *same, not-yet-cached* `match_id` arriving close together
would both start ingesting and could interleave writes. Two additions close
this:

1. **A per-`match_id` lock** around `DataIngestor.load_data`, so a second
   concurrent request for a match already being ingested waits for (or is
   told to retry after) the first, rather than duplicating the work.
2. **Atomic writes**: write each file to a temp path and `os.replace()` it
   into its final namespaced location, so a reader can never observe a
   partially-written file — it either sees the old state or the complete new
   one.

### Files this touches (for whoever implements it)

- `backend/services/data_ingestor_github.py` — the three write paths
  (`load_data`, lines 74-90) and `get_loaded_match_id()` (lines 30-40, which
  becomes a per-`match_id` existence check rather than a single global read).
- `backend/services/frame_data_service.py` — the three read paths (lines
  98, 114-116).
- `backend/services/key_moments_service.py` — one read path (line 77).
- `backend/routes/data_routes.py` — `require_loaded_match` (lines 21-30).
- `backend/services/pitch_control_overlay.py` — **not** touched; it never
  reads from disk (see note above) and the one route that misused it has
  since been removed.

No frontend change is required — every relevant endpoint already sends
`match_id` on every call.

---

## Alternatives considered

### B — Keep one global slot, just make it safe (lock it, don't namespace it)

Same lock/atomic-write additions as above, but keep today's "one match for
the whole server" model instead of namespacing by `match_id`. Rejected: it
requires nearly the same amount of change as Option A for none of the
benefit — two users still can't use the tool independently, which is the
actual problem being solved. Only worth it as an emergency stopgap.

### "Single cached slot, evict-and-redownload on every switch" (global or per-user)

Considered explicitly: rather than keeping all 20 matches cached
indefinitely, only ever keep one (per server, or per user session), and pay
the ingest cost again whenever a different match is requested. Rejected on
the numbers above: each "switch" costs ~90 MB and up to 30 seconds, repeated
every time *any* request touches a match other than the one currently held —
including the same user switching back and forth. Against a data source that
is fixed at 20 matches, fully static (bar the one caveat above), and only
~170 MB in total, this trades a cheap, plentiful resource (disk) for an
expensive, user-visible one (bandwidth, latency, and repeated load on
SkillCorner's GitHub endpoints) for no benefit. Would only make sense if the
dataset were too large to store in full, or changed often enough that
long-lived caching risked staleness — neither is true here.

### C — Per-session/per-user isolated storage

Give each browser session its own cache directory, so users can't see or
share each other's loaded matches. Rejected for this app specifically: the
data is public and identical for every viewer (SkillCorner's open dataset),
so there is nothing to isolate, and doing so would actively throw away the
cross-user sharing benefit Option A gets for free — every user would
re-download matches other users already fetched. Would be the right choice
if this data were private or per-tenant.

### Eviction / TTL policy

Not included in this plan. The dataset has a hard ceiling of 20 matches
(~170 MB total, see above) — there's nothing to evict *to*, and no reason to
expire data that's cryptographically incapable of going stale (bar the event-
data caveat noted above). Revisit only if the data source is later pointed at
something larger or updated more frequently than SkillCorner's fixed archive.

---

## Multi-process caveat

The per-`match_id` lock proposed above is an in-process lock — correct as
long as the backend runs as a single process. If the backend is later scaled
to multiple `uvicorn` workers or multiple machines (see the deployment
walkthrough's note on production process management), the lock and the
"does this match_id exist yet" check both need to move to something shared
across processes (a filesystem lock, or a lightweight external coordination
point) — otherwise two workers can still race on a cold match, though the
atomic-rename write pattern means the worst outcome is duplicated ingest
work, not corrupted data.

---

## Suggested implementation order

1. Namespace the three write paths in `data_ingestor_github.py` by
   `match_id`; write to a temp file and `os.replace()` into place.
2. Update the read paths in `frame_data_service.py` and
   `key_moments_service.py` to use the namespaced paths.
3. Change `get_loaded_match_id()` into a per-`match_id` existence check;
   update `require_loaded_match` accordingly.
4. Add the per-`match_id` lock around `DataIngestor.load_data`.
5. (Optional, only if the data source ever grows past the current fixed 20
   matches) revisit an eviction policy.

---

## References

- [SkillCorner open data](https://github.com/SkillCorner/opendata) — 20
  matches total, confirmed 2026-09-24.
- [Frame data caching](./frame-data-caching.md) — the frontend-side sibling
  of this document: how tracking frames *within* an already-loaded match are
  cached and prefetched. This document is about which matches are available
  to be framed in the first place.
