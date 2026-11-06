# kloppy

[kloppy](https://kloppy.pysport.org/) is an open-source Python library that
reads football tracking and event data from many providers into one common
model. Tapp'd uses it for one thing: turning SkillCorner's raw tracking file
into a table.

Version: `kloppy==3.18.0`, in `backend/requirements-build.txt`.
Code: `KloppyDataIngestor` in `backend/services/data_ingestor_github.py`.

## What it does here

```python
dataset = skillcorner.load_open_data(
    match_id=match_id,
    sample_rate=1,
    coordinates="skillcorner",
    include_empty_frames=False,
    only_alive=False,
)
tracking_df = dataset.to_df()
```

| Argument | Meaning | Why this value |
|---|---|---|
| `match_id` | Which open-data match | kloppy knows where SkillCorner keeps the files and fetches them itself |
| `sample_rate=1` | Keep every frame | Full 10 frames per second |
| `coordinates="skillcorner"` | Leave coordinates as SkillCorner defines them: metres, origin at the centre | Matches the coordinates in the event data, so no conversion is needed between the two |
| `include_empty_frames=False` | Drop frames with no tracked objects | Smaller output. It is also why frame numbers have gaps. |
| `only_alive=False` | Keep frames where the ball is out of play | So play can be followed through stoppages |

`to_df()` gives a wide table: one row per frame, and for each player a
`{player_id}_x` and `{player_id}_y` column.

Everything after that is the project's own code: selecting columns, renaming
them to `home_`/`away_` form, downcasting, and deriving velocities. See the
[data pipeline](../architecture/data-pipeline.md).

## Why it is build-only

Loading and parsing one match with kloppy peaks at about 1.3 GB of memory.
That single fact is the reason for
[prebuilding](../decisions/002-prebuilt-match-data.md).

The separation is enforced in three places:

| Mechanism | Effect |
|---|---|
| kloppy is listed only in `requirements-build.txt` | A server installed from `requirements.txt` does not have it |
| `backend/.dockerignore` excludes `services/data_ingestor_github.py` and `scripts/` | The only code that imports kloppy is not in the image |
| No server module imports the ingestor | A comment at the top of the ingestor says so |

So the server neither has the library nor the code that would use it.

## What it gives and what it costs

**Gives**

- No hand-written parser for SkillCorner's tracking format.
- Knowledge of where the open-data files are and how they are laid out.
- A provider-neutral model, so another provider's tracking data would be a
  different loader call and not a new parser.

**Costs**

- The memory peak. It builds a full in-memory object model of the match
  before the table can be produced.
- A dependency on its conventions: its column names, and its view of where
  SkillCorner's files are. An upstream change in either lands in the build.

## Notebooks

`backend/notebooks/test_kloppy.ipynb` and `test_data_ingestion.ipynb` are
where the loader call and the transform were explored. They are not part of
the build.

## Questions to expect

**Why use a library for this at all?**
Parsing a provider's tracking format correctly, with periods, substitutions
and coordinate systems, is a well-solved problem that kloppy maintains. The
project's value is in what happens after the data is a table.

**Why does it use so much memory?**
It turns every frame into objects in a general-purpose model before
converting to a table. That generality is what makes it provider-neutral,
and it is expensive for a 90 MB input.

**Could you avoid it?**
Yes, with a streaming parser written for SkillCorner's format that writes
rows straight to Parquet. Memory would be flat. It was not worth writing once
the parse had moved to a machine where 1.3 GB is not a problem.
