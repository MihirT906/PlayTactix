from config import ALLOWED_ORIGINS, PORT  # loads .env; must come before other backend imports

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import data_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_routes.router)

@app.get("/")
async def hello_world():
    return {"message": "hello world"}

@app.get("/hello")
async def hello():
    return {"message": "hello world"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)