import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
import math
from fastapi.responses import JSONResponse 
from logger import get_logger, clear_log

logger = get_logger(__name__)

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

from services.data_ingestor_github import DataIngestor
from services.frame_data_service import FrameDataService
from services.key_moments_service import KeyMomentsService
from services.pitch_control_overlay import PitchControlOverlay

router = APIRouter(prefix="/data", tags=["frames"])

data_ingestor: DataIngestor = None

def set_data_ingestor(ingestor: DataIngestor):
    global data_ingestor
    data_ingestor = ingestor

def sanitize_nan(obj):
    if isinstance(obj, float) and math.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_nan(v) for v in obj]
    return obj
    
@router.get("/hello")
async def hello():
    return {"message": "Hello, World!"}

@router.get("/match/{match_id}")
async def download_match_data(match_id: int):
    try:
        clear_log()
        logger.info("Downloading match data for match_id=%s", match_id)
        ingestor = DataIngestor()
        ingestor.load_data(match_id)
        
        return {"message": f"Data for match {match_id} has been saved to gold_tracking_data.json"}
    except Exception as e:
        logger.error("Error occurred while downloading match data for match_id=%s: %s", match_id, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frames")
async def get_frame_data(match_id: int = Query(...), start: int = Query(1), end: int = Query(50)):
    try:
        logger.info("Fetching frames match_id=%s start=%s end=%s", match_id, start, end)
        frame_data_service = FrameDataService()
        ret = frame_data_service.get_frames(match_id=match_id, start=start, end=end)
        return JSONResponse(content=sanitize_nan(ret))

    except Exception as e:
        logger.error("Failed to fetch frames match_id=%s start=%s end=%s", match_id, start, end, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/match_meta")
async def get_match_meta_data(match_id: int = Query(...)):
    try:
        logger.info("Fetching match metadata for match_id=%s", match_id)
        frame_data_service = FrameDataService()
        ret = frame_data_service.get_metadata(match_id=match_id)
        return ret["data"]

    except Exception as e:
        logger.error("Failed to fetch metadata for match_id=%s", match_id, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/match_key_moments")
async def get_match_key_moments(match_id: int = Query(...)):
    try:
        logger.info("Fetching key moments for match_id=%s", match_id)

        key_moments_service = KeyMomentsService()
        key_moments = key_moments_service.get_key_moments(match_id=match_id)

        return {
            "requested_match_id": match_id,
            "data": key_moments,
        }

    except Exception as e:
        logger.error("Failed to fetch key moments for match_id=%s", match_id, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pitch_control_overlay")
async def get_pitch_control_overlay(match_id: int = Query(...), start: int = Query(1), end: int = Query(50)):
    try:
        logger.info("Fetching pitch control match_id=%s start=%s end=%s", match_id, start, end)
        pco = PitchControlOverlay()
        pitch_control_results = pco.get_pitch_control(match_id=match_id, start_frame=start, end_frame=end)
        return pitch_control_results

    except Exception as e:
        logger.error("Failed to fetch pitch control match_id=%s start=%s end=%s", match_id, start, end, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
