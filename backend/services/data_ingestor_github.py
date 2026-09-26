import json
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from typing import Dict
import requests

from kloppy import skillcorner
from logger import get_logger

logger = get_logger(__name__)

from paths import meta_data_path, tracking_data_path, events_data_path

# One lock per match_id, so two concurrent requests for the same not-yet-cached
# match wait for each other instead of racing to ingest/write it twice.
# Matches are namespaced by id (see docs/multi-user-match-caching.md), so a
# lock for one match_id never blocks ingestion of a different one.
_ingestion_locks: dict[int, threading.Lock] = {}
_ingestion_locks_guard = threading.Lock()


def _lock_for_match(match_id: int) -> threading.Lock:
    with _ingestion_locks_guard:
        lock = _ingestion_locks.get(match_id)
        if lock is None:
            lock = threading.Lock()
            _ingestion_locks[match_id] = lock
        return lock


def _atomic_write_json(path: Path, data) -> None:
    """Write via a temp file + rename so a reader never sees a half-written file."""
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w") as f:
        json.dump(data, f)
    tmp_path.replace(path)


def _atomic_write_parquet(path: Path, df: pd.DataFrame) -> None:
    """Write via a temp file + rename so a reader never sees a half-written file."""
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    df.to_parquet(tmp_path, engine="pyarrow", index=False)
    tmp_path.replace(path)


def is_match_cached(match_id: int) -> bool:
    """Whether match_id's data has already been fully ingested and cached on disk.

    bronze_meta_data_{match_id}.json is written last during ingestion, so its
    presence (with a matching id) means the whole set is complete for this match.
    """
    try:
        with meta_data_path(match_id).open("r") as f:
            return int(json.load(f)["id"]) == match_id
    except (OSError, ValueError, KeyError, TypeError):
        return False

class DataIngestor:
    def __init__(self):
        self.kloppy_ingestor = KloppyDataIngestor()
        self.skillcorner_ingestor = SkillCornerDataIngestor()

    def load_data(self, match_id) -> Dict[str, pd.DataFrame]:
        logger.info("Starting data ingestion pipeline for match_id=%s", match_id)

        if is_match_cached(match_id):
            logger.info("match_id=%s already cached, skipping ingestion", match_id)
            return None

        with _lock_for_match(match_id):
            # Re-check now that we hold the lock: a concurrent request for this
            # same match_id may have finished ingesting it while we were waiting.
            if is_match_cached(match_id):
                logger.info("match_id=%s was cached by a concurrent request, skipping ingestion", match_id)
                return None

            logger.info("Fetching bronze metadata for match_id=%s", match_id)
            bronze_meta_data = self.skillcorner_ingestor._get_bronze_meta_data(match_id)

            logger.info("Fetching bronze event data for match_id=%s", match_id)
            bronze_event_data = self.skillcorner_ingestor._get_bronze_event_data(match_id)

            logger.info("Transforming silver event data for match_id=%s", match_id)
            silver_event_data = self.skillcorner_ingestor._get_silver_event_data(bronze_event_data)

            logger.info("Fetching and enriching tracking data for match_id=%s", match_id)
            enriched_tracking_data = self.kloppy_ingestor._get_silver_tracking_data_from_kloppy(match_id, bronze_meta_data)

            logger.info("Writing tracking data to data store")
            _atomic_write_parquet(tracking_data_path(match_id), enriched_tracking_data)

            logger.info("Writing event data to data store")
            _atomic_write_parquet(events_data_path(match_id), silver_event_data)

            # Written last: marks this match's data set as complete
            logger.info("Writing metadata to data store")
            _atomic_write_json(meta_data_path(match_id), bronze_meta_data)

        logger.info("Data ingestion pipeline complete for match_id=%s", match_id)
        return enriched_tracking_data
    
class KloppyDataIngestor:
    def __init__(self):
        pass
        
    def _get_tracking_data_from_kloppy(self, match_id):
        logger.info("Loading tracking data from kloppy for match_id=%s", match_id)
        dataset = skillcorner.load_open_data(
            match_id=match_id,
            sample_rate=1,
            coordinates="skillcorner",
            include_empty_frames=False,
            only_alive=False
        )
        pd.set_option('display.max_columns', None)

        tracking_df = dataset.to_df().copy()
        logger.info("Kloppy tracking data loaded rows=%s cols=%s", len(tracking_df), len(tracking_df.columns))
        return tracking_df
        
    def _get_silver_tracking_data_from_kloppy(self, match_id, meta_data, dt=0.1):
        tracking_df = self._get_tracking_data_from_kloppy(match_id)
            
        home_team_id = meta_data["home_team"]["id"]
            
        player_data = []
        for player in meta_data["players"]:
            player_data.append({
                "player_id": player["id"],
                "team_id": player["team_id"],
                "position": player["player_role"]["acronym"],
                "name": player["short_name"],
                "databallpy_id": (
                    f"home_{player['id']}"
                    if player["team_id"] == home_team_id
                    else f"away_{player['id']}"
                ),
            })

        player_id_to_databallpy_id = {
            str(player["player_id"]): player["databallpy_id"]
            for player in player_data
        }
            
        keep_cols = []
        rename_map = {}

        for col in tracking_df.columns:
            if "_" not in col:
                continue
                
            player_id, suffix = col.rsplit("_", 1)

            if suffix in {"x", "y"} and player_id in player_id_to_databallpy_id:
                keep_cols.append(col)
                rename_map[col] = f"{player_id_to_databallpy_id[player_id]}_{suffix}"

        base_cols = [
            "frame_id",
            "period_id",
            "timestamp",
            "ball_state",
            "ball_owning_team_id",
            "ball_x",
            "ball_y",
            "ball_z",
        ]
            
        existing_base_cols = [col for col in base_cols if col in tracking_df.columns]

        tracking_df = tracking_df[existing_base_cols + keep_cols].rename(columns=rename_map)

        if "ball_x" in tracking_df.columns and "ball_y" in tracking_df.columns:
            tracking_df["ball_vx"] = (tracking_df["ball_x"].diff() / dt).round(2)
            tracking_df["ball_vy"] = (tracking_df["ball_y"].diff() / dt).round(2)
            tracking_df["ball_speed"] = np.sqrt(
                tracking_df["ball_vx"] ** 2 + tracking_df["ball_vy"] ** 2
            ).round(2)

        for player in player_data:
            databallpy_id = player["databallpy_id"]
            x_col = f"{databallpy_id}_x"
            y_col = f"{databallpy_id}_y"
            vx_col = f"{databallpy_id}_vx"
            vy_col = f"{databallpy_id}_vy"
            speed_col = f"{databallpy_id}_speed"

            if x_col in tracking_df.columns and y_col in tracking_df.columns:
                tracking_df[vx_col] = (tracking_df[x_col].diff() / dt).round(2)
                tracking_df[vy_col] = (tracking_df[y_col].diff() / dt).round(2)
                tracking_df[speed_col] = np.sqrt(
                    tracking_df[vx_col] ** 2 + tracking_df[vy_col] ** 2
                ).round(2)

        ordered_base_cols = [
            col for col in [
                "frame_id",
                "period_id",
                "timestamp",
                "ball_state",
                "ball_owning_team_id",
                "ball_x",
                "ball_y",
                "ball_z",
                "ball_vx",
                "ball_vy",
                "ball_speed",
            ] if col in tracking_df.columns
        ]

        ordered_player_cols = []
        for player in player_data:
            databallpy_id = player["databallpy_id"]
            player_cols = [
                f"{databallpy_id}_x",
                f"{databallpy_id}_y",
                f"{databallpy_id}_vx",
                f"{databallpy_id}_vy",
                f"{databallpy_id}_speed",
            ]
            ordered_player_cols.extend(
                [col for col in player_cols if col in tracking_df.columns]
            )

        tracking_df = tracking_df[ordered_base_cols + ordered_player_cols]
        logger.info("Silver tracking data enriched rows=%s players=%s", len(tracking_df), len(player_data))
        computed_cols = [col for col in tracking_df.columns if col not in existing_base_cols]
        # numeric_cols = tracking_df.select_dtypes(include=[np.number]).columns
        # tracking_df[computed_cols] = tracking_df[computed_cols].fillna(0)
        tracking_df = tracking_df.replace([np.inf, -np.inf], np.nan)
        tracking_df = tracking_df.where(pd.notna(tracking_df), None)

        return tracking_df

class SkillCornerDataIngestor:
    def __init__(self):
        pass
    
    def _get_bronze_meta_data(self, match_id) -> pd.DataFrame:
        meta_data_github_url = f"https://raw.githubusercontent.com/SkillCorner/opendata/741bdb798b0c1835057e3fa77244c1571a00e4aa/data/matches/{match_id}/{match_id}_match.json"
        logger.info("Fetching metadata from GitHub match_id=%s", match_id)
        response = requests.get(meta_data_github_url)
        if not response.ok:
            logger.error("Failed to fetch metadata match_id=%s status=%s", match_id, response.status_code)
            response.raise_for_status()
        raw_match_data = response.json()
        logger.info("Metadata fetched successfully match_id=%s", match_id)
        return raw_match_data
    
    def _get_bronze_event_data(self, match_id) -> pd.DataFrame:
        event_data_github_url = f"https://raw.githubusercontent.com/SkillCorner/opendata/refs/heads/master/data/matches/{match_id}/{match_id}_dynamic_events.csv"
        logger.info("Fetching event data from GitHub match_id=%s", match_id)
        raw_data = pd.read_csv(event_data_github_url)
        logger.info("Event data fetched successfully match_id=%s rows=%s", match_id, len(raw_data))
        return raw_data
    
    def _get_silver_event_data(self, bronze_event_data):
        columns_to_keep = [
            'event_id', 'index', 'phase_index', 'frame_start', 'frame_end', 'time_end',
            'team_id', 'attacking_side', 'team_in_possession_phase_type', 'team_out_of_possession_phase_type',
            'event_type', 'event_subtype', 
            'player_id', 'player_name', 'player_position', 'player_in_possession_id',
            'x_start', 'y_start', 'x_end', 'y_end', 'start_type', 'end_type',
            'channel_start', 'channel_end', 'third_start', 'third_end',
            'lead_to_shot', 'lead_to_goal',
            'distance_covered', 'speed_avg', 'separation_gain', 
            'pass_angle', 'pass_distance', 'n_opponents_overtaken',
            'player_targeted_xpass_completion', 'player_targeted_xthreat', 'xthreat', 'xpass_completion', 'xloss_player_possession_start', 'xloss_player_possession_end', 'xloss_player_possession_max', 'xshot_player_possession_start', 'xshot_player_possession_end', 'xshot_player_possession_max'
        ]
        
        silver_event_data = bronze_event_data[columns_to_keep].copy()

        # Normalize all event coordinates to a single attacking direction (left_to_right),
        # so downstream consumers never need to branch on attacking_side.
        invert_mask = silver_event_data["attacking_side"] != "left_to_right"
        for col in ["x_start", "y_start", "x_end", "y_end"]:
            silver_event_data.loc[invert_mask, col] = -silver_event_data.loc[invert_mask, col]

        # silver_event_data['event_subtype_id'] = silver_event_data['event_subtype_id'].fillna(0).astype(int)
        # silver_event_data['event_subtype'] = silver_event_data['event_subtype'].fillna('Unknown') 
        # silver_event_data['player_position'] = silver_event_data['player_position'].fillna('Unknown')
        # silver_event_data['player_in_possession_id'] = silver_event_data['player_in_possession_id'].fillna(-1).astype(int)
        # silver_event_data['player_targeted_xthreat'] = silver_event_data['player_targeted_xthreat'].fillna(-1).astype(float)
        # silver_event_data['lead_to_shot'] = silver_event_data['lead_to_shot'].fillna(False).astype(bool)
        # silver_event_data['lead_to_goal'] = silver_event_data['lead_to_goal'].fillna(False).astype(bool)
        # silver_event_data['distance_covered'] = silver_event_data['distance_covered'].fillna(0).astype(float)
        # silver_event_data['speed_avg'] = silver_event_data['speed_avg'].fillna(0).astype(float)
        # silver_event_data['separation_gain'] = silver_event_data['separation_gain'].fillna(0).astype(float)
        # silver_event_data['pass_distance_received'] = silver_event_data['pass_distance_received'].fillna(0).astype(float)
        # silver_event_data['player_targeted_xpass_completion'] = silver_event_data['player_targeted_xpass_completion'].fillna(-1).astype(float)
        # silver_event_data['xthreat'] = silver_event_data['xthreat'].fillna(-1).astype(float)
        # silver_event_data['xpass_completion'] = silver_event_data['xpass_completion'].fillna(-1).astype(float)
        # silver_event_data['n_opponents_overtaken'] = silver_event_data['n_opponents_overtaken'].fillna(0).astype(int)
        # silver_event_data['xloss_player_possession_start'] = silver_event_data['xloss_player_possession_start'].fillna(-1).astype(float)
        # silver_event_data['xloss_player_possession_end'] = silver_event_data['xloss_player_possession_end'].fillna(-1).astype(float)
        # silver_event_data['xloss_player_possession_max'] = silver_event_data['xloss_player_possession_max'].fillna(-1).astype(float)
        # silver_event_data['xshot_player_possession_start'] = silver_event_data['xshot_player_possession_start'].fillna(-1).astype(float)
        # silver_event_data['xshot_player_possession_end'] = silver_event_data['xshot_player_possession_end'].fillna(-1).astype(float)
        # silver_event_data['xshot_player_possession_max'] = silver_event_data['xshot_player_possession_max'].fillna(-1).astype(float)

        logger.info("Silver event data transformed rows=%s", len(silver_event_data))
        return silver_event_data