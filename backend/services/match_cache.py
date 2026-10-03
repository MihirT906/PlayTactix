import json
import threading

import requests

from config import MATCH_DATA_BASE_URL
from logger import get_logger
from paths import meta_data_path, tracking_data_path, events_data_path

logger = get_logger(__name__)

# (connect, read) seconds - a stalled download should fail, not hang a worker thread
_DOWNLOAD_TIMEOUT = (10, 60)
_CHUNK_SIZE = 1024 * 1024

# One lock per match_id, so two concurrent requests for the same not-yet-cached
# match wait for each other instead of racing to download/write it twice.
# Matches are namespaced by id (see docs/multi-user-match-caching.md), so a
# lock for one match_id never blocks loading a different one.
_match_locks: dict[int, threading.Lock] = {}
_match_locks_guard = threading.Lock()


class MatchNotAvailableError(Exception):
    """No prebuilt data has been published for this match."""


def _lock_for_match(match_id: int) -> threading.Lock:
    with _match_locks_guard:
        lock = _match_locks.get(match_id)
        if lock is None:
            lock = threading.Lock()
            _match_locks[match_id] = lock
        return lock


def is_match_cached(match_id: int) -> bool:
    """Whether match_id's data is fully present in the on-disk cache.

    meta_data_{match_id}.json is written last, both when a match is built
    and when it is downloaded, so its presence (with a matching id) means
    the whole set is complete for this match.
    """
    try:
        with meta_data_path(match_id).open("r") as f:
            return int(json.load(f)["id"]) == match_id
    except (OSError, ValueError, KeyError, TypeError):
        return False


def _download_file(match_id: int, path) -> None:
    """Stream to a temp file + rename so memory stays flat and a reader never sees a half-written file."""
    url = f"{MATCH_DATA_BASE_URL}/{path.name}"
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with requests.get(url, stream=True, timeout=_DOWNLOAD_TIMEOUT) as response:
        if response.status_code == 404:
            raise MatchNotAvailableError(f"No prebuilt data published for match {match_id}")
        response.raise_for_status()
        with tmp_path.open("wb") as f:
            for chunk in response.iter_content(chunk_size=_CHUNK_SIZE):
                f.write(chunk)
    tmp_path.replace(path)


def ensure_match_cached(match_id: int) -> None:
    """Download match_id's prebuilt files into the cache if they aren't there yet.

    The heavy ingestion (kloppy parsing) happens offline in
    scripts/build_match_data.py; the server only ever copies finished files.
    """
    if is_match_cached(match_id):
        logger.info("match_id=%s already cached, skipping download", match_id)
        return

    with _lock_for_match(match_id):
        # Re-check now that we hold the lock: a concurrent request for this
        # same match_id may have finished downloading it while we were waiting.
        if is_match_cached(match_id):
            logger.info("match_id=%s was cached by a concurrent request, skipping download", match_id)
            return

        meta_data_path(match_id).parent.mkdir(parents=True, exist_ok=True)

        logger.info("Downloading prebuilt data for match_id=%s", match_id)
        _download_file(match_id, tracking_data_path(match_id))
        _download_file(match_id, events_data_path(match_id))
        # Downloaded last: marks this match's data set as complete
        _download_file(match_id, meta_data_path(match_id))

    logger.info("Prebuilt data cached for match_id=%s", match_id)
