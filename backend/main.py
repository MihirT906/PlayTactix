import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.data_ingestor_github import SkillCornerDataIngestor
from routes import data_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_ingestor = SkillCornerDataIngestor()
data_routes.set_data_ingestor(data_ingestor)
app.include_router(data_routes.router)

@app.get("/")
async def hello_world():
    return {"message": "hello world"}

@app.get("/hello")
async def hello():
    return {"message": "hello world"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)