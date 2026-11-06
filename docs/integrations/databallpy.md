# databallpy

[databallpy](https://databallpy.readthedocs.io/) is an open-source Python
library for football tracking and event data analysis. Tapp'd uses one
function from it: the pitch control model.

Version: `databallpy==0.6.2`, in `backend/requirements.txt`.
Code: `backend/services/pitch_control_overlay.py`.

## What it does here

```python
from databallpy.features import get_pitch_control_single_frame

pitch_control = get_pitch_control_single_frame(frame_row, (106, 68), 106, 68)
```

Given one row of tracking data, it returns a grid of 68 rows by 106 columns
describing which team controls each part of the pitch. What that means and
how it is used is in [pitch control](../concepts/pitch-control.md).

Unlike kloppy, this is a **runtime** dependency: the server calls it on every
frame of every `/data/frames` request.

## The contract it imposes

databallpy expects tracking data in its own layout, and that expectation
reaches back into the build step.

| Requirement | Where it is met |
|---|---|
| Player columns named `home_{id}_x`, `home_{id}_y`, `home_{id}_vx`, `home_{id}_vy`, and the same for `away_` | The build renames kloppy's `{id}_x` columns into this form and derives the velocity columns |
| No missing velocity for a player who has a position | `FrameDataService._fill_missing_velocities` sets them to zero on a copy of the row before the call |
| Pitch dimensions passed in | Hard-coded to 106 by 68 |

The first row is the reason the stored tracking file looks the way it does.
The column naming is not a free choice; it is databallpy's.

## Other libraries in the requirements

`backend/requirements.txt` also lists `mplsoccer` and `plotly`. No backend
module imports either. They were used in exploratory notebooks and can
likely be dropped from the server's requirements, which would shrink the
image.

## Trade-offs

- **It couples the stored format to a library.** Replacing the pitch control
  model would mean either keeping the naming or rebuilding every match.
- **It is the most expensive call the server makes**, and it runs in the
  request path.
- **One function from a large library.** The whole package and its
  dependencies are installed for a single import.

## Notebook

`backend/notebooks/test_pitch_control_copy.ipynb` is where the call was
explored.

## Questions to expect

**Did you write the pitch control model?**
No, it is databallpy's. The project prepares the input, handles the cases the
function cannot, and delivers and draws the result.

**Why is the tracking data stored in that column layout?**
Because it is the layout the pitch control function takes. Storing it that
way means a row can be passed in as it is, with no reshaping per frame.

**What would you do differently?**
Take pitch control out of the request path, by computing it only when the
overlay is on, or precomputing it at build time. Then the library would move
to the build requirements alongside kloppy and the server would do no
modelling at all.
