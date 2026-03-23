from data_loader import DataLoader
from data_preprocessor import DataPreprocessor


class DataPipeline:
    def __init__(self):
        self.data_loader = DataLoader()
        self.data_preprocessor = DataPreprocessor()

    def get_processed_data(self, match_id):
        enriched_data = self.data_loader.create_enriched_tracking_data(match_id)
        events_data = self.data_loader.load_event_data(match_id)
        frame_events = self.data_preprocessor.precompute_event_associations(events_data)
        
        return enriched_data, frame_events