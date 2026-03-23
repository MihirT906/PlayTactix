import pandas as pd
import numpy as np
from collections import defaultdict


class DataPreprocessor:
    def __init__(self):
        pass

    def precompute_event_associations(self, events_data):
        """
        Pre-compute event associations for all frames by creating a dictionary mapping frame numbers to complete event information like:
        {1: {'player_possession': [...], 'passing_options': [...], ...}}
        """

        frame_events = defaultdict(
            lambda: {
                "player_possession": [],
                "passing_options": [],
                "on_ball_engagements": [],
                "off_ball_runs": [],
            }
        )

        # Group events by type for efficient processing
        event_groups = events_data.groupby("event_type")

        # Map event types to their corresponding keys in frame_events
        event_type_mapping = {
            "player_possession": "player_possession",
            "passing_option": "passing_options",
            "on_ball_engagement": "on_ball_engagements",
            "off_ball_run": "off_ball_runs",
        }

        # Process all event types in a single loop
        for event_type, events_group in event_groups:
            if event_type in event_type_mapping:
                target_key = event_type_mapping[event_type]
                for _, event in events_group.iterrows():
                    event_dict = event.to_dict()
                    for frame in range(
                        int(event["frame_start"]), int(event["frame_end"]) + 1
                    ):
                        frame_events[frame][target_key].append(event_dict)

        return dict(frame_events)
        
