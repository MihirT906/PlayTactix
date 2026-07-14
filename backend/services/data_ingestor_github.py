from fileinput import filename
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from typing import Dict
import requests

from kloppy import skillcorner
from logger import get_logger

logger = get_logger(__name__)

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

def _time_to_seconds(self, time_str) -> int:
    """Convert time string in HH:MM:SS format to total seconds."""
    if time_str is None:
        return 90 * 60  # 120 minutes = 7200 seconds
    h, m, s = map(int, time_str.split(":"))
    return h * 3600 + m * 60 + s

class DataIngestor:
    def __init__(self):
        self.data_dir = DATA_DIR
        self.kloppy_ingestor = KloppyDataIngestor()
        self.skillcorner_ingestor = SkillCornerDataIngestor()
    
    def _data_path(self, filename: str) -> Path:
        return self.data_dir / filename
    
    def load_data(self, match_id) -> Dict[str, pd.DataFrame]:
        logger.info("Starting data ingestion pipeline for match_id=%s", match_id)

        logger.info("Fetching bronze metadata for match_id=%s", match_id)
        bronze_meta_data = self.skillcorner_ingestor._get_bronze_meta_data(match_id)

        logger.info("Fetching bronze event data for match_id=%s", match_id)
        bronze_event_data = self.skillcorner_ingestor._get_bronze_event_data(match_id)

        logger.info("Transforming silver event data for match_id=%s", match_id)
        silver_event_data = self.skillcorner_ingestor._get_silver_event_data(bronze_event_data)

        logger.info("Fetching and enriching tracking data for match_id=%s", match_id)
        enriched_tracking_data = self.kloppy_ingestor._get_silver_tracking_data_from_kloppy(match_id, bronze_meta_data)

        logger.info("Writing tracking data to data store")
        enriched_tracking_data.to_parquet(
            self._data_path("silver_tracking_data_kloppy.parquet"),
            engine="pyarrow",
            index=False,
        )

        logger.info("Writing metadata to data store")
        with self._data_path("bronze_meta_data.json").open("w") as f:
            json.dump(bronze_meta_data, f)

        logger.info("Writing event data to data store")
        silver_event_data.to_parquet(
            self._data_path("silver_event_data.parquet"),
            engine="pyarrow",
            index=False,
        )

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
        # tracking_df = self._get_bronze_tracking_data(match_id)
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
    
    def _get_bronze_tracking_data(self, match_id) -> pd.DataFrame:
        """Load tracking data for a specific match."""

        # Ingest tracking data from Github
        tracking_data_github_url = f"https://media.githubusercontent.com/media/SkillCorner/opendata/741bdb798b0c1835057e3fa77244c1571a00e4aa/data/matches/{match_id}/{match_id}_tracking_extrapolated.jsonl"
        raw_data = pd.read_json(tracking_data_github_url, lines=True)

        return raw_data
    
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
    
    def _get_silver_tracking_data(self, bronze_tracking_data):
        raw_df = pd.json_normalize(
            bronze_tracking_data.to_dict("records"),
            "player_data",
            ["frame", "timestamp", "period", "possession", "ball_data"],
        )
        
        raw_df["x"] = raw_df["x"].round(2)
        raw_df["y"] = raw_df["y"].round(2)

        # Extract 'player_id' and 'group from the 'possession' dictionary
        raw_df["possession_player_id"] = raw_df["possession"].apply(
            lambda x: x.get("player_id")
        )
        raw_df["possession_group"] = raw_df["possession"].apply(
            lambda x: x.get("group")
        )

        # (Optional) Expand the ball_data with json_normalize
        raw_df[["ball_x", "ball_y", "ball_z", "is_detected_ball"]] = pd.json_normalize(
            raw_df.ball_data
        )

        # (Optional) Drop the original 'possession' column if you no longer need it
        raw_df = raw_df.drop(columns=["possession", "ball_data"])

        # Add the match_id identifier to your dataframe
        # raw_df["match_id"] = match_id
        tracking_df = raw_df.copy()
        
        return tracking_df
    
    def _get_silver_meta_data(self, bronze_meta_data):
        # The output has nested json elements. We process them
        raw_match_df = pd.json_normalize(bronze_meta_data, max_level=2)
        raw_match_df["home_team_side"] = raw_match_df["home_team_side"].astype(str)

        players_df = pd.json_normalize(
            raw_match_df.to_dict("records"),
            record_path="players",
            meta=[
                "home_team_score",
                "away_team_score",
                "date_time",
                "home_team_side",
                "home_team.name",
                "home_team.id",
                "away_team.name",
                "away_team.id",
            ],  # data we keep
        )

        # Take only players who played and create their total time
        players_df = players_df[
            ~((players_df.start_time.isna()) & (players_df.end_time.isna()))
        ]
        players_df["total_time"] = players_df["end_time"].apply(
            _time_to_seconds
        ) - players_df["start_time"].apply(_time_to_seconds)

        # Create a flag for GK
        players_df["is_gk"] = players_df["player_role.acronym"] == "GK"

        # Add a flag if the given player is home or away
        players_df["match_name"] = (
            players_df["home_team.name"] + " vs " + players_df["away_team.name"]
        )

        # Add a flag if the given player is home or away
        players_df["home_away_player"] = np.where(
            players_df.team_id == players_df["home_team.id"], "Home", "Away"
        )

        # Create flag from player
        players_df["team_name"] = np.where(
            players_df.team_id == players_df["home_team.id"],
            players_df["home_team.name"],
            players_df["away_team.name"],
        )

        # Figure out sides
        players_df[["home_team_side_1st_half", "home_team_side_2nd_half"]] = (
            players_df["home_team_side"]
            .astype(str)
            .str.strip("[]")
            .str.replace("'", "")
            .str.split(", ", expand=True)
        )
        # Clean up sides
        players_df["direction_player_1st_half"] = np.where(
            players_df.home_away_player == "Home",
            players_df.home_team_side_1st_half,
            players_df.home_team_side_2nd_half,
        )
        players_df["direction_player_2nd_half"] = np.where(
            players_df.home_away_player == "Home",
            players_df.home_team_side_2nd_half,
            players_df.home_team_side_1st_half,
        )

        # Clean up and keep the columns that we require
        columns_to_keep = [
            "start_time",
            "end_time",
            "match_name",
            "date_time",
            "home_team.name",
            "away_team.name",
            "id",
            "short_name",
            "number",
            "team_id",
            "team_name",
            "player_role.position_group",
            "total_time",
            "player_role.name",
            "player_role.acronym",
            "is_gk",
            "direction_player_1st_half",
            "direction_player_2nd_half",
        ]
        players_df = players_df[columns_to_keep]
        return players_df

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