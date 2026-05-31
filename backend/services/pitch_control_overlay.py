

import json
from pathlib import Path
import pandas as pd
import numpy as np
from databallpy.features import get_pitch_control_single_frame

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

class PitchControlOverlay:
    def __init__(self):
        self.data_dir = DATA_DIR
    
    def _data_path(self, filename: str) -> Path:
        return self.data_dir / filename
    
    def _default_params(self):
        params = {}
    
        return params
    
    def _get_player_data(self, match_id=1899585):
        # get meta data from data path bronze_meta_data
        meta_data_path = self._data_path(f"bronze_meta_data.json")
        with open(meta_data_path, "r") as f:
            meta_data = json.load(f)
        
        home_team_id = meta_data["home_team"]["id"]
        away_team_id = meta_data["away_team"]["id"]
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
                )
            })
        
        return player_data
    
    def _get_tracking_data(self, match_id=1899585, start_frame=0, end_frame=1000):
        tracking_data_path = self._data_path(f"silver_tracking_data.parquet")
        tracking_data = pd.read_parquet(tracking_data_path)
        
        tracking_data = tracking_data[(tracking_data["frame"] >= start_frame) & (tracking_data["frame"] <= end_frame)]
        
        return tracking_data
    
    def _get_vx(self, tracking_data, frame_num, player_id, dt=0.1):
        current = tracking_data[
            (tracking_data["frame"] == frame_num) &
            (tracking_data["player_id"] == player_id)
        ][["x"]]

        previous = tracking_data[
            (tracking_data["frame"] == frame_num - 1) &
            (tracking_data["player_id"] == player_id)
        ][["x"]]

        if current.empty or previous.empty:
            return np.nan

        dx = current.iloc[0]["x"] - previous.iloc[0]["x"]
        return dx / dt
    
    def _get_vy(self, tracking_data, frame_num, player_id, dt=0.1):
        current = tracking_data[
            (tracking_data["frame"] == frame_num) &
            (tracking_data["player_id"] == player_id)
        ][["y"]]

        previous = tracking_data[
            (tracking_data["frame"] == frame_num - 1) &
            (tracking_data["player_id"] == player_id)
        ][["y"]]

        if current.empty or previous.empty:
            return np.nan

        dy = current.iloc[0]["y"] - previous.iloc[0]["y"]
        return dy / dt
    
    def get_databall_frame(self, tracking_data, player_data, frame_id, match_id=1899585):
        # tracking_data = self._get_tracking_data(match_id=match_id)
        # player_data = self._get_player_data(match_id=match_id)
        new_row = {"frame": frame_id}
        current_frame = tracking_data[tracking_data["frame"] == frame_id].set_index("player_id")
        
        for player in player_data:
            player_id = player["player_id"]
            player_databallpy_id = player["databallpy_id"]

            if player_id not in current_frame.index:
                continue

            new_row[f"{player_databallpy_id}_x"] = current_frame.loc[player_id, "x"]
            new_row[f"{player_databallpy_id}_y"] = current_frame.loc[player_id, "y"]
            new_row[f"{player_databallpy_id}_vx"] = self._get_vx(tracking_data, frame_id, player_id)
            new_row[f"{player_databallpy_id}_vy"] = self._get_vy(tracking_data, frame_id, player_id)

        # ball_x and ball_y are columns on each player row, so just take one row from the frame
        frame_rows = tracking_data[tracking_data["frame"] == frame_id]
        new_row["ball_x"] = frame_rows["ball_x"].iloc[0]
        new_row["ball_y"] = frame_rows["ball_y"].iloc[0]

        frame = pd.DataFrame([new_row])
        return frame
    
    def get_databall_frames(self, match_id=1899585, start_frame=0, end_frame=1000):
        tracking_data = self._get_tracking_data(match_id=match_id, start_frame=start_frame, end_frame=end_frame)
        player_data = self._get_player_data(match_id=match_id)

        frames = []
        for frame_id in range(start_frame, end_frame + 1):
            frame = self.get_databall_frame(tracking_data, player_data, frame_id, match_id=match_id)
            frames.append(frame)
        
        return pd.concat(frames, ignore_index=True)
    
    def get_pitch_control(self, match_id=1899585, start_frame=0, end_frame=1000):
        frames = self.get_databall_frames(match_id=match_id, start_frame=start_frame, end_frame=end_frame)

        pitch_control_results = {}
        for frame_id in range(start_frame, end_frame + 1):
            frame = frames[frames["frame"] == frame_id]
            pitch_dimensions = (106, 68)
            pitch_control = get_pitch_control_single_frame(frame.iloc[0], pitch_dimensions, pitch_dimensions[0], pitch_dimensions[1])
            pitch_control_results[frame_id] = pitch_control.tolist()
            
        return pitch_control_results
        
        