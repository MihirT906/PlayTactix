# Match cache

The match cache is the server's on-disk copy of the prebuilt files for every
match somebody has asked for. It is the only state the server keeps. This page
explains what is in it, how the server decides a match is "there", and why
that decision can be trusted.

Code: `backend/services/match_cache.py`, `backend/paths.py`.

## What is in it

One directory, `data/`, with three files per match:

| File | Contents | Size |
|---|---|---|
| `tracking_data_{id}.parquet` | One row per frame, positions and velocities | about 8.5 to 9.5 MB |
| `events_data_{id}.parquet` | One row per event | about 0.4 MB |
| `meta_data_{id}.json` | SkillCorner's match file: teams, players, score | about 30 KB |

The match id in the file name is what lets many matches sit side by side. An
earlier version used three fixed names, which meant the server could hold one
match at a time for everyone; see the
[decision record](../decisions/001-per-match-cache.md).

The directory is `data/` at the repository root in development. In Docker the
same path resolves to `/data`, which should be a mounted volume so the cache
outlives the container.

## How the server decides a match is cached

There is no index, no database row and no in-memory list. The check is:

```python
def is_match_cached(match_id):
    try:
        with meta_data_path(match_id).open("r") as f:
            return int(json.load(f)["id"]) == match_id
    except (OSError, ValueError, KeyError, TypeError):
        return False
```

Open the metadata file for that id, parse it, and confirm the id inside
matches. Any failure (file missing, not JSON, no `id`) means "not cached".

Checking the id inside the file, not only that the file exists, guards
against a file that has the right name and the wrong contents.

## Why one file can stand for three

The metadata file is used as a **completeness marker**. The rule that makes
this work is an ordering rule, kept in three places:

| Where files get written | Order |
|---|---|
| The server downloads a match (`ensure_match_cached`) | tracking, events, **metadata last** |
| The build script writes a match (`DataIngestor.load_data`) | tracking, events, **metadata last** |
| The workflow uploads to the release | both Parquet files, **metadata last** |

Because metadata is always last, its presence implies the other two are
already complete. If a download dies after the tracking file, the metadata
file is not there, the match counts as not cached, and the next request
starts again.

The same rule holds one level up. If the release has a match's metadata, its
Parquet files were uploaded before it, so a server never finds the marker on
the release and then a `404` for the data.

This only works together with [atomic writes](./atomic-writes.md): each file
appears under its final name only once it is fully written, so "present" and
"complete" mean the same thing.

## Filling the cache

`ensure_match_cached(match_id)` is the only function that adds to the cache.

1. If the match is cached, return. No lock, no network.
2. Take the lock for this match id.
3. Check again. Another request may have finished the download while this one
   waited.
4. Download tracking, events, then metadata, each to a temporary file that is
   renamed into place.
5. Release the lock.

Steps 2 and 3 are explained in
[locks and concurrency](./locks-and-concurrency.md).

If the release answers `404` for a file, the function raises
`MatchNotAvailableError`, which the route turns into a `404` for the client.

## Reading from the cache

Readers do not take any lock. `FrameDataService` and `KeyMomentsService` open
the files by id on every request. That is safe because:

- the gate (`require_loaded_match`) has already confirmed the marker exists,
  so all three files are complete;
- files are never modified in place, only replaced whole by a rename, so a
  reader holds either the old complete file or the new complete one.

## What the cache does not do

- **It never evicts.** SkillCorner's open data is a small set: 20 matches
  when last counted (September 2026), about 170 MB in total if every one
  were cached. There is nothing to make room for.
- **It never expires.** A cached match is served until someone deletes the
  files.
- **It has no version.** The file names carry the match id and nothing else.
  If the build step changes what is stored, a server that already cached the
  old files keeps serving them. Clearing `data/` (or the volume) is the only
  way to pick up a rebuild.
- **It is not shared between servers.** Each instance has its own directory
  and fills it independently.

## Trade-offs and limits

- **Simplicity over control.** Using the filesystem as the index means there
  is nothing to keep in sync, and also nothing that can answer "which matches
  are cached" without listing a directory.
- **Staleness is manual.** The lack of a version in the name is the weakest
  point of the design. Adding a schema version to the file names or to the
  release tag would fix it.
- **The first loader pays.** One user waits for roughly 9 MB to reach the
  server; everyone after gets the disk copy.

## Questions to expect

**How do you invalidate the cache?**
Today, by deleting the files. The data for a match does not change, so the
only reason to invalidate is a change in the stored format, and that is rare
enough that it was left manual. The proper fix is a version in the file name
or release tag, so new code simply asks for a name the old cache does not
have.

**Why check the id inside the file as well as the name?**
It costs one small JSON parse and protects against a mis-named or corrupted
marker. It also means a truncated or empty file is treated as "not cached"
instead of crashing later.

**What if the process crashes mid-download?**
Leftover `.tmp` files may remain, and possibly one or two complete Parquet
files, but no metadata file. The match is still "not cached", and the next
request downloads all three again, overwriting what was there.

**Why not keep a set of loaded ids in memory?**
It would be lost on restart and would have to be rebuilt from the disk
anyway, and it could disagree with the disk. Asking the disk directly is one
source of truth.

**Why is there no eviction?**
The whole data set is around 20 matches and about 170 MB. Eviction only earns its
complexity when the data cannot all fit.
