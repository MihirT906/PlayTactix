# 002: Prebuild match data instead of parsing on the server

**Status:** Implemented, 2026-10-03 (commit `f531c82`).

> **To confirm (Mihir):** the reasons marked *inferred* below are my reading
> of the code and commit history. Two facts would make this record much
> stronger in an interview: which host and memory limit this ran into, and
> what actually happened there (out-of-memory kill, restart, timeout).

## Context

Until this change, the server did all the work of preparing a match the first
time anyone asked for it. `GET /data/match/{id}` would:

1. download about 90 MB of raw data from SkillCorner (85 to 89 MB of
   tracking, about 5 MB of events, a small metadata file);
2. parse the tracking data with kloppy into a DataFrame;
3. rename columns, derive velocities, and write three compact files to the
   disk cache.

Later requests for the same match were served from the cache, thanks to
[decision 001](./001-per-match-cache.md). The cost was only paid once
per match per server. But it had to be paid on the server, and it was large:

| Measure | Value |
|---|---|
| Peak memory while parsing one match | about 1.3 GB |
| Time for one ingest, measured locally | about 16 s, against a 30 s budget |
| Raw download per match | about 90 MB |
| Finished output per match | about 9.5 MB |

1.3 GB for a single request is most of the memory budget of the backend, and
more than a small hosting plan provides in total. One user opening a new
match could take the whole server down for everyone.

The first response was to make the parse lighter (commit `44fc2d8`):
positions downcast to 32-bit floats before deriving velocities, and all
derived columns attached in one operation instead of one at a time. That
reduced memory, and those changes are still in the build, but it was not
enough to make the parse fit.

Three properties of the problem pointed at a different answer:

- **The output never changes.** Parsing a given match always gives the same
  result.
- **The set of matches is small and known.** About 20, published by
  SkillCorner.
- **The output is tiny compared with the work.** 1.3 GB of memory to produce
  9.5 MB.

## Decision

Do the parsing ahead of time, somewhere other than the server, and have the
server download the finished files.

## How it works

- `backend/scripts/build_match_data.py` runs the existing ingestion for every
  open-data match, or for the ids given to it.
- The **Build match data** GitHub Actions workflow runs that script on a
  hosted runner and uploads the output to a release named `match-data`.
- `GET /data/match/{id}` now streams those three files into the disk cache
  (`backend/services/match_cache.py`). If the release has no files for that
  id, it returns `404`.
- kloppy moved to `requirements-build.txt`, and the ingestion module and
  build script are excluded from the Docker image. The server does not have
  the parser installed and does not ship the code that uses it.

Details: [data pipeline](../architecture/data-pipeline.md).

## Consequences

**Better**

- **Server memory is flat.** Loading a match streams files to disk in 1 MB
  chunks. The 1.3 GB peak is gone from the server entirely.
- **Loading is a file copy.** About 9.5 MB over the network instead of 90 MB
  plus a parse.
- **The server image is smaller and simpler.** No kloppy, no ingestion code.
- **The server no longer depends on SkillCorner at request time**, only on
  the release.
- **Nothing else had to change.** The cache layout, the completeness marker,
  the per-match lock and the atomic writes from decision 001 all still apply.
  The read endpoints and the frontend did not change at all.

**Worse**

- **A new manual step.** When SkillCorner adds a match, or the ingestion code
  changes what is stored, someone has to run the workflow.
- **A new failure mode.** A match that exists at SkillCorner but was never
  built returns `404`, and the frontend's match list (which reads SkillCorner
  directly) will still show it.
- **Stale caches after a format change.** The files carry no version, so a
  server that cached the old format keeps serving it until its disk is
  cleared.
- **Two places where the format is defined.** The build writes it and the
  server reads it, and they are now deployed separately. A mismatch is
  possible in a way it was not when one process did both.

## Alternatives considered

### Keep parsing on the server, on a bigger machine

It would have worked with no code change. Rejected because it means paying
continuously for memory that is used for a few seconds, once per match, and
because a parse during a request would still freeze out other users while it
ran. *Inferred.*

### Keep optimising the parse

Tried first, as described above. It helped but did not get the peak low
enough, and further gains would have meant replacing kloppy's parsing with a
hand-written streaming parser for SkillCorner's format: a lot of code to own
for a problem that goes away if the parse simply happens elsewhere.
*Inferred.*

### Parse on the server, in a background job

Return immediately, parse in a worker, let the client poll. This fixes the
blocked request but not the memory: the worker runs on the same machine and
needs the same 1.3 GB. It also adds a queue and job state to a server that
otherwise has none. *Inferred.*

### Commit the built files to the repository, or bake them into the image

No download at runtime at all. Rejected because around 170 MB of binary files
would bloat the repository's history permanently or the image on every build,
and any change to the data would mean a new commit or a new image. *Inferred.*
Where the files should live instead is
[decision 003](./003-release-as-data-store.md).

### Precompute everything, including the per-frame JSON

Go further and store the exact responses the API returns. Rejected for now as
more than the problem needed: the remaining request-time work (slicing
Parquet) is cheap, and the one expensive part, pitch control, is a separate
question covered in [pitch control](../concepts/pitch-control.md).

## Revisit when

- **The data set stops being small or fixed.** With user-uploaded matches, or
  thousands of them, a build triggered by hand does not scale. The parse
  would need to become an on-demand job on a machine sized for it.
- **The format changes often.** Then versioning the output (in the release
  tag or the file names) becomes necessary, not optional.
- **The remaining request-time work becomes the bottleneck.** That argues for
  moving more into the build, starting with pitch control.

## In an interview

The short version: the server was doing an expensive, memory-hungry,
perfectly repeatable computation at request time. Since the result never
changes and the inputs are a small known set, it was moved to build time on a
free runner, and the server became a cache in front of a file store. Memory
went from a 1.3 GB spike to flat, at the price of a manual publish step and a
new "not built yet" failure.

The general principle is to ask of any expensive request-time work: does the
answer depend on the request, or only on the data? If only on the data, it
can be done once, ahead of time.
