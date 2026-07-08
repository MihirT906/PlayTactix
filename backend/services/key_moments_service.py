from logger import get_logger
from pathlib import Path

logger = get_logger(__name__)

import json
import pandas as pd

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"
    

class KeyMomentsService:
    def __init__(self):
        self.data_dir = DATA_DIR

    def _data_path(self, filename: str):
        return self.data_dir / filename
    
    def _get_lead_to_goals(self, events_data):
            events_data = events_data[(events_data['lead_to_goal'] == True) & (events_data['event_type'] == 'player_possession')]
            events_data["Sequence_ID"] = events_data['phase_index']
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
        
    def _get_lead_to_shots(self, events_data):
            events_data = events_data[(events_data['lead_to_shot'] == True) & (events_data['event_type'] == 'player_possession')]
            events_data["Sequence_ID"] = events_data['phase_index']
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
    
    def _get_all_pops(self, events_data):
        grouped_data = events_data.groupby("phase_index").agg({'frame_start': 'min', 'frame_end': 'max', 'time_end': 'last', 'team_id': 'first', 'team_in_possession_phase_type': 'first', 'team_out_of_possession_phase_type': 'first', 'lead_to_goal': 'last', 'lead_to_shot': 'last'}).reset_index()
        
        if "frame_start" in grouped_data.columns:
            start_buffer = 30  # Buffer of 30 frames before the start of the sequence
            grouped_data["frame_start"] = (
                grouped_data["frame_start"] - start_buffer
            ).clip(lower=0)
        
        if "frame_end" in grouped_data.columns:
            end_buffer = 30  # Buffer of 30 frames after the end of the sequence
            grouped_data["frame_end"] = grouped_data["frame_end"] + end_buffer

        return grouped_data.to_dict("records")
    
    def _get_all_events(self, events_data):
        return json.loads(events_data.to_json(orient="records"))

    def get_key_moments(self, match_id: int):
        
        logger.info("Fetching key moments for match_id=%s", match_id)
        events_df = pd.read_parquet(self._data_path("silver_event_data.parquet"))
        
        goals = self._get_lead_to_goals(events_df)
        logger.info("Key moments computed goals=%s", len(goals))
        shots = self._get_lead_to_shots(events_df)
        logger.info("Key moments computed shots=%s", len(shots))
        pops = self._get_all_pops(events_df)
        logger.info("Key moments computed pops=%s", len(pops))
        events = self._get_all_events(events_df)
        logger.info("Key moments computed events=%s", len(events))
        
        return {
            "pops": pops,
            "goals": goals,
            "shots": shots,
            "events": events,
        }
        
        
    
