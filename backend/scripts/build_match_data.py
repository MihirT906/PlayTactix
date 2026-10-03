"""Build the prebuilt per-match data files the server downloads at runtime.

Usage (from the repo root, with requirements-build.txt installed):

    python backend/scripts/build_match_data.py            # every open-data match
    python backend/scripts/build_match_data.py 1886347    # just these ids

Files land in data/ under the same names the server caches them as, so a
local run also primes a local server's cache. Publishing them is done by
.github/workflows/build-match-data.yml.
"""
import gc
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests

from logger import get_logger
from services.data_ingestor_github import DataIngestor

logger = get_logger(__name__)

MATCHES_INDEX_URL = "https://raw.githubusercontent.com/SkillCorner/opendata/refs/heads/master/data/matches.json"


def _all_match_ids() -> list[int]:
    response = requests.get(MATCHES_INDEX_URL, timeout=30)
    response.raise_for_status()
    return [int(match["id"]) for match in response.json()]


def main(argv: list[str]) -> int:
    match_ids = [int(arg) for arg in argv] or _all_match_ids()
    logger.info("Building match data for %s matches", len(match_ids))

    ingestor = DataIngestor()
    failed = []
    for match_id in match_ids:
        try:
            ingestor.load_data(match_id)
        except Exception:
            # One bad match shouldn't stop the rest from being built
            logger.error("Failed to build match_id=%s", match_id, exc_info=True)
            failed.append(match_id)
        # Each match peaks above 1GB while kloppy parses it; release that
        # before starting the next one.
        gc.collect()

    if failed:
        logger.error("Failed matches: %s", failed)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
