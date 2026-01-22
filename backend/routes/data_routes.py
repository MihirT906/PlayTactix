from fastapi import APIRouter, HTTPException, Query
from services.data_ingestor import DataIngestor

router = APIRouter(prefix="/data", tags=["frames"])

data_ingestor: DataIngestor = None

def set_data_ingestor(ingestor: DataIngestor):
    global data_ingestor
    data_ingestor = ingestor

@router.get("/frame/{frame_number}")
async def get_frame_data(frame_number: int):
    try:
        if data_ingestor is None:
            raise HTTPException(status_code=500, detail="DataIngestor not initialized")
        
        coordinates_df = data_ingestor.get_frame_data(frame_number)
        if coordinates_df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for frame number {frame_number}")

        return coordinates_df.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frames")
async def get_frame_data(start: int = Query(1), end: int = Query(50)):
    try:
        if data_ingestor is None:
            raise HTTPException(status_code=500, detail="DataIngestor not initialized")
        
        df = data_ingestor.load_data(data_ingestor.csv_path)
        if df.empty:
            raise HTTPException(status_code=404, detail="No data found")

        # Filter data for the requested frame range
        filtered_data = df[(df["frame_num"] >= start) & (df["frame_num"] <= end)]
        return filtered_data.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))