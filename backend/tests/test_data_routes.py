import json
import math

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import paths
from main import app
from routes import data_routes
from services import match_cache

MATCH_ID = 123
HOME_TEAM_ID = 1
AWAY_TEAM_ID = 2


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    # Every cache path is built from DATA_DIR, so the tests never read or write the real data/ folder.
    monkeypatch.setattr(paths, "DATA_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def cached_match(data_dir):
    """A tiny match with one player a side: frames 1 and 3 are tracked and frame 2 is missing."""
    tracking = pd.DataFrame(
        {
            "frame_id": [1, 3],
            "period_id": [1, 1],
            "home_10_x": [1.0, 2.0],
            "home_10_y": [1.5, 2.5],
            "home_10_vx": [math.nan, 0.5],
            "away_20_x": [-1.0, math.nan],  # Not tracked on frame 3, so left out of it
            "away_20_y": [-1.5, math.nan],
            "ball_x": [0.0, 0.5],
            "ball_y": [0.0, 0.5],
            "ball_z": [math.nan, 0.1],
        }
    )
    tracking.to_parquet(paths.tracking_data_path(MATCH_ID))
    meta = {
        "id": MATCH_ID,
        "home_team": {"id": HOME_TEAM_ID},
        "players": [
            {"id": 10, "team_id": HOME_TEAM_ID},
            {"id": 20, "team_id": AWAY_TEAM_ID},
        ],
    }
    # Written last, as the real download does: its presence marks the match as cached.
    paths.meta_data_path(MATCH_ID).write_text(json.dumps(meta))
    return meta


@pytest.fixture
def client(monkeypatch):
    # The download route starts a fresh log, which would wipe the real log file.
    monkeypatch.setattr(data_routes, "clear_log", lambda: None)
    return TestClient(app)


def get_frames(client, **params):
    return client.get("/data/frames", params={"match_id": MATCH_ID, "start": 1, "end": 3, **params})


class TestFrames:
    def test_requires_a_match_id(self, client, data_dir):
        response = client.get("/data/frames", params={"start": 1, "end": 3})

        assert response.status_code == 422

    def test_refuses_a_match_that_is_not_loaded(self, client, data_dir):
        response = get_frames(client)

        assert response.status_code == 409

    def test_returns_every_frame_in_the_range(self, client, cached_match):
        response = get_frames(client)

        assert response.status_code == 200
        body = response.json()
        assert (body["requested_start"], body["requested_end"]) == (1, 3)
        assert sorted(body["frames"]) == ["1", "2", "3"]
        assert body["missing_frames"] == [2]

        first = body["frames"]["1"]
        assert first["period"] == 1
        assert first["players"]["player_id"] == [10, 20]
        assert first["players"]["team"] == ["home", "away"]
        assert first["players"]["x"] == [1.0, -1.0]
        # A player without a position on a frame is left out of it.
        assert body["frames"]["3"]["players"]["player_id"] == [10]

    def test_a_missing_frame_has_no_players_or_ball(self, client, cached_match):
        missing = get_frames(client).json()["frames"]["2"]

        assert missing["period"] is None
        assert missing["players"]["player_id"] == []
        assert missing["ball"] == {"ball_x": None, "ball_y": None, "ball_z": None}

    def test_sends_missing_values_as_null(self, client, cached_match):
        response = get_frames(client)

        # NaN is not valid JSON, so the browser could not parse the response.
        assert "NaN" not in response.text
        first = response.json()["frames"]["1"]
        assert first["players"]["vx"] == [None, None]
        assert first["ball"]["ball_z"] is None

    def test_an_unreadable_match_is_an_error_not_an_empty_chunk(self, client, cached_match):
        paths.tracking_data_path(MATCH_ID).write_bytes(b"not a parquet file")

        response = get_frames(client)

        assert response.status_code == 500


class TestMatchMeta:
    def test_returns_the_cached_metadata(self, client, cached_match):
        response = client.get("/data/match_meta", params={"match_id": MATCH_ID})

        assert response.status_code == 200
        assert response.json() == cached_match

    def test_refuses_a_match_that_is_not_loaded(self, client, data_dir):
        response = client.get("/data/match_meta", params={"match_id": MATCH_ID})

        assert response.status_code == 409


class TestMatchDownload:
    def test_a_cached_match_is_not_downloaded_again(self, client, cached_match, monkeypatch):
        def fail_download(*args):
            raise AssertionError("downloaded a match that was already cached")

        monkeypatch.setattr(match_cache, "_download_file", fail_download)

        response = client.get(f"/data/match/{MATCH_ID}")

        assert response.status_code == 200

    def test_a_match_with_no_published_data_is_not_found(self, client, data_dir, monkeypatch):
        def not_published(match_id, path):
            raise match_cache.MatchNotAvailableError(f"No prebuilt data published for match {match_id}")

        monkeypatch.setattr(match_cache, "_download_file", not_published)

        response = client.get(f"/data/match/{MATCH_ID}")

        assert response.status_code == 404
        assert not match_cache.is_match_cached(MATCH_ID)


def test_sanitize_nan_replaces_nan_at_any_depth():
    assert data_routes.sanitize_nan({"a": math.nan, "b": [1.0, math.nan, {"c": math.nan}], "d": "x"}) == {
        "a": None,
        "b": [1.0, None, {"c": None}],
        "d": "x",
    }
