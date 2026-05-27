import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

try:
    from backend.paths import DATA_DIR
except ModuleNotFoundError:
    DATA_DIR = Path(__file__).resolve().parents[2] / "data"

from services.data_ingestor_github import SkillCornerDataIngestor
from services.frame_data_service import FrameDataService

router = APIRouter(prefix="/data", tags=["frames"])

data_ingestor: SkillCornerDataIngestor = None

def set_data_ingestor(ingestor: SkillCornerDataIngestor):
    global data_ingestor
    data_ingestor = ingestor
    
@router.get("/hello")
async def hello():
    return {"message": "Hello, World!"}

@router.get("/match/{match_id}")
async def download_match_data(match_id: int):
    try:
        sc_data_ingestor = SkillCornerDataIngestor()
        sc_data_ingestor.load_data(match_id)
        
        return {"message": f"Data for match {match_id} has been saved to gold_tracking_data.json"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frames")
async def get_frame_data(match_id: int = Query(...), start: int = Query(1), end: int = Query(50)):
    try:
        frame_data_service = FrameDataService()
        ret = frame_data_service.get_frames(match_id=match_id, start=start, end=end)
        return ret

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/match_meta")
async def get_match_meta_data(match_id: int = Query(...)):
    try:
        frame_data_service = FrameDataService()
        ret = frame_data_service.get_metadata(match_id=match_id)
        return ret["data"]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/match_key_moments")
async def get_match_key_moments(match_id: int = Query(...)):
    try:
        with (DATA_DIR / "gold_tracking_data.json").open("r") as f:
            gold_tracking_data = json.load(f)
        
        key_moments = gold_tracking_data.get('key_moments', {})

        return {
            "requested_match_id": match_id,
            "data": key_moments,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))