# Atomic writes

**The idea in one sentence:** never let anyone see a file while it is still
being written. Write it under a temporary name, and give it its real name
only once it is finished.

Every file in the [match cache](./match-cache.md) is written this way. This
page explains the problem that solves, how the trick works, and where it
stops working.

Code: `_download_file` in `backend/services/match_cache.py`;
`_atomic_write_json` and `_atomic_write_parquet` in
`backend/services/data_ingestor_github.py`.

## The problem: a file exists before it is finished

Writing a file takes time. A 9 MB download arrives over a second or more.
During that time the file is already on disk, but only part of it is there.

Suppose the server downloaded straight into the real file name:

```
time  0.0s   tracking_data_1886347.parquet created, 0 MB
time  0.5s   tracking_data_1886347.parquet          4 MB   <- a reader opens it here
time  1.0s   tracking_data_1886347.parquet          9 MB, finished
```

A reader that arrives at 0.5s finds a file with the right name, opens it, and
gets 4 MB of a 9 MB file. Nothing tells it the file is incomplete. It either
crashes trying to parse it or, worse, returns wrong data.

Three things can go wrong in that window:

- **Another request reads the match** and gets a cut-off file.
- **The "is this match cached?" check** sees the file and says yes too early.
- **The download dies** (crash, dropped connection). The half file stays there
  for good, under the real name, looking like a real one.

## The fix: write elsewhere, then rename

Do the slow part under a name nobody looks for. Then switch names in one
quick step.

```
time  0.0s   tracking_data_1886347.parquet.tmp created, 0 MB
time  0.5s   tracking_data_1886347.parquet.tmp          4 MB   <- a reader finds no real file
time  1.0s   tracking_data_1886347.parquet.tmp          9 MB, finished
time  1.0s   renamed to tracking_data_1886347.parquet          <- now readers can see it
```

The reader at 0.5s looks for `tracking_data_1886347.parquet`, finds nothing,
and is told the match is not loaded. That is a correct answer. It never sees
the half-written file, because nothing in the code ever opens a `.tmp` name.

In the code:

```python
def _download_file(match_id, path):
    tmp_path = path.with_suffix(path.suffix + ".tmp")   # the temporary name
    with requests.get(url, stream=True, timeout=_DOWNLOAD_TIMEOUT) as response:
        ...
        with tmp_path.open("wb") as f:                  # slow part: write the bytes
            for chunk in response.iter_content(chunk_size=_CHUNK_SIZE):
                f.write(chunk)
    tmp_path.replace(path)                              # quick part: rename
```

## Why the rename is safe

The slow part is now hidden, but the rename itself must not have a "half
done" moment either. It does not, and this is why.

A file on disk is two separate things:

- the **data**: the actual bytes;
- the **name**: an entry in the folder that points at those bytes.

Renaming does not touch the data. It does not copy 9 MB anywhere. It only
changes the entry in the folder, so that the real name now points at the
finished bytes. The operating system does that as a single step that cannot
be interrupted or seen halfway.

So at any moment, someone looking for the real name sees one of two things:

- the name is not there (or still points at the old file), or
- the name points at the complete new file.

That is what **atomic** means here: all or nothing, with no in-between state
that anyone can observe.

The code calls `Path.replace` and not `Path.rename` because `replace`
overwrites an existing file on every operating system, and `rename` fails on
Windows if the target already exists.

## What this guarantees

| Situation | What happens |
|---|---|
| A reader looks for the file while it is being written | It gets "not found", or the previous complete file if there was one. Never a partial file. |
| The process dies halfway through writing | A `.tmp` file is left behind. The real name is untouched, so nothing is fooled. |
| A reader has the old file open at the moment it is replaced | It carries on reading the old data to the end. The old data is deleted once that reader closes it. |

## How it fits with "metadata is written last"

An atomic write makes one *file* all-or-nothing. But a match is three files
(tracking, events, metadata), and the server needs to know the whole *set* is
there. One extra rule covers that: **the metadata file is always written
last**.

Put the two rules together:

1. A file under its real name is complete (atomic write).
2. The metadata file only appears after the other two are finished (ordering).
3. So if the metadata file is there, all three are complete.

This is why the "is this match cached?" check only needs to look at one file.

## A related detail: streaming

The download uses `stream=True` and writes in 1 MB chunks. That means the
server holds at most about 1 MB in memory at a time, however big the file is,
instead of loading the whole file into RAM before saving it. This is separate
from atomic writes, but it lives in the same function. It matters because the
whole reason for prebuilding match data was to keep the server's memory use
low.

## Where the pattern is used

| Where | What is written |
|---|---|
| Server, the first time a match is requested | The three downloaded files |
| Build script | Two Parquet files and the metadata JSON, written from pandas |

The build script writes into the same `data/` folder with the same names. So
building a match locally also fills a local server's cache, and a server that
happens to be reading while a build runs is protected in the same way.

## Limits

Atomic writes protect **readers**. They do not solve everything.

- **Two writers of the same file can still clash.** The temporary name is
  always the real name plus `.tmp`, so two writers of the same file would
  both write into the same temporary file and could mix their bytes. Inside
  one server process the per-match [lock](./locks-and-concurrency.md)
  prevents that. It would not prevent it across two server processes, or
  between a server and a build script writing the same match at the same
  time. Giving each writer its own temporary name (for example by adding the
  process id) would close that gap.
- **Leftover `.tmp` files are not cleaned up.** A crash leaves one behind. It
  is harmless, because nothing reads `.tmp` names and the next download
  overwrites it, but it uses disk space until then.
- **Atomic does not mean safe from a power cut.** The code does not force the
  data onto the physical disk (`fsync`) before renaming. After a power cut the
  file could have its real name but be missing contents. For a cache that can
  simply be downloaded again, that risk was accepted.
- **The temporary file must be in the same folder as the real one.** The
  rename is only a quick relabel when both names are on the same disk. Across
  two disks the operating system has to copy the data, and that copy is not
  atomic.

## Questions to expect

**What does atomic mean here?**
The switch from "no file" (or "old file") to "complete new file" happens in
one step that cannot be seen half done. That property comes from the
operating system's rename, not from anything Python does.

**Why not just lock the file while it is being written?**
Then every reader would have to take the lock too, and a crash while holding
it would leave a mess to clean up. With write-then-rename, readers need no
lock at all, and a crash leaves nothing to undo.

**What happens to a request that is reading the old file when it is
replaced?**
On Linux and macOS it carries on reading the old data. The rename only
changes what the name points at. The old data stays until the last reader
closes it.

**If you have atomic writes, why do you also need locks?**
They solve different problems. Atomic writes stop a *reader* seeing a
half-written file. Locks stop two *writers* doing the same download twice
and writing into the same temporary file.

**Where else would you use this?**
Anywhere a file is read by something other than the thing writing it: config
files rewritten by a running service, generated assets, checkpoints.
Databases do a more elaborate version of the same idea with a write-ahead
log.
