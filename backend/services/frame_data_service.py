import json
from pathlib import Path
from services.pitch_control_overlay import PitchControlOverlay
from logger import get_logger

logger = get_logger(__name__)

import pandas as pd

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

class FrameDataService:
    def __init__(self):
        self.data_dir = DATA_DIR

    def _data_path(self, filename: str):
        return self.data_dir / filename

    def _empty_players(self) -> dict:
        return {
            "x": [],
            "y": [],
            "player_id": [],
            "team": [],
            "vx": [],
            "vy": [],
            "speed": [],
        }

    def _player_descriptors(self, meta_data: dict) -> list[tuple[str, int]]:
        '''Returns a list of (team, player_id) tuples based on the metadata.'''
        
        home_team_id = meta_data["home_team"]["id"]
        players = []

        for player in meta_data.get("players", []):
            team = "home" if player.get("team_id") == home_team_id else "away"
            player_id = player.get("id")
            if player_id is None:
                continue
            players.append((team, int(player_id)))

        return players

    def _value_or_none(self, value):
        if pd.isna(value):
            return None
        return float(value)

    def _players_from_row(self, row: pd.Series, player_descriptors: list[tuple[str, int]]) -> dict:
        players = self._empty_players()

        for team, player_id in player_descriptors:
            prefix = f"{team}_{player_id}"
            x_col = f"{prefix}_x"
            y_col = f"{prefix}_y"

            if x_col not in row.index or y_col not in row.index:
                continue

            x = row[x_col]
            y = row[y_col]
            if pd.isna(x) or pd.isna(y):
                continue

            players["x"].append(float(x))
            players["y"].append(float(y))
            players["player_id"].append(player_id)
            players["team"].append(team)
            players["vx"].append(self._value_or_none(row.get(f"{prefix}_vx")))
            players["vy"].append(self._value_or_none(row.get(f"{prefix}_vy")))
            players["speed"].append(self._value_or_none(row.get(f"{prefix}_speed")))

        return players  

    def get_metadata(self, match_id: int) -> dict:
        try:
            logger.info("Retrieving metadata for match_id=%s from stored data", match_id)
            with self._data_path("bronze_meta_data.json").open("r") as f:
                meta_data = json.load(f)
            
            return {
                "requested_match_id": match_id,
                "data": meta_data
            }
        except Exception as e:
            logger.error("Error reading bronze_meta_data.json for match_id=%s: %s", match_id, e)
            return {"error": "Failed to read bronze_meta_data.json."}
          

    def get_frames(self, match_id: int, start: int, end: int) -> dict:
        try:
            # Read stored data
            logger.info("Reading data files for match_id=%s", match_id)
            tracking_df = pd.read_parquet(self._data_path("silver_tracking_data_kloppy.parquet"))
            events_df = pd.read_parquet(self._data_path("silver_event_data.parquet"))
            with self._data_path("bronze_meta_data.json").open("r") as f:
                meta_data = json.load(f)

            final_df = tracking_df.copy()
            
            # Filter to requested frame range
            logger.info("Filtering frames for match_id=%s to range %s-%s", match_id, start, end)
            final_df["frame"] = final_df["frame_id"].astype(int)
            final_df = final_df[(final_df["frame"] >= start) & (final_df["frame"] <= end)]

            player_descriptors = self._player_descriptors(meta_data) # (team, player_id) tuples
            frame_rows = {
                int(row["frame"]): row
                for _, row in final_df.drop_duplicates("frame").iterrows()
            }

            # Process frames
            event_idx = 0
            n_events = len(events_df)
            active_events = []
            missing_frames = []
            frames = {}
            for frame_number in range(start, end + 1):
                row = frame_rows.get(frame_number)

                if row is None:
                    missing_frames.append(frame_number)
                    frames[frame_number] = {
                        'period': None,
                        'players': self._empty_players(),
                        'ball': {
                            'ball_x': None,
                            'ball_y': None,
                            'ball_z': None,
                        },
                        'events': [],
                        'overlays': {}
                    }
                else:
                    frames[frame_number] = {
                        'period': int(row['period_id']) if 'period_id' in row.index and pd.notna(row['period_id']) else None,
                        'players': self._players_from_row(row, player_descriptors),
                        'ball': {
                            'ball_x': self._value_or_none(row.get('ball_x')),
                            'ball_y': self._value_or_none(row.get('ball_y')),
                            'ball_z': self._value_or_none(row.get('ball_z')),
                        },
                        'events': [],
                        'overlays': {}
                    }
            
                    # Adding event data
                    while event_idx < n_events and events_df.iloc[event_idx]["frame_start"] <= frame_number:
                        active_events.append(events_df.iloc[event_idx].to_dict())
                        event_idx += 1

                    active_events = [
                        event for event in active_events
                        if event["frame_start"] <= frame_number <= event["frame_end"]
                    ]

                    frames[frame_number]["events"] = list(active_events)
                    
                    frames[frame_number]["overlays"]["pitch_control"] = {
                        "type": "pitch_control",
                        "data": PitchControlOverlay().get_pitch_control(row)
                    }
            logger.info("Returning frames for match_id=%s", match_id, exc_info=True)
            return {
                "requested_match_id": match_id,
                "requested_start": start,
                "requested_end": end,
                "frames": frames,
                "missing_frames": missing_frames
            }
        
        except Exception as e:
            logger.error("Error retrieving frames for match_id=%s: %s", match_id, e, exc_info=True)
            return {"error": "Failed to read data files."}