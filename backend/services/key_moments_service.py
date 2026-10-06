from logger import get_logger

logger = get_logger(__name__)

import json
import pandas as pd

from paths import events_data_path

FRAME_RATE = 10  # SkillCorner tracking frames per second

class KeyMomentsService:
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
    
    @staticmethod
    def _most_common(values):
        modes = values.mode()
        return modes.iloc[0] if not modes.empty else None

    @staticmethod
    def _collapse_repeats(names):
        # A player who keeps the ball across consecutive possession rows appears once.
        names = names.dropna().tolist()
        return [name for i, name in enumerate(names) if i == 0 or name != names[i - 1]]

    def _get_all_pops(self, events_data):
        # A phase mixes rows from both teams (on_ball_engagement rows belong to the defender) and can
        # contain a brief 'disruption' touch by the opponent, so the first row does not reliably describe
        # the phase. Use the most common phase types, and the team with the most possession events.
        # lead_to_goal / lead_to_shot are set per row and switch off after the shot, so a phase counts
        # if any of its rows has them.
        grouped_data = events_data.groupby("phase_index").agg({'frame_start': 'min', 'frame_end': 'max', 'time_end': 'last', 'team_id': 'first', 'team_in_possession_phase_type': self._most_common, 'team_out_of_possession_phase_type': self._most_common, 'lead_to_goal': 'max', 'lead_to_shot': 'max'}).reset_index()

        possession_team = events_data[events_data['event_type'] == 'player_possession'].groupby("phase_index")['team_id'].agg(self._most_common)
        # Phases without a possession event keep the first row's team.
        grouped_data['team_id'] = grouped_data['phase_index'].map(possession_team).fillna(grouped_data['team_id']).astype(int)

        # Rows only carry the match clock at their end ("MM:SS.s"), so walk each one back by its own
        # length to find when the phase started. Done before the frame range is padded below.
        clock_parts = events_data['time_end'].str.split(':', expand=True).astype(float)
        event_start_seconds = (
            clock_parts[0] * 60 + clock_parts[1]
            - (events_data['frame_end'] - events_data['frame_start']) / FRAME_RATE
        )
        phase_start_seconds = event_start_seconds.groupby(events_data['phase_index']).min().clip(lower=0)
        start_seconds = grouped_data['phase_index'].map(phase_start_seconds)
        grouped_data['time_start'] = start_seconds.map(lambda s: f"{int(s // 60):02d}:{int(s % 60):02d}")
        grouped_data['duration_seconds'] = (grouped_data['frame_end'] - grouped_data['frame_start']) / FRAME_RATE

        # Who had the ball, in order, and how the phase began and ended. Only the attacking team's
        # possessions count, so an opponent's 'disruption' touch does not appear in the chain.
        possessions = events_data[events_data['event_type'] == 'player_possession'].sort_values(['frame_start', 'frame_end'])
        attacking_team = possessions['phase_index'].map(grouped_data.set_index('phase_index')['team_id'])
        possessions_by_phase = possessions[possessions['team_id'] == attacking_team].groupby('phase_index')
        players = possessions_by_phase['player_name'].agg(self._collapse_repeats)
        start_type = possessions_by_phase['start_type'].first()
        end_type = possessions_by_phase['end_type'].last()
        has_shot = possessions_by_phase['end_type'].agg(lambda end_types: bool((end_types == 'shot').any()))
        # Phases without a possession by the attacking team get an empty chain.
        grouped_data['players'] = grouped_data['phase_index'].map(lambda phase: players.get(phase, []))
        grouped_data['start_type'] = grouped_data['phase_index'].map(lambda phase: start_type.get(phase))
        grouped_data['end_type'] = grouped_data['phase_index'].map(lambda phase: end_type.get(phase))
        grouped_data['has_shot'] = grouped_data['phase_index'].map(lambda phase: has_shot.get(phase, False))

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
        events_df = pd.read_parquet(events_data_path(match_id))
        
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
        
        
    
