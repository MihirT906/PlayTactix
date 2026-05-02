import json
from fastapi import APIRouter, HTTPException, Query
from services.data_ingestor_github import SkillCornerDataIngestor

router = APIRouter(prefix="/data", tags=["frames"])

data_ingestor: SkillCornerDataIngestor = None

def set_data_ingestor(ingestor: SkillCornerDataIngestor):
    global data_ingestor
    data_ingestor = ingestor
    
@router.get("/match/{match_id}")
async def download_match_data(match_id: int):
    try:
        with open("../data/gold_tracking_data.json", "r") as f:
            gold_tracking_data = json.load(f)

        # if gold_tracking_data.get("match", {}).get("id") == match_id:
        #     return {"message": f"Data for match {match_id} already exists in gold_tracking_data.json"}

        sc_data_ingestor = SkillCornerDataIngestor()
        sc_data_ingestor.load_data(match_id)
        
        return {"message": f"Data for match {match_id} has been saved to gold_tracking_data.json"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frames")
async def get_frame_data(start: int = Query(1), end: int = Query(50)):
    try:
        with open(f"../data/gold_tracking_data.json", "r") as f:
            gold_tracking_data = json.load(f)
        
        frames = gold_tracking_data['frames']
        filtered_frames = {frame_num: frames[str(frame_num)] for frame_num in range(start, end + 1) if str(frame_num) in frames}

        return filtered_frames

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/match_meta")
async def get_match_meta_data():
    try:
        with open(f"../data/gold_tracking_data.json", "r") as f:
            gold_tracking_data = json.load(f)
        
        match_meta_data = gold_tracking_data.get('match', {})

        return match_meta_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))