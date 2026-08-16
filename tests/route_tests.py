import json
import sys
import time
from importlib import import_module
from pathlib import Path

import requests
import pytest


class TestRouteRoutes:

    @pytest.mark.integration
    @pytest.mark.slow

    def test_match_download_route_completes_within_time_budget(self, label: str):
        match_id = 1886347
        max_seconds = 30
        url = f"http://localhost:8000/data/match/{match_id}"
        
        started_at = time.perf_counter()
        response = requests.get(url)
        elapsed = time.perf_counter() - started_at
        payload_size_bytes = len(response.content)
        
        output_dir = Path("tests/test_results")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "match_download_route_timing.json"
        output_path.write_text(
            json.dumps(
                {
                    "label": label,
                    "route": f"/data/match/{match_id}",
                    "match_id": match_id,
                    "elapsed_seconds": round(elapsed, 4),
                    "max_seconds": max_seconds,
                    "passed": response.status_code == 200 and elapsed < max_seconds,
                    "status_code": response.status_code,
                    "payload_size_bytes": payload_size_bytes,
                },
                indent=2,
            )
        )
        assert response.status_code == 200
        assert elapsed < max_seconds

    @pytest.mark.integration
    @pytest.mark.slow
    def test_frames_retrieval_completes_within_budget(
        self,
        label: str,
        start_frame: int,
        end_frame: int,
    ):
        match_id = 1886347
        max_seconds = 30
        url = "http://localhost:8000/data/frames"
        
        started_at = time.perf_counter()
        response = requests.get(
            url,
            params={"start": start_frame, "end": end_frame},
        )
        elapsed = time.perf_counter() - started_at
        payload_size_bytes = len(response.content)
        
        output_dir = Path("tests/test_results")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "frames_retrieval_route_timing.json"
        output_path.write_text(
            json.dumps(
                {
                    "label": label,
                    "route": f"/data/frames",
                    "match_id": match_id,
                    "start_frame": start_frame,
                    "end_frame": end_frame,
                    "elapsed_seconds": round(elapsed, 4),
                    "max_seconds": max_seconds,
                    "passed": response.status_code == 200 and elapsed < max_seconds,
                    "status_code": response.status_code,
                    "payload_size_bytes": payload_size_bytes,
                },
                indent=2,
            )
        )
        assert response.status_code == 200
        assert elapsed < max_seconds