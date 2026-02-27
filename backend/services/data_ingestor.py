import pandas as pd
import os
from typing import List, Dict, Optional
from config import DATA_FILE_NAME

class DataIngestor:
    def __init__(self):
        # Get the absolute path to the backend directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.csv_path = os.path.join(backend_dir, "..", "data", DATA_FILE_NAME)
    
    def load_data(self, csv_path: str) -> pd.DataFrame:
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found at path: {csv_path}")
        return pd.read_csv(csv_path)
    
    def get_frame_data(self, frame_number: int) -> pd.DataFrame:
        df = self.load_data(self.csv_path)
        if 'frame_num' not in df.columns:
            raise ValueError("DataFrame must contain a 'frame_num' column")
        return df[df['frame_num'] == frame_number]