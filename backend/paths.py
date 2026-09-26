from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"


# Per-match cache paths. Centralized here so the code that writes a match's
# data (data_ingestor_github.py) and the code that reads it back
# (frame_data_service.py, key_moments_service.py) can't drift out of sync on
# filenames. See docs/multi-user-match-caching.md.
def meta_data_path(match_id: int) -> Path:
    return DATA_DIR / f"meta_data_{match_id}.json"


def tracking_data_path(match_id: int) -> Path:
    return DATA_DIR / f"tracking_data_{match_id}.parquet"


def events_data_path(match_id: int) -> Path:
    return DATA_DIR / f"events_data_{match_id}.parquet"