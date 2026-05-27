import json
from pathlib import Path

import pandas as pd
import numpy as np
from typing import Dict
import requests

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

class SkillCornerDataIngestor:
    def __init__(self):
        self.data_dir = DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _data_path(self, filename: str) -> Path:
        return self.data_dir / filename
    
    def _time_to_seconds(self, time_str) -> int:
        """Convert time string in HH:MM:SS format to total seconds."""
        if time_str is None:
            return 90 * 60  # 120 minutes = 7200 seconds
        h, m, s = map(int, time_str.split(":"))
        return h * 3600 + m * 60 + s
    
    def _get_bronze_tracking_data(self, match_id) -> pd.DataFrame:
        """Load tracking data for a specific match."""

        # Ingest tracking data from Github
        tracking_data_github_url = f"https://media.githubusercontent.com/media/SkillCorner/opendata/741bdb798b0c1835057e3fa77244c1571a00e4aa/data/matches/{match_id}/{match_id}_tracking_extrapolated.jsonl"
        raw_data = pd.read_json(tracking_data_github_url, lines=True)

        return raw_data
    
    def _get_bronze_meta_data(self, match_id) -> pd.DataFrame:
    
        # Ingest metadata from Github
        meta_data_github_url = f"https://raw.githubusercontent.com/SkillCorner/opendata/741bdb798b0c1835057e3fa77244c1571a00e4aa/data/matches/{match_id}/{match_id}_match.json"
        response = requests.get(meta_data_github_url)
        raw_match_data = response.json()
        
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
            self._time_to_seconds
        ) - players_df["start_time"].apply(self._time_to_seconds)

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
        
    # def _get_gold_tracking_data(self, silver_tracking_data, silver_meta_data, silver_event_data=None):
    #     silver_tracking_data = silver_tracking_data.merge(
    #         silver_meta_data, left_on=["player_id"], right_on=["id"]
    #     )

    #     silver_groups = {
    #         int(frame_number): group
    #         for frame_number, group in silver_tracking_data.groupby("frame")
    #     }

    #     min_frame = int(silver_tracking_data["frame"].min())
    #     max_frame = int(silver_tracking_data["frame"].max())
        
    #     if silver_event_data is not None:
    #         events = silver_event_data.sort_values("frame_start").to_dict("records")
    #     else:
    #         events = []
        
    #     event_idx = 0
    #     n_events = len(events)
    #     active_events = []
    #     frames = {}
    #     for frame_number in range(min_frame, max_frame + 1):
    #         group = silver_groups.get(frame_number)
            
    #         # Adding tracking data
    #         if group is None or group.empty:
    #             frames[frame_number] = {
    #                 'period': None,
    #                 'players': {
    #                     'x': [],
    #                     'y': [],
    #                     'player_id': [],
    #                     'id': [],
    #                     'short_name': [],
    #                     'number': [],
    #                     'team_id': [],
    #                     'total_time': [],
    #                     'player_role.name': [],
    #                     'player_role.acronym': [],
    #                     'is_gk': [],
    #                     'direction_player_1st_half': [],
    #                     'direction_player_2nd_half': [],
    #                 },
    #                 'ball': {
    #                     'ball_x': None,
    #                     'ball_y': None,
    #                     'ball_z': None,
    #                 },
    #                 'events': []
    #             }
    #         else:
    #             frames[frame_number] = {
    #                 'period': group['period'].iloc[0],
    #                 'players': {
    #                     'x': group['x'].tolist(),
    #                     'y': group['y'].tolist(),
    #                     'player_id': group['player_id'].tolist(),
    #                     'id': group['id'].tolist(),
    #                     'short_name': group['short_name'].tolist(),
    #                     'number': group['number'].tolist(),
    #                     'team_id': group['team_id'].tolist(),
    #                     'total_time': group['total_time'].tolist(),
    #                     'player_role.name': group['player_role.name'].tolist(),
    #                     'player_role.acronym': group['player_role.acronym'].tolist(),
    #                     'is_gk': group['is_gk'].tolist(),
    #                     'direction_player_1st_half': group['direction_player_1st_half'].tolist(),
    #                     'direction_player_2nd_half': group['direction_player_2nd_half'].tolist(),
    #                 },
    #                 'ball': {
    #                     'ball_x': group['ball_x'].iloc[0],
    #                     'ball_y': group['ball_y'].iloc[0],
    #                     'ball_z': group['ball_z'].iloc[0],
    #                 },
    #                 'events': []
    #             }
            
    #         # # Adding event data
    #         while event_idx < n_events and events[event_idx]['frame_start'] <= frame_number:
    #             active_events.append(events[event_idx])
    #             event_idx += 1
            
    #         active_events = [e for e in active_events if e['frame_start'] <= frame_number <= e['frame_end']]
            
    #         frames[frame_number]['events'] = active_events
            
    #     return frames

    def _get_bronze_event_data(self, match_id) -> pd.DataFrame:
        event_data_github_url = f"https://raw.githubusercontent.com/SkillCorner/opendata/refs/heads/master/data/matches/{match_id}/{match_id}_dynamic_events.csv"
        raw_data = pd.read_csv(event_data_github_url)

        return raw_data
    
    def _get_silver_event_data(self, bronze_event_data):
        columns_to_keep = [
            'event_id', 'index', 'frame_start', 'frame_end', 'attacking_side', 
            'event_type_id', 'event_type', 'event_subtype_id', 'event_subtype', 
            'player_id', 'player_name', 'player_position', 'player_in_possession_id',
            'team_id', 
            'x_start', 'y_start', 'x_end', 'y_end',
            'lead_to_shot', 'lead_to_goal', 'distance_covered', 'speed_avg', 'separation_gain', 'pass_distance_received', 'player_targeted_xpass_completion', 'player_targeted_xthreat', 'xthreat', 'xpass_completion', 'n_opponents_overtaken', 'xloss_player_possession_max', 'xshot_player_possession_max'
        ]
        
        silver_event_data = bronze_event_data[columns_to_keep]
        silver_event_data['event_subtype_id'] = silver_event_data['event_subtype_id'].fillna(0).astype(int)
        silver_event_data['event_subtype'] = silver_event_data['event_subtype'].fillna('Unknown') 
        silver_event_data['player_position'] = silver_event_data['player_position'].fillna('Unknown')
        silver_event_data['player_in_possession_id'] = silver_event_data['player_in_possession_id'].fillna(-1).astype(int)
        silver_event_data['player_targeted_xthreat'] = silver_event_data['player_targeted_xthreat'].fillna(-1).astype(float)
        silver_event_data['lead_to_shot'] = silver_event_data['lead_to_shot'].fillna(False).astype(bool)
        silver_event_data['lead_to_goal'] = silver_event_data['lead_to_goal'].fillna(False).astype(bool)
        silver_event_data['distance_covered'] = silver_event_data['distance_covered'].fillna(0).astype(float)
        silver_event_data['speed_avg'] = silver_event_data['speed_avg'].fillna(0).astype(float)
        silver_event_data['separation_gain'] = silver_event_data['separation_gain'].fillna(0).astype(float)
        silver_event_data['pass_distance_received'] = silver_event_data['pass_distance_received'].fillna(0).astype(float)
        silver_event_data['player_targeted_xpass_completion'] = silver_event_data['player_targeted_xpass_completion'].fillna(-1).astype(float)
        silver_event_data['xthreat'] = silver_event_data['xthreat'].fillna(-1).astype(float)
        silver_event_data['xpass_completion'] = silver_event_data['xpass_completion'].fillna(-1).astype(float)
        silver_event_data['n_opponents_overtaken'] = silver_event_data['n_opponents_overtaken'].fillna(0).astype(int)
        silver_event_data['xloss_player_possession_max'] = silver_event_data['xloss_player_possession_max'].fillna(-1).astype(float)
        silver_event_data['xshot_player_possession_max'] = silver_event_data['xshot_player_possession_max'].fillna(-1).astype(float)
        
        return silver_event_data 
    
    def _get_key_moments(self, bronze_event_data):
        
        def _get_lead_to_goals(events_data):
            
            def _sequence_func(df):
                df = df[(df['lead_to_goal'] == True) & (df['event_type'] == 'player_possession')]
                return (df['end_type'] == 'shot').cumsum().shift(1, fill_value=0) + 1
        
            events_data["Sequence_ID"] = _sequence_func(events_data)
            grouped_data = events_data.groupby("Sequence_ID").agg({'frame_start': 'min', 'frame_end': 'max', 'lead_to_goal': 'first', 'player_name': 'last', 'time_end': 'last'}).reset_index()
            
            if "frame_start" in grouped_data.columns:
                start_buffer = 30  # Buffer of 30 frames before the start of the sequence
                grouped_data["frame_start"] = (
                    grouped_data["frame_start"] - start_buffer
                ).clip(lower=0)
            
            if "frame_end" in grouped_data.columns:
                end_buffer = 30  # Buffer of 30 frames after the end of the sequence
                grouped_data["frame_end"] = grouped_data["frame_end"] + end_buffer
            
            return grouped_data.to_dict("records")
    
        events_data = bronze_event_data.copy()
        
        def _get_lead_to_shots(events_data):
            
            def _sequence_func(df):
                df = df[(df['lead_to_shot'] == True) & (df['event_type'] == 'player_possession')]
                return (df['end_type'] == 'shot').cumsum().shift(1, fill_value=0) + 1
        
            events_data["Sequence_ID"] = _sequence_func(events_data)
            grouped_data = events_data.groupby("Sequence_ID").agg({'frame_start': 'min', 'frame_end': 'max', 'lead_to_shot': 'first', 'player_name': 'last', 'time_end': 'last'}).reset_index()
            
            if "frame_start" in grouped_data.columns:
                start_buffer = 30  # Buffer of 30 frames before the start of the sequence
                grouped_data["frame_start"] = (
                    grouped_data["frame_start"] - start_buffer
                ).clip(lower=0)
            
            if "frame_end" in grouped_data.columns:
                end_buffer = 30  # Buffer of 30 frames after the end of the sequence
                grouped_data["frame_end"] = grouped_data["frame_end"] + end_buffer
            
            return grouped_data.to_dict("records")
    
        events_data = bronze_event_data.copy()
        
        return {'goals': _get_lead_to_goals(events_data), 'shots': _get_lead_to_shots(events_data)}

            

    
    def load_data(self, match_id) -> Dict[str, pd.DataFrame]:
        bronze_tracking_data = self._get_bronze_tracking_data(match_id)
        bronze_meta_data = self._get_bronze_meta_data(match_id)
        silver_tracking_data = self._get_silver_tracking_data(bronze_tracking_data)
        silver_meta_data = self._get_silver_meta_data(bronze_meta_data)
        bronze_event_data = self._get_bronze_event_data(match_id)
        silver_event_data = self._get_silver_event_data(bronze_event_data)
        # gold_tracking_data = self._get_gold_tracking_data(silver_tracking_data, silver_meta_data, silver_event_data)
        key_moments = self._get_key_moments(bronze_event_data)
        enriched_tracking_data = silver_tracking_data.merge(silver_meta_data, left_on=["player_id"], right_on=["id"])
        
        enriched_tracking_data.to_parquet(
            self._data_path("silver_tracking_data.parquet"),
            engine="pyarrow",
            index=False,
        )
        
        with self._data_path("bronze_meta_data.json").open("w") as f:
            json.dump(bronze_meta_data, f)

        with self._data_path("gold_tracking_data.json").open("w") as f:
            json.dump(
                {
                    "match_id": match_id,
                    "match": bronze_meta_data,
                    "key_moments": key_moments,
                },
                f,
            )
        # silver_meta_data.to_parquet(
        #     self._data_path("silver_meta_data.parquet"),
        #     engine="pyarrow",
        #     index=False,
        # )
        
        silver_event_data.to_parquet(
            self._data_path("silver_event_data.parquet"),
            engine="pyarrow",
            index=False,
        )
            
        return enriched_tracking_data
    
    def get_frame_data(self, frame_number: int, match_id: str = 1886347):
        df_dict = self.load_data(match_id)
        df = df_dict["enriched_tracking_data"]

        if "frame" not in df.columns:
            raise ValueError("DataFrame must contain a 'frame' column")

        frame_df = df[df["frame"] == frame_number]
        return frame_df.to_dict(orient="records")