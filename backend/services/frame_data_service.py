import pandas as pd
# from .data_ingestor_github import SkillCornerDataIngestor

class FrameDataService:
    def __init__(self):
        # self.data_ingestor = SkillCornerDataIngestor()
        pass

    def get_frames(self, match_id: int, start: int, end: int) -> dict:
        
        try:
            # bronze_tracking_data = self.data_ingestor._get_bronze_tracking_data(match_id=match_id)
            # silver_tracking_data = self.data_ingestor._get_silver_tracking_data(bronze_tracking_data)
            # tracking_df = silver_tracking_data.copy()
            tracking_df = pd.read_parquet("../data/silver_tracking_data.parquet")
            
            # bronze_meta_data = self.data_ingestor._get_bronze_meta_data(match_id=match_id)
            # silver_meta_data = self.data_ingestor._get_silver_meta_data(bronze_meta_data)
            # meta_df = silver_meta_data.copy()
            meta_df = pd.read_parquet("../data/silver_meta_data.parquet")
            
            final_df = tracking_df.merge(meta_df, left_on=["player_id"], right_on=["id"])
            
            #filter the df from start to end using the frame column
            final_df = final_df[(final_df["frame"] >= start) & (final_df["frame"] <= end)]
            
            # if final_df.empty:
            #     return {}
            
            frame_series = final_df["frame"].dropna()
            # if frame_series.empty:
            #     return {"error": "No valid frame values found."}

            min_frame = max(start, int(frame_series.min()))
            max_frame = min(end, int(frame_series.max()))
            
            print("min_frame:", min_frame)
            print("max_frame:", max_frame)
            silver_groups = {
                int(frame_number): group
                for frame_number, group in final_df.groupby("frame")
            }
            
            missing_frames = []
            frames = {}
            for frame_number in range(start, end + 1):
                group = silver_groups.get(frame_number)
                
                # Adding tracking data
                if group is None or group.empty:
                    missing_frames.append(frame_number)
                    # frames[frame_number] = {'players': {}, 'ball': {}, 'events': []}
                    frames[frame_number] = {
                        'period': None,
                        'players': {
                            'x': [],
                            'y': [],
                            'player_id': [],
                            'id': [],
                            'short_name': [],
                            'number': [],
                            'team_id': [],
                            'total_time': [],
                            'player_role.name': [],
                            'player_role.acronym': [],
                            'is_gk': [],
                            'direction_player_1st_half': [],
                            'direction_player_2nd_half': [],
                        },
                        'ball': {
                            'ball_x': None,
                            'ball_y': None,
                            'ball_z': None,
                        },
                        'events': []
                    }
                else:
                    frames[frame_number] = {
                        'period': group['period'].iloc[0],
                        'players': {
                            'x': group['x'].tolist(),
                            'y': group['y'].tolist(),
                            'player_id': group['player_id'].tolist(),
                            'id': group['id'].tolist(),
                            'short_name': group['short_name'].tolist(),
                            'number': group['number'].tolist(),
                            'team_id': group['team_id'].tolist(),
                            'total_time': group['total_time'].tolist(),
                            'player_role.name': group['player_role.name'].tolist(),
                            'player_role.acronym': group['player_role.acronym'].tolist(),
                            'is_gk': group['is_gk'].tolist(),
                            'direction_player_1st_half': group['direction_player_1st_half'].tolist(),
                            'direction_player_2nd_half': group['direction_player_2nd_half'].tolist(),
                        },
                        'ball': {
                            'ball_x': group['ball_x'].iloc[0],
                            'ball_y': group['ball_y'].iloc[0],
                            'ball_z': group['ball_z'].iloc[0],
                        },
                        'events': []
                    }
            
            
            return {
                "requested_start": start,
                "requested_end": end,
                "frames": frames,
                "missing_frames": missing_frames
            }
        
        except Exception as e:
            print(f"Error reading parquet files: {e}")
            return {"error": "Failed to read data files."}