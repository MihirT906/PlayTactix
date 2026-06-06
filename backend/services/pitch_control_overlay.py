

import json
from pathlib import Path
import pandas as pd
import numpy as np
from databallpy.features import get_pitch_control_single_frame

class PitchControlOverlay:
    def __init__(self):
        pass
    
    def get_pitch_control(self, frame_row, pitch_dimensions=(106, 68)):
        pitch_control = get_pitch_control_single_frame(frame_row, pitch_dimensions, pitch_dimensions[0], pitch_dimensions[1])
        return pitch_control.tolist()
        
        